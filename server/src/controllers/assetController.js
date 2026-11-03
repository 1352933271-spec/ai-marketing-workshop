import mongoose from 'mongoose'
import MarketingAsset from '../models/MarketingAsset.js'
export async function listAssets(req, res, next) {
  try {
    const { productId, type } = req.query, filter = {}
    if (productId) {
      if (!mongoose.isObjectIdOrHexString(productId)) return res.status(400).json({ code:4001,message:'商品ID格式错误',data:null })
      filter.productId = productId
    }
    if (type) {
      if (!['copy','image'].includes(type)) return res.status(400).json({code:4001,message:'素材类型错误',data:null})
      filter.type=type
    }
    const data=await MarketingAsset.find(filter).sort({createdAt:-1,_id:-1}).limit(100).populate('productId','name')
    res.json({code:0,message:'ok',data})
  } catch(e){next(e)}
}
export async function removeAsset(req,res,next){
  try {
    if(!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({code:4001,message:'素材ID格式错误',data:null})
    const item=await MarketingAsset.findByIdAndDelete(req.params.id)
    if(!item)return res.status(404).json({code:4004,message:'素材不存在',data:null})
    res.json({code:0,message:'ok',data:null})
  }catch(e){next(e)}
}
