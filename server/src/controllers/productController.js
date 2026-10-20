import { saveProduct, getProducts } from '../services/productService.js'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import { analyzeProduct } from '../services/visionService.js'

const inFlight = new Set()

export async function analyze(req, res, next) {
  const id = req.params.id.toLowerCase()
  if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ code: 4001, message: '商品ID格式错误', data: null })
  if (inFlight.has(id)) return res.status(409).json({ code: 4009, message: '该商品正在识别，请勿重复提交', data: null })
  inFlight.add(id)
  try {
    const product = await Product.findById(id)
    if (!product) return res.status(404).json({ code: 4004, message: '商品不存在', data: null })
    const result = await analyzeProduct(product)
    product.aiAnalysis = { ...result, analyzedAt: new Date(), reviewStatus: 'draft', version: (product.aiAnalysis?.version || 0) + 1 }
    await product.save()
    res.json({ code: 0, message: 'ok', data: product.aiAnalysis })
  } catch (error) { next(error) }
  finally { inFlight.delete(id) }
}

export async function createProduct(req, res, next) {
  try {
    const product = await saveProduct(req.body, req.files)
    res.status(201).json({ code: 0, message: 'ok', data: product })
  } catch (error) { next(error) }
}

export async function listProducts(req, res, next) {
  try {
    res.json({ code: 0, message: 'ok', data: await getProducts(req.query) })
  } catch (error) { next(error) }
}
