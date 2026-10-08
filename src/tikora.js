import manifest from '../tikora.manifest.json'
import { loadHubClient, DEFAULT_TIKORA_RELAY_URL } from './tikoraClient.js'
import { executeEffect } from './giftEffects.js'

export class TikoraHub {
  constructor(game) {
    this.game = game
    this.api = null
    this.status = 'off'
    this.onStatus = null
  }

  get capabilities() {
    return {
      effects: manifest.effects.map((effect) => ({ key: effect.key, label: effect.label }))
    }
  }

  async connect(options = {}) {
    const relayUrl = options.relayUrl || DEFAULT_TIKORA_RELAY_URL
    const slug = options.slug || manifest.slug
    const key = options.key || ''

    const ready = await loadHubClient(relayUrl)
    if (!ready || !window.connectHub) {
      this._setStatus('unavailable')
      return false
    }

    this._setStatus('connecting')
    this.api = window.connectHub({
      url: relayUrl,
      gameSlug: slug,
      apiKey: key,
      capabilities: this.capabilities,
      onReady: () => this._setStatus('connected'),
      onWelcome: () => this._setStatus('connected'),
      onEffect: (message) => this._handleEffect(message),
      onError: () => this._setStatus('error'),
      onDisconnect: () => this._setStatus('disconnected'),
      onReconnect: () => this._setStatus('connecting')
    })
    return true
  }

  _handleEffect(message = {}) {
    const payload = message.payload || {}
    const event = message.event || {}
    const stats = this.game?.effectStats
    if (stats) {
      stats.received += 1
      stats.lastKey = message.effect || '-'
    }
    console.log(`[hub] effect ${message.effect || '?'} from ${event.username || 'unknown'}`)
    const effectKey = executeEffect(this.game, message.effect, payload, {
      userId: event.userId ?? event.uniqueId ?? event.username ?? payload.username,
      username: event.username ?? payload.username,
      name: event.name ?? payload.username,
      avatar: event.avatar || payload.avatar || '',
      teamId: payload.teamId
    })
    this.api?.ackEffect?.(message.id, { ok: Boolean(effectKey) })
  }

  disconnect() {
    try {
      this.api?.close?.()
    } catch {
      void 0
    }
    this.api = null
    this._setStatus('off')
  }

  _setStatus(status) {
    this.status = status
    if (this.onStatus) this.onStatus(status)
  }
}
