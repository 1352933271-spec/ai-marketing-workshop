import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchProducts } from '../api/product.js'

export const useProductStore = defineStore('product', () => {
  const list = ref([])
  const total = ref(0)
  const page = ref(1)
  const size = 12
  const loading = ref(false)
  const error = ref('')
  let request = 0

  async function load(nextPage = 1) {
    const current = ++request
    loading.value = true
    error.value = ''
    try {
      const response = await fetchProducts({ page: nextPage, size })
      if (current !== request) return
      list.value = response.data.list
      total.value = response.data.total
      page.value = response.data.page
    } catch (e) {
      if (current === request) error.value = e.message
    } finally {
      if (current === request) loading.value = false
    }
  }
  return { list, total, page, size, loading, error, load }
})
