import mongoose from 'mongoose'
import Product from '../models/Product.js'
import MarketingAsset from '../models/MarketingAsset.js'
import {expandImagePrompt} from '../services/imagePromptService.js'
import {createImageTask,queryImageTask,downloadImage} from '../services/imageService.js'
const polling=new Map(), previews=new Set()
const invalid=message=>Object.assign(new Error(message),{status:400,code:4001})
const valid=id=>mongoose.isObjectIdOrHexString(id)
export function makeImageControllers({expand=expandImagePrompt,create=createImageTask,query=queryImageTask,download=downloadImage,now=Date.now}={}){
 async function preview(req,res,next){
  let lock, ownsLock=false
  try{
   const {productId,sceneIndex=0}=req.body||{}
   if(!valid(productId)||!Number.isInteger(sceneIndex)||sceneIndex<0||sceneIndex>2)throw invalid('商品ID或场景序号不合法')
   lock=productId.toLowerCase();if(previews.has(lock))return res.status(409).json({code:4009,message:'该商品正在扩写提示词',data:null})
   previews.add(lock);ownsLock=true
   const product=await Product.findById(productId)
   if(!product)return res.status(404).json({code:4004,message:'商品不存在',data:null})
   const scene=product.aiAnalysis?.scene_suggestions?.[sceneIndex]
   if(!scene)throw invalid('该商品没有场景建议，请先识别')
   const prompt=await expand({product,scene})
   const asset=await MarketingAsset.create({productId,type:'image',prompt,scene,sceneIndex,status:'pending',imageStage:'preview'})
   res.json({code:0,message:'ok',data:{previewId:asset._id,prompt,scene}})
  }catch(e){next(e)}finally{if(ownsLock)previews.delete(lock)}
 }
 async function generate(req,res,next){
  try{
   const {previewId}=req.body||{}
   if(!valid(previewId))throw invalid('请先扩写并检查英文提示词')
   const asset=await MarketingAsset.findOneAndUpdate({_id:previewId,type:'image',status:'pending',imageStage:'preview'},{$set:{imageStage:'submitting',submittedAt:new Date(now())}},{returnDocument:'after'})
   if(!asset)return res.status(409).json({code:4009,message:'预览不存在或已经提交，请勿重复生成',data:null})
   try{
    asset.taskId=await create(asset.prompt);asset.imageStage='submitted';await asset.save()
   }catch(e){asset.status='failed';asset.imageStage='failed';asset.failureReason=e.expose?e.message:'任务提交异常，请检查控制台，勿重复下单';await asset.save();throw e}
   res.status(202).json({code:0,message:'ok',data:{assetId:asset._id,prompt:asset.prompt,scene:asset.scene}})
  }catch(e){next(e)}
 }
 async function update(assetId){
  const asset=await MarketingAsset.findOne({_id:assetId,type:'image'})
  if(!asset)return null
  if(asset.status!=='pending'||asset.imageStage==='preview')return asset
  if(now()-new Date(asset.submittedAt||asset.createdAt).getTime()>300000){asset.status='failed';asset.imageStage='failed';asset.failureReason='生成超时，请检查控制台任务，勿立即重复下单';await asset.save();return asset}
  if(!asset.taskId)return asset
  const task=await query(asset.taskId)
  if(task.status==='SUCCEEDED'){
   if(!asset.imageUrl)asset.imageUrl=await download(task.url)
   asset.status='done';asset.imageStage='complete';await asset.save()
  }else if(['FAILED','CANCELED','UNKNOWN'].includes(task.status)){
   asset.status='failed';asset.imageStage='failed';asset.failureReason='生图任务失败（'+String(task.code||task.status).replace(/[^a-z0-9_.-]/gi,'').slice(0,70)+'）';await asset.save()
  }else if(!['PENDING','RUNNING'].includes(task.status))throw Error('上游任务状态异常')
  return asset
 }
 async function taskStatus(req,res,next){
  try{
   const id=req.params.assetId
   if(!valid(id))throw invalid('任务ID格式不合法')
   if(!polling.has(id))polling.set(id,update(id).finally(()=>polling.delete(id)))
   const asset=await polling.get(id)
   if(!asset)return res.status(404).json({code:4004,message:'图片任务不存在',data:null})
   res.set('Cache-Control','no-store').json({code:0,message:'ok',data:{status:asset.status,stage:asset.imageStage,imageUrl:asset.imageUrl,message:asset.failureReason||'',prompt:asset.prompt,scene:asset.scene}})
  }catch(e){next(e)}
 }
 return {preview,generate,taskStatus}
}
export const {preview,generate,taskStatus}=makeImageControllers()


