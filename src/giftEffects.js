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

function ensureMarble(ctx) {
  if (ctx.marble && ctx.marble.alive && !ctx.marble.eliminated) return ctx.marble
  const existing = teamMarbles(ctx)[0]
  if (existing) return existing
  const profile = {
    id: `gift_${ctx.team.id}_${Date.now()}`,
    name: ctx.team.name?.en || 'AI',
    avatar: '',
    isBot: true,
  }
  return ctx.game.spawnViewerMarble(profile, ctx.team)
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
  shield(ctx) {
    const marble = ensureMarble(ctx)
    marble.applyPowerup('shield', toNumber(ctx.params.duration, CONFIG.POWERUP_SHIELD_DURATION))
    return { x: marble.x, y: marble.y }
  },
  boost(ctx) {
    const marble = ensureMarble(ctx)
    marble.applyPowerup('overcharge', toNumber(ctx.params.duration, 4))
    return { x: marble.x, y: marble.y }
  },
  heal(ctx) {
    const amount = toNumber(ctx.params.amount, 50)
    for (const marble of teamMarbles(ctx)) {
      marble.hp = Math.min(marble.maxHp, marble.hp + amount)
    }
    const marble = ensureMarble(ctx)
    return { x: marble.x, y: marble.y }
  },
  colorbomb(ctx) {
    return paint(ctx, toNumber(ctx.params.radius, CONFIG.POWERUP_COLOR_BOMB_RADIUS))
  },
  area_convert(ctx) {
    return paint(ctx, toNumber(ctx.params.radius, 4))
  },
  spawn(ctx) {
    const profile = {
      id: `gift_spawn_${ctx.team.id}_${Date.now()}`,
      name: ctx.team.name?.en || 'AI',
      avatar: '',
      isBot: true,
    }
    const marble = ctx.game.spawnViewerMarble(profile, ctx.team)
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

export function executeGiftEffect(game, mapping, event) {
  if (!game || !mapping || !event) return null
  const userId = String(event.userId ?? event.username ?? '')
  const team = game.teams.find((entry) => entry.id === game.scoring.teamOf(userId))
  if (!team) return null
  const effect = EFFECTS[mapping.effect]
  if (!effect) return null

  const viewer = game.viewers?.viewers.get(userId) || null
  const ctx = {
    game,
    team,
    event,
    params: mapping.params || {},
    marble: viewer?.marble || null,
  }

  const at = effect(ctx)
  if (at && game.vfx) {
    game.vfx.addPickupText(at.x, at.y, mapping.effect)
  }
  return mapping.effect
}
