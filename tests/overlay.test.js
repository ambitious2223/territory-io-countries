import { describe, it, expect } from 'vitest'
import { buildOverlayPayload } from '../src/overlaySnapshot.js'

function fakeGame() {
  const teams = [
    { id: 1, name: { en: 'Saudi Arabia' }, iso2: 'SA', emoji: '🇸🇦', color: '#00CC44', flagImage: '/flags/sa.png', eliminated: false },
    { id: 2, name: { en: 'Egypt' }, iso2: 'EG', emoji: '🇪🇬', color: '#FFD700', flagImage: null, eliminated: false },
  ]
  const territoryCounts = new Map([[1, 40], [2, 30]])
  return {
    teams,
    territoryCounts,
    countTeamMarbles: (id) => (id === 1 ? 3 : 1),
    grid: { claimableTiles: 100 },
    round: { state: 'playing', timeLeft: 42.6, autoLoop: true },
  }
}

describe('buildOverlayPayload', () => {
  it('sorts teams by territory and annotates ranks and percents', () => {
    const payload = buildOverlayPayload(fakeGame())
    expect(payload.type).toBe('leaderboard')
    expect(payload.claimable).toBe(100)
    expect(payload.teams.map((t) => t.id)).toEqual([1, 2])
    expect(payload.teams[0]).toMatchObject({ rank: 1, tiles: 40, percent: 40 })
    expect(payload.teams[1]).toMatchObject({ rank: 2, tiles: 30, percent: 30 })
  })

  it('rounds the round timer and carries no feed', () => {
    const payload = buildOverlayPayload(fakeGame())
    expect(payload.round).toEqual({ state: 'playing', timeLeft: 43, autoLoop: true })
    expect(payload.feed).toBeUndefined()
  })

  it('keeps flag images and falls back safely', () => {
    const payload = buildOverlayPayload(fakeGame())
    expect(payload.teams[0].flagImage).toBe('/flags/sa.png')
    expect(payload.teams[1].flagImage).toBeNull()
  })
})
