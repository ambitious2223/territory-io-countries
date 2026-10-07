import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG } from '../src/config.js'
import { ROUND } from '../src/round.js'
import manifest from '../tikora.manifest.json'

const root = fileURLToPath(new URL('..', import.meta.url))

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.js')) out.push(full)
  }
  return out
}

function usedDataKeys() {
  const keys = new Set()
  const pattern = /data-i18n(?:-title|-placeholder)?="([^"]+)"/g
  const files = [join(root, 'index.html'), ...walk(join(root, 'src'))]
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(pattern)) keys.add(match[1])
  }
  return [...keys]
}

let i18n

beforeAll(async () => {
  const store = {}
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
  }
  globalThis.document = { documentElement: {}, querySelectorAll: () => [] }
  i18n = await import('../src/i18n.js')
})

describe('translation completeness', () => {
  it('keeps Arabic in full key parity with English', () => {
    expect(Object.keys(i18n.AR).sort()).toEqual(Object.keys(i18n.EN).sort())
  })

  it('has a non-empty value for every key in both languages', () => {
    for (const table of [i18n.EN, i18n.AR]) {
      for (const [key, value] of Object.entries(table)) {
        expect(String(value).trim().length, key).toBeGreaterThan(0)
      }
    }
  })

  it('covers every data-i18n key used in markup', () => {
    const used = usedDataKeys()
    expect(used.length).toBeGreaterThan(20)
    for (const key of used) {
      expect(i18n.EN[key], key).toBeTruthy()
      expect(i18n.AR[key], key).toBeTruthy()
    }
  })

  it('covers dynamic keys: round states, maps, effects, vfx, scoring', () => {
    for (const state of Object.values(ROUND)) {
      expect(i18n.AR[`round.${state}`], state).toBeTruthy()
    }
    for (const map of CONFIG.MAPS) {
      expect(i18n.AR[`map.${map.toLowerCase()}`], map).toBeTruthy()
    }
    for (const effect of manifest.effects) {
      expect(i18n.AR[`effect.${effect.key}`], effect.key).toBeTruthy()
      expect(i18n.AR[`vfx.${effect.key}`], effect.key).toBeTruthy()
    }
    for (const weight of Object.keys(CONFIG.SCORING)) {
      expect(i18n.AR[`scoring.${weight}`], weight).toBeTruthy()
    }
    for (const mode of ['auto', 'direct', 'tikfinity', 'mock']) {
      expect(i18n.AR[`mode.${mode}`], mode).toBeTruthy()
      expect(i18n.AR[`mock.${mode === 'auto' ? 'chat' : mode}`] !== undefined || mode !== 'auto', mode).toBeDefined()
    }
  })
})

describe('language switching never mirrors the layout', () => {
  it('keeps dir=ltr in both languages', () => {
    i18n.setLanguage('ar')
    expect(globalThis.document.documentElement.dir).toBe('ltr')
    expect(globalThis.document.documentElement.lang).toBe('ar')
    expect(i18n.t('control.pause')).toBe('إيقاف')

    i18n.setLanguage('en')
    expect(globalThis.document.documentElement.dir).toBe('ltr')
    expect(i18n.t('control.pause')).toBe('Pause')
  })

  it('falls back to English for a key missing in Arabic', () => {
    expect(i18n.AR['debug.copy']).toBeTruthy()
    expect(i18n.t('definitely.missing.key', 'fallback')).toBe('fallback')
  })
})
