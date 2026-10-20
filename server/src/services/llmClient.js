export class LLMError extends Error {
  constructor(message, status = 502, code = 5002) {
    super(message)
    this.name = 'LLMError'
    this.status = status
    this.code = code
    this.expose = true
  }
}

// 非流式统一入口；purpose保留用途，usage保留真实统计，未知值不填0。
export async function chatCompletion({ model, messages, temperature = 0.2,
  purpose = 'chat', timeoutMs = 45000, signal, fetchImpl = fetch }) {
  const key = process.env.DASHSCOPE_API_KEY?.trim()
  if (!key) throw new LLMError('服务器未配置百炼 API Key，请先填写 server/.env', 503)
  const base = (process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '')
  let url
  try {
    url = new URL(base + '/chat/completions')
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error()
  } catch { throw new LLMError('模型接口地址配置无效，请检查 LLM_BASE_URL', 503) }
  const deadline = AbortSignal.timeout(timeoutMs)
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline
  let response, data
  try {
    response = await fetchImpl(url, {
      method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature, max_tokens: 2048 }),
      signal: combined,
    })
    data = await response.json()
  } catch {
    throw new LLMError(combined.aborted ? '模型请求超时，请稍后重试' : '无法连接模型服务或返回内容异常，请检查网络及接口配置')
  }
  // 不转发上游原始报错：可能含Key、请求片段或内部细节。
  if (!response.ok) {
    const messagesByStatus = {
      401: '百炼密钥无效，请检查本地配置及所属地域',
      403: '没有模型访问权限，请检查开通状态及余额',
      404: '模型或接口不存在，请检查模型名称及地域',
      429: '请求受限或额度不足，请检查控制台后稍后重试',
      400: '模型不接受当前请求，请检查模型是否支持图片输入',
    }
    throw new LLMError(messagesByStatus[response.status] || '模型服务暂时不可用，请稍后重试')
  }
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new LLMError('模型未返回有效文本，请重试')
  const token = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null
  return {
    content, purpose, model: data.model || model,
    usage: { promptTokens: token(data.usage?.prompt_tokens), completionTokens: token(data.usage?.completion_tokens) },
  }
}
