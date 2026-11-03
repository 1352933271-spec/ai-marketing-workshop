import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getHealth } from '../api/health.js'

export const useHealthStore = defineStore('health', () => {
  const loading = ref(false)
  const result = ref(null)
  const error = ref('')

  async function check() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    result.value = null
    try {
      const response = await getHealth()
      result.value = response
    } catch (e) {
      error.value = e.message
      console.error('[health] 请求失败：', e.message)
    } finally {
      loading.value = false
    }
  }

  return { loading, result, error, check }
})
