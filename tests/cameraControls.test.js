import { describe, it, expect, vi } from 'vitest'
import { Camera } from '../src/renderer.js'
import { ManualCamera, zoomToward } from '../src/cameraControls.js'
import { CONFIG } from '../src/config.js'

globalThis.window = { addEventListener: vi.fn() }

function fakeGame() {
  const camera = new Camera()
  return {
    camera,
    teams: [
      { id: 1, color: '#aaaaaa', emoji: 'A', name: { en: 'Alpha' } },
      { id: 2, color: '#bbbbbb', emoji: 'B', name: { en: 'Beta' } },
    ],
    baseCenters: [{ x: 100, y: 120 }, { x: 800, y: 600 }],
    marbles: [],
    cinematic: { skip: vi.fn() },
    vfx: { addText: vi.fn() },
    grid: { countTiles: (color) => (color === '#bbbbbb' ? 30 : 10) },
    canvas: { addEventListener: vi.fn(), getBoundingClientRect: () => ({ width: 1200, height: 800, left: 0, top: 0 }), width: 1200, height: 800 },
  }
}

describe('zoomToward', () => {
  it('keeps the world point under the cursor fixed', () => {
    const camera = new Camera()
    camera.fx = 600
    camera.fy = 400
    zoomToward(camera, 300, 200, 1.15)
    expect(camera.tzoom).toBeCloseTo(1.15, 5)
    expect(camera.tfx).toBeCloseTo(300 + 300 * (1 / 1.15), 5)
    expect(camera.tfy).toBeCloseTo(200 + 200 * (1 / 1.15), 5)
  })

  it('clamps between full-arena and 3x', () => {
    const camera = new Camera()
    zoomToward(camera, 0, 0, 99)
    expect(camera.tzoom).toBe(3)
    zoomToward(camera, 0, 0, 0.01)
    expect(camera.tzoom).toBe(1)
  })
})

describe('ManualCamera', () => {
  it('focus cancels the cinematic and toasts', () => {
    const game = fakeGame()
    const manual = new ManualCamera(game)
    manual.focus(300, 300)
    expect(game.cinematic.skip).toHaveBeenCalled()
    expect(game.camera.tfx).toBe(300)
    expect(game.camera.tzoom).toBe(1.8)
    expect(game.vfx.addText).toHaveBeenCalled()
  })

  it('follows a ball until it dies, then resets', () => {
    const game = fakeGame()
    const manual = new ManualCamera(game)
    const soldier = { x: 40, y: 50, alive: true, eliminated: false }
    manual.followBall(soldier)

    manual.update()
    expect(game.camera.tfx).toBe(40)
    expect(game.camera.tzoom).toBeGreaterThanOrEqual(1.6)

    soldier.x = 70
    manual.update()
    expect(game.camera.tfx).toBe(70)

    soldier.alive = false
    manual.update()
    expect(manual.follow).toBeNull()
    expect(game.camera.tfx).toBe(CONFIG.CANVAS_WIDTH / 2)
  })

  it('pans, zooms via keyboard actions and resets', () => {
    const game = fakeGame()
    const manual = new ManualCamera(game)
    manual.focus(600, 400)

    manual.pan(40, 0)
    expect(game.camera.tfx).toBe(640)

    manual.zoomBy(1.15)
    expect(game.camera.tzoom).toBeCloseTo(1.8 * 1.15, 5)

    manual.reset()
    expect(manual.follow).toBeNull()
    expect(game.camera.tfx).toBe(CONFIG.CANVAS_WIDTH / 2)
    expect(game.camera.tzoom).toBe(1)
  })

  it('jumps to nations and to the leader', () => {
    const game = fakeGame()
    const manual = new ManualCamera(game)

    manual.focusTeam(1)
    expect(game.camera.tfx).toBe(100)
    expect(game.camera.tzoom).toBe(1.6)

    manual.focusLeader()
    expect(game.camera.tfx).toBe(800)
    expect(game.camera.tfy).toBe(600)
  })

  it('attaches without throwing', () => {
    const game = fakeGame()
    expect(() => new ManualCamera(game)).not.toThrow()
    expect(game.canvas.addEventListener).toHaveBeenCalled()
  })
})
