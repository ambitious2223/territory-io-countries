import { describe, it, expect, beforeAll } from 'vitest'
import { CONFIG } from '../src/config.js'

let speed

beforeAll(async () => {
  const store = {}
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
  }
  speed = await import('../src/speedControl.js')
})

const STORAGE_KEY = 'twf_soldierSpeed'

describe('soldier speed control', () => {
  it('rescales live balls and persists the speed', () => {
    speed.setSoldierSpeed(1.1, [])
    const ball = { alive: true, eliminated: false, vx: 1, vy: 0.5 }

    speed.setSoldierSpeed(2.2, [ball])

    expect(CONFIG.MARBLE_SPEED).toBeCloseTo(2.2, 5)
    expect(ball.vx).toBeCloseTo(2, 5)
    expect(ball.vy).toBeCloseTo(1, 5)
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBe('2.2')

    const dead = { alive: false, eliminated: false, vx: 1, vy: 0 }
    speed.setSoldierSpeed(1.1, [dead])
    expect(dead.vx).toBe(1)
  })

  it('clamps to the configured range', () => {
    speed.setSoldierSpeed(99, [])
    expect(CONFIG.MARBLE_SPEED).toBe(CONFIG.SPEED_CTRL_MAX)
    speed.setSoldierSpeed(0.1, [])
    expect(CONFIG.MARBLE_SPEED).toBe(CONFIG.SPEED_CTRL_MIN)
  })

  it('restores a saved speed on init', () => {
    speed.setSoldierSpeed(1.7, [])
    CONFIG.MARBLE_SPEED = CONFIG.SPEED_CTRL_MIN
    speed.initSpeedControl()
    expect(speed.getSoldierSpeed()).toBeCloseTo(1.7, 5)
    speed.setSoldierSpeed(1.1, [])
  })
})
