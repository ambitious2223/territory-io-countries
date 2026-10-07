import { CONFIG } from './config.js'

function toNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function teamMarbles(ctx) {
  return ctx.game.marbles.filter(
    (marble) => marble.teamId === ctx.team.id && marble.alive && !marble.eliminated
  )
}

function activatorProfile(ctx, prefix) {
  const activator = ctx.activator
  return {
    id: `${prefix}_${activator?.userId || ctx.team.id}_${Date.now()}`,
    name: activator?.name || ctx.team.name?.en || 'AI',
    avatar: activator?.avatar || '',
    isBot: true
  }
}

function ensureMarble(ctx) {
  if (ctx.marble && ctx.marble.alive && !ctx.marble.eliminated) return ctx.marble
  const existing = teamMarbles(ctx)[0]
  if (existing) return existing
  return ctx.game.spawnViewerMarble(activatorProfile(ctx, 'gift'), ctx.team)
}

function paint(ctx, radius) {
  const marble = ensureMarble(ctx)
  const { row, col } = ctx.game.grid.worldToGrid(marble.x, marble.y)
  const painted = ctx.game.grid.paintColorBomb(col, row, ctx.team.color, radius)
  ctx.game.particles.emitSparks(marble.x, marble.y, ctx.team.color, Math.max(6, painted * 3))
  ctx.game.camera.shake(12, 0.22)
  return { x: marble.x, y: marble.y }
}

const EFFECTS = {
  overcharge(ctx) {
    const marble = ensureMarble(ctx)
    marble.applyPowerup('overcharge', toNumber(ctx.params.duration, CONFIG.POWERUP_OVERCHARGE_DURATION))
    return { x: marble.x, y: marble.y }
  },
  boost(ctx) {
    const marble = ensureMarble(ctx)
    marble.applyPowerup('overcharge', toNumber(ctx.params.duration, 4))
    return { x: marble.x, y: marble.y }
  },
  colorbomb(ctx) {
    return paint(ctx, toNumber(ctx.params.radius, CONFIG.POWERUP_COLOR_BOMB_RADIUS))
  },
  area_convert(ctx) {
    return paint(ctx, toNumber(ctx.params.radius, 4))
  },
  spawn(ctx) {
    const marble = ctx.game.spawnViewerMarble(activatorProfile(ctx, 'spawn'), ctx.team)
    ctx.game.camera.shake(8, 0.18)
    return { x: marble.x, y: marble.y }
  },
  instant_claim(ctx) {
    const marble = ensureMarble(ctx)
    marble.overcharge = true
    marble.powerupTimer = toNumber(ctx.params.duration, 6)
    return { x: marble.x, y: marble.y }
  },
}

export const EFFECT_KEYS = Object.keys(EFFECTS)

export function executeEffect(game, effectKey, params = {}, target = {}) {
  if (!game) return null
  const effect = EFFECTS[effectKey]
  if (!effect) return null

  const hasTeam = target.teamId !== undefined && target.teamId !== null
  const lookup = target.userId ?? target.username
  const hasUser = lookup !== undefined && lookup !== null && String(lookup) !== ''
  let team = hasTeam ? game.teams.find((entry) => entry.id === target.teamId) || null : null
  if (!team && hasUser) {
    team = game.teams.find((entry) => entry.id === game.scoring.teamOf(String(lookup))) || null
  }
  if (!team) {
    if (!hasUser) return null
    const queued = game.joinPrompt?.request({
      username: String(target.username ?? lookup),
      name: target.name || target.username || String(lookup),
      avatar: target.avatar || '',
      userId: String(lookup),
      effect: effectKey,
      params
    })
    return queued ? 'pending' : null
  }

  const viewer = hasUser
    ? game.viewers?.viewers.get(String(lookup)) ||
      game.viewers?.viewers.get(String(target.username || '')) ||
      null
    : null
  const ctx = {
    game,
    team,
    params,
    marble: viewer?.marble || null,
    activator: hasUser
      ? {
          userId: String(lookup),
          username: String(target.username ?? lookup),
          name: target.name || target.username || String(lookup),
          avatar: target.avatar || viewer?.avatar || ''
        }
      : null
  }

  const at = effect(ctx)
  if (at && game.vfx) {
    game.vfx.addPickupText(at.x, at.y, effectKey)
  }
  return effectKey
}

export function executeGiftEffect(game, mapping, event) {
  if (!mapping || !event) return null
  return executeEffect(game, mapping.effect, mapping.params || {}, {
    userId: event.userId ?? event.username,
    username: event.username,
    name: event.name || event.username,
    avatar: event.avatar || ''
  })
}
