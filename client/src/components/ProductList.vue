<script setup>
import { onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useProductStore } from '../stores/product.js'
import { imageUrl, analyzeProduct } from '../api/product.js'

const store = useProductStore()
const analyzing = reactive({})
const errors = reactive({})
async function runAnalyze(product) {
  if (analyzing[product._id]) return
  analyzing[product._id] = true
  errors[product._id] = ''
  try {
    const response = await analyzeProduct(product._id)
    product.aiAnalysis = response.data
    ElMessage.success(response.data.visual_elements.length ? '识别完成，请核对结果' : '未识别到商品，请尝试更清晰的图片')
  } catch (error) { errors[product._id] = error.message; ElMessage.error(error.message) }
  finally { analyzing[product._id] = false }
}
defineExpose({ reload: () => store.load(1) })
onMounted(() => store.load())
</script>

<template>
  <section class="asset-list" aria-label="商品素材列表">
    <div class="list-heading">
      <div><h2>我的商品素材 <span class="asset-count">{{ store.total }}</span></h2><p>保留商品原貌，为下一步创作准备好素材。</p></div>
      <el-button :loading="store.loading" @click="store.load(store.page)">刷新列表</el-button>
    </div>
    <el-alert v-if="store.error" :title="'列表加载失败：' + store.error" type="error" :closable="false" show-icon />
    <div v-loading="store.loading" class="list-content">
      <el-empty v-if="!store.loading && !store.error && !store.list.length" description="还没有商品，先上传一个吧" />
      <div v-else-if="!store.error" class="waterfall">
        <el-card v-for="product in store.list" :key="product._id" class="product-item" shadow="hover" :body-style="{ padding: 0 }">
          <div class="product-cover">
            <el-image v-if="product.images.length" :src="imageUrl(product.images[0])" :alt="product.name"
              :preview-src-list="product.images.map(imageUrl)" fit="contain" lazy preview-teleported>
              <template #error><div class="image-fallback">图片加载失败</div></template>
            </el-image>
            <div v-else class="image-fallback">暂无图片</div>
            <span class="image-count">{{ product.images.length }} 张图片</span>
          </div>
          <div class="product-info">
            <h3>{{ product.name }}</h3>
            <div class="product-tags">
              <el-tag v-if="product.category" size="small" effect="plain">{{ product.category }}</el-tag>
              <el-tag v-if="product.audience" size="small" type="info" effect="plain">{{ product.audience }}</el-tag>
            </div>
            <div class="product-time">{{ new Date(product.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) }}</div>
            <el-button class="analyze-button" type="primary" plain size="small" :loading="analyzing[product._id]" :disabled="analyzing[product._id]" @click="runAnalyze(product)">
              {{ product.aiAnalysis?.analyzedAt ? '重新识别' : 'AI 一键识别' }}
            </el-button>
            <p v-if="errors[product._id]" class="analysis-error" role="alert">{{ errors[product._id] }}</p>
            <div v-if="product.aiAnalysis?.analyzedAt" class="ai-result">
              <p class="analysis-note">AI 分析草稿 · 请核对后再用于营销</p>
              <template v-if="product.aiAnalysis.visual_elements.length">
                <div class="ai-title">外观特征</div>
                <el-tag v-for="tag in product.aiAnalysis.visual_elements" :key="tag" class="analysis-tag" type="primary">{{ tag }}</el-tag>
                <div class="ai-title">核心卖点</div>
                <el-tag v-for="tag in product.aiAnalysis.core_selling_points" :key="tag" class="analysis-tag" type="success">{{ tag }}</el-tag>
                <div class="ai-title">场景建议</div>
                <el-tag v-for="tag in product.aiAnalysis.scene_suggestions" :key="tag" class="analysis-tag" type="warning">{{ tag }}</el-tag>
              </template>
              <p v-else class="analysis-note">未识别到商品，建议更换主体清晰的图片。</p>
            </div>
          </div>
        </el-card>
      </div>
    </div>
    <el-pagination v-if="store.total > store.size" class="asset-pagination" layout="prev, pager, next" :total="store.total"
      :page-size="store.size" :current-page="store.page" :disabled="store.loading" @current-change="store.load" />
  </section>
</template>
