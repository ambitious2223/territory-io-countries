import defaultConfig from '../config/teams.json'
import { CONFIG } from './config.js'

const STORAGE_KEY = 'twf_teams'
const PALETTE = ['#00CC44', '#FFD700', '#FF8C00', '#9B30FF', '#1E90FF', '#FF2222', '#FF00FF', '#00CED1']

const imageCache = new Map()
const panelListeners = new Set()
const gameListeners = new Set()

let baseUrl = ''
let autoSaveTimer = null

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
if (!Number.isFinite(state.capitalScale)) {
  state = { ...state, capitalScale: CONFIG.CAP_SCALE_DEFAULT }
}

export function getConfig() {
  return state
}

export function getTeams() {
  return state.teams
}

export function getLimits() {
  return { minTeams: state.minTeams ?? 2, maxTeams: state.maxTeams ?? 12 }
}

export function getCapitalScale() {
  return Number.isFinite(state.capitalScale) ? state.capitalScale : CONFIG.CAP_SCALE_DEFAULT
}

export function setBaseUrl(url) {
  baseUrl = url || ''
}

export function subscribe(fn) {
  panelListeners.add(fn)
  return () => panelListeners.delete(fn)
}

export function subscribeGame(fn) {
  gameListeners.add(fn)
  return () => gameListeners.delete(fn)
}

function notifyPanel() {
  for (const fn of panelListeners) fn(state)
}

function notifyGame() {
  for (const fn of gameListeners) fn(state)
}

function commit(next, options = {}) {
  state = next
  saveLocal()
  const { panel = true, game = true } = options
  if (panel) notifyPanel()
  if (game) notifyGame()
}

export function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null
    void saveToServer()
  }, CONFIG.TEAMS_AUTOSAVE_MS)
}

export function flushAutoSave() {
  if (!autoSaveTimer) return
  clearTimeout(autoSaveTimer)
  autoSaveTimer = null
  void saveToServer()
}

export async function loadFromServer(url = baseUrl) {
  try {
    const response = await fetch(`${url}/api/teams`)
    if (!response.ok) return
    const data = await response.json()
    if (Array.isArray(data.teams)) commit(data)
  } catch {
    void 0
  }
}

export async function saveToServer(url = baseUrl) {
  try {
    const response = await fetch(`${url}/api/teams`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    })
    if (!response.ok) return
    state = { ...state, ...(await response.json()) }
    saveLocal()
    notifyGame()
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
    { panel: false, game: false }
  )
  scheduleAutoSave()
}

export function setCapitalScale(scale) {
  const clamped = Math.min(
    CONFIG.CAP_SCALE_MAX,
    Math.max(CONFIG.CAP_SCALE_MIN, Number(scale) || CONFIG.CAP_SCALE_DEFAULT)
  )
  commit({ ...state, capitalScale: clamped }, { panel: false, game: true })
  scheduleAutoSave()
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
  scheduleAutoSave()
  return team
}

export function removeTeam(id) {
  const { minTeams } = getLimits()
  if (state.teams.length <= minTeams) return false
  commit({ ...state, teams: state.teams.filter((team) => team.id !== id) })
  scheduleAutoSave()
  return true
}

export async function uploadFlag(url, teamId, dataUrl) {
  const response = await fetch(`${url}/api/flags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, imageData: dataUrl })
  })
  const data = await response.json()
  if (data.url) {
    commit(
      {
        ...state,
        teams: state.teams.map((team) => (team.id === teamId ? { ...team, flagImage: data.url } : team))
      },
      { panel: true, game: true }
    )
    scheduleAutoSave()
  }
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

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('beforeunload', flushAutoSave)
}
