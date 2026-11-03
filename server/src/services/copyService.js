import { chatCompletion } from './llmClient.js'
import { buildCopyMessages } from './promptBuilder.js'
import { findViolations, maskViolations } from '../middlewares/compliance.js'
import { checkCopyQuality } from './copyQuality.js'

export async function generateCopy(params, completion = chatCompletion) {
  const messages = buildCopyMessages(params)
  const options = { model: process.env.TEXT_MODEL || 'qwen-plus', messages, temperature: 0.3, purpose: 'copy' }
  let response = await completion(options)
  let issues = checkCopyQuality(response.content, params)
  if (issues.length) {
    const firstUsage = response.usage
    response = await completion({ ...options, temperature: 0.2, messages: [...messages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: `Revise this draft. Mandatory corrections:\n${issues.join('\n')}\nDo not add any other features. Return ONLY the corrected copy.` },
    ] })
    response.usage = Object.fromEntries(['promptTokens', 'completionTokens'].map(key => [key,
      Number.isInteger(firstUsage?.[key]) && Number.isInteger(response.usage?.[key]) ? firstUsage[key] + response.usage[key] : null]))
    issues = checkCopyQuality(response.content, params)
  }
  if (issues.length) throw Object.assign(new Error('文案未通过语言、结构或事实检查，请重新生成'), { name: 'LLMError', status: 502, code: 5002, expose: true })
  return { content: maskViolations(response.content), warnings: findViolations(response.content), usage: response.usage }
}
