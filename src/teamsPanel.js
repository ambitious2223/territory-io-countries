import { t } from './i18n.js'
import { CONFIG } from './config.js'
import { cropToAspect } from './imageUtils.js'
import {
  addTeam,
  getCapitalScale,
  getTeams,
  removeTeam,
  saveToServer,
  setCapitalScale,
  subscribe,
  updateTeam,
  uploadFlag
} from './teamRegistry.js'

let activeGame = null

export function initTeamsPanel(game) {
  activeGame = game
  const body = document.getElementById('teams-panel-body')
  if (!body) return

  document.getElementById('btn-teams-add')?.addEventListener('click', () => addTeam())
  document.getElementById('btn-teams-save')?.addEventListener('click', () => {
    saveToServer(activeGame?.bridge?.url || '')
  })

  initCapitalSlider()
  subscribe(() => renderTeamsPanel())
  renderTeamsPanel()
}

function initCapitalSlider() {
  const slider = document.getElementById('capital-scale')
  const label = document.getElementById('capital-scale-value')
  if (!slider || !label) return
  slider.min = String(CONFIG.CAP_SCALE_MIN)
  slider.max = String(CONFIG.CAP_SCALE_MAX)
  slider.step = String(CONFIG.CAP_SCALE_STEP)
  slider.value = String(getCapitalScale())
  label.textContent = `${getCapitalScale().toFixed(1)}x`
  slider.addEventListener('input', () => {
    setCapitalScale(slider.value)
    label.textContent = `${getCapitalScale().toFixed(1)}x`
  })
}

export function renderTeamsPanel() {
  const body = document.getElementById('teams-panel-body')
  if (!body) return
  body.innerHTML = ''
  for (const team of getTeams()) {
    body.appendChild(buildRow(team))
  }
}

function buildRow(team) {
  const row = document.createElement('div')
  row.className = 'team-row'

  const index = document.createElement('span')
  index.className = 'team-index'
  index.textContent = String(team.index ?? team.id)

  const emoji = document.createElement('span')
  emoji.className = 'team-emoji'
  if (team.flagImage) {
    const preview = document.createElement('img')
    preview.className = 'team-flag-preview'
    preview.src = team.flagImage
    preview.alt = ''
    emoji.appendChild(preview)
  } else {
    emoji.textContent = team.emoji || '🏳️'
  }

  const color = document.createElement('input')
  color.type = 'color'
  color.className = 'team-color'
  color.value = team.color || '#cccccc'
  color.addEventListener('input', () => updateTeam(team.id, { color: color.value }))

  const en = document.createElement('input')
  en.className = 'team-name'
  en.value = team.name?.en || ''
  en.placeholder = 'English'
  en.addEventListener('input', () => {
    updateTeam(team.id, (current) => ({ name: { ...current.name, en: en.value } }))
  })

  const ar = document.createElement('input')
  ar.className = 'team-name'
  ar.dir = 'rtl'
  ar.value = team.name?.ar || ''
  ar.placeholder = 'عربي'
  ar.addEventListener('input', () => {
    updateTeam(team.id, (current) => ({ name: { ...current.name, ar: ar.value } }))
  })

  const iso = document.createElement('input')
  iso.className = 'team-iso'
  iso.maxLength = 2
  iso.value = team.iso2 || ''
  iso.placeholder = 'ISO'
  iso.addEventListener('input', () => updateTeam(team.id, { iso2: iso.value.toUpperCase() }))

  const flag = document.createElement('input')
  flag.type = 'file'
  flag.className = 'team-flag'
  flag.accept = 'image/png,image/jpeg,image/webp'
  flag.addEventListener('change', () => pickFlag(team.id, flag))

  const remove = document.createElement('button')
  remove.className = 'team-remove'
  remove.textContent = '✕'
  remove.title = t('debug.remove')
  remove.addEventListener('click', () => removeTeam(team.id))

  row.append(index, emoji, color, en, ar, iso, flag, remove)
  return row
}

function pickFlag(teamId, input) {
  const file = input.files?.[0]
  if (!file) return
  input.disabled = true
  input.title = 'Uploading…'
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const normalized = await cropToAspect(reader.result)
      const result = await uploadFlag(activeGame?.bridge?.url || '', teamId, normalized)
      if (result?.error) {
        input.disabled = false
        input.title = result.error
        console.warn('Flag upload failed:', result.error)
      }
    } catch (error) {
      input.disabled = false
      input.title = error.message
      console.warn('Flag processing failed:', error.message)
    }
  }
  reader.readAsDataURL(file)
}
