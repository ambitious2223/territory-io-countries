import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'

const URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i
const DEFAULT_TARGET = 'http://localhost:1935'
const CLOUDFLARED = 'cloudflared'

const activeTunnels = new Set()
let hooked = false

function hookProcess() {
  if (hooked) return
  hooked = true
  const killAll = () => {
    for (const tunnel of activeTunnels) tunnel._kill()
  }
  process.once('exit', killAll)
  const onSignal = (signal) => {
    killAll()
    process.removeListener(signal, onSignal)
    process.kill(process.pid, signal)
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)
}

export function parseTunnelUrl(text) {
  const match = String(text || '').match(URL_PATTERN)
  return match ? match[0] : null
}

export class TunnelManager extends EventEmitter {
  constructor(options = {}) {
    super()
    this.enabled = options.enabled !== false
    this.spawner = options.spawner || spawn
    this.command = options.command || CLOUDFLARED
    this.target = options.target || DEFAULT_TARGET
    this.child = null
    this.status = 'off'
    this.url = null
    this.error = null
  }

  snapshot() {
    return {
      enabled: this.enabled,
      status: this.status,
      url: this.url,
      error: this.error,
      target: this.target,
    }
  }

  _set(partial) {
    Object.assign(this, partial)
    this.emit('status', this.snapshot())
  }

  start() {
    if (!this.enabled) return
    if (this.child || this.status === 'starting' || this.status === 'on') return
    this._set({ status: 'starting', url: null, error: null })

    let child
    try {
      child = this.spawner(this.command, ['tunnel', '--url', this.target, '--no-autoupdate'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      this._set({ status: 'error', error: String(error?.message || error) })
      return
    }

    this.child = child
    activeTunnels.add(this)
    hookProcess()

    const onData = (chunk) => {
      if (this.url) return
      const url = parseTunnelUrl(chunk.toString())
      if (url) this._set({ status: 'on', url, error: null })
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)

    child.on('error', (error) => {
      this.child = null
      this._set({ status: 'error', error: String(error?.message || error) })
    })
    child.on('exit', () => {
      this.child = null
      if (this.status !== 'error') this._set({ status: 'off', url: null })
    })
  }

  stop() {
    this._kill()
    this._set({ status: 'off', url: null, error: null })
  }

  _kill() {
    activeTunnels.delete(this)
    const child = this.child
    this.child = null
    if (!child) return
    try {
      child.kill()
    } catch {
      void 0
    }
  }
}
