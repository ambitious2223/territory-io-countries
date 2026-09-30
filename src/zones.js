function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function generateBaseLayout(teamCount, rows, cols, baseSize = 4) {
  const layout = []
  for (let r = 0; r < rows; r++) layout[r] = new Array(cols).fill(-1)

  const teams = Math.max(1, teamCount)
  const gridCols = Math.ceil(Math.sqrt(teams))
  const gridRows = Math.ceil(teams / gridCols)
  const cellW = cols / gridCols
  const cellH = rows / gridRows
  const size = Math.max(2, Math.min(
    baseSize,
    Math.floor(cellW) - 1,
    Math.floor(cellH) - 1,
    rows - 2,
    cols - 2
  ))

  for (let i = 0; i < teams; i++) {
    const gridRow = Math.floor(i / gridCols)
    const gridCol = i % gridCols
    const cy = (gridRow + 0.5) * cellH
    const cx = (gridCol + 0.5) * cellW
    const r0 = clamp(Math.round(cy - size / 2), 0, rows - size)
    const c0 = clamp(Math.round(cx - size / 2), 0, cols - size)
    for (let dr = 0; dr < size; dr++) {
      for (let dc = 0; dc < size; dc++) {
        layout[r0 + dr][c0 + dc] = i
      }
    }
  }
  return layout
}

export function baseCentroids(layout, tileSize) {
  const sums = []
  for (let r = 0; r < layout.length; r++) {
    for (let c = 0; c < layout[r].length; c++) {
      const team = layout[r][c]
      if (team < 0) continue
      if (!sums[team]) sums[team] = { x: 0, y: 0, count: 0 }
      sums[team].x += (c + 0.5) * tileSize
      sums[team].y += (r + 0.5) * tileSize
      sums[team].count += 1
    }
  }
  return sums.map((sum) => (sum ? { x: sum.x / sum.count, y: sum.y / sum.count } : null))
}

export function baseSpawnTiles(layout, tileSize) {
  return baseCentroids(layout, tileSize)
    .filter(Boolean)
    .map((point) => ({ row: Math.floor(point.y / tileSize), col: Math.floor(point.x / tileSize) }))
}
