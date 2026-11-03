import mongoose from 'mongoose'
import TokenLog from '../models/TokenLog.js'
export async function recordUsage(data){
 if(mongoose.connection.readyState!==1)return
 try{await TokenLog.create({...data,purpose:['vision','copy','prompt','image','chat'].includes(data.purpose)?data.purpose:'chat'})}catch{console.warn('[token-log] 审计写入失败，主业务继续')}
}
export function usageError(error){return error?.code===5002?'模型调用失败':'调用未完成或内部异常'}
