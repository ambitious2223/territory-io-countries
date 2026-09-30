import { describe, it, expect } from 'vitest'
import { ScoringEngine, DEFAULT_WEIGHTS } from '../src/scoring.js'

function engine() {
  const scoring = new ScoringEngine()
  scoring.registerUser('u1', 1)
  scoring.registerUser('u2', 2)
  return scoring
}

describe('ScoringEngine events', () => {
  it('scores gifts dominant by coin value', () => {
    const scoring = engine()
    expect(scoring.applyEvent({ type: 'gift', userId: 'u1', coins: 100 })).toBe(100 * DEFAULT_WEIGHTS.giftPerCoin)
    expect(scoring.interactionScore(1)).toBe(100)
  })

  it('ignores events from users with no team', () => {
    const scoring = engine()
    expect(scoring.applyEvent({ type: 'gift', userId: 'ghost', coins: 50 })).toBe(0)
  })

  it('scores likes by weight', () => {
    const scoring = engine()
    scoring.applyEvent({ type: 'like', userId: 'u1', likeCount: 10 })
    expect(scoring.interactionScore(1)).toBeCloseTo(10 * DEFAULT_WEIGHTS.like, 5)
  })

  it('scores a comment only once per user', () => {
    const scoring = engine()
    expect(scoring.applyEvent({ type: 'chat', userId: 'u1', message: 'hi' })).toBe(DEFAULT_WEIGHTS.comment)
    expect(scoring.applyEvent({ type: 'chat', userId: 'u1', message: 'again' })).toBe(0)
  })

  it('scores follow and share once per user', () => {
    const scoring = engine()
    expect(scoring.applyEvent({ type: 'follow', userId: 'u1' })).toBe(DEFAULT_WEIGHTS.follow)
    expect(scoring.applyEvent({ type: 'follow', userId: 'u1' })).toBe(0)
    expect(scoring.applyEvent({ type: 'share', userId: 'u1' })).toBe(DEFAULT_WEIGHTS.share)
    expect(scoring.applyEvent({ type: 'share', userId: 'u1' })).toBe(0)
  })
})

describe('ScoringEngine settlement', () => {
  it('combines territory and interaction', () => {
    const scoring = engine()
    scoring.applyEvent({ type: 'gift', userId: 'u1', coins: 10 })
    scoring.setTerritory(1, 40)
    expect(scoring.territoryScore(1)).toBe(40 * DEFAULT_WEIGHTS.tile)
    expect(scoring.combined(1)).toBeCloseTo(10 + 40 * DEFAULT_WEIGHTS.tile, 5)
  })

  it('ranks the leaderboard by combined score', () => {
    const scoring = engine()
    scoring.applyEvent({ type: 'gift', userId: 'u2', coins: 100 })
    scoring.setTerritory(1, 100)
    const board = scoring.leaderboard([1, 2])
    expect(board[0].teamId).toBe(2)
  })

  it('resets all state', () => {
    const scoring = engine()
    scoring.applyEvent({ type: 'gift', userId: 'u1', coins: 10 })
    scoring.reset()
    expect(scoring.interactionScore(1)).toBe(0)
    expect(scoring.teamOf('u1')).toBeNull()
  })
})
