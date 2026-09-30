import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))

export const ROOT = join(here, '..')
export const CONFIG_PATH = join(ROOT, '.tiktok-config.json')
export const PUBLIC_DIR = join(ROOT, 'public')
export const DIST_DIR = join(ROOT, 'dist')
export const UPLOADS_DIR = join(ROOT, 'public', 'flags')

export const BRIDGE_PORT = Number(process.env.PORT) || 3020
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:1935')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const MODES = ['auto', 'direct', 'tikfinity', 'tikora', 'mock']

export const MAX_SOURCE_FAILS = 2
export const BRIDGE_RETRY_MS = 10000
export const TIKFINITY_RETRY_MS = 8000
export const GIFT_DEDUPE_MAX = 200

export const TIKTOK_STATES = ['idle', 'connecting', 'live', 'offline', 'error']
