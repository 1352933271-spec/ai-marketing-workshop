import http from './http.js'
export const generateCopy = (body) => http.post('/api/copy/generate', body)
