import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const UPLOAD_DIR = fileURLToPath(new URL('../../uploads/', import.meta.url))
export const STAGING_DIR = path.join(UPLOAD_DIR, '.staging')
export const ALLOWED = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }
fs.mkdirSync(STAGING_DIR, { recursive: true })

export function inputError(message, code = 4001) {
  return Object.assign(new Error(message), { status: 400, code })
}

export async function cleanupFiles(files = []) {
  await Promise.all(files.map(async (file) => {
    try { await unlink(typeof file === 'string' ? file : file.path) }
    catch (error) { if (error.code !== 'ENOENT') console.error('[upload cleanup]', error.code) }
  }))
}

const parse = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => callback(null, STAGING_DIR),
    filename: (req, file, callback) => callback(null, randomUUID() + '.upload'),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 3, fieldSize: 2048, parts: 9 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(ALLOWED, file.mimetype)) return callback(inputError('仅支持 JPG / PNG / WebP 图片', 4002))
    callback(null, true)
  },
}).array('images', 5)

export function uploadImages(req, res, next) {
  if (!req.is('multipart/form-data')) return next(inputError('请使用 multipart/form-data 提交表单'))
  parse(req, res, async (error) => {
    if (error) { await cleanupFiles(req.files); return next(error) }
    next()
  })
}
