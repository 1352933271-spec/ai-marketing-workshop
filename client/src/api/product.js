import http from './http.js'

// 浏览器自动设置multipart边界，不手写Content-Type。
export const createProduct = (formData) => http.post('/api/products', formData)
export const fetchProducts = (params) => http.get('/api/products', { params })

export const imageUrl = (path) => (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '') + path
