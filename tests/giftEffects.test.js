import { describe, it, expect, vi, beforeAll } from 'vitest'

let fx

beforeAll(async () => {
  fx = await import('../src/giftEffects.js')
})

function fakeGame() {
  const team = { id: 1, name: { en: 'Egypt' }, color: '#FFD700', eliminated: false }
  return {
    teams: [team],
    marbles: [],
    scoring: { teamOf: (id) => (id === 'leader' ? 1 : null) },
    viewers: { viewers: new Map() },
    joinPrompt: { request: vi.fn(() => true) },
    vfx: { addPickupText: vi.fn() },
    camera: { shake: vi.fn() },
    particles: { emitSparks: vi.fn() },
    grid: { worldToGrid: () => ({ row: 0, col: 0 }), paintColorBomb: () => 4 },
    spawnViewerMarble: vi.fn(() => ({
      x: 1, y: 1,
      applyPowerup: vi.fn(),
      overcharge: false,
      powerupTimer: 0,
    })),
  }
}

describe('effect identity', () => {
  it('spawns the effect soldier with the activator photo and name', () => {
    const game = fakeGame()
    const out = fx.executeEffect(game, 'spawn', {}, {
      userId: 'ahmad', username: 'ahmad', name: 'Ahmad ❤', avatar: 'https://cdn/p.jpg', teamId: 1,
    })
    expect(out).toBe('spawn')
    expect(game.spawnViewerMarble).toHaveBeenCalledTimes(1)
    const profile = game.spawnViewerMarble.mock.calls[0][0]
    expect(profile.name).toBe('Ahmad ❤')
    expect(profile.avatar).toBe('https://cdn/p.jpg')
  })

  it('runs immediately for an activator who is already in a nation', () => {
    const game = fakeGame()
    const out = fx.executeEffect(game, 'boost', { duration: 3 }, { userId: 'leader' })
    expect(out).toBe('boost')
    expect(game.joinPrompt.request).not.toHaveBeenCalled()
  })

  it('queues a pick-a-side prompt when the activator has no nation', () => {
    const game = fakeGame()
    const out = fx.executeEffect(game, 'boost', { duration: 3 }, {
      userId: 'stranger', username: 'stranger', name: 'Stranger', avatar: 'https://cdn/s.jpg',
    })
    expect(out).toBe('pending')
    expect(game.joinPrompt.request).toHaveBeenCalledWith(expect.objectContaining({
      username: 'stranger',
      effect: 'boost',
      avatar: 'https://cdn/s.jpg',
    }))
  })

  it('returns null for unknown effects and missing targets', () => {
    const game = fakeGame()
    expect(fx.executeEffect(game, 'nope', {}, { userId: 'leader' })).toBeNull()
    expect(fx.executeEffect(game, 'boost', {}, {})).toBeNull()
  })
})
