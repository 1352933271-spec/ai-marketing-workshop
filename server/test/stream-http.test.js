import '../src/config/env.js'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import mongoose from 'mongoose'
import {createApp} from '../src/createApp.js'
import {makeStream} from '../src/controllers/copyController.js'
import Product from '../src/models/Product.js'
import MarketingAsset from '../src/models/MarketingAsset.js'

test('SSE真实HTTP：保存、重写上限、断流中断及历史删除',async()=>{
 await mongoose.connect(process.env.MONGO_URI,{dbName:'hw6_test_'+randomUUID().replaceAll('-',''),serverSelectionTimeoutMS:8000})
 const app=createApp()
 const text='## A desk companion\nAn angled screen position for your desk.\n'+Array.from({length:10},(_,i)=>'#Desk'+i).join(' ')
 let aborted=false
 app.post('/test-stream',makeStream({complete:async function*(){yield {type:'delta',text};yield {type:'usage',usage:{promptTokens:3,completionTokens:8}}}}))
 app.post('/test-bad',makeStream({complete:async function*(){yield {type:'delta',text:'wrong format'}}}))
 app.post('/test-stop',makeStream({complete:async function*({signal}){
  signal.addEventListener('abort',()=>{aborted=true},{once:true});yield {type:'delta',text:'partial'}
  await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}))
 }}))
 // createApp的末尾404会拦截新路由；把测试专用路由放到独立Express实例。
 const {default:express}=await import('express');const host=express();host.use(express.json())
 const routes=app.router.stack.filter(layer=>layer.route?.path?.startsWith('/test-'))
 for(const layer of routes)host.post(layer.route.path,layer.route.stack[0].handle)
 host.use('/api',app)
 const server=host.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r))
 const base='http://127.0.0.1:'+server.address().port
 try{
  const product=await Product.create({name:'Test',images:[],aiAnalysis:{core_selling_points:['angled desk view']}})
  const data={productId:String(product._id),language:'en',channel:'instagram',extra:''}
  const request=(route,signal)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal})
  const res=await request('/test-stream');assert.match(res.headers.get('content-type'),/text\/event-stream/)
  const body=await res.text();assert.match(body,/event: delta/);assert.match(body,/event: done/)
  assert.equal(await MarketingAsset.countDocuments(),1)
  const bad=await(await request('/test-bad')).text();assert.match(bad,/"reset":true/);assert.match(bad,/event: error/);assert.equal(await MarketingAsset.countDocuments(),1)
  const controller=new AbortController();const stopping=await request('/test-stop',controller.signal);const reader=stopping.body.getReader();await reader.read();controller.abort()
  await new Promise(r=>setTimeout(r,100));assert.equal(aborted,true);assert.equal(await MarketingAsset.countDocuments(),1)
  const item=await MarketingAsset.findOne();await MarketingAsset.findByIdAndDelete(item._id);assert.equal(await MarketingAsset.countDocuments(),0)
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await mongoose.connection.dropDatabase();await mongoose.disconnect()}
})
