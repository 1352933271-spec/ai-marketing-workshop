import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { rename } from 'node:fs/promises'
import sharp from 'sharp'
import Product from '../models/Product.js'
import { ALLOWED, UPLOAD_DIR, STAGING_DIR, cleanupFiles, inputError } from '../middlewares/upload.js'

export async function saveProduct(body = {}, files = []) {
  const generated = []
  try {
    const values = {}
    const limits = { name: 100, audience: 200, category: 60 }
    for (const key of Object.keys(body)) {
      if (!Object.hasOwn(limits, key)) throw inputError('不支持的表单字段：' + key)
    }
    for (const [key, max] of Object.entries(limits)) {
      if (body[key] !== undefined && typeof body[key] !== 'string') throw inputError('表单字段必须为文本')
      values[key] = (body[key] || '').trim()
      if (values[key].length > max) throw inputError(`${key} 最多 ${max} 个字符`)
    }
    if (!values.name) throw inputError('商品名称不能为空')
    if (!files.length) throw inputError('请至少上传一张图片')
    const images = []
    for (const file of files) {
      const input = sharp(file.path, { limitInputPixels: 25000000, failOn: 'warning' })
      let metadata
      try { metadata = await input.metadata() }
      catch { throw inputError('文件不是有效图片，或图片已损坏', 4002) }
      if (metadata.format !== ALLOWED[file.mimetype] || (metadata.pages || 1) > 1) {
        throw inputError('图片真实格式与声明不符，或为不支持的多帧图片', 4002)
      }
      const extension = metadata.format === 'jpeg' ? 'jpg' : metadata.format
      const filename = randomUUID() + '.' + extension
      const staged = path.join(STAGING_DIR, filename)
      const destination = path.join(UPLOAD_DIR, filename)
      generated.push(staged, destination)
      try {
        // 完整解码再编码：验证实际像素，清除附加数据和元信息。
        await input.rotate().toFormat(metadata.format).toFile(staged)
      } catch { throw inputError('图片解码失败或尺寸超过限制（最多2500万像素）', 4002) }
      await rename(staged, destination)
      images.push('/uploads/' + filename)
    }
    const product = await Product.create({ ...values, images })
    return product
  } catch (error) {
    await cleanupFiles(generated)
    throw error
  } finally {
    await cleanupFiles(files)
  }
}

export async function getProducts(query) {
  const integer = (value, fallback, max) => {
    if (value === undefined) return fallback
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw inputError('分页参数必须为正整数')
    const number = Number(value)
    if (!Number.isSafeInteger(number) || number > max) throw inputError('分页参数超出范围')
    return number
  }
  const page = integer(query.page, 1, 1000000)
  const size = integer(query.size, 20, 50)
  const [list, total] = await Promise.all([
    Product.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * size).limit(size).lean(),
    Product.countDocuments(),
  ])
  return { list, total, page, size }
}
