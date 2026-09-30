import { describe, it, expect, vi } from 'vitest'
import { matchMapping } from '../src/mappings.js'
import { executeGiftEffect } from '../src/giftEffects.js'

const MAPPINGS = [
  { id: 'a', enabled: true, match: { giftName: 'Rose' }, effect: 'shield', params: {} },
  { id: 'b', enabled: false, match: { giftName: 'Heart' }, effect: 'boost', params: {} },
  { id: 'c', enabled: true, match: { minCoins: 1000 }, effect: 'area_convert', params: {} },
  { id: 'd', enabled: true, match: { minCoins: 100 }, effect: 'colorbomb', params: {} },
]

describe('matchMapping', () => {
  it('matches a gift by name (case-insensitive contains)', () => {
    expect(matchMapping(MAPPINGS, { type: 'gift', giftName: 'Rose x5', coins: 1 }).id).toBe('a')
  })

  it('skips disabled mappings', () => {
    expect(matchMapping(MAPPINGS, { type: 'gift', giftName: 'Heart', coins: 1 })).toBeNull()
  })

  it('honours coin thresholds and first-match order', () => {
    expect(matchMapping(MAPPINGS, { type: 'gift', giftName: 'Other', coins: 2000 }).id).toBe('c')
    expect(matchMapping(MAPPINGS, { type: 'gift', giftName: 'Other', coins: 200 }).id).toBe('d')
  })

  it('returns null below every threshold', () => {
    expect(matchMapping(MAPPINGS, { type: 'gift', giftName: 'Other', coins: 5 })).toBeNull()
  })

  it('ignores non-gift events', () => {
    expect(matchMapping(MAPPINGS, { type: 'like', likeCount: 5 })).toBeNull()
  })

  it('ignores rules with no condition', () => {
    expect(matchMapping([{ id: 'x', enabled: true, match: {}, effect: 'shield' }], { type: 'gift', coins: 10 })).toBeNull()
  })
})

describe('executeGiftEffect', () => {
  it('applies an effect to the gifter team marble', () => {
    const marble = {
      teamId: 1,
      alive: true,
      eliminated: false,
      x: 10,
      y: 10,
      hp: 100,
      maxHp: 100,
      applyPowerup: vi.fn(),
    }
    const game = {
      teams: [{ id: 1, name: { en: 'A' }, color: '#fff' }],
      marbles: [marble],
      scoring: { teamOf: () => 1 },
      viewers: { viewers: new Map() },
      vfx: { addPickupText: vi.fn() },
      grid: { worldToGrid: () => ({ row: 0, col: 0 }), paintColorBomb: () => 5 },
      particles: { emitSparks: vi.fn() },
      camera: { shake: vi.fn() },
      spawnViewerMarble: vi.fn(),
    }
    const result = executeGiftEffect(game, { effect: 'shield', params: {} }, { type: 'gift', userId: 'u' })
    expect(result).toBe('shield')
    expect(marble.applyPowerup).toHaveBeenCalledWith('shield', expect.any(Number))
  })

  it('returns null when the gifter has no team', () => {
    const game = {
      teams: [],
      marbles: [],
      scoring: { teamOf: () => null },
      viewers: { viewers: new Map() },
    }
    expect(executeGiftEffect(game, { effect: 'shield' }, { type: 'gift', userId: 'ghost' })).toBeNull()
  })
})
