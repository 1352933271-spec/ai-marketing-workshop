import { Router } from 'express'
import { generate, stream } from '../controllers/copyController.js'
import { inputGuard } from '../middlewares/compliance.js'
import { health } from '../controllers/healthController.js'
import { uploadImages } from '../middlewares/upload.js'
import { createProduct, listProducts, analyze } from '../controllers/productController.js'

import { listAssets, removeAsset } from '../controllers/assetController.js'
import { preview as previewImage, generate as generateImage, taskStatus } from '../controllers/imageController.js'
import { overview } from '../controllers/statsController.js'
const router = Router()
router.get('/stats/overview', overview)
router.post('/images/preview', previewImage)
router.post('/images/generate', generateImage)
router.get('/images/tasks/:assetId', taskStatus)
router.post('/copy/stream', inputGuard(), stream)
router.get('/assets', listAssets)
router.delete('/assets/:id', removeAsset)
router.post('/copy/generate', inputGuard(), generate)
router.get('/health', health)
router.post('/products', uploadImages, createProduct)
router.get('/products', listProducts)
router.post('/products/:id/analyze', analyze)
export default router



