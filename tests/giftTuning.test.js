import { describe, it, expect, beforeAll } from 'vitest'
import { CONFIG } from '../src/config.js'

let tuning

beforeAll(async () => {
  const store = {}
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
  }
  tuning = await import('../src/giftTuning.js')
})

const DEFAULTS = {
  secondsPerCoin: CONFIG.GIFT_SPEED_SEC_PER_COIN,
  maxSeconds: CONFIG.GIFT_SPEED_MAX_SEC,
  maxMultiplier: CONFIG.GIFT_SPEED_MAX_MULT,
  coinsToMax: CONFIG.GIFT_SPEED_COINS_TO_MAX,
}

describe('gift tuning', () => {
  it('applies and clamps values onto CONFIG', () => {
    tuning.setGiftTuning({ secondsPerCoin: 2, maxSeconds: 9999, maxMultiplier: 1, coinsToMax: 0 })
    expect(CONFIG.GIFT_SPEED_SEC_PER_COIN).toBe(2)
    expect(CONFIG.GIFT_SPEED_MAX_SEC).toBe(CONFIG.GIFT_TUNING_LIMITS.maxSeconds.max)
    expect(CONFIG.GIFT_SPEED_MAX_MULT).toBe(CONFIG.GIFT_TUNING_LIMITS.maxMultiplier.min)
    expect(CONFIG.GIFT_SPEED_COINS_TO_MAX).toBe(CONFIG.GIFT_TUNING_LIMITS.coinsToMax.min)
  })

  it('persists and reloads the saved values', () => {
    tuning.setGiftTuning({ maxSeconds: 120 })
    expect(JSON.parse(globalThis.localStorage.getItem('twf_giftSpeed')).maxSeconds).toBe(120)

    tuning.resetGiftTuning()
    tuning.initGiftTuning()
    expect(CONFIG.GIFT_SPEED_MAX_SEC).toBe(DEFAULTS.maxSeconds)
  })

  it('resets back to the defaults', () => {
    tuning.setGiftTuning({ secondsPerCoin: 5, maxSeconds: 30 })
    const restored = tuning.resetGiftTuning()
    expect(restored).toEqual(DEFAULTS)
    expect(CONFIG.GIFT_SPEED_SEC_PER_COIN).toBe(DEFAULTS.secondsPerCoin)
    expect(CONFIG.GIFT_SPEED_MAX_SEC).toBe(DEFAULTS.maxSeconds)
  })
})
