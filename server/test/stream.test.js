import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readSSE } from '../src/services/sse.js'
import { streamChat } from '../src/services/llmClient.js'

async function* bytes(text){const data=new TextEncoder().encode(text);for(const b of data)yield new Uint8Array([b])}
test('SSE中文逐字节、CRLF、多行data及心跳边界',async()=>{
 const result=[]
 for await(const ev of readSSE(bytes(': heartbeat\r\n\r\nevent: delta\r\ndata: 中文\r\ndata: 第二行\r\n\r\n')))result.push(ev)
 assert.deepEqual(result,[{event:'delta',data:'中文\n第二行'}])
})
test('拒绝不完整尾帧，不能当作完成',async()=>{
 await assert.rejects(async()=>{for await(const ev of readSSE(bytes('data: unfinished')))void ev},/不完整/)
})
test('流式模型正确请求增量与usage，必须收到DONE',async()=>{
 const before=process.env.DASHSCOPE_API_KEY;process.env.DASHSCOPE_API_KEY='test-placeholder'
 try{
  const wire='data: '+JSON.stringify({choices:[{delta:{content:'中文'}}]})+'\n\ndata: '+JSON.stringify({usage:{prompt_tokens:10,completion_tokens:2}})+'\n\ndata: [DONE]\n\n'
  const fetchImpl=async(url,options)=>{assert.equal(JSON.parse(options.body).stream,true);assert.equal(JSON.parse(options.body).stream_options.include_usage,true);return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(wire));c.close()}}))}
  const result=[];for await(const ev of streamChat({messages:[],model:'test',fetchImpl}))result.push(ev)
  assert.deepEqual(result,[{type:'delta',text:'中文'},{type:'usage',usage:{promptTokens:10,completionTokens:2}}])
  await assert.rejects(async()=>{for await(const ev of streamChat({fetchImpl:async()=>new Response('data: {}\n\n')}))void ev},/中断/)
 }finally{if(before===undefined)delete process.env.DASHSCOPE_API_KEY;else process.env.DASHSCOPE_API_KEY=before}
})
