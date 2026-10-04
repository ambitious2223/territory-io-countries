import { io } from 'socket.io-client'

const DEFAULT_BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3020'

export class BridgeClient {
  constructor(url = DEFAULT_BRIDGE_URL) {
    this.url = url
    this.socket = null
    this.eventListeners = new Set()
    this.statusListeners = new Set()
    this.overlayListeners = new Set()
  }

  connect() {
    if (this.socket) return
    this.socket = io(this.url, { transports: ['websocket', 'polling'] })

    this.socket.on('connect', () => this._emit('status', { bridgeOk: true }))
    this.socket.on('disconnect', () => this._emit('status', { bridgeOk: false, tiktokState: 'offline' }))
    this.socket.on('connect_error', (err) => {
      this._emit('status', { bridgeOk: false, tiktokState: 'offline', lastError: err.message })
    })

    this.socket.on('tiktok-event', (event) => this._emit('event', event))
    this.socket.on('tiktok:status', (status) => this._emit('status', status))
    this.socket.on('overlay:leaderboard', (payload) => this._emitOverlay(payload))
  }

  onOverlay(fn) {
    this.overlayListeners.add(fn)
    return () => this.overlayListeners.delete(fn)
  }

  sendOverlay(payload) {
    this.socket?.emit('overlay:state', payload)
  }

  _emitOverlay(payload) {
    for (const fn of this.overlayListeners) fn(payload)
  }

  onEvent(fn) {
    this.eventListeners.add(fn)
    return () => this.eventListeners.delete(fn)
  }

  onStatus(fn) {
    this.statusListeners.add(fn)
    return () => this.statusListeners.delete(fn)
  }

  requestConnect(payload) {
    this.socket?.emit('tiktok:connect', payload)
  }

  requestDisconnect() {
    this.socket?.emit('tiktok:disconnect')
  }

  async injectMock(body) {
    const response = await fetch(`${this.url}/api/mock-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return response.json()
  }

  _emit(kind, payload) {
    const listeners = kind === 'event' ? this.eventListeners : this.statusListeners
    for (const fn of listeners) fn(payload)
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }
}
