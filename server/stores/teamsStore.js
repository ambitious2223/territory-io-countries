import { TEAMS_PATH } from '../constants.js'
import { readJson, writeJson } from './store.js'

const DEFAULTS = { minTeams: 2, maxTeams: 12, teams: [] }

let cache = null

export function getTeamsConfig() {
  if (!cache) cache = readJson(TEAMS_PATH, DEFAULTS)
  return cache
}

export function saveTeamsConfig(data) {
  const next = { ...getTeamsConfig(), ...data }
  cache = next
  writeJson(TEAMS_PATH, next)
  return next
}

export function updateTeam(id, patch) {
  const config = getTeamsConfig()
  const teams = config.teams.map((team) => (team.id === id ? { ...team, ...patch } : team))
  return saveTeamsConfig({ teams })
}
