import http from './http.js'
export const previewImage=body=>http.post('/api/images/preview',body,{timeout:110000})
export const generateImage=previewId=>http.post('/api/images/generate',{previewId})
export const getImageTask=id=>http.get(`/api/images/tasks/${id}`)
