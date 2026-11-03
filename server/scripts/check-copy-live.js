import '../src/config/env.js'
import mongoose from 'mongoose'
import { writeFile } from 'node:fs/promises'
import Product from '../src/models/Product.js'
import { generateCopy } from '../src/services/copyService.js'
import { chatCompletion } from '../src/services/llmClient.js'
import { checkCopyQuality } from '../src/services/copyQuality.js'
await mongoose.connect(process.env.MONGO_URI)
try {
  const product = await Product.findById('6ad77302e9fde4e38d252ee0')
  const params = { product, language: 'en', channel: process.argv[2] || 'amazon' }
  const drafts = []
  try {
    await generateCopy(params, async options => {
      const response = await chatCompletion(options)
      drafts.push({ ...response, issues: checkCopyQuality(response.content, params) })
      return response
    })
  } finally {
    await writeFile(new URL('../../../marketing-hw4/copy-diagnostics.json', import.meta.url), JSON.stringify(drafts, null, 2))
    console.log(JSON.stringify(drafts.map(d => ({ model: d.model, issues: d.issues, content: d.content }))))
  }
} finally { await mongoose.disconnect() }
