const ARABIC_DIACRITICS = /[\u064b-\u0652\u0670]/g
const TATWEEL = /\u0640/g
const LEADING_NOISE = /^[@#/!]+/
const LEADING_JOIN = /^(join|انضم)\s+/

export function normalizeKeyword(input) {
  let text = String(input ?? '').trim().toLowerCase()
  text = text.replace(LEADING_NOISE, '')
  text = text.replace(LEADING_JOIN, '')
  text = text.replace(ARABIC_DIACRITICS, '')
  text = text.replace(TATWEEL, '')
  text = text.replace(/[أإآٱ]/g, 'ا')
  text = text.replace(/ى/g, 'ي')
  text = text.replace(/ة/g, 'ه')
  text = text.replace(/ؤ/g, 'و')
  text = text.replace(/ئ/g, 'ي')
  text = text.replace(/\s+/g, ' ').trim()
  return text
}

export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
    }
    previous = current
  }
  return previous[b.length]
}

function nameCandidates(team) {
  return [team.name?.en, team.name?.ar, ...(team.aliases || [])].filter(Boolean)
}

const ARABIC_WORD = /[؀-ۿ]/

function editLimit(length) {
  if (length >= 10) return 3
  if (length >= 6) return 2
  if (length >= 4) return 1
  return 0
}

function splitWords(text) {
  return text.split(/[\s,.،؛:!؟…"'()\-–—]+/).filter(Boolean)
}

function candidateKeys(team) {
  const keys = []
  for (const source of nameCandidates(team)) {
    const key = normalizeKeyword(source)
    if (!key) continue
    keys.push(key)
    if (ARABIC_WORD.test(key)) {
      const bare = key.replace(/^ال/, '')
      if (bare && bare !== key) keys.push(bare)
    }
  }
  return [...new Set(keys)]
}

function commentVariants(normalized) {
  const variants = [normalized]
  if (normalized.startsWith('ال') && normalized.length > 4) {
    const bare = normalized.slice(2)
    if (bare) variants.push(bare)
  }
  return variants
}

export function matchTeam(teams, rawInput) {
  const raw = String(rawInput ?? '').trim()
  if (!raw || !Array.isArray(teams) || teams.length === 0) return null

  for (const team of teams) {
    if (team.emoji && raw === team.emoji) return team
  }

  const normalized = normalizeKeyword(raw)
  if (!normalized) return null

  if (/^\d+$/.test(normalized)) {
    const number = Number(normalized)
    const byNumber = teams.find((team) => team.index === number || team.id === number)
    if (byNumber) return byNumber
  }

  const upper = raw.replace(LEADING_NOISE, '').trim().toUpperCase()
  const byIso = teams.find((team) => team.iso2 && upper === String(team.iso2).toUpperCase())
  if (byIso) return byIso

  const variants = commentVariants(normalized)
  const commentWords = new Set(
    variants.flatMap((variant) => splitWords(variant)).filter((word) => word.length >= 3)
  )

  for (const team of teams) {
    const keys = candidateKeys(team)
    for (const key of keys) {
      if (variants.includes(key)) return team
    }
  }

  for (const team of teams) {
    for (const key of candidateKeys(team)) {
      for (const word of splitWords(key)) {
        if (word.length >= 3 && commentWords.has(word)) return team
      }
    }
  }

  for (const team of teams) {
    for (const key of candidateKeys(team)) {
      if (key.length < 3) continue
      for (const variant of variants) {
        if (variant.length < 3) continue
        if (key.startsWith(variant) || variant.startsWith(key)) return team
      }
    }
  }

  let best = null
  let bestDistance = Infinity
  for (const team of teams) {
    const keys = candidateKeys(team)
    const fuzzyTargets = []
    for (const key of keys) {
      fuzzyTargets.push(key)
      if (key.includes(' ')) fuzzyTargets.push(...splitWords(key))
    }
    for (const target of fuzzyTargets) {
      if (target.length < 4) continue
      const limit = editLimit(target.length)
      if (limit === 0) continue
      for (const variant of variants) {
        if (variant.length < 3) continue
        if (Math.abs(target.length - variant.length) > limit) continue
        const distance = levenshtein(target, variant)
        if (distance <= limit && distance < bestDistance) {
          bestDistance = distance
          best = team
        }
      }
    }
  }
  return best
}

export function findTeam(teams, id) {
  return teams.find((team) => team.id === id) ?? null
}

export function teamLabel(team, language = 'en') {
  if (!team) return ''
  return team.name?.[language] || team.name?.en || team.emoji || `Team ${team.id}`
}
