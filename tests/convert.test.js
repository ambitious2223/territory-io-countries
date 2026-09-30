import { describe, it, expect } from 'vitest'
import { Grid } from '../src/grid.js'
import { Marble } from '../src/marble.js'
import { CONFIG } from '../src/config.js'

const RED = '#FF2222'

function makeWalls() {
  return Array.from({ length: CONFIG.GRID_ROWS }, () => new Array(CONFIG.GRID_COLS).fill(false))
}

function makeLayout() {
  const layout = Array.from({ length: CONFIG.GRID_ROWS }, () => new Array(CONFIG.GRID_COLS).fill(-1))
  layout[7][11] = 0
  layout[7][12] = 0
  layout[8][11] = 0
  layout[8][12] = 0
  return layout
}

function tileCenter(grid, row, col) {
  return grid.gridToWorld(row, col)
}

describe('Grid conversion', () => {
  it('starts neutral except for the base tiles', () => {
    const grid = new Grid()
    grid.init(makeWalls(), makeLayout(), [RED])
    expect(grid.countTiles(RED)).toBe(4)
    expect(grid.countTiles(CONFIG.NEUTRAL_COLOR)).toBe(CONFIG.GRID_ROWS * CONFIG.GRID_COLS - 4)
  })

  it('stores and clears convert progress', () => {
    const grid = new Grid()
    grid.init(makeWalls(), makeLayout(), [RED])
    grid.setConvert(6, 11, RED, 0.5)
    expect(grid.getConvert(6, 11)).toEqual({ color: RED, progress: 0.5 })
    grid.clearConvert(6, 11)
    expect(grid.getConvert(6, 11)).toBeNull()
  })

  it('reports the frontier around owned tiles', () => {
    const grid = new Grid()
    grid.init(makeWalls(), makeLayout(), [RED])
    const frontier = grid.getFrontierTiles(RED)
    expect(frontier.length).toBeGreaterThan(0)
    expect(frontier.every((tile) => grid.getOwner(tile.row, tile.col) !== RED)).toBe(true)
  })
})

describe('Marble slow-convert', () => {
  it('moves to a frontier tile and converts it', () => {
    const grid = new Grid()
    grid.init(makeWalls(), makeLayout(), [RED])
    const start = tileCenter(grid, 7, 11)
    const marble = new Marble(start.x, start.y, RED, 'tester', { teamId: 1 })

    let claimed = false
    for (let i = 0; i < 400 && !claimed; i++) {
      const result = marble.update(0.5, grid, new Set())
      if (result && result.claimed) claimed = true
    }

    expect(claimed).toBe(true)
    expect(grid.countTiles(RED)).toBe(5)
    expect(marble.claimedCount).toBeGreaterThanOrEqual(1)
  })

  it('scores a full convert in about TILE_CONVERT_TIME seconds', () => {
    const grid = new Grid()
    grid.init(makeWalls(), makeLayout(), [RED])
    const start = tileCenter(grid, 7, 11)
    const marble = new Marble(start.x, start.y, RED, 'tester', { teamId: 1 })

    marble.targetRow = 6
    marble.targetCol = 11
    const target = tileCenter(grid, 6, 11)
    marble.targetX = target.x
    marble.targetY = target.y
    marble.hasTarget = true
    marble.converting = true
    marble.convertProgress = 0
    marble.convertTime = CONFIG.TILE_CONVERT_TIME
    grid.setConvert(6, 11, RED, 0)

    let elapsed = 0
    while (marble.converting && elapsed < 3) {
      marble.update(0.05, grid, new Set())
      elapsed += 0.05
    }
    expect(marble.converting).toBe(false)
    expect(elapsed).toBeGreaterThan(CONFIG.TILE_CONVERT_TIME - 0.1)
    expect(elapsed).toBeLessThan(CONFIG.TILE_CONVERT_TIME + 0.1)
  })
})
