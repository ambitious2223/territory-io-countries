import { describe, it, expect, beforeAll } from 'vitest'
import { CONFIG } from '../src/config.js'

let JoinPrompt

beforeAll(async () => {
  const store = {}
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
  }
  globalThis.Image = class {
    constructor() { this.complete = false; this.naturalWidth = 0 }
  }
  ;({ JoinPrompt } = await import('../src/joinPrompt.js'))
})

describe('JoinPrompt', () => {
  it('queues a request, shows it and resolves by username', () => {
    const prompt = new JoinPrompt()
    expect(prompt.request({ username: 'ahmad', name: 'Ahmad', effect: 'boost', params: {} })).toBe(true)
    expect(prompt.request({ username: 'ahmad' })).toBe(false)

    prompt.update(60)
    expect(prompt.current.username).toBe('ahmad')

    const resolved = prompt.resolve(['someone_else', 'ahmad'])
    expect(resolved.effect).toBe('boost')
    expect(prompt.current).toBeNull()
    expect(prompt.resolve('ahmad')).toBeNull()
  })

  it('resolves a queued item that is not the visible one', () => {
    const prompt = new JoinPrompt()
    prompt.request({ username: 'a', effect: 'boost' })
    prompt.request({ username: 'b', effect: 'spawn' })
    prompt.update(60)
    expect(prompt.current.username).toBe('a')

    expect(prompt.resolve('b').effect).toBe('spawn')
    expect(prompt.resolve('a').effect).toBe('boost')
    expect(prompt.current).toBeNull()

    prompt.update(60)
    expect(prompt.current).toBeNull()
  })

  it('expires after JOIN_PROMPT_TIMEOUT seconds', () => {
    const prompt = new JoinPrompt()
    prompt.request({ username: 'x', effect: 'spawn' })
    prompt.update(60)
    expect(prompt.current).not.toBeNull()

    prompt.update((CONFIG.JOIN_PROMPT_TIMEOUT - 2) * 60)
    expect(prompt.current).not.toBeNull()

    prompt.update(2 * 60)
    expect(prompt.current).toBeNull()
  })

  it('clears everything on reset', () => {
    const prompt = new JoinPrompt()
    prompt.request({ username: 'a', effect: 'boost' })
    prompt.request({ username: 'b', effect: 'spawn' })
    prompt.update(60)
    prompt.clear()
    expect(prompt.count).toBe(0)
    expect(prompt.current).toBeNull()
  })
})
