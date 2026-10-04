import { describe, it, expect } from 'vitest'
import { parseLaunchUrl, resolveTikoraIdentity } from '../server/tikoraIdentity.js'
import { TIKORA_DEFAULTS } from '../server/constants.js'

describe('parseLaunchUrl', () => {
  it('reads game, key and relay from a launch URL', () => {
    const out = parseLaunchUrl('http://localhost:1935/?game=territory-with-flags&key=gk_abc&relay=ws%3A%2F%2F127.0.0.1%3A27016%2F')
    expect(out).toEqual({ slug: 'territory-with-flags', key: 'gk_abc', relayUrl: 'ws://127.0.0.1:27016/' })
  })

  it('returns empty values for missing or invalid input', () => {
    expect(parseLaunchUrl('')).toEqual({ slug: '', key: '', relayUrl: '' })
    expect(parseLaunchUrl('not a url')).toEqual({ slug: '', key: '', relayUrl: '' })
    expect(parseLaunchUrl('http://localhost:1935/')).toEqual({ slug: '', key: '', relayUrl: '' })
  })
})

describe('resolveTikoraIdentity', () => {
  it('prefers the hub-injected env vars', () => {
    const out = resolveTikoraIdentity({
      env: { TIKORA_GAME_KEY: 'gk_env', TIKORA_GAME_SLUG: 'env-slug', TIKORA_RELAY_URL: 'ws://env:1/' },
      config: { tikoraKey: 'gk_cfg', tikoraSlug: 'cfg-slug' },
      manifest: { slug: 'manifest-slug' },
    })
    expect(out).toEqual({ slug: 'env-slug', key: 'gk_env', relayUrl: 'ws://env:1/', enabled: true })
  })

  it('falls back to the launch URL query when the discrete env vars are absent', () => {
    const out = resolveTikoraIdentity({
      env: { TIKORA_GAME_LAUNCH_URL: 'http://localhost:1935/?game=launch-slug&key=gk_url' },
      manifest: { slug: 'manifest-slug' },
    })
    expect(out.slug).toBe('launch-slug')
    expect(out.key).toBe('gk_url')
    expect(out.enabled).toBe(true)
  })

  it('falls back to config then manifest then defaults', () => {
    const config = resolveTikoraIdentity({ config: { tikoraKey: 'gk_cfg' }, manifest: {} })
    expect(config.slug).toBe(TIKORA_DEFAULTS.slug)
    expect(config.key).toBe('gk_cfg')
    expect(config.relayUrl).toBe(TIKORA_DEFAULTS.relayUrl)
    expect(config.enabled).toBe(false)

    const fromManifest = resolveTikoraIdentity({ manifest: { slug: 'manifest-slug' } })
    expect(fromManifest.slug).toBe('manifest-slug')
    expect(fromManifest.enabled).toBe(false)
  })
})
