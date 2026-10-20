import { saveProduct, getProducts } from '../services/productService.js'

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
