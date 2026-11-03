import mongoose from 'mongoose'
const schema=new mongoose.Schema({purpose:{type:String,enum:['vision','copy','prompt','image','chat'],index:true},model:String,promptTokens:{type:Number,default:null,min:0},completionTokens:{type:Number,default:null,min:0},success:{type:Boolean,default:null},outcome:{type:String,enum:['success','failed','cancelled']},latencyMs:Number,errorMessage:String,demo:{type:Boolean,default:false}},{timestamps:true,bufferCommands:false})
schema.index({createdAt:1})
export default mongoose.model('TokenLog',schema)
