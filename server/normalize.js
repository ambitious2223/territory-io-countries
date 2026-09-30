import { GIFT_DEDUPE_MAX } from './constants.js'

export function normalizeUsername(raw) {
  return String(raw || '').trim().replace(/^@+/, '').replace(/\s+/g, '')
}

export function pickUser(data = {}) {
  const user = data.user && typeof data.user === 'object' ? data.user : data
  const userId = user.userId ?? user.id ?? data.userId ?? data.uniqueId ?? ''
  const username =
    user.uniqueId ?? user.username ?? data.uniqueId ?? data.username ?? user.nickname ?? 'unknown'
  const name =
    user.nickname ?? user.nickName ?? user.name ?? data.nickname ?? user.uniqueId ?? 'Viewer'
  const avatar =
    user.profilePictureUrl ?? user.avatar ?? data.profilePictureUrl ?? data.avatar ?? ''
  return {
    userId: String(userId),
    username: String(username),
    name: String(name),
    avatar: String(avatar)
  }
}

export class Normalizer {
  constructor(source) {
    this.source = source
    this.seenGiftIds = new Set()
    this.giftOrder = []
    this.lastRoomLikeTotal = null
  }

  _base(data) {
    const user = pickUser(data)
    return { source: this.source, userId: user.userId, username: user.username, name: user.name, avatar: user.avatar, ts: Date.now() }
  }

  _dedupe(msgId) {
    if (!msgId) return false
    if (this.seenGiftIds.has(msgId)) return true
    this.seenGiftIds.add(msgId)
    this.giftOrder.push(msgId)
    if (this.giftOrder.length > GIFT_DEDUPE_MAX) {
      this.seenGiftIds.delete(this.giftOrder.shift())
    }
    return false
  }

  chat(data) {
    const message = data.comment ?? data.message ?? data.text ?? ''
    if (!message) return null
    return { ...this._base(data), type: 'chat', message: String(message) }
  }

  gift(data) {
    const giftType = data.giftType ?? data.gift?.gift_type
    const repeatEnd = data.repeatEnd ?? data.repeat_end
    if (giftType === 1 && !repeatEnd) return null

    const giftName = data.giftName ?? data.gift?.name ?? data.name ?? ''
    const giftId = String(data.giftId ?? data.gift?.id ?? data.gift?.gift_id ?? '')
    const baseCost = Number(data.diamondCount ?? data.diamond_count ?? data.gift?.diamond_count ?? data.coins ?? 0) || 0
    const repeatCount = Number(data.repeatCount ?? data.repeat_count ?? 1) || 1
    const coins = data.coins !== undefined && data.coins !== null ? Number(data.coins) || 0 : baseCost * repeatCount
    const msgId = String(data.msgId ?? data.msg_id ?? `${giftId}_${baseCost}_${repeatCount}_${giftName}`)
    if (this._dedupe(msgId)) return null

    return {
      ...this._base(data),
      type: 'gift',
      giftId,
      giftName: String(giftName),
      coins,
      repeatCount,
      msgId
    }
  }

  like(data) {
    const count = this._likeDelta(data)
    if (count <= 0) return null
    return { ...this._base(data), type: 'like', likeCount: count }
  }

  follow(data) {
    return { ...this._base(data), type: 'follow' }
  }

  share(data) {
    return { ...this._base(data), type: 'share' }
  }

  member(data) {
    return { ...this._base(data), type: 'member' }
  }

  _likeDelta(data) {
    const burst = Number(data.likeCount ?? data.like_count ?? data.count)
    const hasBurst = Number.isFinite(burst) && burst > 0
    const roomTotal = Number(data.totalLikeCount ?? data.total_like_count ?? data.totalLike ?? data.likeTotal)
    const hasRoom = Number.isFinite(roomTotal) && roomTotal >= 0

    if (hasRoom) {
      if (this.lastRoomLikeTotal === null) {
        this.lastRoomLikeTotal = roomTotal
        return hasBurst ? burst : 0
      }
      if (roomTotal > this.lastRoomLikeTotal) {
        const delta = roomTotal - this.lastRoomLikeTotal
        this.lastRoomLikeTotal = roomTotal
        return delta
      }
      if (roomTotal < this.lastRoomLikeTotal) {
        this.lastRoomLikeTotal = roomTotal
        return hasBurst ? burst : 0
      }
      return hasBurst ? burst : 0
    }

    return hasBurst ? burst : 1
  }
}
