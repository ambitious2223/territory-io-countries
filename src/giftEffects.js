import { CONFIG } from './config.js'
import { teamLabel } from './teams.js'
import { getLanguage } from './i18n.js'

function toNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function durationParam(params, fallback) {
  return Math.min(CONFIG.EFFECT_DURATION_MAX, Math.max(0, toNumber(params.duration, fallback)))
}

function radiusParam(params, fallback) {
  return Math.round(Math.min(CONFIG.EFFECT_RADIUS_MAX, Math.max(1, toNumber(params.radius, fallback))))
}

function tilesParam(params) {
  return Math.round(Math.min(CONFIG.EFFECT_TILES_MAX, Math.max(1, toNumber(params.tiles, CONFIG.CLAIM_STORM_TILES))))
}

function countParam(params) {
  return Math.round(Math.min(CONFIG.EFFECT_COUNT_MAX, Math.max(1, toNumber(params.count, CONFIG.SUMMON_COUNT))))
}

function pickBypassTeam(game, target) {
  if (target.teamId !== undefined && target.teamId !== null) {
    const byId = game.teams.find((team) => team.id === target.teamId)
    if (byId) return byId
  }
  let best = null
  let bestCount = Infinity
  for (const team of game.teams) {
    if (team.eliminated) continue
    const count = game.countTeamMarbles ? game.countTeamMarbles(team.id) : 0
    if (count < bestCount) {
      bestCount = count
      best = team
    }
  }
  return best || game.teams[0] || null
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
    name: activator?.name || teamLabel(ctx.team, getLanguage()) || 'AI',
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
    marble.applyPowerup('overcharge', durationParam(ctx.params, CONFIG.POWERUP_OVERCHARGE_DURATION))
    return { x: marble.x, y: marble.y }
  },
  boost(ctx) {
    const marble = ensureMarble(ctx)
    marble.applyPowerup('overcharge', durationParam(ctx.params, CONFIG.POWERUP_FREEZE_DURATION))
    return { x: marble.x, y: marble.y }
  },
  colorbomb(ctx) {
    return paint(ctx, radiusParam(ctx.params, CONFIG.POWERUP_COLOR_BOMB_RADIUS))
  },
  area_convert(ctx) {
    return paint(ctx, radiusParam(ctx.params, 4))
  },
  spawn(ctx) {
    const marble = ctx.game.spawnViewerMarble(activatorProfile(ctx, 'spawn'), ctx.team)
    ctx.game.camera.shake(8, 0.18)
    return { x: marble.x, y: marble.y }
  },
  instant_claim(ctx) {
    const marble = ensureMarble(ctx)
    marble.overcharge = true
    marble.powerupTimer = durationParam(ctx.params, CONFIG.POWERUP_OVERCHARGE_DURATION)
    return { x: marble.x, y: marble.y }
  },
  freeze(ctx) {
    const marble = ensureMarble(ctx)
    const duration = durationParam(ctx.params, CONFIG.POWERUP_FREEZE_DURATION)
    for (const enemy of ctx.game.marbles) {
      if (enemy.alive && !enemy.eliminated && enemy.teamId !== ctx.team.id) {
        enemy.freeze(duration)
      }
    }
    ctx.game.camera.shake(8, 0.2)
    return { x: marble.x, y: marble.y }
  },
  shield(ctx) {
    const marble = ensureMarble(ctx)
    ctx.game.grid.setShield(ctx.team.color, durationParam(ctx.params, CONFIG.POWERUP_SHIELD_DURATION))
    ctx.game.camera.shake(6, 0.2)
    return { x: marble.x, y: marble.y }
  },
  team_speed(ctx) {
    const marble = ensureMarble(ctx)
    const duration = durationParam(ctx.params, CONFIG.POWERUP_OVERCHARGE_DURATION)
    for (const soldier of teamMarbles(ctx)) {
      soldier.applyPowerup('overcharge', duration)
    }
    return { x: marble.x, y: marble.y }
  },
  claim_storm(ctx) {
    const marble = ensureMarble(ctx)
    const painted = ctx.game.grid.claimFrontier(ctx.team.color, tilesParam(ctx.params))
    if (painted > 0) {
      ctx.game.particles.emitSparks(marble.x, marble.y, ctx.team.color, Math.min(CONFIG.SPARK_COUNT * 6, painted))
      ctx.game.camera.shake(10, 0.25)
    }
    return { x: marble.x, y: marble.y }
  },
  mega_bomb(ctx) {
    return paint(ctx, radiusParam(ctx.params, CONFIG.POWERUP_MEGA_BOMB_RADIUS))
  },
  summon(ctx) {
    const profile = activatorProfile(ctx, 'spawn')
    let at = null
    for (let i = 0; i < countParam(ctx.params); i++) {
      const soldier = ctx.game.spawnViewerMarble({ ...profile, id: `${profile.id}_${i}` }, ctx.team)
      at = { x: soldier.x, y: soldier.y }
    }
    ctx.game.camera.shake(8, 0.18)
    return at
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
    if (CONFIG.PROMPT_BYPASS) {
      team = pickBypassTeam(game, target)
      if (!team) return null
      game.scoring?.registerUser?.(String(lookup), team.id)
    } else {
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
  game.onboarding?.notify('gift')
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
