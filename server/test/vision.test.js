import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractJson, validateAnalysis, createVisionAnalyzer, toDataUrl } from '../src/services/visionService.js'
import { chatCompletion, LLMError } from '../src/services/llmClient.js'

const valid = {
  visual_elements: ['浅灰外观', '倾斜支撑结构', '平整底座'],
  core_selling_points: ['支撑结构便于桌面观看', '底座适合桌面摆放', '简洁外观便于搭配'],
  scene_suggestions: ['清晨在办公桌上展示商品', '午后在咖啡馆木桌上展示外观', '夜间在书桌灯光下展示结构'],
}

test('容错解析JSON、围栏、前后说明及字符串中的大括号', () => {
  for (const text of [JSON.stringify(valid), '```json\n' + JSON.stringify(valid) + '\n```', '分析如下：' + JSON.stringify(valid) + '结束']) {
    assert.deepEqual(validateAnalysis(extractJson(text)), valid)
  }
  assert.equal(extractJson('{"text":"含有}和{以及\\\"引号"}').text, '含有}和{以及"引号')
})
test('不可识别商品允许三个空数组', () => {
  assert.deepEqual(validateAnalysis({ visual_elements: [], core_selling_points: [], scene_suggestions: [] }), { visual_elements: [], core_selling_points: [], scene_suggestions: [] })
})
test('拒绝错字段、错类型、数量、长度、重复及部分空数组', () => {
  for (const value of [{ ...valid, extra: [] }, { ...valid, visual_elements: '红色' }, { ...valid, visual_elements: [4, 'a', 'b'] }, { ...valid, scene_suggestions: ['只有一条'] }, { ...valid, core_selling_points: [] }, { ...valid, visual_elements: ['重复', '重复', '不同'] }, { ...valid, visual_elements: ['长'.repeat(31), 'a', 'b'] }]) {
    assert.throws(() => validateAnalysis(value))
  }
  for (const text of ['无JSON', '{"broken":', 'null']) assert.throws(() => extractJson(text))
})
test('首轮格式失败后仅重试一次，只传前三张图', async () => {
  const calls = []
  const analyze = createVisionAnalyzer({ encode: async (p) => 'data:image/png;base64,' + p,
    complete: async (options) => { calls.push(options); return { content: calls.length === 1 ? '无JSON' : JSON.stringify(valid) } },
  })
  const result = await analyze({ name: '测试', images: ['a', 'b', 'c', 'd'] })
  assert.deepEqual(result, valid)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].messages[1].content.length, 4)
  assert.match(calls[1].messages[0].content, /上次输出未通过校验/)
})
test('两次格式失败明确报错，不无限调用', async () => {
  let count = 0
  const analyze = createVisionAnalyzer({ encode: async () => 'image', complete: async () => { count++; return { content: '{}' } } })
  await assert.rejects(analyze({ images: ['a'] }), (error) => error.code === 5002)
  assert.equal(count, 2)
})
test('鉴权/网络失败不自动重试；无图不调用', async () => {
  let count = 0
  const analyze = createVisionAnalyzer({ encode: async () => 'image', complete: async () => { count++; throw new LLMError('密钥无效') } })
  await assert.rejects(analyze({ images: ['a'] }), /密钥无效/)
  await assert.rejects(analyze({ images: [] }), /没有可识别图片/)
  assert.equal(count, 1)
})
test('图片路径不允许穿越和非UUID文件', async () => {
  for (const file of ['/uploads/../.env', '/tmp/image.jpg', '/uploads/a.png']) {
    await assert.rejects(toDataUrl(file), /路径无效/)
  }
})
test('统一客户端请求、Token未知、错误脱敏与超时', async () => {
  const original = process.env.DASHSCOPE_API_KEY
  process.env.DASHSCOPE_API_KEY = 'unit-test-placeholder'
  try {
    const success = await chatCompletion({ model: 'test', messages: [], fetchImpl: async (url, options) => {
      assert.match(url.pathname, /chat\/completions$/)
      assert.equal(options.redirect, 'error')
      return new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }))
    } })
    assert.equal(success.usage.promptTokens, null)
    await assert.rejects(chatCompletion({ messages: [], fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'unit-test-placeholder' } }), { status: 401 }) }), (error) => !error.message.includes('unit-test-placeholder') && /密钥无效/.test(error.message))
    await assert.rejects(chatCompletion({ messages: [], fetchImpl: async () => new Response('null') }), /有效文本/)
    await assert.rejects(chatCompletion({ messages: [], signal: AbortSignal.abort(), fetchImpl: async () => { throw new Error('unit-test-placeholder') } }), /超时/)
    delete process.env.DASHSCOPE_API_KEY
    await assert.rejects(chatCompletion({ messages: [] }), /未配置/)
  } finally {
    if (original === undefined) delete process.env.DASHSCOPE_API_KEY
    else process.env.DASHSCOPE_API_KEY = original
  }
})
