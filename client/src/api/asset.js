import http from './http.js'
export const fetchAssets=(params)=>http.get('/api/assets',{params})
export const deleteAsset=(id)=>http.delete(`/api/assets/${id}`)
