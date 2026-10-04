import { TIKORA_DEFAULTS } from './constants.js'

export function parseLaunchUrl(raw) {
  if (!raw) return { slug: '', key: '', relayUrl: '' }
  try {
    const url = new URL(raw)
    return {
      slug: url.searchParams.get('game') || '',
      key: url.searchParams.get('key') || '',
      relayUrl: url.searchParams.get('relay') || '',
    }
  } catch {
    return { slug: '', key: '', relayUrl: '' }
  }
}

export function resolveTikoraIdentity({ env = {}, config = {}, manifest = {} } = {}) {
  const fromUrl = parseLaunchUrl(env.TIKORA_GAME_LAUNCH_URL)
  const slug = env.TIKORA_GAME_SLUG || fromUrl.slug || env.TIKORA_SLUG || config.tikoraSlug || manifest.slug || TIKORA_DEFAULTS.slug
  const key = env.TIKORA_GAME_KEY || fromUrl.key || env.TIKORA_KEY || config.tikoraKey || ''
  const relayUrl = env.TIKORA_RELAY_URL || fromUrl.relayUrl || config.tikoraRelayUrl || TIKORA_DEFAULTS.relayUrl
  const enabled = Boolean(
    env.TIKORA_GAME_KEY || env.TIKORA_GAME_SLUG || env.TIKORA_GAME_LAUNCH_URL ||
    env.TIKORA_KEY || env.TIKORA_SLUG || config.tikoraEnabled
  )
  return { slug, key, relayUrl, enabled }
}
