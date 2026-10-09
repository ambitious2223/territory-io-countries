import { CONFIG_PATH, MODES } from '../constants.js'
import { readJson, writeJson } from './store.js'

const DEFAULTS = {
  username: '',
  mode: 'auto',
  autoConnect: true,
  tikfinityHost: '127.0.0.1',
  tikfinityPort: 21213,
  tikoraEnabled: false,
  tikoraSlug: '',
  tikoraKey: '',
  tikoraRelayUrl: 'ws://127.0.0.1:27016/',
  tunnelEnabled: true,
  tunnelTarget: 'http://localhost:3020'
}

let cache = null

function normalizeMode(mode) {
  return MODES.includes(mode) ? mode : 'auto'
}

function raw() {
  const merged = { ...DEFAULTS, ...readJson(CONFIG_PATH, {}) }
  merged.mode = normalizeMode(merged.mode)
  merged.username = String(merged.username || '').replace(/^@+/, '').trim()
  return merged
}

function resolve() {
  const merged = raw()
  if (process.env.BRIDGE_MODE) merged.mode = normalizeMode(process.env.BRIDGE_MODE)
  if (process.env.TIKTOK_USERNAME) merged.username = process.env.TIKTOK_USERNAME
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
  if (partial.tunnelEnabled !== undefined) clean.tunnelEnabled = Boolean(partial.tunnelEnabled)
  if (partial.tunnelTarget !== undefined) clean.tunnelTarget = String(partial.tunnelTarget)

  writeJson(CONFIG_PATH, { ...raw(), ...clean })
  cache = resolve()
  return cache
}
