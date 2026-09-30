export function generateZoneLayout(teamCount, rows, cols) {
  const layout = []
  const teams = Math.max(1, teamCount)
  const zoneCols = Math.max(1, Math.ceil(Math.sqrt(teams)))
  const zoneRows = Math.max(1, Math.ceil(teams / zoneCols))

  for (let r = 0; r < rows; r++) {
    layout[r] = []
    const zoneRow = Math.min(zoneRows - 1, Math.floor((r * zoneRows) / rows))
    for (let c = 0; c < cols; c++) {
      const zoneCol = Math.min(zoneCols - 1, Math.floor((c * zoneCols) / cols))
      const cell = zoneRow * zoneCols + zoneCol
      layout[r][c] = cell % teams
    }
  }
  return layout
}

export function zoneCentroids(layout, tileSize) {
  const sums = []
  const rows = layout.length
  const cols = layout[0]?.length ?? 0

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
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

export function zoneSpawnTiles(layout, tileSize) {
  return zoneCentroids(layout, tileSize)
    .filter(Boolean)
    .map((point) => ({ row: Math.floor(point.y / tileSize), col: Math.floor(point.x / tileSize) }))
}
