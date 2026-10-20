import http from './http.js'

export const getHealth = () => http.get('/api/health')
