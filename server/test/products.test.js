import '../src/config/env.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import sharp from 'sharp'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { createApp } from '../src/createApp.js'
import Product from '../src/models/Product.js'
import { UPLOAD_DIR, STAGING_DIR, cleanupFiles } from '../src/middlewares/upload.js'

test('资产中心真实MongoDB及HTTP集成验证', async (t) => {
  const database = 'aimarketing_test_' + randomUUID().replaceAll('-', '')
  await mongoose.connect(process.env.MONGO_URI, { dbName: database, serverSelectionTimeoutMS: 8000 })
  const server = createApp().listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const png = await sharp({ create: { width: 64, height: 80, channels: 3, background: '#16765d' } }).png().toBuffer()
  const savedPaths = []
  const stagingBefore = (await readdir(STAGING_DIR)).sort()
  const form = ({ count = 2, name = '测试商品', bytes = png, type = 'image/png', field = 'images' } = {}) => {
    const data = new FormData()
    data.append('name', name)
    data.append('audience', '欧美年轻人')
    data.append('category', '3C 配件')
    for (let i = 0; i < count; i++) data.append(field, new Blob([bytes], { type }), '../untrusted-name.php')
    return data
  }
  const post = async (data) => {
    const response = await fetch(base + '/api/products', { method: 'POST', body: data })
    const body = await response.json()
    if (body.code === 0) savedPaths.push(...body.data.images.map((image) => path.join(UPLOAD_DIR, path.basename(image))))
    return { response, body }
  }
  try {
    let id
    await t.test('两图上传、随机安全文件名、实际图片可访问', async () => {
      const { response, body } = await post(form())
      assert.equal(response.status, 201)
      assert.equal(body.code, 0)
      id = body.data._id
      assert.equal(body.data.images.length, 2)
      assert.ok(body.data.createdAt)
      assert.notEqual(body.data.images[0], body.data.images[1])
      for (const image of body.data.images) {
        assert.match(image, /^\/uploads\/[0-9a-f-]{36}\.png$/)
        const result = await fetch(base + image)
        assert.equal(result.status, 200)
        assert.equal(result.headers.get('x-content-type-options'), 'nosniff')
        const decoded = await sharp(Buffer.from(await result.arrayBuffer())).metadata()
        assert.equal(decoded.width, 64)
      }
    })
    await t.test('刷新列表及数据库持久化', async () => {
      const body = await (await fetch(base + '/api/products?page=1&size=1')).json()
      assert.equal(body.data.list[0]._id, id)
      assert.equal(body.data.total, 1)
      assert.equal((await Product.findById(id)).images.length, 2)
      const empty = await (await fetch(base + '/api/products?page=2&size=1')).json()
      assert.equal(empty.data.list.length, 0)
      assert.equal(empty.data.total, 1)
    })
    for (const [label, options, code] of [
      ['绕过前端上传GIF', { type: 'image/gif', bytes: Buffer.from('GIF89a') }, 4002],
      ['伪造PNG内容', { bytes: Buffer.from('%PDF-not-an-image') }, 4002],
      ['真实格式与声明不符', { type: 'image/jpeg' }, 4002],
      ['损坏PNG像素', { bytes: png.subarray(0, 42) }, 4002],
      ['单图超5MB', { bytes: Buffer.alloc(5 * 1024 * 1024 + 1) }, 4003],
      ['超过5张', { count: 6 }, 4001],
      ['错误文件字段', { field: 'image' }, 4001],
      ['缺少名称', { name: '   ' }, 4001],
      ['缺少图片', { count: 0 }, 4001],
    ]) {
      await t.test(label, async () => {
        const { response, body } = await post(form(options))
        assert.equal(response.status, 400)
        assert.equal(body.code, code)
        assert.equal(body.data, null)
        assert.equal(await Product.countDocuments(), 1)
        assert.deepEqual((await readdir(STAGING_DIR)).sort(), stagingBefore)
      })
    }
    await t.test('恰好5张及恰好5MB边界可上传', async () => {
      const five = await post(form({ count: 5 }))
      assert.equal(five.body.data.images.length, 5)
      const boundary = Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024 - png.length)])
      const exact = await post(form({ count: 1, bytes: boundary }))
      assert.equal(exact.response.status, 201)
    })
    await t.test('分页拒绝非法值而非执行无界查询', async () => {
      for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=abc', 'size=0', 'size=51', 'size=-1']) {
        const response = await fetch(base + '/api/products?' + query)
        assert.equal(response.status, 400)
      }
    })
    await t.test('暂存文件及路径穿越不能公开访问', async () => {
      for (const endpoint of ['/uploads/.gitkeep', '/uploads/.staging/unknown.upload', '/uploads/%2e%2e/.env']) {
        assert.equal((await fetch(base + endpoint)).status, 404)
      }
    })
    await t.test('数据库写入失败时回滚本次生成文件', async () => {
      const before = (await readdir(UPLOAD_DIR)).sort()
      const original = Product.create
      Product.create = async () => { throw new Error('simulated database failure') }
      try {
        const result = await post(form())
        assert.equal(result.response.status, 500)
        assert.deepEqual((await readdir(UPLOAD_DIR)).sort(), before)
        assert.deepEqual((await readdir(STAGING_DIR)).sort(), stagingBefore)
      } finally { Product.create = original }
    })
  } finally {
    await cleanupFiles(savedPaths)
    // 仅清理本测试随机创建的数据库，绝不操作aimarketing业务库。
    assert.equal(mongoose.connection.name, database)
    assert.match(database, /^aimarketing_test_[a-f0-9]{32}$/)
    await mongoose.connection.dropDatabase()
    await new Promise((resolve) => server.close(resolve))
    await mongoose.disconnect()
  }
})
