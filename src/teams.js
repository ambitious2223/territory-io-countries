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

  for (const team of teams) {
    for (const candidate of nameCandidates(team)) {
      if (normalizeKeyword(candidate) === normalized) return team
    }
  }

  let best = null
  let bestDistance = Infinity
  for (const team of teams) {
    for (const candidate of [team.name?.en, ...(team.aliases || [])].filter(Boolean)) {
      const key = normalizeKeyword(candidate)
      if (key.length < 3 || normalized.length < 3) continue
      const prefix = key.startsWith(normalized) || normalized.startsWith(key)
      const distance = prefix ? 0 : levenshtein(key, normalized)
      if ((prefix || distance <= 2) && distance < bestDistance) {
        bestDistance = distance
        best = team
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
