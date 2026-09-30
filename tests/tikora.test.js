import { describe, it, expect } from 'vitest'
import { hubClientScriptUrl } from '../src/tikoraClient.js'
import { EFFECT_KEYS } from '../src/giftEffects.js'
import manifest from '../tikora.manifest.json'

describe('hubClientScriptUrl', () => {
  it('maps ws to http and appends hub-client.js', () => {
    expect(hubClientScriptUrl('ws://127.0.0.1:27016/')).toBe('http://127.0.0.1:27016/hub-client.js')
  })

  it('maps wss to https', () => {
    expect(hubClientScriptUrl('wss://example.com:1')).toBe('https://example.com:1/hub-client.js')
  })

  it('falls back to the default relay', () => {
    expect(hubClientScriptUrl('')).toBe('http://127.0.0.1:27016/hub-client.js')
  })
})

describe('tikora manifest', () => {
  it('declares only implemented effects', () => {
    for (const effect of manifest.effects) {
      expect(EFFECT_KEYS).toContain(effect.key)
    }
  })
})
