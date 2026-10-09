import { describe, it, expect, vi, beforeAll } from 'vitest'
import { CONFIG } from '../src/config.js'

const noop = () => {}

function ctxStub() {
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
    fillRect: noop,
    rect: noop,
    clip: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    ellipse: noop,
    arc: noop,
    drawImage: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 40 }),
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
  }
}

let WinScreen

beforeAll(async () => {
  globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop }
  globalThis.Image = class {
    constructor() { this.complete = false; this.naturalWidth = 0 }
  }
  ;({ WinScreen } = await import('../src/winScreen.js'))
})

function fakeGame() {
  const teams = [
    { id: 1, color: '#FF2222', emoji: 'A', name: { en: 'Alpha' }, flagImage: null, eliminated: false },
    { id: 2, color: '#1E90FF', emoji: 'B', name: { en: 'Beta' }, flagImage: null, eliminated: false },
    { id: 3, color: '#00CC44', emoji: 'C', name: { en: 'Gamma' }, flagImage: null, eliminated: false },
  ]
  return {
    teams,
    territoryCounts: new Map([[1, 50], [2, 30], [3, 20]]),
    countTeamMarbles: () => 1,
    grid: { claimableTiles: 100 },
    round: { state: 'intermission', timeLeft: 12 },
    scoring: {
      topContributors: () => ([
        { id: 'u1', name: 'Ahmad', avatar: '', teamId: 2, score: 120 },
      ]),
    },
    analytics: { duration: 95 },
    winColor: '#FF2222',
    winner: { name: 'Alpha', color: '#FF2222', tiles: 50 },
    winReason: 'timeout',
    audio: {
      playAnthem: vi.fn(), playConfetti: vi.fn(), playReveal: vi.fn(),
      playPodium: vi.fn(), playDrumroll: vi.fn(), playCrowd: vi.fn(),
    },
  }
}

describe('WinScreen', () => {
  it('snapshots the winner, top-3 nations and supporters on show', () => {
    const game = fakeGame()
    const screen = new WinScreen(game)
    screen.show()

    expect(screen.visible).toBe(true)
    expect(screen.snapshot.winnerName).toBe('Alpha')
    expect(screen.snapshot.percent).toBe(50)
    expect(screen.snapshot.reason).toBe('timeout')
    expect(screen.snapshot.wins).toBe(1)
    expect(screen.snapshot.nations.map((row) => row.rank)).toEqual([1, 2, 3])
    expect(screen.snapshot.supporters[0]).toMatchObject({ name: 'Ahmad', teamId: 2, color: '#1E90FF' })
    expect(game.audio.playAnthem).toHaveBeenCalledTimes(1)
    expect(game.audio.playAnthem).toHaveBeenCalledWith(game.teams[0])
    expect(game.audio.playConfetti).toHaveBeenCalledTimes(1)
  })

  it('plays the drumroll, reveal, crowd and podium sounds once, on schedule', () => {
    const game = fakeGame()
    const screen = new WinScreen(game)
    screen.show()

    screen.update(CONFIG.WIN_MEDALLION_REVEAL * 60 + 1)
    expect(game.audio.playDrumroll).toHaveBeenCalledTimes(1)
    expect(game.audio.playReveal).toHaveBeenCalledTimes(1)
    expect(game.audio.playCrowd).toHaveBeenCalledTimes(1)

    screen.update((CONFIG.WIN_PODIUM_DELAY - CONFIG.WIN_MEDALLION_REVEAL) * 60 + 1)
    expect(game.audio.playPodium).toHaveBeenCalledTimes(1)

    screen.update(60)
    expect(game.audio.playReveal).toHaveBeenCalledTimes(1)
    expect(game.audio.playPodium).toHaveBeenCalledTimes(1)
  })

  it('counts the stats up over the entrance window', () => {
    const game = fakeGame()
    const screen = new WinScreen(game)
    screen.show()
    expect(screen.timer).toBe(0)
    screen.update(16)
    expect(screen.timer).toBeGreaterThan(0)
    expect(screen.alpha).toBeGreaterThan(0)
  })

  it('fades in, draws without crashing and hides cleanly', () => {
    const game = fakeGame()
    const screen = new WinScreen(game)
    screen.show()
    screen.update(16)

    expect(() => screen.draw(ctxStub())).not.toThrow()

    screen.hide()
    expect(screen.visible).toBe(false)
    expect(screen.snapshot).toBeNull()
    expect(() => screen.draw(ctxStub())).not.toThrow()
  })

  it('draws the full sequence (podium + countdown) without a round object', () => {
    const game = fakeGame()
    delete game.round
    const screen = new WinScreen(game)
    screen.show()
    screen.update((CONFIG.WIN_PODIUM_DELAY + 1) * 60)
    expect(screen.podiumShown).toBe(true)
    expect(() => screen.draw(ctxStub())).not.toThrow()
  })
})
