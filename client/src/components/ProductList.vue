<script setup>
import { onMounted } from 'vue'
import { useProductStore } from '../stores/product.js'
import { imageUrl } from '../api/product.js'

const store = useProductStore()
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
          </div>
        </el-card>
      </div>
    </div>
    <el-pagination v-if="store.total > store.size" class="asset-pagination" layout="prev, pager, next" :total="store.total"
      :page-size="store.size" :current-page="store.page" :disabled="store.loading" @current-change="store.load" />
  </section>
</template>
