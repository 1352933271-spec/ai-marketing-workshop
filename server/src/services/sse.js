// 增量解码UTF-8，并按空行读取SSE，不能假定网络块与事件对齐。
export async function* readSSE(body) {
  const decoder = new TextDecoder()
  let buffer = ''
  function parse(block) {
    let event = 'message'; const data = []
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
    }
    return data.length ? { event, data: data.join('\n') } : null
  }
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    if (buffer.length > 1000000) throw new Error('SSE事件过大')
    let match
    while ((match = /\r?\n\r?\n/.exec(buffer))) {
      const block = buffer.slice(0, match.index)
      buffer = buffer.slice(match.index + match[0].length)
      const value = parse(block); if (value) yield value
    }
  }
  buffer += decoder.decode()
  if (buffer.trim()) throw new Error('SSE事件不完整')
}
