import mongoose from 'mongoose'

const assetSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  type: { type: String, enum: ['copy', 'image'], required: true },
  language: String,
  channel: String,
  content: String,
  imageUrl: String,
  prompt: String,
  taskId: String,
  status: { type: String, enum: ['pending', 'done', 'failed'], default: 'done' },
  reviewStatus: { type: String, enum: ['draft', 'approved'], default: 'draft' },
}, { timestamps: true })

export default mongoose.model('MarketingAsset', assetSchema)
