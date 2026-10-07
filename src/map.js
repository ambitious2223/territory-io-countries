const WALL = 'WALL';
const BLOCK = 2;

function mark(walls, r, c, rows, cols) {
  for (let dr = 0; dr < BLOCK; dr++) {
    for (let dc = 0; dc < BLOCK; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) walls[nr][nc] = true;
    }
  }
}

function clearSpawns(walls, spawnTiles, rows, cols) {
  const radius = BLOCK * 2;
  for (const tile of spawnTiles) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const nr = tile.row + dr;
        const nc = tile.col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          walls[nr][nc] = false;
        }
      }
    }
  }
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
      if (x1 < cols && y1 < rows) mark(walls, y1, x1, rows, cols);
      if (x2 < cols && y2 >= 0) mark(walls, y2, x2, rows, cols);
      if (x3 >= 0 && y3 < rows) mark(walls, y3, x3, rows, cols);
      if (x4 >= 0 && y4 >= 0) mark(walls, y4, x4, rows, cols);
    }
    for (let c = 0; c < cols; c++) mark(walls, cy, c, rows, cols);
    for (let r = 0; r < rows; r++) mark(walls, r, cx, rows, cols);
  } else if (name === 'Islands') {
    const clusters = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < clusters; i++) {
      const cr = 2 + Math.floor(Math.random() * (rows - 4));
      const cc = 2 + Math.floor(Math.random() * (cols - 4));
      const size = Math.random() < 0.5 ? 4 : 6;
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

  if (spawnTiles && spawnTiles.length) clearSpawns(walls, spawnTiles, rows, cols);
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
