import { describe, it, expect } from 'vitest'
import { CONFIG } from '../src/config.js'
import { ConfettiSystem } from '../src/confetti.js'

function ctxStub() {
  const noop = () => {}
  return {
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    translate: noop,
    rotate: noop,
    rect: noop,
    clip: noop,
    drawImage: noop,
    fillRect: noop,
    fill: noop,
  }
}

describe('ConfettiSystem', () => {
  it('bursts from the centre and then rains from the top', () => {
    const confetti = new ConfettiSystem()
    confetti.start(['#FF0000'])

    const afterBurst = confetti.pool.filter((piece) => piece.active).length
    expect(afterBurst).toBeGreaterThan(0)
    expect(confetti.active).toBe(true)

    confetti.update(60)
    const afterSecond = confetti.pool.filter((piece) => piece.active).length
    expect(afterSecond).toBeGreaterThan(afterBurst)
  })

  it('never exceeds the piece cap', () => {
    const confetti = new ConfettiSystem()
    confetti.start(['#FF0000'])
    for (let frame = 0; frame < 300; frame++) confetti.update(1)
    expect(confetti.pool.filter((piece) => piece.active).length).toBeLessThanOrEqual(CONFIG.WIN_CONFETTI_MAX)
  })

  it('shuts down after WIN_CONFETTI_TIME once pieces have fallen', () => {
    const confetti = new ConfettiSystem()
    confetti.start(['#FF0000'])
    const frames = Math.ceil((CONFIG.WIN_CONFETTI_TIME + 14) * 60)
    for (let frame = 0; frame < frames; frame++) confetti.update(1)
    expect(confetti.active).toBe(false)
  })

  it('stop() clears every piece', () => {
    const confetti = new ConfettiSystem()
    confetti.start(['#FF0000'])
    confetti.stop()
    expect(confetti.active).toBe(false)
    expect(confetti.pool.some((piece) => piece.active)).toBe(false)
  })

  it('draws without crashing', () => {
    const confetti = new ConfettiSystem()
    confetti.start(['#FF0000'])
    confetti.update(16)
    expect(() => confetti.draw(ctxStub())).not.toThrow()
  })
})
