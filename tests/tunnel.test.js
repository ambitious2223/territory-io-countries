import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { TunnelManager, parseTunnelUrl } from '../server/tunnel.js'

const BOX = `
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://brave-quiet-river.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
`

function fakeChild() {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.killed = false
  child.kill = () => {
    child.killed = true
    child.emit('exit', 0)
  }
  return child
}

describe('parseTunnelUrl', () => {
  it('finds the quick-tunnel URL inside cloudflared output', () => {
    expect(parseTunnelUrl(BOX)).toBe('https://brave-quiet-river.trycloudflare.com')
  })

  it('returns null when there is no tunnel URL yet', () => {
    expect(parseTunnelUrl('Starting tunnel...')).toBeNull()
    expect(parseTunnelUrl('')).toBeNull()
    expect(parseTunnelUrl(undefined)).toBeNull()
  })
})

describe('TunnelManager', () => {
  it('moves starting → on and captures the URL', () => {
    const child = fakeChild()
    const manager = new TunnelManager({ spawner: () => child })
    const seen = []
    manager.on('status', (status) => seen.push(status.status))

    manager.start()
    expect(manager.status).toBe('starting')

    child.stderr.emit('data', Buffer.from(BOX))
    expect(manager.status).toBe('on')
    expect(manager.url).toBe('https://brave-quiet-river.trycloudflare.com')
    expect(seen).toContain('starting')
    expect(seen).toContain('on')
  })

  it('reports an error when cloudflared cannot be spawned', () => {
    const manager = new TunnelManager({
      spawner: () => { throw new Error('not found') },
    })
    manager.start()
    expect(manager.status).toBe('error')
    expect(manager.error).toBe('not found')
  })

  it('stops and kills the child', () => {
    const child = fakeChild()
    const manager = new TunnelManager({ spawner: () => child })
    manager.start()
    manager.stop()
    expect(manager.status).toBe('off')
    expect(child.killed).toBe(true)
  })

  it('does nothing when disabled', () => {
    const spawner = vi.fn()
    const manager = new TunnelManager({ enabled: false, spawner })
    manager.start()
    expect(spawner).not.toHaveBeenCalled()
    expect(manager.status).toBe('off')
  })

  it('exposes its configuration in the snapshot', () => {
    const manager = new TunnelManager({ target: 'http://localhost:1935', spawner: () => fakeChild() })
    expect(manager.snapshot()).toMatchObject({ enabled: true, status: 'off', target: 'http://localhost:1935' })
  })
})
