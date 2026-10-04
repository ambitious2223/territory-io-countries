import { describe, it, expect, beforeAll, vi } from 'vitest'

let registry

beforeAll(async () => {
  const store = {}
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
  }
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ success: true, url: '/flags/test.png' }) }))
  registry = await import('../src/teamRegistry.js')
})

describe('team registry flag upload', () => {
  it('stores the returned url and notifies subscribers', async () => {
    const team = registry.getTeams()[0]
    let notified = 0
    const unsubscribe = registry.subscribe(() => { notified += 1 })

    const result = await registry.uploadFlag('http://localhost:3020', team.id, 'data:image/png;base64,AAAA')

    expect(result.url).toBe('/flags/test.png')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3020/api/flags',
      expect.objectContaining({ method: 'POST' })
    )
    expect(registry.getTeams().find((entry) => entry.id === team.id).flagImage).toBe('/flags/test.png')
    expect(notified).toBeGreaterThan(0)

    unsubscribe()
  })
})
