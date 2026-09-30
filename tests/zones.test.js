import { describe, it, expect } from 'vitest'
import { generateZoneLayout, zoneCentroids, zoneSpawnTiles } from '../src/zones.js'

describe('generateZoneLayout', () => {
  it('assigns every tile to a team in range', () => {
    for (const count of [2, 3, 4, 5, 6, 7, 8, 12]) {
      const layout = generateZoneLayout(count, 16, 24)
      const seen = new Set()
      for (const row of layout) {
        for (const team of row) {
          expect(team).toBeGreaterThanOrEqual(0)
          expect(team).toBeLessThan(count)
          seen.add(team)
        }
      }
      expect(seen.size).toBe(count)
    }
  })

  it('produces the right dimensions', () => {
    const layout = generateZoneLayout(4, 16, 24)
    expect(layout.length).toBe(16)
    expect(layout[0].length).toBe(24)
  })
})

describe('zoneCentroids', () => {
  it('returns a centroid per team', () => {
    const layout = generateZoneLayout(4, 16, 24)
    const centroids = zoneCentroids(layout, 50)
    expect(centroids.length).toBe(4)
    for (const point of centroids) {
      expect(point).not.toBeNull()
      expect(point.x).toBeGreaterThan(0)
      expect(point.y).toBeGreaterThan(0)
    }
  })
})

describe('zoneSpawnTiles', () => {
  it('returns in-bounds tiles', () => {
    const layout = generateZoneLayout(8, 16, 24)
    const tiles = zoneSpawnTiles(layout, 50)
    expect(tiles.length).toBe(8)
    for (const tile of tiles) {
      expect(tile.row).toBeGreaterThanOrEqual(0)
      expect(tile.row).toBeLessThan(16)
      expect(tile.col).toBeGreaterThanOrEqual(0)
      expect(tile.col).toBeLessThan(24)
    }
  })
})
