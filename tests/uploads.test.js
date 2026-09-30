import { describe, it, expect } from 'vitest'
import { decodeFlagImage } from '../server/uploads.js'

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

describe('decodeFlagImage', () => {
  it('accepts a valid PNG', () => {
    const result = decodeFlagImage(PNG_1PX)
    expect(result.ext).toBe('.png')
    expect(result.buffer.length).toBeGreaterThan(0)
  })

  it('rejects non-image data URLs', () => {
    expect(() => decodeFlagImage('data:text/plain;base64,aGk=')).toThrow()
  })

  it('rejects malformed input', () => {
    expect(() => decodeFlagImage('not a data url')).toThrow()
    expect(() => decodeFlagImage('')).toThrow()
  })

  it('rejects a bad PNG signature', () => {
    expect(() => decodeFlagImage('data:image/png;base64,bm90YXBuZw==')).toThrow()
  })
})
