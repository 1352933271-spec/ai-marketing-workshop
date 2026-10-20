import mongoose from 'mongoose'

const analysisSchema = new mongoose.Schema({
  visual_elements: [String],
  core_selling_points: [String],
  scene_suggestions: [String],
  uncertain_fields: [String],
  analyzedAt: Date,
  reviewStatus: { type: String, enum: ['draft', 'approved'], default: 'draft' },
  version: { type: Number, default: 1, min: 1 },
}, { _id: false })

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  audience: { type: String, default: '', maxlength: 200 },
  category: { type: String, default: '' },
  images: [{ type: String }],
  verifiedFacts: {
    material: String,
    dimensions: String,
    loadCapacity: String,
  },
  aiAnalysis: { type: analysisSchema, default: undefined },
}, { timestamps: true })

export default mongoose.model('Product', productSchema)
