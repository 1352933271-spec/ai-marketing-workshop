import Dashboard from '../views/Dashboard.vue'
import { createRouter, createWebHistory } from 'vue-router'
import HealthView from '../views/HealthView.vue'
import AssetView from '../views/AssetView.vue'
import CopyStudio from '../views/CopyStudio.vue'
import SceneStudio from '../views/SceneStudio.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    {path:'/stats',name:'stats',component:Dashboard},
    { path: '/scene', name: 'scene', component: SceneStudio },
    { path: '/copy', name: 'copy', component: CopyStudio },
    { path: '/', name: 'assets', component: AssetView },
    { path: '/health', name: 'health', component: HealthView },
  ],
})


