import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { CONFIG } from '../src/config.js'

let Onboarding
let store

beforeAll(async () => {
  store = {}
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
  }
  ;({ Onboarding } = await import('../src/onboarding.js'))
})

beforeEach(() => {
  delete store['twf.guide']
  delete store['twf.tips']
  delete store['twf.hint']
})

const game = {
  teams: [
    { id: 1, color: '#00CC44', emoji: 'SA', name: { en: 'Saudi Arabia', ar: 'السعودية' } },
    { id: 2, color: '#FFD700', emoji: 'EG', name: { en: 'Egypt', ar: 'مصر' } },
  ],
}

function ctxStub() {
  const noop = () => {}
  return {
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    arcTo: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 40 }),
    globalAlpha: 1,
  }
}

describe('join guide', () => {
  it('shows every round start and auto-hides after JOIN_GUIDE_TIME', () => {
    const onboarding = new Onboarding(game)
    onboarding.startRound()
    expect(onboarding.joinVisible).toBe(true)

    onboarding.update((CONFIG.JOIN_GUIDE_TIME - 1) * 60)
    expect(onboarding.joinVisible).toBe(true)

    onboarding.update(2 * 60)
    expect(onboarding.joinVisible).toBe(false)
  })

  it('stays dismissed until the next round', () => {
    const onboarding = new Onboarding(game)
    onboarding.startRound()
    onboarding.dismissJoin()
    onboarding.update(5 * 60)
    expect(onboarding.joinVisible).toBe(false)

    onboarding.startRound()
    expect(onboarding.joinVisible).toBe(true)
  })

  it('covers half the arena', () => {
    const onboarding = new Onboarding(game)
    const rect = onboarding.joinRect()
    expect(rect.w).toBe(CONFIG.CANVAS_WIDTH * CONFIG.JOIN_GUIDE_SHARE)
  })

  it('dismisses when its close button is clicked', () => {
    const onboarding = new Onboarding(game)
    onboarding.startRound()
    const rect = onboarding.joinRect()
    const close = onboarding.closeRect(rect)

    expect(onboarding.handlePointer(close.x + 5, close.y + 5)).toBe(true)
    expect(onboarding.joinVisible).toBe(false)
    expect(onboarding.handlePointer(5, 5)).toBe(false)
  })
})

describe('gameplay tips', () => {
  it('rotates once per milestone and expires', () => {
    const onboarding = new Onboarding(game)
    onboarding.notify('gift')
    onboarding.notify('mid')
    expect(onboarding.tips).toEqual(['gift', 'mid'])

    onboarding.update(CONFIG.TIP_TIME * 60 + 1)
    expect(onboarding.tips).toEqual(['mid'])

    onboarding.update(CONFIG.TIP_TIME * 60 + 1)
    expect(onboarding.tips).toEqual([])

    onboarding.notify('gift')
    expect(onboarding.tips).toEqual([])
    onboarding.notify('final')
    expect(onboarding.tips).toEqual(['final'])
  })

  it('fires phase milestones once each', () => {
    const onboarding = new Onboarding(game)
    onboarding.checkPhase(CONFIG.ROUND_DURATION / 2 + 5)
    expect(onboarding.tips).toEqual([])

    onboarding.checkPhase(CONFIG.ROUND_DURATION / 2 - 5)
    expect(onboarding.tips).toEqual(['mid'])
    onboarding.checkPhase(CONFIG.ROUND_DURATION / 2 - 10)
    expect(onboarding.tips).toEqual(['mid'])

    onboarding.checkPhase(CONFIG.TIP_FINAL_TIME)
    expect(onboarding.tips).toEqual(['mid', 'final'])
    onboarding.checkPhase(CONFIG.TIP_FINAL_TIME - 10)
    expect(onboarding.tips).toEqual(['mid', 'final'])
  })

  it('dismisses the current tip via its close button', () => {
    const onboarding = new Onboarding(game)
    onboarding.notify('gift')
    const rect = onboarding.tipRect()
    const close = onboarding.closeRect(rect)

    expect(onboarding.handlePointer(close.x + 5, close.y + 5)).toBe(true)
    expect(onboarding.tips).toEqual([])
  })
})

describe('persisted switches', () => {
  it('remembers disabled guide and tips across instances', () => {
    const onboarding = new Onboarding(game)
    onboarding.setJoinEnabled(false)
    onboarding.setTipsEnabled(false)
    expect(store['twf.guide']).toBe('0')
    expect(store['twf.tips']).toBe('0')

    const reloaded = new Onboarding(game)
    expect(reloaded.joinEnabled).toBe(false)
    expect(reloaded.tipsEnabled).toBe(false)

    reloaded.startRound()
    expect(reloaded.joinVisible).toBe(false)
    reloaded.notify('gift')
    expect(reloaded.tips).toEqual([])

    reloaded.setTipsEnabled(true)
    reloaded.notify('gift')
    expect(reloaded.tips).toEqual(['gift'])
  })

  it('draws without crashing', () => {
    const onboarding = new Onboarding(game)
    onboarding.startRound()
    onboarding.joinAlpha = 1
    onboarding.notify('gift')
    onboarding.tipAlpha = 1
    expect(() => onboarding.draw(ctxStub())).not.toThrow()
  })

  it('persists the join-hint switch (rendered in the DOM band, not on the canvas)', () => {
    const onboarding = new Onboarding(game)
    expect(onboarding.hintEnabled).toBe(true)

    onboarding.setHintEnabled(false)
    expect(store['twf.hint']).toBe('0')
    const reloaded = new Onboarding(game)
    expect(reloaded.hintEnabled).toBe(false)

    reloaded.setHintEnabled(true)
    expect(store['twf.hint']).toBe('1')
    expect(new Onboarding(game).hintEnabled).toBe(true)
  })
})
