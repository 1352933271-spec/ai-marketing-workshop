import './config/env.js'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import Product from './models/Product.js'
import MarketingAsset from './models/MarketingAsset.js'

// 实际写入、读取、关联查询并删除本次创建的数据；不会清空已有集合。
let product
let asset
try {
  await connectDB()
  await Promise.all([Product.init(), MarketingAsset.init()])
  product = await Product.create({ name: '骨架验证测试商品', audience: '测试受众', category: 'phone_stand' })
  asset = await MarketingAsset.create({ productId: product._id, type: 'copy', language: 'en-US', channel: 'instagram', content: 'Connection check only.' })
  const found = await MarketingAsset.findById(asset._id).populate('productId')
  assert.equal(found.productId.name, '骨架验证测试商品')
  assert.ok(product.createdAt && asset.updatedAt)
  await assert.rejects(() => Product.create({ name: '' }), { name: 'ValidationError' })
  console.log('[check] Product、MarketingAsset 写入、读取、关联及时间戳验证通过')
  console.log('[check] 必填校验验证通过')
} catch (error) {
  console.error('[check] 验证失败：', error.name)
  process.exitCode = 1
} finally {
  if (asset) await MarketingAsset.deleteOne({ _id: asset._id })
  if (product) await Product.deleteOne({ _id: product._id })
  console.log('[check] 本次测试数据已清理')
  await mongoose.disconnect()
}
