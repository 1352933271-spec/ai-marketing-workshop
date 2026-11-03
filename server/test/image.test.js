import '../src/config/env.js'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import express from 'express'
import {randomUUID} from 'node:crypto'
import sharp from 'sharp'
import {unlink} from 'node:fs/promises'
import path from 'node:path'
import {UPLOAD_DIR} from '../src/middlewares/upload.js'
import {makeImageControllers} from '../src/controllers/imageController.js'
import {errorHandler} from '../src/middlewares/errorHandler.js'
import {createImageTask,queryImageTask,downloadImage,validateResultURL,imageRequest} from '../src/services/imageService.js'
import {expandImagePrompt} from '../src/services/imagePromptService.js'
import Product from '../src/models/Product.js'
import MarketingAsset from '../src/models/MarketingAsset.js'

test('万相请求必须异步且一次一张，任务查询路径与错误脱敏',async()=>{
 const request=async(route,options)=>{assert.match(route,/image-synthesis$/);assert.equal(options.headers['X-DashScope-Async'],'enable');assert.equal(JSON.parse(options.body).parameters.n,1);return {output:{task_id:'task-123'}}}
 assert.equal(await createImageTask('sample',request),'task-123')
 assert.equal((await queryImageTask('task-123',async route=>{assert.equal(route,'/tasks/task-123');return {output:{task_status:'RUNNING'}}})).status,'RUNNING')
 await assert.rejects(queryImageTask('../bad'),/格式/)
 await assert.rejects(imageRequest('/tasks/test',{},async()=>new Response(JSON.stringify({code:'AccessDenied',message:'SECRET-IN-UPSTREAM'}),{status:403})),e=>e.message.includes('AccessDenied')&&!e.message.includes('SECRET-IN-UPSTREAM'))
})
test('生成图片下载：官方HTTPS域名限定、解码和本地PNG保存',async()=>{
 for(const url of ['http://localhost/a','https://127.0.0.1/a','https://evil.com/a','https://a.oss-cn-beijing.aliyuncs.com.evil.com/a'])assert.throws(()=>validateResultURL(url))
 const data=await sharp({create:{width:30,height:30,channels:3,background:'#fff'}}).jpeg().toBuffer()
 const local=await downloadImage('https://example.oss-cn-beijing.aliyuncs.com/a',async()=>new Response(data))
 assert.match(local,/^\/uploads\/generated\/[0-9a-f-]+\.png$/)
 const file=path.join(UPLOAD_DIR,'generated',path.basename(local));assert.equal((await sharp(file).metadata()).format,'png');await unlink(file)
 await assert.rejects(downloadImage('https://example.oss-cn-beijing.aliyuncs.com/a',async()=>new Response('not image')),/解码/)
})
test('英文扩写格式不合法最多重写一次，不把非法内容作为成功',async()=>{
 let count=0
 const prompt=await expandImagePrompt({product:{name:'x'},scene:'桌面'},async()=>({content:++count===1?'中文错误':Array(65).fill('product').join(' ')}));assert.equal(count,2);assert.equal(prompt.split(' ').length,65)
 await assert.rejects(expandImagePrompt({product:{},scene:'x'},async()=>({content:'bad'})),/校验/)
})
test('真实HTTP/MongoDB：预览确认、防重复、任务状态、超时、持久失败',async()=>{
 await mongoose.connect(process.env.MONGO_URI,{dbName:'hw7_test_'+randomUUID().replaceAll('-',''),serverSelectionTimeoutMS:8000})
 let creates=0,queries=0,downloads=0,state='RUNNING'
 const controllers=makeImageControllers({expand:async()=>Array(65).fill('sample').join(' '),create:async()=>{creates++;return 'task-123'},query:async()=>{queries++;await new Promise(r=>setTimeout(r,30));return {status:state,url:'https://example.oss-cn-beijing.aliyuncs.com/a'}},download:async()=>{downloads++;return '/uploads/generated/'+randomUUID()+'.png'}})
 const app=express();app.use(express.json());app.post('/preview',controllers.preview);app.post('/generate',controllers.generate);app.get('/tasks/:assetId',controllers.taskStatus);app.use(errorHandler)
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port
 const post=(url,data)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
 try{
  const product=await Product.create({name:'test',aiAnalysis:{scene_suggestions:['桌面']}})
  assert.equal((await post('/preview',{productId:'invalid'})).status,400)
  assert.equal((await post('/preview',{productId:String(product._id),sceneIndex:1})).status,400)
  const preview=await(await post('/preview',{productId:String(product._id),sceneIndex:0})).json();const id=preview.data.previewId
  assert.equal(creates,0)
  assert.equal((await post('/generate',{previewId:id})).status,202);assert.equal(creates,1)
  assert.equal((await post('/generate',{previewId:id})).status,409);assert.equal(creates,1)
  const task=()=>fetch(base+'/tasks/'+id).then(r=>r.json())
  const concurrent=await Promise.all([task(),task()]);assert.equal(queries,1);assert.equal(concurrent[0].data.status,'pending')
  state='SUCCEEDED';assert.equal((await task()).data.status,'done');assert.equal(downloads,1);await task();assert.equal(downloads,1)
  const saved=await MarketingAsset.findById(id);assert.equal(saved.taskId,'task-123');assert.equal(saved.imageStage,'complete')
  const failed=await MarketingAsset.create({productId:product._id,type:'image',status:'pending',imageStage:'submitted',submittedAt:new Date(),taskId:'failed'})
  state='FAILED';const failure=await(await fetch(base+'/tasks/'+failed._id)).json();assert.equal(failure.data.status,'failed');assert.ok(failure.data.message);assert.equal((await(await fetch(base+'/tasks/'+failed._id)).json()).data.message,failure.data.message)
  const expired=await MarketingAsset.create({productId:product._id,type:'image',status:'pending',imageStage:'submitted',submittedAt:new Date(Date.now()-310000),taskId:'expired'})
  assert.equal((await(await fetch(base+'/tasks/'+expired._id)).json()).data.status,'failed')
  const copy=await MarketingAsset.create({productId:product._id,type:'copy',status:'done'});assert.equal((await fetch(base+'/tasks/'+copy._id)).status,404)
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await mongoose.connection.dropDatabase();await mongoose.disconnect()}
})
