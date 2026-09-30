import { describe, it, expect } from 'vitest'
import { buildMockEvent } from '../server/mock.js'

describe('buildMockEvent', () => {
  it('defaults to a chat event', () => {
    const event = buildMockEvent({ type: 'chat', username: 'a', message: 'hi' })
    expect(event.type).toBe('chat')
    expect(event.message).toBe('hi')
    expect(event.source).toBe('mock')
  })

  it('builds a gift with coins', () => {
    const event = buildMockEvent({ type: 'gift', username: 'a', value: 10 })
    expect(event.type).toBe('gift')
    expect(event.coins).toBe(10)
    expect(event.msgId).toBeTruthy()
  })

  it('builds a like with a count', () => {
    const event = buildMockEvent({ type: 'like', value: 3 })
    expect(event.type).toBe('like')
    expect(event.likeCount).toBe(3)
  })

  it('sanitizes the username', () => {
    const event = buildMockEvent({ type: 'follow', username: '   ' })
    expect(event.username).toBe('mock_viewer')
  })
})
