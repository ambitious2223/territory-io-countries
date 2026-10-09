import { getLanguage } from './i18n.js'
import { teamLabel } from './teams.js'
import { subscribe as subscribeTeams } from './teamRegistry.js'

const marbleStamps = new WeakMap()
let stampSeq = 0
let lastSignature = ''
let buttons = []

function stamp(marble) {
  if (!marbleStamps.has(marble)) marbleStamps.set(marble, ++stampSeq)
  return marbleStamps.get(marble)
}

export function cameraPlayerList(game) {
  const list = []
  const viewers = game.viewers?.viewers
  if (!viewers) return list
  for (const viewer of viewers.values()) {
    if (viewer.isBot) continue
    const marble = viewer.marble
    if (!marble || !marble.alive || marble.eliminated) continue
    list.push({
      id: viewer.id,
      name: viewer.name || viewer.username || viewer.id,
      color: viewer.team?.color || marble.color,
      marble
    })
  }
  list.sort((a, b) => String(a.id).localeCompare(String(b.id)))
  return list
}

function signature(players) {
  return players.map((player) => `${player.id}:${stamp(player.marble)}`).join('|')
}

export function initCameraPanel(game) {
  const arenaBtn = document.getElementById('cam-arena')
  const leaderBtn = document.getElementById('cam-leader')
  const container = document.getElementById('cam-nations')
  if (!arenaBtn || !game.manualCamera) return
  arenaBtn.addEventListener('click', () => game.manualCamera.reset())
  leaderBtn?.addEventListener('click', () => game.manualCamera.focusLeader())
  const renderChips = () => {
    if (!container) return
    container.innerHTML = ''
    for (const team of game.teams) {
      const chip = document.createElement('button')
      chip.className = 'ctrl-btn'
      chip.style.flex = '1'
      chip.style.minWidth = '78px'
      const label = teamLabel(team, getLanguage())
      chip.textContent = team.emoji ? `${team.emoji} ${label}` : label
      chip.addEventListener('click', () => game.manualCamera.focusTeam(team.id))
      container.appendChild(chip)
    }
  }
  renderChips()
  subscribeTeams(renderChips)
}

export function updateCameraPanel(game) {
  if (!game.debugMode) return
  const container = document.getElementById('cam-players')
  if (!container) return
  const players = cameraPlayerList(game)
  const sig = signature(players)
  if (sig !== lastSignature) {
    lastSignature = sig
    container.innerHTML = ''
    buttons = []
    for (const player of players) {
      const button = document.createElement('button')
      button.className = 'cam-player-btn'
      button.style.setProperty('--team-color', player.color)
      button.textContent = player.name
      button.addEventListener('click', () => {
        const current = game.viewers?.viewers?.get(player.id)?.marble
        if (current && current.alive && !current.eliminated) {
          game.manualCamera?.followBall(current)
        }
      })
      container.appendChild(button)
      buttons.push({ id: player.id, button, marble: player.marble })
    }
  }
  const followed = game.manualCamera?.follow || null
  for (const entry of buttons) {
    const current = game.viewers?.viewers?.get(entry.id)?.marble
    const live = current && current.alive && !current.eliminated ? current : null
    entry.button.classList.toggle('active', Boolean(followed) && live === followed)
  }
}
