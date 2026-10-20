import { createRouter, createWebHistory } from 'vue-router'
import HealthView from '../views/HealthView.vue'
import AssetView from '../views/AssetView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'assets', component: AssetView },
    { path: '/health', name: 'health', component: HealthView },
  ],
})
