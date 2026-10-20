import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// 按文件定位，保证从根目录或server目录启动时均能读取同一配置。
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })
