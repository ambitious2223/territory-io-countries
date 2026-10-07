import { describe, it, expect } from 'vitest'
import { CONFIG } from '../src/config.js'
import { Grid } from '../src/grid.js'
import { Marble } from '../src/marble.js'
import { PowerUpManager } from '../src/powerups.js'

function makeWalls() {
  return Array.from({ length: CONFIG.GRID_ROWS }, () => new Array(CONFIG.GRID_COLS).fill(false))
}

function makeGrid() {
  const layout = Array.from({ length: CONFIG.GRID_ROWS }, () => new Array(CONFIG.GRID_COLS).fill(-1))
  for (let r = 14; r < 18; r++) {
    for (let c = 22; c < 26; c++) layout[r][c] = 0
  }
  const grid = new Grid()
  grid.init(makeWalls(), layout, ['#FF2222'])
  return grid
}

function spawnMarble(grid) {
  const center = grid.gridToWorld(15, 23)
  return new Marble(center.x, center.y, '#FF2222', 'tester', {})
}

describe('duration constants run in seconds, not frames', () => {
  it('keeps overcharge alive for POWERUP_OVERCHARGE_DURATION seconds', () => {
    const grid = makeGrid()
    const marble = spawnMarble(grid)
    marble.applyPowerup('overcharge', CONFIG.POWERUP_OVERCHARGE_DURATION)

    const justBefore = Math.floor(CONFIG.POWERUP_OVERCHARGE_DURATION * 60) - 30
    for (let frame = 0; frame < justBefore; frame++) marble.update(1, grid)
    expect(marble.alive).toBe(true)
    expect(marble.overcharge).toBe(true)

    for (let frame = 0; frame < 60; frame++) marble.update(1, grid)
    expect(marble.overcharge).toBe(false)
  })

  it('does not spawn power-ups before the configured interval', () => {
    const powerups = new PowerUpManager()
    const grid = makeGrid()
    for (let frame = 0; frame < 10; frame++) powerups.update(1, [], grid)
    expect(powerups.powerups.length).toBe(0)
  })

  it('a frozen soldier holds still and unfreezes in seconds', () => {
    const grid = makeGrid()
    const marble = spawnMarble(grid)
    marble.freeze(1)

    const origin = { x: marble.x, y: marble.y }
    for (let frame = 0; frame < 30; frame++) marble.update(1, grid)
    expect(marble.frozenTimer).toBeGreaterThan(0)
    expect(marble.x).toBe(origin.x)
    expect(marble.y).toBe(origin.y)

    for (let frame = 0; frame < 150; frame++) marble.update(1, grid)
    expect(marble.frozenTimer).toBeLessThanOrEqual(0)
    expect(marble.x !== origin.x || marble.y !== origin.y).toBe(true)
  })

  it('holds a captured tile for TILE_HOLD_TIME seconds', () => {
    const grid = makeGrid()
    grid.convertOnHit(4, 4, '#FF2222')
    expect(grid.isHeld(4, 4)).toBe(true)

    grid.tick((CONFIG.TILE_HOLD_TIME - 0.5) * 60)
    expect(grid.isHeld(4, 4)).toBe(true)

    grid.tick(1 * 60)
    expect(grid.isHeld(4, 4)).toBe(false)
  })
})
