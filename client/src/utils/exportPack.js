import JSZip from 'jszip'
import {saveAs} from 'file-saver'
import {fetchAssets} from '../api/asset.js'
export const safeName=value=>String(value||'商品').replace(/[\\/:*?"<>|\x00-\x1f.]/g,'_').trim().slice(0,60)||'商品'
export async function buildPack(product){
 const all=(await fetchAssets({productId:product._id})).data
 if(all.length>=100)throw Error('素材达到100条，当前导出可能被截断，请先整理素材')
 const assets=all.filter(a=>a.status==='done'),images=assets.filter(a=>a.type==='image'),copies=assets.filter(a=>a.type==='copy')
 if(!images.length&&!copies.length)throw Error('该商品还没有可导出的素材')
 const zip=new JSZip(),root=safeName(product.name)+'-营销包',folder=zip.folder(root);let size=0
 for(let i=0;i<images.length;i++){
  if(!/^\/uploads\/generated\/[0-9a-f-]{36}\.png$/.test(images[i].imageUrl||''))throw Error('图片本地路径不合法')
  const response=await fetch((import.meta.env.VITE_API_BASE??'')+images[i].imageUrl)
  if(!response.ok)throw Error('图片下载失败，未导出不完整营销包')
  const blob=await response.blob();size+=blob.size
  if(!blob.size||blob.size>15*1024*1024||size>100*1024*1024)throw Error('图片为空或超过导出大小限制')
  folder.file(`images/scene-${i+1}.png`,blob)
 }
 copies.forEach((a,i)=>folder.file(`copy/${safeName(a.channel)}-${safeName(a.language)}-${i+1}.txt`,a.content||''))
 folder.file('README.txt',`商品：${product.name}\n导出时间：${new Date().toISOString()}\n场景图：${images.length} 张\n文案：${copies.length} 条\nAI内容为待审核草稿；场景概念图不能作为商品实拍或性能证明。\n`)
 return {blob:await zip.generateAsync({type:'blob',compression:'DEFLATE'}),name:root+'.zip',images:images.length,copies:copies.length}
}
export async function exportPack(product){const pack=await buildPack(product);saveAs(pack.blob,pack.name);return pack}
