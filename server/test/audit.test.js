import '../src/config/env.js'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import express from 'express'
import {randomUUID} from 'node:crypto'
import {chatCompletion,streamChat} from '../src/services/llmClient.js'
import TokenLog from '../src/models/TokenLog.js'
import {overview} from '../src/controllers/statsController.js'

test('统一审计及聚合：真实Mongo临时库，成功失败取消、未知Token、时区与demo排除',async()=>{
 await mongoose.connect(process.env.MONGO_URI,{dbName:'audit_test_'+randomUUID().replaceAll('-',''),serverSelectionTimeoutMS:8000})
 const app=express();app.get('/stats',overview);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port
 try{
  await chatCompletion({model:'fixture',purpose:'vision',messages:[],fetchImpl:async()=>new Response(JSON.stringify({choices:[{message:{content:'ok'}}],usage:{prompt_tokens:20,completion_tokens:8}}))})
  await assert.rejects(chatCompletion({model:'fixture',purpose:'prompt',messages:[],fetchImpl:async()=>new Response('{}',{status:401})}))
  const stop=new AbortController();stop.abort()
  await assert.rejects(async()=>{for await(const e of streamChat({model:'fixture',purpose:'copy',signal:stop.signal,fetchImpl:async()=>{throw Error('cancel')}}))void e})
  await TokenLog.create({purpose:'chat',model:'demo',success:true,outcome:'success',promptTokens:999,completionTokens:999,demo:true})
  const res=await fetch(base+'/stats?days=7');const {data}=await res.json()
  assert.equal(data.success,1);assert.equal(data.failed,1);assert.equal(data.cancelled,1);assert.equal(data.totalCalls,3);assert.equal(data.totalTokens,28);assert.equal(data.successRate,50);assert.equal(data.excludedDemo,1);assert.equal(data.series.length,7);assert.equal(data.series.slice(0,6).reduce((n,d)=>n+d.calls,0),0);assert.equal(data.unknownUsageCalls,2)
  for(const x of ['-1','0','31','2.5','bad'])assert.equal((await fetch(base+'/stats?days='+x)).status,400)
  const logs=await TokenLog.find().lean();assert.ok(logs.every(l=>!JSON.stringify(l).includes(process.env.DASHSCOPE_API_KEY)))
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await mongoose.connection.dropDatabase();await mongoose.disconnect()}
})
