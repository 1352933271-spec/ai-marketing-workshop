import '../src/config/env.js'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import Product from '../src/models/Product.js'
import { chatCompletion } from '../src/services/llmClient.js'
import { toDataUrl, extractJson, validateAnalysis, VISION_SYSTEM_PROMPT } from '../src/services/visionService.js'

const directory = fileURLToPath(new URL('../../docs/验收记录/', import.meta.url))
await mkdir(directory, { recursive: true })
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
  const product = await Product.findOne({ name: '折叠手机支架（示例）' }).lean()
  if (!product) throw new Error('请先上传清晰商品图')
  const images = await Promise.all(product.images.slice(0, 3).map(async (image) => ({ type: 'image_url', image_url: { url: await toDataUrl(image) } })))
  // 保留已实测v2的原提示词，避免最终Prompt更新后把不同版本混为一谈。
  let archived = []
  try { archived = JSON.parse(await readFile(directory + '作业4-Prompt调优实测.json', 'utf8')) } catch {}
  let versions = [
    ['v0', '你是跨境电商商品分析助手。请观察商品图片，分析外观特征、核心卖点和海外展示场景。不要编造参数。'],
    ['v1', '观察商品图片并用中文回答。只输出合法JSON，不要Markdown围栏或解释，只能有visual_elements、core_selling_points、scene_suggestions三个字符串数组。外观3到6条，卖点3到5条，场景恰好3条，每条不超过30字。不能编造参数。无法识别商品时三个数组均为空。'],
    ['v2', archived.find((record) => record.version === 'v2')?.prompt || VISION_SYSTEM_PROMPT],
    ['v3', VISION_SYSTEM_PROMPT],
  ]
  let records = []
  if (process.argv.includes('--final-only')) {
    records = archived.filter((record) => record.version !== 'v3')
    versions = [['v3', VISION_SYSTEM_PROMPT]]
  }
  for (const [version, prompt] of versions) {
    const started = Date.now()
    const response = await chatCompletion({ model: process.env.VISION_MODEL, purpose: 'vision', temperature: 0.2,
      messages: [{ role: 'system', content: prompt }, { role: 'user', content: [...images, { type: 'text', text: JSON.stringify({ name: product.name, category: product.category, audience: product.audience }) }] }],
    })
    if (response.content.includes(process.env.DASHSCOPE_API_KEY)) throw new Error('密钥检查不通过，停止记录')
    const record = { version, verifiedAt: new Date().toISOString(), productId: String(product._id), productName: product.name,
      prompt, model: response.model, purpose: response.purpose, usage: response.usage,
      latencyMs: Date.now() - started, rawContent: response.content, schemaPassed: false,
    }
    try { record.analysis = validateAnalysis(extractJson(response.content)); record.schemaPassed = true }
    catch (error) { record.validationIssue = error.message }
    records.push(record)
    await writeFile(directory + '作业4-Prompt调优实测.json', JSON.stringify(records, null, 2) + '\n', 'utf8')
    console.log(JSON.stringify({ version, model: response.model, latencyMs: record.latencyMs, schemaPassed: record.schemaPassed, usage: record.usage }))
  }
} catch (error) {
  console.error('调优实测未完成：', error.name === 'LLMError' ? error.message : error.name)
  process.exitCode = 1
} finally { await mongoose.disconnect() }
