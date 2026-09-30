import { describe, it, expect } from 'vitest'
import { matchTeam, normalizeKeyword, levenshtein, findTeam } from '../src/teams.js'

const TEAMS = [
  {
    id: 1,
    index: 1,
    name: { en: 'Saudi Arabia', ar: 'السعودية' },
    iso2: 'SA',
    emoji: '🇸🇦',
    aliases: ['saudi', 'ksa']
  },
  {
    id: 2,
    index: 2,
    name: { en: 'Egypt', ar: 'مصر' },
    iso2: 'EG',
    emoji: '🇪🇬',
    aliases: ['masr', 'misr']
  },
  {
    id: 3,
    index: 3,
    name: { en: 'United Arab Emirates', ar: 'الإمارات' },
    iso2: 'AE',
    emoji: '🇦🇪',
    aliases: ['emirates', 'uae', 'dubai']
  }
]

describe('normalizeKeyword', () => {
  it('folds Arabic diacritics and letter variants', () => {
    expect(normalizeKeyword('السّعوديّة')).toBe(normalizeKeyword('السعودية'))
    expect(normalizeKeyword('الإمارات')).toBe(normalizeKeyword('الامارات'))
  })

  it('strips join prefixes and noise', () => {
    expect(normalizeKeyword('join Egypt')).toBe('egypt')
    expect(normalizeKeyword('#Egypt')).toBe('egypt')
  })
})

describe('levenshtein', () => {
  it('measures edit distance', () => {
    expect(levenshtein('saudi', 'saudia')).toBe(1)
    expect(levenshtein('egypt', 'egypt')).toBe(0)
  })
})

describe('matchTeam', () => {
  it('matches by team number', () => {
    expect(matchTeam(TEAMS, '2').id).toBe(2)
  })

  it('matches by ISO2 case-insensitively', () => {
    expect(matchTeam(TEAMS, 'ae').id).toBe(3)
  })

  it('matches by English name', () => {
    expect(matchTeam(TEAMS, 'Egypt').id).toBe(2)
  })

  it('matches by Arabic name with diacritics', () => {
    expect(matchTeam(TEAMS, 'السّعوديّة').id).toBe(1)
  })

  it('matches by flag emoji', () => {
    expect(matchTeam(TEAMS, '🇦🇪').id).toBe(3)
  })

  it('matches aliases', () => {
    expect(matchTeam(TEAMS, 'ksa').id).toBe(1)
    expect(matchTeam(TEAMS, 'dubai').id).toBe(3)
  })

  it('matches with a join prefix', () => {
    expect(matchTeam(TEAMS, 'join Brazil')).toBeNull()
    expect(matchTeam(TEAMS, 'join Egypt').id).toBe(2)
  })

  it('tolerates a small typo', () => {
    expect(matchTeam(TEAMS, 'saudia').id).toBe(1)
  })

  it('returns null for unknown input', () => {
    expect(matchTeam(TEAMS, 'zzzzzz')).toBeNull()
    expect(matchTeam(TEAMS, '')).toBeNull()
  })
})

describe('findTeam', () => {
  it('finds by id', () => {
    expect(findTeam(TEAMS, 2).name.en).toBe('Egypt')
    expect(findTeam(TEAMS, 99)).toBeNull()
  })
})
