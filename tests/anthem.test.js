import { describe, it, expect, beforeAll } from 'vitest'

let audio

beforeAll(async () => {
  globalThis.performance = globalThis.performance || { now: () => 0 }
  audio = await import('../src/audio.js')
})

describe('per-nation anthem', () => {
  it('returns a deterministic melody for a nation', () => {
    expect(audio.anthemFrequencies(1)).toEqual(audio.anthemFrequencies(1))
    expect(audio.anthemFrequencies(4)).toEqual(audio.anthemFrequencies(4))
  })

  it('gives different nations different melodies', () => {
    const a = audio.anthemFrequencies(1)
    const b = audio.anthemFrequencies(2)
    expect(a).not.toEqual(b)
  })

  it('always returns a short non-empty phrase of positive frequencies', () => {
    for (let id = 1; id <= 12; id++) {
      const notes = audio.anthemFrequencies(id)
      expect(notes.length).toBeGreaterThan(3)
      for (const freq of notes) expect(freq).toBeGreaterThan(0)
    }
  })

  it('plays without a live audio context (no throw)', () => {
    const engine = new audio.AudioEngine()
    expect(() => engine.playAnthem({ id: 3 })).not.toThrow()
    expect(() => engine.playDrumroll()).not.toThrow()
    expect(() => engine.playCrowd()).not.toThrow()
  })
})
