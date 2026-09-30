const STORAGE_KEY = 'twf_winners'
const EMPTY = { teams: [], players: [] }

let baseUrl = ''
let state = loadLocal()

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    void 0
  }
  return { ...EMPTY }
}

function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    void 0
  }
}

function localAdd(board, entry) {
  const list = Array.isArray(state[board]) ? state[board].map((item) => ({ ...item })) : []
  const existing = list.find((item) => item.id === entry.id)
  if (existing) {
    existing.wins = (existing.wins || 0) + 1
    if (entry.score !== undefined) existing.score = entry.score
  } else {
    list.push({ ...entry, wins: 1 })
  }
  list.sort((a, b) => b.wins - a.wins)
  return { ...state, [board]: list }
}

export function setBaseUrl(url) {
  baseUrl = url
}

export function getWinners() {
  return state
}

export async function loadWinners() {
  try {
    const response = await fetch(`${baseUrl}/api/winners`)
    if (response.ok) {
      state = await response.json()
      saveLocal()
    }
  } catch {
    void 0
  }
  return state
}

export async function addWinner(board, entry) {
  try {
    const response = await fetch(`${baseUrl}/api/winners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board, entry })
    })
    if (response.ok) {
      state = await response.json()
      saveLocal()
      return state
    }
  } catch {
    void 0
  }
  state = localAdd(board, entry)
  saveLocal()
  return state
}
