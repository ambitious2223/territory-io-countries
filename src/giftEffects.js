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

export function giftSpeedDuration(coins) {
  const raw = toNumber(coins, 0) * CONFIG.GIFT_SPEED_PER_COIN
  return Math.min(CONFIG.GIFT_SPEED_MAX, Math.max(CONFIG.GIFT_SPEED_MIN, raw))
}

function setStats(game, patch) {
  if (game.effectStats) Object.assign(game.effectStats, patch)
}

export function executeEffect(game, effectKey, params = {}, target = {}) {
  if (!game) return null
  setStats(game, { lastKey: String(effectKey) })
  const effect = EFFECTS[effectKey]
  if (!effect) {
    setStats(game, { outcome: 'unknown' })
    return null
  }

  const keys = []
  for (const value of [target.userId, target.username]) {
    const key = value === undefined || value === null ? '' : String(value)
    if (key && !keys.includes(key)) keys.push(key)
  }
  const hasTeam = target.teamId !== undefined && target.teamId !== null
  let team = hasTeam ? game.teams.find((entry) => entry.id === target.teamId) || null : null
  let viewer = null

  if (!team) {
    for (const key of keys) {
      const teamId = game.scoring?.teamOf?.(key)
      if (teamId !== null && teamId !== undefined) {
        team = game.teams.find((entry) => entry.id === teamId) || null
        if (team) break
      }
    }
  }
  if (!team) {
    for (const key of keys) {
      viewer = game.viewers?.viewers.get(key) || null
      if (viewer) break
    }
    if (viewer && viewer.teamId !== null && viewer.teamId !== undefined) {
      team = game.teams.find((entry) => entry.id === viewer.teamId) || null
    }
  }

  if (!team) {
    if (keys.length === 0) return null
    if (CONFIG.PROMPT_BYPASS) {
      team = pickBypassTeam(game, target)
      if (!team) return null
      for (const key of keys) game.scoring?.registerUser?.(key, team.id)
    } else {
      const queued = game.joinPrompt?.request({
        username: String(target.username ?? keys[0]),
        name: target.name || target.username || keys[0],
        avatar: target.avatar || '',
        userId: keys[0],
        effect: effectKey,
        params
      })
      setStats(game, { outcome: 'queued' })
      return queued ? 'pending' : null
    }
  }

  if (!viewer) {
    for (const key of keys) {
      viewer = game.viewers?.viewers.get(key) || null
      if (viewer) break
    }
  }

  const ctx = {
    game,
    team,
    params,
    marble: viewer?.marble || null,
    activator: keys.length
      ? {
          userId: keys[0],
          username: String(target.username ?? keys[0]),
          name: target.name || target.username || keys[0],
          avatar: target.avatar || viewer?.avatar || ''
        }
      : null
  }

  const at = effect(ctx)
  if (at && game.vfx) {
    game.vfx.addPickupText(at.x, at.y, effectKey)
  }
  game.onboarding?.notify('gift')
  setStats(game, { outcome: 'applied' })
  return effectKey
}

export function autoGiftSpeed(game, event) {
  if (!game || !event) return null
  return executeEffect(game, 'boost', { duration: giftSpeedDuration(event.coins) }, {
    userId: event.userId ?? event.username,
    username: event.username,
    name: event.name || event.username,
    avatar: event.avatar || ''
  })
}
