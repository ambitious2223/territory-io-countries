import { describe, it, expect, vi, beforeAll } from 'vitest'
import { CONFIG } from '../src/config.js'
import { Marble } from '../src/marble.js'

let fx

beforeAll(async () => {
  fx = await import('../src/giftEffects.js')
})

const RED = '#FF2222'

function fakeGame() {
  const team = { id: 1, name: { en: 'Egypt' }, color: RED, eliminated: false }
  return {
    teams: [team],
    marbles: [],
    scoring: {
      teamOf: (id) => (id === 'member' ? 1 : null),
      registerUser: vi.fn(),
    },
    viewers: { viewers: new Map() },
    joinPrompt: { request: vi.fn(() => true) },
    vfx: { addPickupText: vi.fn() },
    camera: { shake: vi.fn() },
    particles: { emitSparks: vi.fn() },
    grid: { worldToGrid: () => ({ row: 0, col: 0 }), paintColorBomb: () => 4 },
    onboarding: { notify: vi.fn() },
    spawnViewerMarble: vi.fn(),
    effectStats: { received: 0, lastKey: '', outcome: '-' },
  }
}

function giftEvent(coins, extra = {}) {
  return { type: 'gift', userId: 'member', username: 'member', name: 'Member', coins, ...extra }
}

describe('gift speed duration from coin value', () => {
  it('scales with coins', () => {
    expect(fx.giftSpeedDuration(40)).toBeCloseTo(40 * CONFIG.GIFT_SPEED_PER_COIN, 5)
    expect(fx.giftSpeedDuration(120)).toBeGreaterThan(fx.giftSpeedDuration(40))
  })

  it('never drops below the floor or exceeds the cap', () => {
    expect(fx.giftSpeedDuration(1)).toBe(CONFIG.GIFT_SPEED_MIN)
    expect(fx.giftSpeedDuration(0)).toBe(CONFIG.GIFT_SPEED_MIN)
    expect(fx.giftSpeedDuration(100000)).toBe(CONFIG.GIFT_SPEED_MAX)
    expect(fx.giftSpeedDuration(undefined)).toBe(CONFIG.GIFT_SPEED_MIN)
  })
})

describe('automatic speed burst on every gift', () => {
  it('overcharges the donor ball for a coin-scaled duration', () => {
    const game = fakeGame()
    const ball = new Marble(600, 400, RED, 'member', { teamId: 1 })
    game.marbles.push(ball)

    const out = fx.autoGiftSpeed(game, giftEvent(100))
    expect(out).toBe('boost')
    expect(ball.overcharge).toBe(true)
    expect(ball.powerupTimer).toBeCloseTo(100 * CONFIG.GIFT_SPEED_PER_COIN, 5)
    expect(game.effectStats.outcome).toBe('applied')
  })

  it('clamps a whale gift to the max burst', () => {
    const game = fakeGame()
    const ball = new Marble(600, 400, RED, 'member', { teamId: 1 })
    game.marbles.push(ball)

    fx.autoGiftSpeed(game, giftEvent(100000))
    expect(ball.powerupTimer).toBe(CONFIG.GIFT_SPEED_MAX)
  })

  it('holds the burst for a donor without a nation until they join', () => {
    const game = fakeGame()
    const out = fx.autoGiftSpeed(game, giftEvent(50, { userId: 'stranger', username: 'stranger' }))
    expect(out).toBe('pending')
    expect(game.joinPrompt.request).toHaveBeenCalledWith(expect.objectContaining({
      username: 'stranger',
      effect: 'boost',
    }))
    const params = game.joinPrompt.request.mock.calls[0][0].params
    expect(params.duration).toBeCloseTo(50 * CONFIG.GIFT_SPEED_PER_COIN, 5)
  })

  it('needs no hub: works straight off a bridge gift event', () => {
    const game = fakeGame()
    game.tikora = { status: 'off' }
    const ball = new Marble(600, 400, RED, 'member', { teamId: 1 })
    game.marbles.push(ball)

    expect(fx.autoGiftSpeed(game, giftEvent(20))).toBe('boost')
    expect(ball.overcharge).toBe(true)
  })
})
