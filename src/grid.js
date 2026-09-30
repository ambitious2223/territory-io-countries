import { CONFIG } from './config.js';
import { WALL } from './map.js';

export class Grid {
  constructor() {
    this.cols = CONFIG.GRID_COLS;
    this.rows = CONFIG.GRID_ROWS;
    this.tileSize = CONFIG.TILE_SIZE;
    this.tiles = [];
    this.owners = [];
    this.fillProgress = [];
    this.walls = null;
    this.claimableTiles = 0;
  }

  init(walls, layout = null, colors = null) {
    this.walls = walls;
    this.tiles = [];
    this.owners = [];
    this.fillProgress = [];
    this.claimableTiles = 0;

    const zoneMap = CONFIG.ZONE_LAYOUT;
    const zoneRows = zoneMap.length;
    const zoneCols = zoneMap[0].length;
    const tilesPerZoneCol = this.cols / zoneCols;
    const tilesPerZoneRow = this.rows / zoneRows;

    for (let r = 0; r < this.rows; r++) {
      this.tiles[r] = [];
      this.owners[r] = [];
      this.fillProgress[r] = [];
      for (let c = 0; c < this.cols; c++) {
        if (walls[r][c]) {
          this.tiles[r][c] = WALL;
          this.owners[r][c] = WALL;
          this.fillProgress[r][c] = 1.0;
        } else {
          let color;
          if (layout && colors) {
            const teamIndex = layout[r][c];
            color = teamIndex >= 0 && teamIndex < colors.length ? colors[teamIndex] : CONFIG.NEUTRAL_COLOR;
          } else {
            const zr = Math.floor(r / tilesPerZoneRow);
            const zc = Math.floor(c / tilesPerZoneCol);
            color = CONFIG.COLORS[zoneMap[zr][zc]];
          }
          this.tiles[r][c] = color;
          this.owners[r][c] = color;
          this.fillProgress[r][c] = 1.0;
          this.claimableTiles++;
        }
      }
    }
  }

  isWall(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return true;
    return this.owners[row][col] === WALL;
  }

  getTile(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.tiles[row][col];
  }

  getOwner(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.owners[row][col];
  }

  paintTile(row, col, color) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    if (this.owners[row][col] === WALL) return;
    if (this.tiles[row][col] !== color) {
      this.tiles[row][col] = color;
      this.owners[row][col] = color;
      this.fillProgress[row][col] = 1.0;
    }
  }

  setFillProgress(row, col, progress) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    if (this.owners[row][col] === WALL) return;
    this.fillProgress[row][col] = Math.max(0, Math.min(1, progress));
    this.tiles[row][col] = this.owners[row][col];
  }

  getFillProgress(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return 0;
    return this.fillProgress[row][col];
  }

  worldToGrid(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    return {
      row: Math.max(0, Math.min(this.rows - 1, row)),
      col: Math.max(0, Math.min(this.cols - 1, col)),
    };
  }

  gridToWorld(row, col) {
    return {
      x: (col + 0.5) * this.tileSize,
      y: (row + 0.5) * this.tileSize,
    };
  }

  getTileAtWorld(x, y) {
    const { row, col } = this.worldToGrid(x, y);
    return this.getTile(row, col);
  }

  paintAtWorld(x, y, color) {
    const { row, col } = this.worldToGrid(x, y);
    this.paintTile(row, col, color);
  }

  isOwnedBy(row, col, color) {
    return this.getOwner(row, col) === color;
  }

  isAdjacentOwned(row, col, color) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
        if (this.owners[nr][nc] === color) return true;
      }
    }
    return false;
  }

  getFriendlyNeighborCount(row, col, color) {
    let count = 0;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
        if (this.owners[nr][nc] === color) count++;
      }
    }
    return count;
  }

  getEnemyNeighborCount(row, col, color) {
    let count = 0;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
        const owner = this.owners[nr][nc];
        if (owner !== color && owner !== null && owner !== WALL) count++;
      }
    }
    return count;
  }

  getTileType(row, col, color) {
    const owner = this.getOwner(row, col);
    if (owner === WALL) return 'wall';
    if (owner === color) return 'own';
    if (owner === null) return 'neutral';
    return 'enemy';
  }

  getFrontierTiles(color) {
    const frontier = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.owners[r][c] !== color && this.owners[r][c] !== WALL && this.isAdjacentOwned(r, c, color)) {
          frontier.push({ row: r, col: c });
        }
      }
    }
    return frontier;
  }

  autoFillEnclosures(color) {
    const visited = [];
    for (let r = 0; r < this.rows; r++) {
      visited[r] = [];
      for (let c = 0; c < this.cols; c++) {
        visited[r][c] = false;
      }
    }

    const queue = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const onEdge = r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1;
        if (onEdge && this.owners[r][c] !== color && this.owners[r][c] !== WALL && !visited[r][c]) {
          queue.push({ row: r, col: c });
          visited[r][c] = true;
        }
      }
    }

    while (queue.length > 0) {
      const { row, col } = queue.shift();
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          if (!visited[nr][nc] && this.owners[nr][nc] !== color && this.owners[nr][nc] !== WALL) {
            visited[nr][nc] = true;
            queue.push({ row: nr, col: nc });
          }
        }
      }
    }

    let filled = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!visited[r][c] && this.owners[r][c] !== color && this.owners[r][c] !== WALL) {
          this.paintTile(r, c, color);
          filled++;
        }
      }
    }
    return filled;
  }

  paintColorBomb(cx, cy, color, radius) {
    let painted = 0;
    for (let r = cy - radius; r <= cy + radius; r++) {
      for (let c = cx - radius; c <= cx + radius; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          if (this.owners[r][c] !== WALL && this.owners[r][c] !== color) {
            this.paintTile(r, c, color);
            painted++;
          }
        }
      }
    }
    return painted;
  }

  isValidSpawn(x, y) {
    const { row, col } = this.worldToGrid(x, y);
    return !this.isWall(row, col);
  }

  countTiles(color) {
    let count = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.owners[r][c] === color) count++;
      }
    }
    return count;
  }

  draw(ctx) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const owner = this.owners[r][c];
        const fill = this.fillProgress[r][c];
        const tx = c * this.tileSize;
        const ty = r * this.tileSize;

        if (owner === WALL) {
          ctx.fillStyle = CONFIG.WALL_COLOR;
          ctx.fillRect(tx, ty, this.tileSize, this.tileSize);

          ctx.fillStyle = CONFIG.WALL_HIGHLIGHT;
          ctx.fillRect(tx + 2, ty + 2, this.tileSize - 4, 2);
          ctx.fillRect(tx + 2, ty + 2, 2, this.tileSize - 4);

          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(tx + this.tileSize - 4, ty + 4, 2, this.tileSize - 6);
          ctx.fillRect(tx + 4, ty + this.tileSize - 4, this.tileSize - 6, 2);

          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 1;
          for (let i = 0; i < this.tileSize; i += 10) {
            ctx.beginPath();
            ctx.moveTo(tx + i, ty);
            ctx.lineTo(tx, ty + i);
            ctx.stroke();
          }
          continue;
        }

        const baseColor = '#1a1a1a';

        if (fill >= 1) {
          ctx.fillStyle = owner;
        } else if (fill > 0) {
          ctx.fillStyle = baseColor;
          ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
          ctx.fillStyle = owner;
          ctx.globalAlpha = fill;
          const sw = this.tileSize * fill;
          const sh = this.tileSize * fill;
          const sx = tx + (this.tileSize - sw) / 2;
          const sy = ty + (this.tileSize - sh) / 2;
          ctx.fillRect(sx, sy, sw, sh);
          ctx.globalAlpha = 1;
          continue;
        } else {
          ctx.fillStyle = baseColor;
        }
        ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
      }
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * this.tileSize);
      ctx.lineTo(this.cols * this.tileSize, r * this.tileSize);
      ctx.stroke();
    }
    for (let c = 0; c <= this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * this.tileSize, 0);
      ctx.lineTo(c * this.tileSize, this.rows * this.tileSize);
      ctx.stroke();
    }
  }
}
