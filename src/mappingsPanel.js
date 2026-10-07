import { EFFECT_OPTIONS } from './mappings.js'
import { t } from './i18n.js'
import {
  addMapping,
  getMappings,
  removeMapping,
  saveToServer,
  subscribe,
  updateMapping
} from './mappingsStore.js'

export function initMappingsPanel() {
  const body = document.getElementById('mappings-panel-body')
  if (!body) return
  document.getElementById('btn-mappings-add')?.addEventListener('click', () => addMapping())
  document.getElementById('btn-mappings-save')?.addEventListener('click', () => saveToServer())
  subscribe(() => renderMappingsPanel())
  renderMappingsPanel()
}

export function renderMappingsPanel() {
  const body = document.getElementById('mappings-panel-body')
  if (!body) return
  body.innerHTML = ''
  for (const mapping of getMappings()) {
    body.appendChild(buildRow(mapping))
  }
}

function buildRow(mapping) {
  const row = document.createElement('div')
  row.className = 'mapping-row'

  const enabled = document.createElement('input')
  enabled.type = 'checkbox'
  enabled.checked = mapping.enabled !== false
  enabled.addEventListener('change', () => updateMapping(mapping.id, { enabled: enabled.checked }))

  const gift = document.createElement('input')
  gift.className = 'mapping-input'
  gift.placeholder = t('mapping.giftPlaceholder')
  gift.value = mapping.match?.giftName || ''
  gift.addEventListener('input', () => updateMapping(mapping.id, { match: { giftName: gift.value } }))

  const coins = document.createElement('input')
  coins.className = 'mapping-coins'
  coins.type = 'number'
  coins.placeholder = t('mapping.minPlaceholder')
  coins.value = mapping.match?.minCoins ?? ''
  coins.addEventListener('input', () => {
    updateMapping(mapping.id, {
      match: { minCoins: coins.value === '' ? undefined : Number(coins.value) }
    })
  })

  const select = document.createElement('select')
  select.className = 'mapping-select'
  for (const option of EFFECT_OPTIONS) {
    const opt = document.createElement('option')
    opt.value = option.key
    opt.textContent = t(`effect.${option.key}`, option.label)
    select.appendChild(opt)
  }
  select.value = mapping.effect
  select.addEventListener('change', () => updateMapping(mapping.id, { effect: select.value }))

  const remove = document.createElement('button')
  remove.className = 'mapping-remove'
  remove.textContent = '✕'
  remove.addEventListener('click', () => removeMapping(mapping.id))

  row.append(enabled, gift, coins, select, remove)
  return row
}
