import { describe, it, expect } from 'vitest'
import { generateBaseLayout, baseCentroids, baseSpawnTiles } from '../src/zones.js'

const BASE_TILES = 16

describe('generateBaseLayout', () => {
  it('gives every team a full base of equal size', () => {
    for (const count of [2, 3, 4, 5, 6, 7, 8, 12]) {
      const layout = generateBaseLayout(count, 16, 24, 4)
      const counts = new Map()
      for (const row of layout) {
        for (const team of row) {
          if (team < 0) continue
          expect(team).toBeGreaterThanOrEqual(0)
          expect(team).toBeLessThan(count)
          counts.set(team, (counts.get(team) || 0) + 1)
        }
      }
      expect(counts.size).toBe(count)
      for (const total of counts.values()) expect(total).toBe(BASE_TILES)
    }
  })

  it('keeps the rest of the arena neutral', () => {
    const layout = generateBaseLayout(4, 16, 24, 4)
    let neutral = 0
    for (const row of layout) {
      for (const team of row) if (team < 0) neutral++
    }
    expect(neutral).toBe(16 * 24 - 4 * BASE_TILES)
  })

  it('produces the right dimensions', () => {
    const layout = generateBaseLayout(4, 16, 24)
    expect(layout.length).toBe(16)
    expect(layout[0].length).toBe(24)
  })
})

describe('baseCentroids', () => {
  it('returns a centroid per team', () => {
    const layout = generateBaseLayout(4, 16, 24)
    const centroids = baseCentroids(layout, 50)
    expect(centroids.length).toBe(4)
    for (const point of centroids) {
      expect(point).not.toBeNull()
      expect(point.x).toBeGreaterThan(0)
      expect(point.y).toBeGreaterThan(0)
    }
  })
})

describe('baseSpawnTiles', () => {
  it('returns in-bounds tiles', () => {
    const layout = generateBaseLayout(8, 16, 24)
    const tiles = baseSpawnTiles(layout, 50)
    expect(tiles.length).toBe(8)
    for (const tile of tiles) {
      expect(tile.row).toBeGreaterThanOrEqual(0)
      expect(tile.row).toBeLessThan(16)
      expect(tile.col).toBeGreaterThanOrEqual(0)
      expect(tile.col).toBeLessThan(24)
    }
  })
})
