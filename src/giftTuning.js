import { CONFIG } from './config.js'

const STORAGE_KEY = 'twf_giftSpeed'

const FIELDS = {
  secondsPerCoin: { config: 'GIFT_SPEED_SEC_PER_COIN', limit: 'secondsPerCoin' },
  maxSeconds: { config: 'GIFT_SPEED_MAX_SEC', limit: 'maxSeconds' },
  maxMultiplier: { config: 'GIFT_SPEED_MAX_MULT', limit: 'maxMultiplier' },
  coinsToMax: { config: 'GIFT_SPEED_COINS_TO_MAX', limit: 'coinsToMax' },
}

const DEFAULTS = {}
for (const [field, spec] of Object.entries(FIELDS)) DEFAULTS[field] = CONFIG[spec.config]

function clampField(field, value) {
  const spec = FIELDS[field]
  const limit = CONFIG.GIFT_TUNING_LIMITS[spec.limit]
  const number = Number(value)
  if (!Number.isFinite(number)) return CONFIG[spec.config]
  return Math.min(limit.max, Math.max(limit.min, number))
}

export function getGiftTuning() {
  const out = {}
  for (const [field, spec] of Object.entries(FIELDS)) out[field] = CONFIG[spec.config]
  return out
}

export function applyGiftTuning(values = {}) {
  for (const field of Object.keys(FIELDS)) {
    if (values[field] !== undefined) CONFIG[FIELDS[field].config] = clampField(field, values[field])
  }
  return getGiftTuning()
}

export function setGiftTuning(patch) {
  const next = applyGiftTuning(patch)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    void 0
  }
  return next
}

export function resetGiftTuning() {
  applyGiftTuning(DEFAULTS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS))
  } catch {
    void 0
  }
  return getGiftTuning()
}

export function initGiftTuning() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) applyGiftTuning(JSON.parse(raw))
  } catch {
    void 0
  }
  return getGiftTuning()
}
