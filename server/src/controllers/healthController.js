import mongoose from 'mongoose'

export function health(req, res) {
  const connected = mongoose.connection.readyState === 1
  res.status(connected ? 200 : 503).json({
    code: connected ? 0 : 5001,
    message: connected ? 'ok' : '数据库未连接',
    data: {
      status: connected ? 'up' : 'degraded',
      db: connected ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    },
  })
}
