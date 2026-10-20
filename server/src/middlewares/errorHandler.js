export function notFound(req, res) {
  res.status(404).json({ code: 4004, message: '接口不存在', data: null })
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)
  if (err.name === 'LLMError' && err.expose === true) {
    return res.status(err.status).json({ code: err.code, message: err.message, data: null })
  }
  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: '单张图片不能超过 5MB',
      LIMIT_FILE_COUNT: '最多上传 5 张图片',
      LIMIT_UNEXPECTED_FILE: '上传字段名应为 images，且最多上传 5 张图片',
      LIMIT_FIELD_COUNT: '最多提交名称、受众、品类三个表单字段',
      LIMIT_FIELD_VALUE: '表单文本过长',
      LIMIT_PART_COUNT: '表单内容超过数量限制',
    }
    return res.status(400).json({ code: err.code === 'LIMIT_FILE_SIZE' ? 4003 : 4001, message: messages[err.code] || '上传表单不合法', data: null })
  }
  const invalidJson = err.type === 'entity.parse.failed'
  const tooLarge = err.type === 'entity.too.large'
  const status = invalidJson ? 400 : tooLarge ? 413 : (err.status || 500)
  if (status >= 500) console.error('[error]', err.name)
  res.status(status).json({
    code: status < 500 ? (typeof err.code === 'number' ? err.code : 4001) : 5001,
    message: invalidJson ? '请求体不是有效JSON' : tooLarge ? '请求体超过大小限制' : status >= 500 ? '服务器内部错误' : err.message,
    data: null,
  })
}
