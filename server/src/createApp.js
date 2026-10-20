import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import { errorHandler, notFound } from './middlewares/errorHandler.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  const origins = (process.env.CORS_ORIGIN || 'http://localhost:5174').split(',').map((s) => s.trim())
  app.use(cors({ origin: origins }))
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true, limit: '2mb' }))
  app.use('/api', routes)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

