import { describe, it, expect } from 'vitest'
import { overlayRows, overlaySignature } from '../src/overlay/overlayModel.js'

function payload() {
  return {
    round: { state: 'playing', timeLeft: 42 },
    teams: [
      { id: 1, name: 'Saudi Arabia', nameAr: 'السعودية', emoji: '🇸🇦', flagImage: '/flags/sa.png', tiles: 40, percent: 40, eliminated: false },
      { id: 2, name: 'Egypt', nameAr: 'مصر', emoji: '🇪🇬', flagImage: null, tiles: 0, percent: 0, eliminated: true },
      { id: 3, name: 'Qatar', nameAr: 'قطر', emoji: '🇶🇦', flagImage: null, tiles: 20, percent: 20, eliminated: false },
    ],
  }
}

describe('overlayRows', () => {
  it('maps teams to rows with rank, crown and flag', () => {
    const rows = overlayRows(payload(), { rows: 12, lang: 'en' })
    expect(rows.map((r) => r.id)).toEqual(['1', '2', '3'])
    expect(rows[0]).toMatchObject({ rank: 1, label: 'Saudi Arabia', percent: 40, crown: true, flagImage: '/flags/sa.png' })
    expect(rows[1]).toMatchObject({ rank: 2, eliminated: true, crown: false, flagImage: '' })
  })

  it('uses the Arabic name when the language is Arabic', () => {
    const rows = overlayRows(payload(), { rows: 12, lang: 'ar' })
    expect(rows[0].label).toBe('السعودية')
  })

  it('honours the row limit', () => {
    expect(overlayRows(payload(), { rows: 2, lang: 'en' })).toHaveLength(2)
  })
})

describe('overlaySignature', () => {
  it('is stable for identical state and changes when a percent moves', () => {
    const a = overlaySignature(payload(), { rows: 12, lang: 'en' })
    const b = overlaySignature(payload(), { rows: 12, lang: 'en' })
    expect(a).toBe(b)

    const moved = payload()
    moved.teams[0].percent = 41
    expect(overlaySignature(moved, { rows: 12, lang: 'en' })).not.toBe(a)
  })
})
