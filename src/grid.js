import { CONFIG } from './config.js';
import { WALL } from './map.js';
import { shade } from './utils.js';

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export class Grid {
  constructor() {
    this.cols = CONFIG.GRID_COLS;
    this.rows = CONFIG.GRID_ROWS;
    this.tileSize = CONFIG.TILE_SIZE;
    this.tiles = [];
    this.owners = [];
    this.convert = [];
    this.walls = null;
    this.claimableTiles = 0;
  }

  init(walls, layout = null, colors = null) {
    this.walls = walls;
    this.tiles = [];
    this.owners = [];
    this.convert = [];
    this.claimableTiles = 0;

    for (let r = 0; r < this.rows; r++) {
      this.tiles[r] = [];
      this.owners[r] = [];
      this.convert[r] = [];
      for (let c = 0; c < this.cols; c++) {
        if (walls[r][c]) {
          this.tiles[r][c] = WALL;
          this.owners[r][c] = WALL;
          this.convert[r][c] = null;
        } else {
          let color = CONFIG.NEUTRAL_COLOR;
          if (layout && colors) {
            const teamIndex = layout[r][c];
            if (teamIndex >= 0 && teamIndex < colors.length) color = colors[teamIndex];
          }
          this.tiles[r][c] = color;
          this.owners[r][c] = color;
          this.convert[r][c] = null;
          this.claimableTiles++;
        }
      }
    }
  }

  inBounds(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  isWall(row, col) {
    if (!this.inBounds(row, col)) return true;
    return this.owners[row][col] === WALL;
  }

  getOwner(row, col) {
    if (!this.inBounds(row, col)) return null;
    return this.owners[row][col];
  }

  paintTile(row, col, color) {
    if (!this.inBounds(row, col)) return;
    if (this.owners[row][col] === WALL) return;
    this.tiles[row][col] = color;
    this.owners[row][col] = color;
    this.convert[row][col] = null;
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

  blocksAt(x, y, color) {
    const { row, col } = this.worldToGrid(x, y);
    const owner = this.owners[row][col];
    return owner === WALL || owner !== color;
  }

  convertOnHit(row, col, color) {
    if (!this.inBounds(row, col)) return { owned: false };
    const owner = this.owners[row][col];
    if (owner === WALL || owner === color) return { owned: false };

    const chunk = owner === CONFIG.NEUTRAL_COLOR ? CONFIG.CONVERT_HIT_CHUNK : CONFIG.CONVERT_ENEMY_HIT_CHUNK;
    const current = this.convert[row][col];
    const progress = current && current.color === color ? current.progress + chunk : chunk;

    if (progress >= 1) {
      this.paintTile(row, col, color);
      return { owned: true };
    }
    this.convert[row][col] = { color, progress };
    return { owned: false };
  }

  nearestOwnedTile(row, col, color) {
    let best = null;
    let bestDist = Infinity;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.owners[r][c] !== color) continue;
        const dist = (r - row) * (r - row) + (c - col) * (c - col);
        if (dist < bestDist) {
          bestDist = dist;
          best = { row: r, col: c };
        }
      }
    }
    return best;
  }

  autoFillEnclosures(color) {
    const visited = [];
    for (let r = 0; r < this.rows; r++) {
      visited[r] = new Array(this.cols).fill(false);
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
      for (const [dr, dc] of DIRS) {
        const nr = row + dr;
        const nc = col + dc;
        if (!this.inBounds(nr, nc)) continue;
        if (!visited[nr][nc] && this.owners[nr][nc] !== color && this.owners[nr][nc] !== WALL) {
          visited[nr][nc] = true;
          queue.push({ row: nr, col: nc });
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
        if (this.inBounds(r, c) && this.owners[r][c] !== WALL && this.owners[r][c] !== color) {
          this.paintTile(r, c, color);
          painted++;
        }
      }
    }
    return painted;
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
    const size = this.tileSize;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const owner = this.owners[r][c];
        const tx = c * size;
        const ty = r * size;

        if (owner === WALL) {
          this.drawWall(ctx, tx, ty, size);
          continue;
        }

        ctx.fillStyle = owner;
        ctx.fillRect(tx, ty, size, size);

        const conv = this.convert[r][c];
        if (conv) {
          const inset = Math.min(size * 0.45, (size * (1 - conv.progress)) / 2);
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = conv.color;
          ctx.fillRect(tx + inset, ty + inset, size - inset * 2, size - inset * 2);
          ctx.globalAlpha = 1;
        }
      }
    }

    this.drawBorders(ctx);
  }

  drawWall(ctx, tx, ty, size) {
    ctx.fillStyle = CONFIG.WALL_COLOR;
    ctx.fillRect(tx, ty, size, size);
    ctx.fillStyle = CONFIG.WALL_HIGHLIGHT;
    ctx.fillRect(tx + 2, ty + 2, size - 4, 2);
    ctx.fillRect(tx + 2, ty + 2, 2, size - 4);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(tx + size - 4, ty + 4, 2, size - 6);
    ctx.fillRect(tx + 4, ty + size - 4, size - 6, 2);
  }

  drawBorders(ctx) {
    const size = this.tileSize;
    ctx.lineWidth = CONFIG.BORDER_WIDTH;
    ctx.lineCap = 'round';

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const owner = this.owners[r][c];
        if (owner === WALL || owner === CONFIG.NEUTRAL_COLOR) continue;

        const right = this.getOwner(r, c + 1);
        const down = this.getOwner(r + 1, c);
        ctx.strokeStyle = shade(owner, -0.25);

        if (right !== owner && right !== null) {
          ctx.beginPath();
          ctx.moveTo((c + 1) * size, r * size);
          ctx.lineTo((c + 1) * size, (r + 1) * size);
          ctx.stroke();
        }
        if (down !== owner && down !== null) {
          ctx.beginPath();
          ctx.moveTo(c * size, (r + 1) * size);
          ctx.lineTo((c + 1) * size, (r + 1) * size);
          ctx.stroke();
        }
      }
    }
  }
}
