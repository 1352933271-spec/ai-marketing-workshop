import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findViolations, maskViolations } from '../src/middlewares/compliance.js'
import { buildCopyMessages } from '../src/services/promptBuilder.js'
import { generateCopy } from '../src/services/copyService.js'
import { createApp } from '../src/createApp.js'
import { checkCopyQuality } from '../src/services/copyQuality.js'

const product = { name: '桌面支架', aiAnalysis: { core_selling_points: ['倾斜支撑'], uncertain_fields: ['材质'] } }
const tags = '\n#desk #stand #phone #home #office #study #style #work #view #simple'
test('重复调用仍命中、多语言及全角字符遮蔽，正常单词不误报', () => {
  for (let i = 0; i < 3; i++) {
    const text = '最好 No.1 １００％ guaranteed 全网最低 unbeatable 世界一 garantizado'
    assert.equal(findViolations(text).length, 9)
    assert.equal(findViolations(maskViolations(text)).length, 0)
  }
  assert.deepEqual(findViolations('A desktop stand for your everyday routine. customer'), [])
})
test('九种组合都包含事实边界、语言和格式，拒绝原型键及未知参数', () => {
  for (const language of ['en', 'ja', 'es']) for (const channel of ['amazon', 'tiktok', 'instagram']) {
    const messages = buildCopyMessages({ product, language, channel })
    assert.match(messages[0].content, /Never invent/)
    assert.deepEqual(JSON.parse(messages[1].content).sellingPoints, ['倾斜支撑'])
  }
  for (const language of ['zh', '__proto__', 'constructor']) assert.throws(() => buildCopyMessages({ product, language, channel: 'amazon' }), /不支持/)
})
test('服务遮蔽输出并保留警告及真实用量，不吞掉模型失败', async () => {
  const params = { product, language: 'en', channel: 'instagram' }
  const data = await generateCopy(params, async () => ({ content: 'A guaranteed miracle' + tags, usage: { promptTokens: 12 } }))
  assert.equal(data.content, 'A ********** *******' + tags)
  assert.deepEqual(data.warnings, ['guaranteed', 'miracle'])
  assert.equal(data.usage.promptTokens, 12)
  await assert.rejects(generateCopy(params, async () => { throw new Error('upstream unavailable') }), /upstream/)
})
test('HTTP输入拦截先于查库执行，拒绝非字符串及错误ID', async () => {
  const server = createApp().listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/copy/generate`
    for (const [body, code] of [[{ extra: '要写成全球最好的产品' }, 4003], [{ extra: {} }, 4001], [{ productId: 'invalid' }, 4001]]) {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      assert.equal(response.status, 400)
      assert.equal((await response.json()).code, code)
    }
  } finally { await new Promise(resolve => server.close(resolve)) }
})
test('语言、结构与明显虚构功能检查失败仅重写一次，用量累加', async () => {
  assert.ok(checkCopyQuality('foldable 支架', { product, language: 'en', channel: 'amazon' }).length >= 3)
  let calls = 0
  const result = await generateCopy({ product, language: 'en', channel: 'instagram' }, async () => {
    calls++
    return { content: (calls === 1 ? 'A foldable stand' : 'An angled stand for your desk') + tags, usage: { promptTokens: 10, completionTokens: 5 } }
  })
  assert.equal(calls, 2)
  assert.equal(result.usage.promptTokens, 20)
  calls = 0
  await assert.rejects(generateCopy({ product, language: 'en', channel: 'instagram' }, async () => {
    calls++; return { content: 'An ergonomic foldable stand' }
  }), /未通过/)
  assert.equal(calls, 2)
})
