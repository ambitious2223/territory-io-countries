import { describe, it, expect, vi } from 'vitest'
import { Camera } from '../src/renderer.js'
import { JoinCinematic } from '../src/joinCinematic.js'
import { CONFIG } from '../src/config.js'

describe('Camera', () => {
  it('eases toward a focus target', () => {
    const camera = new Camera()
    camera.focusOn(100, 200, 2)
    for (let i = 0; i < 200; i++) camera.update(1)
    expect(camera.zoom).toBeCloseTo(2, 1)
    expect(camera.fx).toBeCloseTo(100, 0)
    expect(camera.fy).toBeCloseTo(200, 0)
  })

  it('returns to the default focus', () => {
    const camera = new Camera()
    camera.focusOn(0, 0, 2)
    camera.resetFocus()
    for (let i = 0; i < 200; i++) camera.update(1)
    expect(camera.zoom).toBeCloseTo(1, 1)
  })

  it('exposes blur pixels from the scale', () => {
    const camera = new Camera()
    expect(camera.blurPixels).toBe(0)
    camera.blurScale = 1
    camera.setBlur(1)
    for (let i = 0; i < 200; i++) camera.update(1)
    expect(camera.blurPixels).toBeGreaterThan(CONFIG.CINEMATIC_BLUR_MAX - 0.5)
    camera.blurScale = 0
    expect(camera.blurPixels).toBe(0)
  })
})

function fakeCamera() {
  return { focusOn: vi.fn(), resetFocus: vi.fn(), setBlur: vi.fn() }
}

describe('JoinCinematic', () => {
  it('runs through focus, hold and return phases', () => {
    const camera = fakeCamera()
    const cinematic = new JoinCinematic(camera)
    cinematic.enqueue({ x: 50, y: 60, name: 'Ann', teamName: 'Egypt', color: '#fff' })

    expect(cinematic.active).toBe(true)
    expect(cinematic.pending).toBe(1)

    cinematic.update(60)
    expect(camera.focusOn).toHaveBeenCalledWith(50, 60, CONFIG.CINEMATIC_ZOOM)
    expect(camera.setBlur).toHaveBeenCalled()

    cinematic.update(60)
    cinematic.update(60)
    expect(camera.resetFocus).toHaveBeenCalled()

    cinematic.update(60)
    expect(cinematic.active).toBe(false)
  })

  it('skips the queue and resets the camera', () => {
    const camera = fakeCamera()
    const cinematic = new JoinCinematic(camera)
    cinematic.enqueue({ x: 1, y: 2, name: 'A' })
    cinematic.enqueue({ x: 3, y: 4, name: 'B' })
    cinematic.skip()
    expect(cinematic.pending).toBe(0)
    expect(cinematic.active).toBe(false)
    expect(camera.resetFocus).toHaveBeenCalled()
    expect(camera.setBlur).toHaveBeenCalledWith(0)
  })

  it('tracks the moving joiner during focus and hold', () => {
    const camera = fakeCamera()
    const cinematic = new JoinCinematic(camera)
    const soldier = { x: 100, y: 120, alive: true, eliminated: false }
    cinematic.enqueue({ x: 100, y: 120, name: 'V', color: '#fff', track: soldier })

    cinematic.update(60)
    expect(camera.focusOn).toHaveBeenLastCalledWith(100, 120, CONFIG.CINEMATIC_ZOOM)

    soldier.x = 500
    soldier.y = 60
    cinematic.update(60)
    expect(camera.focusOn).toHaveBeenLastCalledWith(500, 60, CONFIG.CINEMATIC_ZOOM)

    soldier.x = 777
    cinematic.update(60)
    expect(camera.focusOn).toHaveBeenLastCalledWith(777, 60, CONFIG.CINEMATIC_ZOOM)
  })

  it('stops tracking a dead soldier but keeps the last position', () => {
    const camera = fakeCamera()
    const cinematic = new JoinCinematic(camera)
    const soldier = { x: 10, y: 20, alive: true, eliminated: false }
    cinematic.enqueue({ x: 10, y: 20, name: 'V', color: '#fff', track: soldier })

    cinematic.update(60)
    soldier.alive = false
    camera.focusOn.mockClear()
    cinematic.update(60)
    expect(camera.focusOn).not.toHaveBeenCalled()
  })
})
