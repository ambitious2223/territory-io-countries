import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { CONFIG } from '../src/config.js'

let registry

beforeAll(async () => {
  const store = {}
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
  }
  globalThis.fetch = vi.fn(async (url, options = {}) => {
    const json = async () => JSON.parse(JSON.stringify(registry.getConfig()))
    if (String(url).endsWith('/api/flags')) {
      return { ok: true, json: async () => ({ success: true, url: '/flags/test.png' }) }
    }
    void options
    return { ok: true, json }
  })
  registry = await import('../src/teamRegistry.js')
  registry.setBaseUrl('http://bridge:3020')
})

beforeEach(() => {
  vi.useFakeTimers()
  globalThis.fetch.mockClear()
})

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(CONFIG.TEAMS_AUTOSAVE_MS)
  vi.useRealTimers()
})

describe('team registry', () => {
  it('stores an uploaded flag url and notifies the panel and the game', async () => {
    const team = registry.getTeams()[0]
    const panel = vi.fn()
    const game = vi.fn()
    const offPanel = registry.subscribe(panel)
    const offGame = registry.subscribeGame(game)

    const result = await registry.uploadFlag('http://bridge:3020', team.id, 'data:image/png;base64,AAAA')

    expect(result.url).toBe('/flags/test.png')
    expect(registry.getTeams().find((entry) => entry.id === team.id).flagImage).toBe('/flags/test.png')
    expect(panel).toHaveBeenCalled()
    expect(game).toHaveBeenCalled()

    offPanel()
    offGame()
  })

  it('updates the capital scale, notifying the game only', () => {
    const panel = vi.fn()
    const game = vi.fn()
    const offPanel = registry.subscribe(panel)
    const offGame = registry.subscribeGame(game)

    registry.setCapitalScale(1.6)
    expect(registry.getCapitalScale()).toBeCloseTo(1.6)
    expect(game).toHaveBeenCalled()
    expect(panel).not.toHaveBeenCalled()

    offPanel()
    offGame()
  })

  it('clamps the capital scale to the configured range', () => {
    registry.setCapitalScale(99)
    expect(registry.getCapitalScale()).toBe(CONFIG.CAP_SCALE_MAX)
    registry.setCapitalScale(0.1)
    expect(registry.getCapitalScale()).toBe(CONFIG.CAP_SCALE_MIN)
    registry.setCapitalScale(CONFIG.CAP_SCALE_DEFAULT)
    expect(registry.getCapitalScale()).toBe(CONFIG.CAP_SCALE_DEFAULT)
  })

  it('debounces an automatic save after an edit', async () => {
    const game = vi.fn()
    const offGame = registry.subscribeGame(game)

    registry.updateTeam(1, { color: '#010203' })
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(game).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(CONFIG.TEAMS_AUTOSAVE_MS)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://bridge:3020/api/teams',
      expect.objectContaining({ method: 'PUT' })
    )
    expect(game).toHaveBeenCalled()

    offGame()
    registry.updateTeam(1, { color: '#00CC44' })
  })

  it('notifies the game but not the panel when saving to the server', async () => {
    const panel = vi.fn()
    const game = vi.fn()
    const offPanel = registry.subscribe(panel)
    const offGame = registry.subscribeGame(game)

    await registry.saveToServer()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://bridge:3020/api/teams',
      expect.objectContaining({ method: 'PUT' })
    )
    expect(game).toHaveBeenCalled()
    expect(panel).not.toHaveBeenCalled()

    offPanel()
    offGame()
  })
})
