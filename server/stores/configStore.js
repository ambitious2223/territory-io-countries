import { CONFIG_PATH, MODES } from '../constants.js'
import { readJson, writeJson } from './store.js'

const DEFAULTS = {
  username: process.env.TIKTOK_USERNAME || '',
  mode: process.env.BRIDGE_MODE || 'auto',
  autoConnect: true,
  tikfinityHost: '127.0.0.1',
  tikfinityPort: 21213,
  tikoraEnabled: false,
  tikoraSlug: '',
  tikoraKey: '',
  tikoraRelayUrl: 'ws://127.0.0.1:27016/'
}

let cache = null

function resolve() {
  const merged = { ...DEFAULTS, ...readJson(CONFIG_PATH, {}) }
  if (process.env.BRIDGE_MODE) merged.mode = process.env.BRIDGE_MODE
  if (!MODES.includes(merged.mode)) merged.mode = 'auto'
  merged.username = String(merged.username || '').replace(/^@+/, '').trim()
  return merged
}

export function getConfig() {
  if (!cache) cache = resolve()
  return cache
}

export function saveConfig(partial) {
  const clean = {}
  if (partial.username !== undefined) clean.username = String(partial.username).replace(/^@+/, '').trim()
  if (partial.mode !== undefined && MODES.includes(partial.mode)) clean.mode = partial.mode
  if (partial.autoConnect !== undefined) clean.autoConnect = Boolean(partial.autoConnect)
  if (partial.tikfinityHost !== undefined) clean.tikfinityHost = String(partial.tikfinityHost)
  if (partial.tikfinityPort !== undefined) clean.tikfinityPort = Number(partial.tikfinityPort) || DEFAULTS.tikfinityPort
  if (partial.tikoraEnabled !== undefined) clean.tikoraEnabled = Boolean(partial.tikoraEnabled)
  if (partial.tikoraSlug !== undefined) clean.tikoraSlug = String(partial.tikoraSlug)
  if (partial.tikoraKey !== undefined) clean.tikoraKey = String(partial.tikoraKey)
  if (partial.tikoraRelayUrl !== undefined) clean.tikoraRelayUrl = String(partial.tikoraRelayUrl)

  cache = { ...getConfig(), ...clean }
  writeJson(CONFIG_PATH, cache)
  return cache
}
