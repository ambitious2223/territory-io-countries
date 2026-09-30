import { CONFIG } from './config.js';

const WALL = 'WALL';

function clearSpawns(walls, spawnTiles, rows, cols) {
  for (const tile of spawnTiles) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = tile.row + dr;
        const nc = tile.col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          walls[nr][nc] = false;
        }
      }
    }
  }
}

function defaultSpawnTiles(cols, rows) {
  const zoneMap = CONFIG.ZONE_LAYOUT;
  const zoneRows = zoneMap.length;
  const zoneCols = zoneMap[0].length;
  const tilesPerZoneCol = cols / zoneCols;
  const tilesPerZoneRow = rows / zoneRows;
  const tiles = [];
  for (let zr = 0; zr < zoneRows; zr++) {
    for (let zc = 0; zc < zoneCols; zc++) {
      tiles.push({
        row: Math.floor(zr * tilesPerZoneRow + tilesPerZoneRow / 2),
        col: Math.floor(zc * tilesPerZoneCol + tilesPerZoneCol / 2),
      });
    }
  }
  return tiles;
}

export function generateMap(name, cols, rows, spawnTiles = null) {
  const walls = [];
  for (let r = 0; r < rows; r++) {
    walls[r] = [];
    for (let c = 0; c < cols; c++) {
      walls[r][c] = false;
    }
  }

  if (name === 'Crossfire') {
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    for (let i = 0; i < Math.max(cols, rows); i++) {
      const x1 = cx + i;
      const y1 = cy + i;
      const x2 = cx + i;
      const y2 = cy - i;
      const x3 = cx - i;
      const y3 = cy + i;
      const x4 = cx - i;
      const y4 = cy - i;
      if (x1 < cols && y1 < rows) walls[y1][x1] = true;
      if (x2 < cols && y2 >= 0) walls[y2][x2] = true;
      if (x3 >= 0 && y3 < rows) walls[y3][x3] = true;
      if (x4 >= 0 && y4 >= 0) walls[y4][x4] = true;
    }
    for (let c = 0; c < cols; c++) walls[cy][c] = true;
    for (let r = 0; r < rows; r++) walls[r][cx] = true;
  } else if (name === 'Islands') {
    const clusters = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < clusters; i++) {
      const cr = 2 + Math.floor(Math.random() * (rows - 4));
      const cc = 2 + Math.floor(Math.random() * (cols - 4));
      const size = Math.random() < 0.5 ? 2 : 3;
      for (let dr = 0; dr < size; dr++) {
        for (let dc = 0; dc < size; dc++) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            walls[nr][nc] = true;
          }
        }
      }
    }
  }

  const tiles = spawnTiles && spawnTiles.length ? spawnTiles : defaultSpawnTiles(cols, rows);
  clearSpawns(walls, tiles, rows, cols);
  return walls;
}

export function countWalls(walls) {
  let count = 0;
  for (let r = 0; r < walls.length; r++) {
    for (let c = 0; c < walls[r].length; c++) {
      if (walls[r][c]) count++;
    }
  }
  return count;
}

export { WALL };
