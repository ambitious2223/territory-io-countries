import { Normalizer } from './normalize.js'

export function connectDirect({ username, onEvent, onStatus }) {
  const normalizer = new Normalizer('direct')
  let client = null
  let stopped = false

  function emit(event) {
    if (event) onEvent(event)
  }

  async function start() {
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = await import('tiktok-live-connector')

    client = new TikTokLiveConnection(username, {
      processInitialData: false,
      fetchRoomInfoOnConnect: true
    })

    onStatus({ tiktokState: 'connecting', source: 'direct' })

    client.on(ControlEvent.CONNECTED, (state) => {
      if (stopped) return
      onStatus({ tiktokState: 'live', source: 'direct', roomId: state?.roomId ?? null, lastError: null })
    })

    client.on(ControlEvent.DISCONNECTED, (info) => {
      if (stopped) return
      onStatus({ tiktokState: 'offline', lastError: info?.reason ?? null })
    })

    client.on(ControlEvent.ERROR, (err) => {
      if (stopped) return
      const message = err?.exception?.message ?? err?.message ?? String(err)
      onStatus({ tiktokState: 'error', lastError: message })
    })

    client.on('error', (err) => {
      if (stopped) return
      onStatus({ tiktokState: 'error', lastError: err?.message ?? String(err) })
    })

    const handlers = [
      [WebcastEvent.CHAT, (data) => normalizer.chat(data)],
      [WebcastEvent.GIFT, (data) => normalizer.gift(data)],
      [WebcastEvent.LIKE, (data) => normalizer.like(data)],
      [WebcastEvent.MEMBER, (data) => normalizer.member(data)],
      [WebcastEvent.SHARE, (data) => normalizer.share(data)],
      [WebcastEvent.FOLLOW, (data) => normalizer.follow(data)]
    ]

    for (const [eventName, handler] of handlers) {
      if (!eventName) continue
      client.on(eventName, (data) => {
        if (stopped) return
        emit(handler(data))
      })
    }

    await client.connect()
  }

  function stop() {
    stopped = true
    try {
      client?.disconnect()
    } catch {
      void 0
    }
    client = null
  }

  return { start, stop }
}
