import { describe, it, expect, beforeAll } from 'vitest'
import { executeEffect } from '../src/giftEffects.js'

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

describe('effect routing across rounds', () => {
  it('an effect still lands after a round reset (registrations survive)', () => {
    const game = bootGame()
    game.handleBridgeEvent({ type: 'chat', username: 'v1', name: 'V1', message: '1' })
    game.resetRound()

    const out = executeEffect(game, 'freeze', {}, { userId: 'v1', username: 'v1' })
    expect(out).toBe('freeze')
    expect(game.effectStats.outcome).toBe('applied')
    expect(game.joinPrompt.count).toBe(0)
  })

  it('holds an unknown viewer effect, then applies it when they pick a nation', () => {
    const game = bootGame()

    const held = executeEffect(game, 'shield', {}, { userId: 'newbie', username: 'newbie' })
    expect(held).toBe('pending')
    expect(game.joinPrompt.count).toBe(1)
    expect(game.effectStats.outcome).toBe('queued')

    game.handleBridgeEvent({ type: 'chat', username: 'newbie', name: 'Newbie', message: '1' })
    expect(game.joinPrompt.count).toBe(0)
    expect(game.effectStats.outcome).toBe('applied')
  })

  it('resolves a queued effect for a viewer already in the roster', () => {
    const game = bootGame()
    const team = game.teams[0]
    game.viewers.viewers.set('ghost', {
      id: 'ghost',
      username: 'ghost',
      name: 'Ghost',
      teamId: team.id,
      team,
      marble: null,
      queued: false,
      isBot: false,
    })
    game.joinPrompt.request({ username: 'ghost', userId: 'ghost', effect: 'freeze', params: {} })
    expect(game.joinPrompt.count).toBe(1)

    game.handleBridgeEvent({ type: 'chat', username: 'ghost', name: 'Ghost', message: 'whatever' })
    expect(game.joinPrompt.count).toBe(0)
    expect(game.effectStats.outcome).toBe('applied')
  })

  it('finds the team even when the hub only knows the username', () => {
    const game = bootGame()
    game.handleBridgeEvent({ type: 'chat', userId: '777', username: 'alice', name: 'Alice', message: '1' })

    const out = executeEffect(game, 'boost', {}, { userId: 'unknown-key', username: 'alice' })
    expect(out).toBe('boost')
    expect(game.effectStats.outcome).toBe('applied')
  })

  it('counts every received hub effect for telemetry', () => {
    const game = bootGame()
    game.handleBridgeEvent({ type: 'chat', username: 'v3', name: 'V3', message: '3' })
    const before = game.effectStats.received

    executeEffect(game, 'freeze', {}, { userId: 'v3', username: 'v3' })
    executeEffect(game, 'not_a_real_effect', {}, { userId: 'v3' })
    expect(game.effectStats.outcome).toBe('unknown')
    expect(game.effectStats.lastKey).toBe('not_a_real_effect')
    expect(game.effectStats.received).toBe(before)
  })

  it('auto-restarts a round that was stopped during the countdown', () => {
    const game = bootGame()
    game.round.state = 'countdown'
    game.round.timer = 3
    game.endRound()
    expect(game.round.state).toBe('idle')

    game.update(1)
    expect(game.round.isRunning).toBe(true)
    expect(game.round.state).toBe('countdown')
  })
})
