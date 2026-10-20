import mongoose from 'mongoose'

export async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error('缺少 MONGO_URI 环境变量，请复制 .env.example 为 .env')
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
  console.log('[db] MongoDB 已连接')
}
