<script setup>
import { ref } from 'vue'
import UploadPanel from '../components/UploadPanel.vue'
import ProductList from '../components/ProductList.vue'

const list = ref()
</script>

<template>
  <main class="workspace asset-workspace">
    <header class="topbar">
      <RouterLink class="brand" to="/"><span class="brand-mark">M</span> AI 出海营销工坊</RouterLink>
      <nav class="asset-nav"><RouterLink to="/">资产中心</RouterLink><RouterLink to="/health">连接检测</RouterLink></nav>
    </header>
    <section class="asset-intro">
      <span class="eyebrow">01 / PRODUCT ASSETS</span>
      <h1>每一次好营销，从好素材开始。</h1>
      <p>上传商品图片，整理核心信息，让素材从这里进入创作流程。</p>
    </section>
    <div class="asset-layout">
      <UploadPanel @created="list?.reload()" />
      <ProductList ref="list" />
    </div>
    <footer>刘嘉略 · 0120251050 <span>资产中心 · 作业 3</span></footer>
  </main>
</template>
