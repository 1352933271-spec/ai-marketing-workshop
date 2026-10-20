import './config/env.js'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import { createApp } from './createApp.js'

let server
try {
  const port = Number(process.env.PORT || 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT必须为有效端口')
  await connectDB()
  server = createApp().listen(port, '127.0.0.1', () => console.log(`[server] http://localhost:${port}`))
  server.on('error', async (error) => {
    console.error('[启动失败]', error.code || error.name)
    await mongoose.disconnect()
    process.exitCode = 1
  })
} catch (error) {
  // 不打印包含数据库连接串、密码等内容的错误对象。
  console.error('[启动失败]', error.name, '请检查环境变量、端口和 MongoDB 服务')
  await mongoose.disconnect()
  process.exitCode = 1
}

async function shutdown() {
  if (server) await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
