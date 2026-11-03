<script setup>
import { computed,onMounted,ref,watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useProductStore } from '../stores/product.js'
import { useCopyStream } from '../utils/useCopyStream.js'
import MarkdownView from '../components/MarkdownView.vue'
import { fetchAssets,deleteAsset } from '../api/asset.js'
const store=useProductStore()
const form=ref({productId:'',language:'en',channel:'amazon',extra:''})
const ready=computed(()=>store.list.filter(p=>p.aiAnalysis?.core_selling_points?.length))
const {text,streaming,error,result,stopped,start,stop}=useCopyStream()
const assets=ref([]),viewing=ref(null),assetsError=ref('')
function run(){if(!form.value.productId)return ElMessage.warning('请先选择已识别商品');start({...form.value})}
async function loadAssets(){try{assets.value=(await fetchAssets({type:'copy'})).data;assetsError.value=''}catch(e){assetsError.value=e.message}}
async function copyText(row){try{await navigator.clipboard.writeText(row.content);ElMessage.success('已复制')}catch{ElMessage.warning('复制失败，请在详情中选中文字手动复制')}}
async function remove(row){try{await deleteAsset(row._id);await loadAssets();if(viewing.value?._id===row._id)viewing.value=null;ElMessage.success('已删除')}catch(e){ElMessage.error(e.message)}}
watch(result,r=>{if(r)loadAssets()})
onMounted(()=>{store.load();loadAssets()})
</script>
<template>
  <main class="workspace asset-workspace">
    <header class="topbar">
      <RouterLink class="brand" to="/"><span class="brand-mark">M</span> AI 出海营销工坊</RouterLink>
      <nav class="asset-nav"><RouterLink to="/">资产中心</RouterLink><RouterLink to="/copy">文案工坊</RouterLink><RouterLink to="/scene">场景生图</RouterLink><RouterLink to="/health">连接检测</RouterLink><RouterLink to="/stats">运营看板</RouterLink></nav>
    </header>
    <section class="asset-intro"><span class="eyebrow">02 / COPY STUDIO</span><h1>一个商品，走进不同市场。</h1><p>选择语言与渠道，把商品卖点变成适合当地消费者的文案。</p></section>
    <div class="copy-layout">
      <el-card header="生成设置">
        <el-alert v-if="store.error" :title="store.error" type="error" :closable="false" />
        <el-form label-position="top">
          <el-form-item label="已识别的商品"><el-select :disabled="streaming" v-model="form.productId" placeholder="请选择商品" style="width:100%"><el-option v-for="p in ready" :key="p._id" :label="p.name" :value="p._id" /></el-select></el-form-item>
          <p v-if="!ready.length && !store.loading">本页没有已识别商品，请先到资产中心识别，或切换商品页。</p>
          <el-pagination small layout="prev, pager, next" :total="store.total" :page-size="store.size" :current-page="store.page" @current-change="store.load" />
          <el-form-item label="目标语言"><el-select :disabled="streaming" v-model="form.language"><el-option label="English (US)" value="en" /><el-option label="日本語" value="ja" /><el-option label="Español (Latinoamérica)" value="es" /></el-select></el-form-item>
          <el-form-item label="发布渠道"><el-select :disabled="streaming" v-model="form.channel"><el-option label="Amazon 商品详情页" value="amazon" /><el-option label="TikTok 短视频脚本" value="tiktok" /><el-option label="Instagram 帖子配文" value="instagram" /></el-select></el-form-item>
          <el-form-item label="补充要求"><el-input :disabled="streaming" v-model="form.extra" type="textarea" :rows="3" maxlength="2000" show-word-limit /></el-form-item>
          <el-button v-if="!streaming" type="primary" @click="run">生成文案</el-button><el-button v-else type="danger" @click="stop">停止生成</el-button>
        </el-form>
      </el-card>
      <el-card header="实时文案">
        <el-alert v-if="result?.warnings?.length" :title="'已遮蔽敏感词：' + result.warnings.join('、')" type="warning" :closable="false" />
        <el-alert v-if="error" :title="error" type="error" :closable="false" /><p v-if="streaming">正在生成 · 当前内容为待审草稿</p><p v-if="stopped">已停止生成，未保存本次草稿。</p><MarkdownView :source="text || '选择商品、语言与渠道，开始生成文案。'" :streaming="streaming" />
      </el-card>
    </div>
    <el-card header="历史文案" style="margin:24px 0">
      <el-alert v-if="assetsError" :title="assetsError" type="error" :closable="false" />
      <el-button @click="loadAssets">刷新历史</el-button>
      <el-table :data="assets" empty-text="暂无保存的文案">
        <el-table-column label="商品" min-width="160"><template #default="{row}">{{ row.productId?.name || '商品已移除' }}</template></el-table-column>
        <el-table-column prop="language" label="语言" width="90"/><el-table-column prop="channel" label="渠道" width="120"/>
        <el-table-column label="时间" min-width="170"><template #default="{row}">{{new Date(row.createdAt).toLocaleString('zh-CN')}}</template></el-table-column>
        <el-table-column label="操作" width="210"><template #default="{row}"><el-button link @click="viewing=row">查看</el-button><el-button link @click="copyText(row)">复制</el-button><el-popconfirm title="确定删除这份文案？" @confirm="remove(row)"><template #reference><el-button link type="danger">删除</el-button></template></el-popconfirm></template></el-table-column>
      </el-table>
    </el-card>
    <el-drawer :model-value="!!viewing" title="文案详情 · 请人工审核后使用" size="70%" @close="viewing=null"><MarkdownView :source="viewing?.content"/></el-drawer>    <footer>刘嘉略 · 0120251050 <span>流式文案与素材管理 · 实战 6</span></footer>
  </main>
</template>

<style scoped>
.copy-layout { display:grid; grid-template-columns:minmax(280px, 360px) minmax(0,1fr); gap:24px; }
.copy-output { white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; line-height:1.8; min-height:240px; }
.comparison { margin-top:32px; }
.comparison-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }
@media(max-width:760px) { .copy-layout,.comparison-grid { grid-template-columns:1fr; } }
</style>




