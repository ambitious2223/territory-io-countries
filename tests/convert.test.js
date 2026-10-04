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

describe('Grid one-touch capture', () => {
  it('starts neutral except for the bases', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    expect(grid.countTiles(RED)).toBe(4)
    expect(grid.countTiles(BLUE)).toBe(1)
    expect(grid.countTiles(CONFIG.NEUTRAL_COLOR)).toBe(CONFIG.GRID_ROWS * CONFIG.GRID_COLS - 5)
  })

  it('claims neutral land in a single hit', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    const hit = grid.convertOnHit(7, 10, RED)
    expect(hit.owned).toBe(true)
    expect(hit.from).toBe(CONFIG.NEUTRAL_COLOR)
    expect(grid.getOwner(7, 10)).toBe(RED)
  })

  it('claims enemy land in a single hit', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    const hit = grid.convertOnHit(7, 13, RED)
    expect(hit.owned).toBe(true)
    expect(hit.from).toBe(BLUE)
    expect(grid.getOwner(7, 13)).toBe(RED)
  })

  it('holds a freshly captured tile against the enemy', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    grid.convertOnHit(7, 13, RED)
    expect(grid.isHeld(7, 13)).toBe(true)
    const blocked = grid.convertOnHit(7, 13, BLUE)
    expect(blocked.owned).toBe(false)
    expect(blocked.blocked).toBe(true)
    expect(grid.getOwner(7, 13)).toBe(RED)
  })

  it('lets the enemy retake once the hold expires', () => {
    const grid = new Grid()
    grid.init(makeWalls(), baseLayout(), [RED, BLUE])
    grid.convertOnHit(7, 13, RED)
    grid.tick(CONFIG.TILE_HOLD_TIME + 0.1)
    expect(grid.isHeld(7, 13)).toBe(false)
    expect(grid.convertOnHit(7, 13, BLUE).owned).toBe(true)
    expect(grid.getOwner(7, 13)).toBe(BLUE)
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
