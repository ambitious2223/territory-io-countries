import { EventEmitter } from 'events'
import { getConfig, saveConfig } from './stores/configStore.js'
import { connectDirect } from './directBridge.js'
import { connectTikfinity } from './tikfinityBridge.js'
import { BRIDGE_RETRY_MS, MAX_SOURCE_FAILS, TIKFINITY_RETRY_MS } from './constants.js'

export class ConnectionManager extends EventEmitter {
  constructor() {
    super()
    this.status = { source: 'none', tiktokState: 'idle', roomId: null, lastError: null }
    this.connection = null
    this.manual = false
    this.failCount = 0
    this.retryTimer = null
  }

  snapshot() {
    const config = getConfig()
    return {
      username: config.username,
      mode: config.mode,
      tikfinityHost: config.tikfinityHost,
      tikfinityPort: config.tikfinityPort,
      source: this.status.source,
      tiktokState: this.status.tiktokState,
      roomId: this.status.roomId,
      lastError: this.status.lastError
    }
  }

  emitEvent(event) {
    if (event) this.emit('event', event)
  }

  _status(partial) {
    Object.assign(this.status, partial)
    this.emit('status', this.snapshot())
  }

  _teardown() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    try {
      this.connection?.stop()
    } catch {
      void 0
    }
    this.connection = null
  }

  _scheduleRetry(fn, ms) {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = setTimeout(() => {
      if (!this.manual) fn()
    }, ms)
  }

  start() {
    this.manual = false
    this.failCount = 0
    this._teardown()

    const config = getConfig()
    if (config.mode === 'mock' || (config.mode === 'auto' && !config.username)) {
      this._status({ source: 'mock', tiktokState: 'live', roomId: null, lastError: null })
      return
    }
    if (config.mode === 'tikfinity') {
      this._connectTikfinity()
      return
    }
    this._connectDirect()
  }

  stop() {
    this.manual = true
    this._teardown()
    this._status({ source: 'none', tiktokState: 'idle', roomId: null })
  }

  reconnect(partial = {}) {
    const hasConfig = ['username', 'mode', 'tikfinityHost', 'tikfinityPort', 'tikoraRelayUrl']
      .some((key) => partial[key] !== undefined)
    if (hasConfig) saveConfig(partial)
    this.stop()
    this.start()
  }

  _connectDirect() {
    const config = getConfig()
    this._status({ tiktokState: 'connecting', source: 'direct', lastError: null })

    this.connection = connectDirect({
      username: config.username,
      onEvent: (event) => this.emitEvent(event),
      onStatus: (status) => {
        if (status.tiktokState === 'live') this.failCount = 0
        this._status(status)
        if (status.tiktokState === 'offline' || status.tiktokState === 'error') {
          this._handleDirectFailure()
        }
      }
    })

    Promise.resolve(this.connection.start()).catch(() => this._handleDirectFailure())
  }

  _handleDirectFailure() {
    if (this.manual) return
    this.failCount += 1
    if (getConfig().mode === 'auto' && this.failCount >= MAX_SOURCE_FAILS) {
      this._teardown()
      this._connectTikfinity()
      return
    }
    this._teardown()
    this._scheduleRetry(() => this.start(), BRIDGE_RETRY_MS)
  }

  _connectTikfinity() {
    const config = getConfig()
    this._status({ tiktokState: 'connecting', source: 'tikfinity', lastError: null })

    this.connection = connectTikfinity({
      host: config.tikfinityHost,
      port: config.tikfinityPort,
      onEvent: (event) => this.emitEvent(event),
      onStatus: (status) => {
        this._status(status)
        if (status.tiktokState === 'offline' || status.tiktokState === 'error') {
          this._retryTikfinity()
        }
      }
    })

    Promise.resolve(this.connection.start()).catch(() => this._retryTikfinity())
  }

  _retryTikfinity() {
    if (this.manual) return
    this._scheduleRetry(() => this._connectTikfinity(), TIKFINITY_RETRY_MS)
  }
}
