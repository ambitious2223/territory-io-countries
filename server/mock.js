let seq = 0

export function buildMockEvent(input = {}) {
  const type = String(input.type || 'chat').toLowerCase()
  const username = String(input.username || 'mock_viewer').trim() || 'mock_viewer'
  const value = Number(input.value) || 1
  const base = {
    source: 'mock',
    userId: `mock_${username}`,
    username,
    name: username,
    avatar: '',
    ts: Date.now()
  }

  switch (type) {
    case 'gift':
      return {
        ...base,
        type: 'gift',
        giftId: String(input.giftId || 'mock'),
        giftName: String(input.giftName || 'Mock Gift'),
        coins: value,
        repeatCount: 1,
        msgId: `mock_${Date.now()}_${seq++}`
      }
    case 'like':
      return { ...base, type: 'like', likeCount: value }
    case 'follow':
      return { ...base, type: 'follow' }
    case 'share':
      return { ...base, type: 'share' }
    case 'member':
      return { ...base, type: 'member' }
    default:
      return { ...base, type: 'chat', message: String(input.message || value) }
  }
}
