import { MAPPINGS_PATH } from '../constants.js'
import { readJson, writeJson } from './store.js'

const DEFAULTS = { effects: [], mappings: [] }

let cache = null

export function getMappingsConfig() {
  if (!cache) cache = { ...DEFAULTS, ...readJson(MAPPINGS_PATH, DEFAULTS) }
  return cache
}

export function saveMappingsConfig(data) {
  const next = { ...getMappingsConfig(), ...data }
  cache = next
  writeJson(MAPPINGS_PATH, next)
  return next
}
