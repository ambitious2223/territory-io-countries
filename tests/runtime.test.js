import { describe, it, expect, beforeAll } from 'vitest'

const noop = () => {}

function makeCtx() {
  const target = { canvas: { width: 1200, height: 800 } }
  return new Proxy(target, {
    get(obj, prop) {
      if (prop === 'measureText') return () => ({ width: 10 })
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => ({ addColorStop: noop })
      }
      if (prop in obj) return obj[prop]
      return noop
    },
    set() { return true },
  })
}

function makeEl() {
  return {
    addEventListener: noop,
    removeEventListener: noop,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    style: {},
    dataset: {},
    value: '',
    textContent: '',
    innerHTML: '',
    checked: false,
    appendChild: noop,
    querySelectorAll: () => [],
  }
}

let Game

beforeAll(async () => {
  const ctx = makeCtx()
  const canvas = { width: 1200, height: 800, getContext: () => ctx, addEventListener: noop }
  globalThis.canvas = canvas
  globalThis.document = {
    getElementById: () => makeEl(),
    querySelectorAll: () => [],
    addEventListener: noop,
    documentElement: { lang: 'en', dir: 'ltr' },
    createElement: () => makeEl(),
    head: { appendChild: noop },
  }
  globalThis.window = globalThis
  globalThis.addEventListener = noop
  globalThis.Image = class { constructor() { this.complete = false } }
  globalThis.requestAnimationFrame = noop
  globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop }
  globalThis.fetch = async () => ({ ok: false, json: async () => ({}) })
  ;({ Game } = await import('../src/game.js'))
})

describe('headless game loop', () => {
  it('boots, spawns a ball, expands territory and renders without throwing', () => {
    const game = new Game(globalThis.canvas)
    game.setTeams(game.defaultTeams())
    game.start()

    game.handleBridgeEvent({ type: 'chat', username: 'v0', name: 'Viewer0', message: '1' })
    expect(game.countTeamMarbles(game.teams[0].id)).toBeGreaterThanOrEqual(1)

    const before = game.teams.reduce((sum, t) => sum + game.grid.countTiles(t.color), 0)

    expect(() => {
      for (let f = 0; f < 300; f++) {
        game.update(1)
        game.render()
      }
    }).not.toThrow()

    const after = game.teams.reduce((sum, t) => sum + game.grid.countTiles(t.color), 0)
    expect(after).toBeGreaterThan(before)
  })
})
