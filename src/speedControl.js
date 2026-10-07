import { CONFIG } from './config.js'

const STORAGE_KEY = 'twf_soldierSpeed'

function clamp(value) {
  return Math.min(CONFIG.SPEED_CTRL_MAX, Math.max(CONFIG.SPEED_CTRL_MIN, value))
}

export function initSpeedControl() {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    if (Number.isFinite(saved) && saved > 0) CONFIG.MARBLE_SPEED = clamp(saved)
  } catch {
    void 0
  }
  return CONFIG.MARBLE_SPEED
}

export function getSoldierSpeed() {
  return CONFIG.MARBLE_SPEED
}

export function setSoldierSpeed(value, marbles = []) {
  const next = clamp(Number(value) || CONFIG.MARBLE_SPEED)
  const ratio = next / CONFIG.MARBLE_SPEED
  CONFIG.MARBLE_SPEED = next
  for (const marble of marbles) {
    if (!marble.alive || marble.eliminated) continue
    marble.vx *= ratio
    marble.vy *= ratio
  }
  try {
    localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    void 0
  }
  return next
}
