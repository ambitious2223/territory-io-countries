export const EFFECT_OPTIONS = [
  { key: 'overcharge', label: 'Overcharge' },
  { key: 'shield', label: 'Shield' },
  { key: 'boost', label: 'Speed Boost' },
  { key: 'heal', label: 'Heal' },
  { key: 'colorbomb', label: 'Color Bomb' },
  { key: 'area_convert', label: 'Area Convert' },
  { key: 'spawn', label: 'Spawn Ally' },
  { key: 'instant_claim', label: 'Instant Claim' },
]

export function matchMapping(mappings, event) {
  if (!event || event.type !== 'gift') return null
  const list = Array.isArray(mappings) ? mappings : []
  const name = String(event.giftName || '').toLowerCase()
  const id = String(event.giftId || '')
  const coins = Number(event.coins) || 0

  for (const mapping of list) {
    if (!mapping || mapping.enabled === false) continue
    const rule = mapping.match || {}
    const hasCondition = rule.giftId || rule.giftName || rule.minCoins !== undefined
    if (!hasCondition) continue
    if (rule.giftId && String(rule.giftId) !== id) continue
    if (rule.giftName && !name.includes(String(rule.giftName).toLowerCase())) continue
    if (rule.minCoins !== undefined && coins < Number(rule.minCoins)) continue
    return mapping
  }
  return null
}

export function createMapping() {
  return {
    id: `map_${Date.now().toString(36)}`,
    enabled: true,
    match: { giftName: '' },
    effect: 'shield',
    params: {},
  }
}
