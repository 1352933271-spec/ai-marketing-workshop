import mongoose from 'mongoose'
import Product from '../models/Product.js'
import { generateCopy } from '../services/copyService.js'

export async function generate(req, res, next) {
  try {
    const { productId, language, channel, extra = '' } = req.body || {}
    if (!mongoose.isObjectIdOrHexString(productId)) return res.status(400).json({ code: 4001, message: '商品ID格式错误', data: null })
    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ code: 4004, message: '商品不存在', data: null })
    if (!product.aiAnalysis?.core_selling_points?.length) return res.status(400).json({ code: 4001, message: '请先对该商品执行“AI 一键识别”', data: null })
    const data = await generateCopy({ product, language, channel, extra })
    res.json({ code: 0, message: 'ok', data })
  } catch (error) { next(error) }
}

import MarketingAsset from '../models/MarketingAsset.js'
import { streamChat } from '../services/llmClient.js'
import { buildCopyMessages } from '../services/promptBuilder.js'
import { checkCopyQuality } from '../services/copyQuality.js'
import { findViolations, maskViolations } from '../middlewares/compliance.js'

export function makeStream({ complete = streamChat } = {}) {
  return async function stream(req, res, next) {
    const { productId, language, channel, extra = '' } = req.body || {}
    let product, messages
    try {
      if (!mongoose.isObjectIdOrHexString(productId)) return res.status(400).json({ code: 4001, message: '商品ID格式错误', data: null })
      product = await Product.findById(productId)
      if (!product) return res.status(404).json({ code: 4004, message: '商品不存在', data: null })
      if (!product.aiAnalysis?.core_selling_points?.length) return res.status(400).json({ code: 4001, message: '请先识别商品', data: null })
      messages = buildCopyMessages({ product, language, channel, extra })
    } catch (e) { return next(e) }
    res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
    res.flushHeaders()
    const upstream = new AbortController()
    let gone = false, full = '', usage = null
    const send = (event, data) => { if (!gone) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) }
    const close = () => { if (!res.writableEnded) { gone = true; upstream.abort(); console.log('[copy-stream] client closed; upstream aborted') } }
    res.on('close', close)
    const heartbeat = setInterval(() => { if (!gone) res.write(': heartbeat\n\n') }, 15000)
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        full = ''
        let attemptUsage = null
        for await (const ev of complete({ model: process.env.TEXT_MODEL || 'qwen-plus', messages, purpose: 'copy', signal: upstream.signal })) {
          if (gone) break
          if (ev.type === 'delta') {
            full += ev.text
            if (full.length > 100000) throw Error('文案超过长度限制')
            send('delta', { text: ev.text })
          } else if (ev.type === 'usage') {
            attemptUsage = ev.usage
          }
        }
        usage = attempt === 0 ? (attemptUsage || {promptTokens:null,completionTokens:null}) : Object.fromEntries(['promptTokens','completionTokens'].map(k => [k, Number.isInteger(usage?.[k]) && Number.isInteger(attemptUsage?.[k]) ? usage[k]+attemptUsage[k] : null]))
        if (gone) return
        if (!full.trim()) throw Error('模型没有返回文案')
        const issues = checkCopyQuality(full, { language, channel, product })
        if (!issues.length) break
        if (attempt === 1) throw Error('文案未通过语言、结构或事实检查，本次草稿未保存，请重新生成')
        messages = [...messages, {role:'assistant',content:full}, {role:'user',content:'Revise this draft. Mandatory corrections:\n'+issues.join('\n')+'\nReturn ONLY corrected copy.'}]
        send('delta', {text:'',reset:true})
      }
      const warnings = findViolations(full), content = maskViolations(full)
      const asset = await MarketingAsset.create({ productId, type: 'copy', language, channel, content, status: 'done' })
      send('done', { assetId: asset._id, content, warnings, usage })
    } catch (e) {
      if (!gone) send('error', { message: e.expose || ['文案超过长度限制','模型没有返回文案','文案未通过语言、结构或事实检查，本次草稿未保存，请重新生成'].includes(e.message) ? e.message : '生成或保存失败，请重试' })
    } finally {
      clearInterval(heartbeat)
      res.off('close', close)
      upstream.abort()
      res.end()
    }
  }
}
export const stream = makeStream()


