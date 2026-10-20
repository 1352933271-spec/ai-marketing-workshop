import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '',
  timeout: 60000,
})

http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (!body || typeof body.code !== 'number') {
      return Promise.reject(new Error('后端响应格式不符合约定'))
    }
    if (body.code !== 0) return Promise.reject(new Error(body.message || '请求失败'))
    return body
  },
  (error) => Promise.reject(new Error(error.response?.data?.message || error.message)),
)

export default http
