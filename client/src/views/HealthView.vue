<script setup>
import { onMounted } from 'vue'
import { useHealthStore } from '../stores/health.js'
import ModuleCard from '../components/ModuleCard.vue'

const health = useHealthStore()
const modules = [
  { number: '01', title: '资产中心', description: '统一管理商品图片与已核实参数。' },
  { number: '02', title: '视觉理解', description: '提取商品外观、卖点与场景建议。' },
  { number: '03', title: '文案引擎', description: '生成多语言、多渠道营销文案。' },
  { number: '04', title: '场景与交付', description: '生成场景图，审核后统一打包。' },
]
onMounted(() => health.check())
</script>

<template>
  <main class="workspace">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">M</span> AI 出海营销工坊</div>
      <span class="stage-label">作业 2 · 全栈工程骨架</span>
    </header>
    <section class="intro">
      <span class="eyebrow">MULTIMODAL MARKETING WORKSHOP</span>
      <h1>让商品故事，走向更大的市场。</h1>
      <p>从商品图片到海外营销素材，在一个工作台串起创作与交付。</p>
    </section>
    <el-card class="health-card" shadow="never">
      <div class="health-heading">
        <div><h2>前后端联调</h2><p>检查 Express 服务与 MongoDB 的实时连接状态</p></div>
        <el-button type="primary" :loading="health.loading" @click="health.check">重新检测</el-button>
      </div>
      <el-alert v-if="health.error" :title="'后端连接失败：' + health.error" type="error" :closable="false" show-icon />
      <el-alert v-else-if="health.result" title="后端连接成功 · MongoDB 已连接" type="success" :closable="false" show-icon />
      <el-alert v-else title="正在检测连接…" type="info" :closable="false" show-icon />
      <div class="connection-grid">
        <div><span>请求接口</span><strong>GET /api/health</strong></div>
        <div><span>数据库状态</span><strong>{{ health.result?.data.db ?? '等待响应' }}</strong></div>
        <div><span>服务端时间（UTC）</span><strong>{{ health.result?.data.time ?? '—' }}</strong></div>
      </div>
      <p class="console-hint">按 F12 打开浏览器控制台，可查看带有 [health] 标记的真实接口响应。</p>
    </el-card>
    <section class="modules" aria-label="后续功能规划">
      <ModuleCard v-for="module in modules" :key="module.number" v-bind="module" />
    </section>
    <footer>刘嘉略 · 0120251050 <span>Vue 3 / Express / MongoDB</span></footer>
  </main>
</template>
