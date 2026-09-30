import WebSocket from 'ws'
import { Normalizer } from './normalize.js'

export function connectTikfinity({ host, port, onEvent, onStatus }) {
  const normalizer = new Normalizer('tikfinity')
  const url = `ws://${host}:${port}/`
  let socket = null
  let stopped = false

  function emit(event) {
    if (event) onEvent(event)
  }

  function route(text) {
    let message
    try {
      message = JSON.parse(text)
    } catch {
      return
    }
    if (!message || typeof message !== 'object') return

    const name = String(message.event || message.type || message.eventName || '').toLowerCase()
    const data = message.data && typeof message.data === 'object' ? message.data : message

    if (name === 'chat' || name === 'comment' || data.comment) return emit(normalizer.chat(data))
    if (name === 'gift' || data.giftId || data.giftName || data.gift) return emit(normalizer.gift(data))
    if (name === 'like' || data.likeCount != null || data.like_count != null || data.totalLikeCount != null) {
      return emit(normalizer.like(data))
    }
    if (name === 'follow' || name === 'social') return emit(normalizer.follow(data))
    if (name === 'share') return emit(normalizer.share(data))
    if (name === 'member' || name === 'join') return emit(normalizer.member(data))
  }

  function start() {
    return new Promise((resolve) => {
      onStatus({ tiktokState: 'connecting', source: 'tikfinity' })
      try {
        socket = new WebSocket(url)
      } catch (err) {
        onStatus({ tiktokState: 'error', lastError: `TikFinity: ${err.message}` })
        resolve(false)
        return
      }

      socket.on('open', () => {
        if (stopped) return
        onStatus({ tiktokState: 'live', source: 'tikfinity', roomId: null, lastError: null })
        resolve(true)
      })

      socket.on('message', (buffer) => {
        if (stopped) return
        route(Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer))
      })

      socket.on('close', () => {
        if (stopped) return
        onStatus({ tiktokState: 'offline' })
      })

      socket.on('error', (err) => {
        if (stopped) return
        onStatus({ tiktokState: 'error', lastError: `TikFinity: ${err.message}` })
        resolve(false)
      })
    })
  }

  function stop() {
    stopped = true
    try {
      socket?.close()
    } catch {
      void 0
    }
    socket = null
  }

  return { start, stop }
}
