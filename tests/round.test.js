import { describe, it, expect } from 'vitest'
import { RoundManager, ROUND } from '../src/round.js'

function makeRound(overrides = {}) {
  return new RoundManager({ countdown: 1, roundDuration: 2, intermission: 1, ...overrides })
}

describe('RoundManager', () => {
  it('runs countdown → playing → roundEnd', () => {
    const round = makeRound()
    expect(round.start()).toBe(true)
    expect(round.state).toBe(ROUND.COUNTDOWN)

    expect(round.update(60)).toBe(ROUND.PLAYING)
    expect(round.timer).toBe(2)

    expect(round.update(60)).toBe(null)
    expect(round.state).toBe(ROUND.PLAYING)

    expect(round.update(120)).toBe(ROUND.ROUND_END)
  })

  it('auto-loops from intermission to the next countdown', () => {
    const round = makeRound()
    round.start()
    round.update(60)
    round.beginIntermission()
    expect(round.update(60)).toBe(ROUND.COUNTDOWN)
  })

  it('stops when auto-loop is off', () => {
    const round = makeRound({ autoLoop: false })
    round.start()
    round.update(60)
    round.beginIntermission()
    expect(round.update(60)).toBe(ROUND.IDLE)
  })

  it('ends manually only while playing', () => {
    const round = makeRound()
    round.start()
    expect(round.end()).toBe(false)
    round.update(60)
    expect(round.end()).toBe(true)
    expect(round.state).toBe(ROUND.ROUND_END)
  })

  it('stops on demand', () => {
    const round = makeRound()
    round.start()
    round.stop()
    expect(round.state).toBe(ROUND.IDLE)
  })
})
