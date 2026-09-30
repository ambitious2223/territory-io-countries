export const DEFAULT_TIKORA_RELAY_URL = 'ws://127.0.0.1:27016/'

export function hubClientScriptUrl(relayUrl) {
  let base = (relayUrl || DEFAULT_TIKORA_RELAY_URL).trim()
  base = base.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:')
  base = base.split('?')[0].split('#')[0]
  if (!base.endsWith('/')) base += '/'
  return `${base}hub-client.js`
}

let loaded = null

export function loadHubClient(relayUrl) {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.connectHub) return Promise.resolve(true)
  if (loaded && loaded.url === relayUrl) return loaded.promise

  const promise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = hubClientScriptUrl(relayUrl)
    script.async = true
    script.onload = () => resolve(Boolean(window.connectHub))
    script.onerror = () => {
      if (loaded && loaded.promise === promise) loaded = null
      resolve(false)
    }
    document.head.appendChild(script)
  })

  loaded = { url: relayUrl, promise }
  return promise
}
