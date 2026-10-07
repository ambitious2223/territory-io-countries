import { describe, it, expect, vi, beforeAll } from 'vitest'
import { CONFIG } from '../src/config.js'
import { Grid } from '../src/grid.js'
import { Marble } from '../src/marble.js'

let fx

beforeAll(async () => {
  fx = await import('../src/giftEffects.js')
})

const RED = '#FF2222'
const BLUE = '#1E90FF'

function makeWalls() {
  return Array.from({ length: CONFIG.GRID_ROWS }, () => new Array(CONFIG.GRID_COLS).fill(false))
}

function baseGrid() {
  const layout = Array.from({ length: CONFIG.GRID_ROWS }, () => new Array(CONFIG.GRID_COLS).fill(-1))
  for (let r = 14; r < 18; r++) {
    for (let c = 22; c < 26; c++) layout[r][c] = 0
  }
  const grid = new Grid()
  grid.init(makeWalls(), layout, [RED])
  return grid
}

function fakeGame(grid = null) {
  const team = { id: 1, name: { en: 'Egypt' }, color: RED, eliminated: false }
  return {
    teams: [team],
    marbles: [],
    scoring: { teamOf: (id) => (id === 'leader' ? 1 : null) },
    viewers: { viewers: new Map() },
    joinPrompt: { request: vi.fn(() => true) },
    vfx: { addPickupText: vi.fn() },
    camera: { shake: vi.fn() },
    particles: { emitSparks: vi.fn() },
    grid: grid || { worldToGrid: () => ({ row: 0, col: 0 }), paintColorBomb: () => 4 },
    spawnViewerMarble: vi.fn(() => ({
      x: 1, y: 1,
      applyPowerup: vi.fn(),
      overcharge: false,
      powerupTimer: 0,
    })),
  }
}

function mine() {
  return new Marble(600, 400, RED, 'me', { teamId: 1 })
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

describe('new power-ups', () => {
  it('freezes enemy soldiers but not its own', () => {
    const game = fakeGame()
    const friendly = mine()
    const enemy = new Marble(700, 300, BLUE, 'foe', { teamId: 2 })
    game.marbles.push(friendly, enemy)

    expect(fx.executeEffect(game, 'freeze', {}, { teamId: 1 })).toBe('freeze')
    expect(enemy.frozenTimer).toBeCloseTo(CONFIG.POWERUP_FREEZE_DURATION, 5)
    expect(friendly.frozenTimer).toBe(0)
  })

  it('overcharges the whole team on team_speed', () => {
    const game = fakeGame()
    const friendly = mine()
    const enemy = new Marble(700, 300, BLUE, 'foe', { teamId: 2 })
    game.marbles.push(friendly, enemy)

    expect(fx.executeEffect(game, 'team_speed', { duration: 5 }, { teamId: 1 })).toBe('team_speed')
    expect(friendly.overcharge).toBe(true)
    expect(friendly.powerupTimer).toBeCloseTo(5, 5)
    expect(enemy.overcharge).toBe(false)
  })

  it('hardens a shielded nation against capture, bombs and enclosures', () => {
    const grid = baseGrid()
    const game = fakeGame(grid)
    game.marbles.push(mine())

    expect(fx.executeEffect(game, 'shield', {}, { teamId: 1 })).toBe('shield')
    expect(grid.isShielded(RED)).toBe(true)

    const before = grid.countTiles(RED)
    expect(grid.convertOnHit(14, 25, BLUE).owned).toBe(false)
    grid.paintColorBomb(25, 15, BLUE, 2)
    expect(grid.countTiles(RED)).toBe(before)

    grid.tick((CONFIG.POWERUP_SHIELD_DURATION + 1) * 60)
    expect(grid.isShielded(RED)).toBe(false)
    expect(grid.convertOnHit(14, 25, BLUE).owned).toBe(true)
  })

  it('claims the whole frontier on claim_storm', () => {
    const grid = baseGrid()
    const game = fakeGame(grid)
    game.marbles.push(mine())

    const before = grid.countTiles(RED)
    expect(fx.executeEffect(game, 'claim_storm', {}, { teamId: 1 })).toBe('claim_storm')
    expect(grid.countTiles(RED)).toBe(before + 16)
  })

  it('paints a big area with mega_bomb', () => {
    const grid = baseGrid()
    const game = fakeGame(grid)
    game.marbles.push(new Marble(2, 2, RED, 'me', { teamId: 1 }))

    const before = grid.countTiles(RED)
    expect(fx.executeEffect(game, 'mega_bomb', {}, { teamId: 1 })).toBe('mega_bomb')
    expect(grid.countTiles(RED)).toBeGreaterThan(before)
  })

  it('summons allies carrying the activator identity', () => {
    const game = fakeGame()
    const out = fx.executeEffect(game, 'summon', { count: 3 }, {
      teamId: 1, userId: 'ahmad', username: 'ahmad', name: 'Ahmad', avatar: 'https://cdn/a.jpg',
    })
    expect(out).toBe('summon')
    expect(game.spawnViewerMarble).toHaveBeenCalledTimes(3)
    const profiles = game.spawnViewerMarble.mock.calls.map((call) => call[0])
    for (const profile of profiles) {
      expect(profile.name).toBe('Ahmad')
      expect(profile.avatar).toBe('https://cdn/a.jpg')
    }
    const ids = new Set(profiles.map((profile) => profile.id))
    expect(ids.size).toBe(3)
  })

  it('clamps out-of-range params', () => {
    const game = fakeGame()
    expect(fx.executeEffect(game, 'summon', { count: 9999 }, { teamId: 1, userId: 'leader' })).toBe('summon')
    expect(game.spawnViewerMarble).toHaveBeenCalledTimes(CONFIG.EFFECT_COUNT_MAX)
  })
})
