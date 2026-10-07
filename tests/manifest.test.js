import { describe, it, expect } from 'vitest'
import manifest from '../tikora.manifest.json'
import { EFFECT_KEYS } from '../src/giftEffects.js'
import { EFFECT_OPTIONS } from '../src/mappings.js'

describe('tikora manifest', () => {
  it('matches the effects the game can execute', () => {
    const manifestKeys = manifest.effects.map((effect) => effect.key).sort()
    expect(manifestKeys).toEqual([...EFFECT_KEYS].sort())
  })

  it('gives every effect a unique key and a label', () => {
    const seen = new Set()
    for (const effect of manifest.effects) {
      expect(effect.key).toBeTruthy()
      expect(effect.label).toBeTruthy()
      expect(seen.has(effect.key)).toBe(false)
      seen.add(effect.key)
    }
  })

  it('drives the in-game mappings dropdown options', () => {
    expect(EFFECT_OPTIONS.map((option) => option.key)).toEqual(manifest.effects.map((effect) => effect.key))
  })
})
