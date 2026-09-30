import { WINNERS_PATH } from '../constants.js'
import { readJson, writeJson } from './store.js'

const DEFAULTS = { teams: [], players: [] }
const BOARDS = ['teams', 'players']

let cache = null

export function getWinners() {
  if (!cache) cache = { ...DEFAULTS, ...readJson(WINNERS_PATH, DEFAULTS) }
  return cache
}

export function addWinner(board, entry) {
  if (!BOARDS.includes(board) || !entry || entry.id === undefined) return getWinners()
  const data = getWinners()
  const list = Array.isArray(data[board]) ? data[board].map((item) => ({ ...item })) : []
  const existing = list.find((item) => item.id === entry.id)
  if (existing) {
    existing.wins = (existing.wins || 0) + 1
    if (entry.score !== undefined) existing.score = entry.score
  } else {
    list.push({ ...entry, wins: 1 })
  }
  list.sort((a, b) => b.wins - a.wins)
  cache = { ...data, [board]: list }
  writeJson(WINNERS_PATH, cache)
  return cache
}

export function clearWinners(board) {
  if (!BOARDS.includes(board)) return getWinners()
  cache = { ...getWinners(), [board]: [] }
  writeJson(WINNERS_PATH, cache)
  return cache
}
