import defaultConfig from '../config/teams.json'

const STORAGE_KEY = 'twf_teams'
const PALETTE = ['#00CC44', '#FFD700', '#FF8C00', '#9B30FF', '#1E90FF', '#FF2222', '#FF00FF', '#00CED1']

const imageCache = new Map()
const listeners = new Set()

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadLocal() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed.teams) ? parsed : null
  } catch {
    return null
  }
}

function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    void 0
  }
}

let state = loadLocal() || clone(defaultConfig)

export function getConfig() {
  return state
}

export function getTeams() {
  return state.teams
}

export function getLimits() {
  return { minTeams: state.minTeams ?? 2, maxTeams: state.maxTeams ?? 12 }
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify() {
  for (const fn of listeners) fn(state)
}

function commit(next, shouldNotify = true) {
  state = next
  saveLocal()
  if (shouldNotify) notify()
}

export async function loadFromServer(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/teams`)
    if (!response.ok) return
    const data = await response.json()
    if (Array.isArray(data.teams)) commit(data)
  } catch {
    void 0
  }
}

export async function saveToServer(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/teams`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    })
    if (response.ok) commit(await response.json())
  } catch {
    void 0
  }
}

export function updateTeam(id, patch) {
  commit(
    {
      ...state,
      teams: state.teams.map((team) => {
        if (team.id !== id) return team
        const resolved = typeof patch === 'function' ? patch(team) : patch
        return { ...team, ...resolved }
      })
    },
    false
  )
}

export function addTeam() {
  const { maxTeams } = getLimits()
  if (state.teams.length >= maxTeams) return null
  const id = state.teams.reduce((max, team) => Math.max(max, team.id), 0) + 1
  const team = {
    id,
    index: state.teams.length + 1,
    name: { en: `Team ${id}`, ar: `فريق ${id}` },
    iso2: '',
    emoji: '🏳️',
    color: PALETTE[(id - 1) % PALETTE.length],
    flagImage: null,
    aliases: []
  }
  commit({ ...state, teams: [...state.teams, team] })
  return team
}

export function removeTeam(id) {
  const { minTeams } = getLimits()
  if (state.teams.length <= minTeams) return false
  commit({ ...state, teams: state.teams.filter((team) => team.id !== id) })
  return true
}

export async function uploadFlag(baseUrl, teamId, dataUrl) {
  const response = await fetch(`${baseUrl}/api/flags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, imageData: dataUrl })
  })
  const data = await response.json()
  if (data.url) updateTeam(teamId, { flagImage: data.url })
  return data
}

export function getFlagImage(team) {
  if (!team?.flagImage) return null
  let image = imageCache.get(team.flagImage)
  if (!image) {
    image = new Image()
    image.src = team.flagImage
    imageCache.set(team.flagImage, image)
  }
  return image
}
