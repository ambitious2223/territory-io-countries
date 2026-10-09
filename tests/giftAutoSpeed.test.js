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
  it('gives one coin one second by default', () => {
    expect(fx.giftSpeedSeconds(1)).toBeCloseTo(CONFIG.GIFT_SPEED_SEC_PER_COIN, 5)
    expect(fx.giftSpeedSeconds(20)).toBeCloseTo(20 * CONFIG.GIFT_SPEED_SEC_PER_COIN, 5)
  })

  it('never drops below the floor or exceeds the ceiling', () => {
    expect(fx.giftSpeedSeconds(0)).toBe(CONFIG.GIFT_SPEED_MIN_SEC)
    expect(fx.giftSpeedSeconds(undefined)).toBe(CONFIG.GIFT_SPEED_MIN_SEC)
    expect(fx.giftSpeedSeconds(100000)).toBe(CONFIG.GIFT_SPEED_MAX_SEC)
  })
})

describe('gift speed multiplier from coin value', () => {
  it('starts at the base multiplier for tiny gifts', () => {
    expect(fx.giftSpeedMult(0)).toBeCloseTo(CONFIG.BALL_OVERCHARGE_MULT, 5)
  })

  it('reaches the cap at the configured coin count', () => {
    expect(fx.giftSpeedMult(CONFIG.GIFT_SPEED_COINS_TO_MAX)).toBeCloseTo(CONFIG.GIFT_SPEED_MAX_MULT, 5)
    expect(fx.giftSpeedMult(100000)).toBeCloseTo(CONFIG.GIFT_SPEED_MAX_MULT, 5)
  })

  it('scales linearly in between', () => {
    const coins = CONFIG.GIFT_SPEED_COINS_TO_MAX / 2
    const expected = CONFIG.BALL_OVERCHARGE_MULT +
      (CONFIG.GIFT_SPEED_MAX_MULT - CONFIG.BALL_OVERCHARGE_MULT) / 2
    expect(fx.giftSpeedMult(coins)).toBeCloseTo(expected, 5)
  })
})

describe('automatic speed burst on every gift', () => {
  it('overcharges the donor ball with the coin-scaled speed and time', () => {
    const game = fakeGame()
    const ball = new Marble(600, 400, RED, 'member', { teamId: 1 })
    game.marbles.push(ball)

    const out = fx.autoGiftSpeed(game, giftEvent(100))
    expect(out).toBe('boost')
    expect(ball.overcharge).toBe(true)
    expect(ball.speedMult).toBeCloseTo(fx.giftSpeedMult(100), 5)
    expect(ball.powerupTimer).toBeCloseTo(fx.giftSpeedSeconds(100), 5)
    expect(game.effectStats.outcome).toBe('applied')
  })

  it('caps a whale gift at the max speed and max time', () => {
    const game = fakeGame()
    const ball = new Marble(600, 400, RED, 'member', { teamId: 1 })
    game.marbles.push(ball)

    fx.autoGiftSpeed(game, giftEvent(100000))
    expect(ball.speedMult).toBeCloseTo(CONFIG.GIFT_SPEED_MAX_MULT, 5)
    expect(ball.powerupTimer).toBeCloseTo(CONFIG.GIFT_SPEED_MAX_SEC, 5)
  })

  it('lets the gift burst exceed the shared effect duration clamp', () => {
    const game = fakeGame()
    const ball = new Marble(600, 400, RED, 'member', { teamId: 1 })
    game.marbles.push(ball)

    fx.executeEffect(game, 'boost', { duration: 120, mult: 6, max: 120 }, {
      userId: 'member', username: 'member', name: 'Member',
    })
    expect(ball.powerupTimer).toBeCloseTo(120, 5)
    expect(ball.speedMult).toBeCloseTo(6, 5)
  })

  it('holds the burst for a donor without a nation until they join', () => {
    const game = fakeGame()
    const out = fx.autoGiftSpeed(game, giftEvent(50, { userId: 'stranger', username: 'stranger' }))
    expect(out).toBe('pending')
    const params = game.joinPrompt.request.mock.calls[0][0].params
    expect(params.duration).toBeCloseTo(fx.giftSpeedSeconds(50), 5)
    expect(params.mult).toBeCloseTo(fx.giftSpeedMult(50), 5)
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
