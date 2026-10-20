export function notFound(req, res) {
  res.status(404).json({ code: 4004, message: '接口不存在', data: null })
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)
  const invalidJson = err.type === 'entity.parse.failed'
  const tooLarge = err.type === 'entity.too.large'
  const status = invalidJson ? 400 : tooLarge ? 413 : (err.status || 500)
  if (status >= 500) console.error('[error]', err.name)
  res.status(status).json({
    code: status < 500 ? 4001 : 5001,
    message: invalidJson ? '请求体不是有效JSON' : tooLarge ? '请求体超过大小限制' : status >= 500 ? '服务器内部错误' : err.message,
    data: null,
  })
}
