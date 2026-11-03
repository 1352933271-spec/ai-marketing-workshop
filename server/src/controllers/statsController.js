import TokenLog from '../models/TokenLog.js'
export async function overview(req,res,next){
 try{
  const days=req.query.days===undefined?7:Number(req.query.days)
  if(!Number.isInteger(days)||days<1||days>30)return res.status(400).json({code:4001,message:'days必须为1至30的整数',data:null})
  const day=86400000,fmt=d=>d.toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'})
  const today=new Date(fmt(new Date())+'T00:00:00+08:00'),since=new Date(+today-(days-1)*day),until=new Date(+today+day)
  const filter={createdAt:{$gte:since,$lt:until},demo:{$ne:true}}
  const match={$match:filter}
  const [daily,outcomes,byPurpose,unknownUsageCalls,demoCount]=await Promise.all([
   TokenLog.aggregate([match,{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt',timezone:'Asia/Shanghai'}},promptTokens:{$sum:'$promptTokens'},completionTokens:{$sum:'$completionTokens'},calls:{$sum:1}}}]),
   TokenLog.aggregate([match,{$group:{_id:'$outcome',count:{$sum:1}}}]),
   TokenLog.aggregate([match,{$group:{_id:'$purpose',calls:{$sum:1},tokens:{$sum:{$add:[{$ifNull:['$promptTokens',0]},{$ifNull:['$completionTokens',0]}]}}}}]),
   TokenLog.countDocuments({...filter,$or:[{promptTokens:null},{completionTokens:null}]}),
   TokenLog.countDocuments({createdAt:{$gte:since,$lt:until},demo:true})])
  const map=Object.fromEntries(daily.map(d=>[d._id,d]));const series=Array.from({length:days},(_,i)=>{const date=fmt(new Date(+since+i*day));return {date,promptTokens:map[date]?.promptTokens||0,completionTokens:map[date]?.completionTokens||0,calls:map[date]?.calls||0}})
  const count=k=>outcomes.find(o=>o._id===k)?.count||0,success=count('success'),failed=count('failed'),cancelled=count('cancelled')
  res.json({code:0,message:'ok',data:{series,success,failed,cancelled,byPurpose,totalTokens:series.reduce((n,d)=>n+d.promptTokens+d.completionTokens,0),totalCalls:success+failed+cancelled,successRate:success+failed?+(100*success/(success+failed)).toFixed(1):0,unknownUsageCalls,hasDemo:false,excludedDemo:demoCount,timezone:'Asia/Shanghai',note:'仅统计启用审计后的真实调用；取消不计失败，成功率排除取消；Token为已知用量合计，非费用账单。'}})
 }catch(e){next(e)}
}
