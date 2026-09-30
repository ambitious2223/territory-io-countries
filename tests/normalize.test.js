import { describe, it, expect } from 'vitest'
import { Normalizer, pickUser, normalizeUsername } from '../server/normalize.js'

describe('normalizeUsername', () => {
  it('strips @ and whitespace', () => {
    expect(normalizeUsername('  @User Name ')).toBe('UserName')
  })
})

describe('pickUser', () => {
  it('reads the nested connector shape', () => {
    const user = pickUser({ user: { uniqueId: 'a', nickname: 'Ann', profilePictureUrl: 'p' } })
    expect(user).toEqual({ userId: '', username: 'a', name: 'Ann', avatar: 'p' })
  })

  it('reads the flat shape', () => {
    const user = pickUser({ uniqueId: 'b', nickname: 'Bob', profilePictureUrl: 'q' })
    expect(user.username).toBe('b')
    expect(user.name).toBe('Bob')
    expect(user.avatar).toBe('q')
  })
})

describe('Normalizer gift', () => {
  it('skips intermediate combo events', () => {
    const normalizer = new Normalizer('direct')
    expect(normalizer.gift({ giftType: 1, repeatEnd: false })).toBeNull()
  })

  it('scales coins by repeat count', () => {
    const normalizer = new Normalizer('direct')
    const event = normalizer.gift({
      giftId: 1,
      giftName: 'Rose',
      diamondCount: 5,
      repeatCount: 3,
      repeatEnd: true,
      msgId: 'm1',
      uniqueId: 'x'
    })
    expect(event.coins).toBe(15)
    expect(event.type).toBe('gift')
  })

  it('dedupes by msgId', () => {
    const normalizer = new Normalizer('direct')
    const base = { giftId: 1, diamondCount: 5, repeatCount: 1, repeatEnd: true, msgId: 'dup', uniqueId: 'x' }
    expect(normalizer.gift(base)).not.toBeNull()
    expect(normalizer.gift(base)).toBeNull()
  })
})

describe('Normalizer like', () => {
  it('reconstructs deltas from the room total', () => {
    const normalizer = new Normalizer('direct')
    expect(normalizer.like({ totalLikeCount: 100, uniqueId: 'x' })).toBeNull()
    expect(normalizer.like({ totalLikeCount: 105, uniqueId: 'x' }).likeCount).toBe(5)
  })

  it('falls back to the event burst count', () => {
    const normalizer = new Normalizer('direct')
    expect(normalizer.like({ likeCount: 7, uniqueId: 'x' }).likeCount).toBe(7)
  })
})

describe('Normalizer chat', () => {
  it('ignores empty messages', () => {
    const normalizer = new Normalizer('direct')
    expect(normalizer.chat({ comment: '' })).toBeNull()
  })

  it('returns the message', () => {
    const normalizer = new Normalizer('direct')
    expect(normalizer.chat({ comment: 'SA', uniqueId: 'x' }).message).toBe('SA')
  })
})
