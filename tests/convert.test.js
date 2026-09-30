import { describe, it, expect } from 'vitest'
import { Grid } from '../src/grid.js'
import { Marble } from '../src/marble.js'
import { CONFIG } from '../src/config.js'

const RED = '#FF2222'
const BLUE = '#1E90FF'

function makeWalls() {
  return Array.from({ length: CONFIG.GRID_ROWS }, () => new Array(CONFIG.GRID_COLS).fill(false))
}

function baseLayout() {
  const layout = Array.from({ length: CONFIG.GRID_ROWS }, () => new Array(CONFIG.GRID_COLS).fill(-1))
  layout[7][11] = 0
  layout[7][12] = 0
  layout[8][11] = 0
  layout[8][12] = 0
  layout[7][13] = 1
  return layout
}

describe('Grid hit-conversion', () => {
  it('starts neutral except for the bases', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    expect(grid.countTiles(RED)).toBe(4)
    expect(grid.countTiles(BLUE)).toBe(1)
    expect(grid.countTiles(CONFIG.NEUTRAL_COLOR)).toBe(CONFIG.GRID_ROWS * CONFIG.GRID_COLS - 5)
  })

  it('takes two hits to claim neutral land', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    expect(grid.convertOnHit(7, 10, RED).owned).toBe(false)
    expect(grid.convertOnHit(7, 10, RED).owned).toBe(true)
    expect(grid.getOwner(7, 10)).toBe(RED)
  })

  it('takes more hits to eat enemy land', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    const hits = Math.ceil(1 / CONFIG.CONVERT_ENEMY_HIT_CHUNK)
    let owned = false
    for (let i = 0; i < hits - 1; i++) owned = grid.convertOnHit(7, 13, RED).owned
    expect(owned).toBe(false)
    expect(grid.convertOnHit(7, 13, RED).owned).toBe(true)
    expect(grid.getOwner(7, 13)).toBe(RED)
  })

  it('lets an opposing nation take over an in-progress tile', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    grid.convertOnHit(7, 10, RED)
    expect(grid.convertOnHit(7, 10, BLUE).owned).toBe(false)
    expect(grid.getOwner(7, 10)).toBe(CONFIG.NEUTRAL_COLOR)
  })

  it('blocks movement into any tile a nation does not own', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    const own = grid.gridToWorld(7, 11)
    const neutral = grid.gridToWorld(7, 10)
    const enemy = grid.gridToWorld(7, 13)
    expect(grid.blocksAt(own.x, own.y, RED)).toBe(false)
    expect(grid.blocksAt(neutral.x, neutral.y, RED)).toBe(true)
    expect(grid.blocksAt(enemy.x, enemy.y, RED)).toBe(true)
  })
})

describe('Marble ricochet', () => {
  it('stays inside its nation and expands the border', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    const start = grid.gridToWorld(7, 11)
    const marble = new Marble(start.x, start.y, RED, 'tester', { teamId: 1 })

    const before = grid.countTiles(RED)
    for (let f = 0; f < 4000 && marble.alive; f++) {
      marble.update(1, grid)
      const { row, col } = grid.worldToGrid(marble.x, marble.y)
      expect(grid.getOwner(row, col)).toBe(RED)
    }

    expect(marble.alive).toBe(true)
    expect(grid.countTiles(RED)).toBeGreaterThan(before)
    expect(marble.conversions).toBeGreaterThan(0)
  })
})
