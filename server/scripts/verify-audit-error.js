import '../src/config/env.js'
import mongoose from 'mongoose'
import {chatCompletion} from '../src/services/llmClient.js'
try{
 await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:8000})
 try{await chatCompletion({model:'course-audit-missing-model',purpose:'chat',messages:[{role:'user',content:'Audit error-path check'}],timeoutMs:20000})}catch(e){console.log('已验证真实失败调用审计：',e.code||e.name)}
}finally{await mongoose.disconnect()}
