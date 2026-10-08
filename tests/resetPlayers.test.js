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
  globalThis.canvas = { width: 1200, height: 800, getContext: () => ctx, addEventListener: noop }
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

function bootGame() {
  const game = new Game(globalThis.canvas)
  game.setTeams(game.defaultTeams())
  game.start()
  game.round.state = 'playing'
  game.round.timer = 180
  return game
}

describe('resetPlayers', () => {
  it('wipes human players, their soldiers, registrations and prompts — bots survive', () => {
    const game = bootGame()
    game.handleBridgeEvent({ type: 'chat', username: 'old_timer', name: 'Old', message: '1' })
    expect(game.scoring.teamOf('old_timer')).toBe(1)
    const humanBall = game.marbles.find((m) => m.teamId === game.teams[0].id && !m.isBot)
    expect(humanBall).toBeTruthy()

    game.joinPrompt.request({ username: 'old_timer', userId: 'old_timer', effect: 'freeze', params: {} })
    expect(game.joinPrompt.count).toBe(1)

    game.resetPlayers()

    expect(game.scoring.teamOf('old_timer')).toBeNull()
    expect(game.viewers.viewers.has('old_timer')).toBe(false)
    expect(game.joinPrompt.count).toBe(0)
    expect(humanBall.alive).toBe(false)

    const survivors = game.marbles.filter((m) => m.teamId === game.teams[0].id && m.alive)
    expect(survivors.length).toBeGreaterThan(0)
    expect(survivors.every((m) => m.isBot)).toBe(true)
  })

  it('old players never come back on the next round', () => {
    const game = bootGame()
    game.handleBridgeEvent({ type: 'chat', username: 'lonely', name: 'Lonely', message: '1' })
    game.resetPlayers()
    game.resetRound()

    const alive = game.marbles.filter((m) => m.alive)
    expect(alive.length).toBeGreaterThan(0)
    expect(alive.every((m) => m.isBot)).toBe(true)
    expect(game.viewers.viewers.has('lonely')).toBe(false)
    expect(game.scoring.teamOf('lonely')).toBeNull()
  })
})
