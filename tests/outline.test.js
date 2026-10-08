import { describe, it, expect, vi } from 'vitest'
import { traceOutline, strokeLoops, buildPath } from '../src/outline.js'

function mask(rows, cols, filled) {
  const m = Array.from({ length: rows }, () => new Array(cols).fill(false))
  for (const [r, c] of filled) m[r][c] = true
  return m
}

describe('traceOutline', () => {
  it('returns a four-point loop for a single tile', () => {
    const loops = traceOutline(mask(3, 3, [[1, 1]]), 3, 3, 50)
    expect(loops).toHaveLength(1)
    expect(loops[0]).toHaveLength(4)
  })

  it('merges adjacent tiles into one loop', () => {
    const loops = traceOutline(mask(3, 4, [[1, 1], [1, 2]]), 3, 4, 50)
    expect(loops).toHaveLength(1)
    expect(loops[0]).toHaveLength(6)
  })

  it('returns separate loops for disconnected regions', () => {
    const loops = traceOutline(mask(4, 5, [[0, 0], [3, 4]]), 4, 5, 50)
    expect(loops).toHaveLength(2)
  })

  it('ignores empty masks', () => {
    expect(traceOutline(mask(3, 3, []), 3, 3, 50)).toHaveLength(0)
  })
})

describe('buildPath', () => {
  it('falls back outside the browser (no Path2D)', () => {
    const loops = traceOutline(mask(3, 3, [[1, 1]]), 3, 3, 50)
    expect(buildPath(loops, 10)).toBeNull()
  })
})

describe('strokeLoops', () => {
  it('strokes rounded paths without throwing', () => {
    const ctx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
    }
    const loops = traceOutline(mask(3, 3, [[1, 1]]), 3, 3, 50)
    strokeLoops(ctx, loops, 14)
    expect(ctx.closePath).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.quadraticCurveTo).toHaveBeenCalled()
  })
})
