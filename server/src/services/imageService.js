import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import sharp from 'sharp'
import {UPLOAD_DIR} from '../middlewares/upload.js'
import {LLMError} from './llmClient.js'

function baseURL(){
 const fallback=(process.env.LLM_BASE_URL||'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/compatible-mode\/v1\/?$/,'/api/v1')
 const url=new URL(process.env.IMAGE_BASE_URL||fallback)
 if(url.protocol!=='https:'||url.username||url.password)throw new LLMError('生图接口地址配置错误',503)
 return url.href.replace(/\/$/,'')
}
export async function imageRequest(route,options={},fetchImpl=fetch){
 const key=process.env.DASHSCOPE_API_KEY?.trim()
 if(!key)throw new LLMError('服务器未配置API Key',503)
 let response,data
 try{
  response=await fetchImpl(baseURL()+route,{...options,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(options.headers||{})},redirect:'error',signal:AbortSignal.timeout(30000)})
  data=await response.json()
 }catch{throw new LLMError('生图服务连接异常，请稍后查询任务，勿重复下单')}
 if(!response.ok||data.code){
  const code=String(data.code||response.status).replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,80)
  throw new LLMError('万相接口拒绝请求（'+code+'），请检查所选模型权限、地域与额度')
 }
 return data
}
async function rawCreateImageTask(prompt,request=imageRequest){
 const data=await request('/services/aigc/text2image/image-synthesis',{method:'POST',headers:{'X-DashScope-Async':'enable'},body:JSON.stringify({model:process.env.IMAGE_MODEL||'wanx2.1-t2i-turbo',input:{prompt},parameters:{size:'1024*1024',n:1,prompt_extend:false,watermark:false}})})
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(data.output?.task_id||''))throw new LLMError('生图服务未返回有效任务号')
 return data.output.task_id
}
export async function queryImageTask(id,request=imageRequest){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(id||''))throw new LLMError('任务号格式错误',400,4001)
 const data=await request('/tasks/'+encodeURIComponent(id))
 const out=data.output||{}
 return {status:out.task_status,url:out.results?.[0]?.url,code:out.code||out.results?.[0]?.code}
}
export function validateResultURL(value){
 const url=new URL(value)
 if(url.protocol!=='https:'||url.username||url.password||url.port||!/^[-a-z0-9]+\.oss[-a-z0-9]*\.aliyuncs\.com$/i.test(url.hostname))throw new LLMError('生成图片地址不是受支持的官方OSS地址')
 return url
}
export async function downloadImage(value,fetchImpl=fetch){
 const url=validateResultURL(value)
 const response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(30000)})
 if(!response.ok||!response.body)throw new LLMError('下载生成图片失败，可稍后查询重试')
 const chunks=[];let length=0
 for await(const chunk of response.body){length+=chunk.length;if(length>15*1024*1024)throw new LLMError('生成图片超过15MB限制');chunks.push(chunk)}
 let buffer
 try{buffer=await sharp(Buffer.concat(chunks),{limitInputPixels:25000000}).png().toBuffer()}catch{throw new LLMError('生成结果不是可解码图片')}
 const dir=path.join(UPLOAD_DIR,'generated');await mkdir(dir,{recursive:true})
 const name=randomUUID()+'.png',file=path.join(dir,name)
 try{await writeFile(file,buffer,{flag:'wx'})}catch{await unlink(file).catch(()=>{});throw new LLMError('本地图片保存失败')}
 return '/uploads/generated/'+name
}

import {recordUsage,usageError} from './usageLogger.js'
export async function createImageTask(...args){
 const started=Date.now(),model=process.env.IMAGE_MODEL||'wanx2.1-t2i-turbo'
 try{const id=await rawCreateImageTask(...args);await recordUsage({purpose:'image',model,promptTokens:0,completionTokens:0,success:true,outcome:'success',latencyMs:Date.now()-started});return id}
 catch(e){await recordUsage({purpose:'image',model,promptTokens:0,completionTokens:0,success:false,outcome:'failed',latencyMs:Date.now()-started,errorMessage:usageError(e)});throw e}
}
