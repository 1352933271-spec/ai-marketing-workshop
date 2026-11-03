<script setup>
import {ref,computed,onMounted,onBeforeUnmount,watch,nextTick} from 'vue'
import {useProductStore} from '../stores/product.js'
import {previewImage,generateImage,getImageTask} from '../api/image.js'
import {fetchAssets} from '../api/asset.js'
import {imageUrl} from '../api/product.js'
const store=useProductStore(),productId=ref(''),sceneIndex=ref(0),expanding=ref(false),generating=ref(false),current=ref(null),gallery=ref([]),error=ref(''),notice=ref('')
const ready=computed(()=>store.list.filter(p=>p.aiAnalysis?.scene_suggestions?.length)),product=computed(()=>store.list.find(p=>p._id===productId.value))
let timer=null,disposed=false,epoch=0
function clearPoll(){clearTimeout(timer);timer=null;epoch++}
async function loadGallery(){try{gallery.value=(await fetchAssets({type:'image'})).data.filter(a=>a.imageStage!=='preview')}catch(e){error.value=e.message}}
async function poll(id,started=Date.now(),token=epoch){
 if(disposed||token!==epoch)return
 try{
  const {data}=await getImageTask(id)
  if(disposed||token!==epoch)return
  if(data.status==='done'){current.value={...current.value,...data};generating.value=false;await loadGallery();return}
  if(data.status==='failed'){error.value=data.message||'生成失败';generating.value=false;await loadGallery();return}
  if(Date.now()-started>120000){notice.value='等待已超过2分钟，可在任务列表点击继续查看，无需重新下单。';generating.value=false;await loadGallery();return}
  timer=setTimeout(()=>poll(id,started,token),3000)
 }catch(e){if(disposed||token!==epoch)return;error.value=e.message;generating.value=false;await loadGallery()}
}
async function preview(){
 if(!productId.value||expanding.value||generating.value)return
 expanding.value=true;error.value='';notice.value='';current.value=null
 try{const {data}=await previewImage({productId:productId.value,sceneIndex:sceneIndex.value});if(!disposed)current.value=data}catch(e){if(!disposed)error.value=e.message}finally{expanding.value=false}
}
async function run(){
 if(!current.value?.previewId||generating.value)return
 generating.value=true;error.value='';notice.value='';clearPoll()
 try{const {data}=await generateImage(current.value.previewId);if(disposed)return;current.value={...data,imageUrl:''};await loadGallery();if(disposed)return;timer=setTimeout(()=>poll(data.assetId,Date.now(),epoch),3000)}catch(e){if(!disposed){error.value=e.message;generating.value=false}}
}
async function inspect(asset){if(generating.value||expanding.value)return;productId.value=asset.productId?._id||'';sceneIndex.value=asset.sceneIndex||0;await nextTick();current.value={...asset};error.value='';notice.value=''} 
function resume(asset){clearPoll();error.value='';notice.value='';current.value={...asset,assetId:asset._id};generating.value=true;timer=setTimeout(()=>poll(asset._id,Date.now(),epoch),3000)}
watch([productId,sceneIndex],()=>{if(!generating.value&&!expanding.value)current.value=null})
onMounted(()=>{store.load();loadGallery()})
onBeforeUnmount(()=>{disposed=true;clearPoll()})
</script>
<template>
 <main class="workspace asset-workspace">
  <header class="topbar"><RouterLink class="brand" to="/"><span class="brand-mark">M</span>AI 出海营销工坊</RouterLink><nav class="asset-nav"><RouterLink to="/">资产中心</RouterLink><RouterLink to="/copy">文案工坊</RouterLink><RouterLink to="/scene">场景生图</RouterLink><RouterLink to="/stats">运营看板</RouterLink></nav></header>
  <section class="asset-intro"><span class="eyebrow">03 / SCENE STUDIO</span><h1>把商品，放进生活场景。</h1><p>先检查英文提示词，再生成一张场景概念图。文生图无法保证与原商品完全一致，请人工核对后使用。</p></section>
  <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon/><el-alert v-if="notice" :title="notice" type="warning" :closable="false"/>
  <div class="scene-layout">
   <el-card header="场景设置"><el-form label-position="top">
    <el-form-item label="已识别的商品"><el-select v-model="productId" :disabled="generating||expanding" placeholder="选择商品"><el-option v-for="p in ready" :key="p._id" :value="p._id" :label="p.name"/></el-select></el-form-item>
    <el-pagination small layout="prev,pager,next" :total="store.total" :page-size="store.size" :current-page="store.page" :disabled="generating||expanding" @current-change="store.load"/>
    <el-alert v-if="store.error" :title="store.error" type="error" :closable="false"/>
    <el-form-item v-if="product" label="展示场景"><el-radio-group v-model="sceneIndex" :disabled="generating||expanding"><el-radio v-for="(s,i) in product.aiAnalysis.scene_suggestions" :key="i" :value="i">{{s}}</el-radio></el-radio-group></el-form-item>
    <el-button :disabled="!productId||generating" :loading="expanding" @click="preview">扩写英文提示词</el-button>
    <el-button type="primary" :disabled="!current?.previewId||generating||expanding" :loading="generating" @click="run">确认提示词并生成1张</el-button>
   </el-form><p>一次只下发一张。重复点击不会重复提交同一预览；离开页面停止轮询，不会取消已经提交的生图任务。</p></el-card>
   <el-card header="场景主图预览">
    <el-skeleton v-if="generating||expanding" animated><template #template><el-skeleton-item variant="image" style="width:100%;height:390px"/><el-skeleton-item variant="text"/></template></el-skeleton>
    <el-image v-else-if="current?.imageUrl" :src="imageUrl(current.imageUrl)" :preview-src-list="[imageUrl(current.imageUrl)]" fit="contain" style="width:100%;height:500px"/>
    <el-empty v-else :description="current?.previewId?'检查下方英文提示词后，点击确认生成':'选择商品和场景，先扩写提示词'"/>
    <p v-if="generating">任务处理中 · 每3秒查询一次</p>
    <el-collapse v-if="current?.prompt" :model-value="['prompt']"><el-collapse-item name="prompt" title="AI扩写的英文提示词"><p class="image-prompt">{{current.prompt}}</p><small>AI生成场景概念图，不作为实物照片或性能证明。</small></el-collapse-item></el-collapse>
   </el-card>
  </div>
  <el-card header="已生成场景图与任务记录" style="margin:24px 0"><el-button @click="loadGallery">刷新任务</el-button><el-empty v-if="!gallery.length" description="暂无生图任务"/><div class="scene-gallery"><article v-for="g in gallery" :key="g._id"><el-image v-if="g.status==='done'" :src="imageUrl(g.imageUrl)" :preview-src-list="[imageUrl(g.imageUrl)]" fit="cover" style="width:200px;height:200px"/><p>{{g.productId?.name}} · {{g.status}}</p><el-button v-if="g.status==='done'" :disabled="generating||expanding" @click="inspect(g)">查看图片与提示词</el-button><el-button v-if="g.status==='pending'" :disabled="generating" @click="resume(g)">继续查看</el-button><p v-if="g.failureReason">{{g.failureReason}}</p></article></div></el-card>
  <footer>刘嘉略 · 0120251050 <span>异步场景生图 · 实战7</span></footer>
 </main>
</template>
<style scoped>
.scene-layout{display:grid;grid-template-columns:360px minmax(0,1fr);gap:24px;margin-top:20px}.scene-layout .el-button{margin:5px 5px 5px 0}.el-radio-group{display:flex;flex-direction:column;align-items:flex-start}.el-radio{height:auto;min-height:36px;white-space:normal}.image-prompt{color:#214b3b;line-height:1.8}.scene-gallery{display:flex;flex-wrap:wrap;gap:20px;margin-top:20px}.scene-gallery article{max-width:220px}@media(max-width:760px){.scene-layout{grid-template-columns:1fr}}
</style>




