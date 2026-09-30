import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))

export const ROOT = join(here, '..')
export const CONFIG_PATH = join(ROOT, '.tiktok-config.json')
export const TEAMS_PATH = join(ROOT, 'config', 'teams.json')
export const WINNERS_PATH = join(ROOT, 'config', 'winners.json')
export const MAPPINGS_PATH = join(ROOT, 'config', 'mappings.json')
export const TIKORA_MANIFEST_PATH = join(ROOT, 'tikora.manifest.json')

export const TIKORA_DEFAULTS = {
  relayUrl: 'ws://127.0.0.1:27016/',
  slug: 'territory-with-flags',
}
export const PUBLIC_DIR = join(ROOT, 'public')
export const DIST_DIR = join(ROOT, 'dist')
export const UPLOADS_DIR = join(ROOT, 'public', 'flags')

export const BRIDGE_PORT = Number(process.env.PORT) || 3020
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:1935')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const MODES = ['auto', 'direct', 'tikfinity', 'mock']

export const MAX_SOURCE_FAILS = 2
export const BRIDGE_RETRY_MS = 10000
export const TIKFINITY_RETRY_MS = 8000
export const GIFT_DEDUPE_MAX = 200

export const TIKTOK_STATES = ['idle', 'connecting', 'live', 'offline', 'error']
