import { CONFIG } from './config.js';
import { randomRange, hexToRgba } from './utils.js';

export class Marble {
  constructor(x, y, color, name, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = CONFIG.MARBLE_RADIUS;
    this.color = color;
    this.name = name;
    this.alive = true;
    this.eliminated = false;

    this.teamId = options.teamId ?? null;
    this.viewerId = options.viewerId ?? null;
    this.isBot = options.isBot ?? false;
    this.avatarUrl = options.avatar || '';
    this.avatarImage = null;
    if (this.avatarUrl) {
      const image = new Image();
      image.src = this.avatarUrl;
      this.avatarImage = image;
    }

    this.overcharge = false;
    this.powerupTimer = 0;
    this.claimedCount = 0;

    this.targetRow = -1;
    this.targetCol = -1;
    this.targetX = 0;
    this.targetY = 0;
    this.hasTarget = false;
    this.converting = false;
    this.convertProgress = 0;
    this.convertTime = CONFIG.TILE_CONVERT_TIME;

    this._allMarbles = [];
  }

  applyPowerup(type, duration) {
    if (type === 'overcharge') {
      this.overcharge = true;
      this.powerupTimer = duration;
    }
  }

  setAllMarbles(list) {
    this._allMarbles = list;
  }

  _key(row = this.targetRow, col = this.targetCol) {
    return `${row},${col}`;
  }

  update(dt, grid, reserved) {
    if (!this.alive || this.eliminated) return null;

    if (this.powerupTimer > 0) {
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        this.overcharge = false;
        this.powerupTimer = 0;
      }
    }

    if (this.converting) {
      const conv = grid.getConvert(this.targetRow, this.targetCol);
      if (!conv || conv.color !== this.color) {
        this._cancelConvert(grid);
      }
    }

    if (this.converting) {
      const boost = this.overcharge ? CONFIG.CONVERT_OVERCHARGE_MULT : 1;
      this.convertProgress += (dt / this.convertTime) * boost;
      if (this.convertProgress >= 1) {
        grid.paintTile(this.targetRow, this.targetCol, this.color);
        const x = this.targetX;
        const y = this.targetY;
        this.converting = false;
        this.convertProgress = 0;
        this.hasTarget = false;
        this.claimedCount += 1;
        return { claimed: true, x, y, color: this.color };
      }
      grid.setConvert(this.targetRow, this.targetCol, this.color, this.convertProgress);
      return null;
    }

    if (!this.hasTarget) {
      this._pickTarget(grid, reserved);
      if (!this.hasTarget) return null;
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = CONFIG.MARBLE_SPEED * (this.overcharge ? 1.6 : 1);

    if (dist > CONFIG.MARBLE_ARRIVE_DIST) {
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return null;
    }

    const owner = grid.getOwner(this.targetRow, this.targetCol);
    if (owner === this.color) {
      reserved?.delete(this._key());
      this.hasTarget = false;
      return null;
    }

    this.x = this.targetX;
    this.y = this.targetY;
    this.vx = 0;
    this.vy = 0;
    this.converting = true;
    this.convertProgress = 0;
    this.convertTime = owner === CONFIG.NEUTRAL_COLOR
      ? CONFIG.TILE_CONVERT_TIME
      : CONFIG.TILE_CONVERT_ENEMY_TIME;
    reserved?.delete(this._key());
    grid.setConvert(this.targetRow, this.targetCol, this.color, 0);
    return null;
  }

  _cancelConvert(grid) {
    if (this.targetRow >= 0) grid.clearConvert(this.targetRow, this.targetCol);
    this.converting = false;
    this.convertProgress = 0;
    this.hasTarget = false;
  }

  _pickTarget(grid, reserved) {
    const frontier = grid.getFrontierTiles(this.color);
    if (frontier.length === 0) {
      this.hasTarget = false;
      return;
    }

    let best = null;
    let bestScore = -Infinity;
    for (const tile of frontier) {
      if (reserved && reserved.has(this._key(tile.row, tile.col))) continue;
      const wx = (tile.col + 0.5) * grid.tileSize;
      const wy = (tile.row + 0.5) * grid.tileSize;
      const dist = Math.sqrt((wx - this.x) ** 2 + (wy - this.y) ** 2);
      const friendly = grid.getFriendlyNeighborCount(tile.row, tile.col, this.color);
      const enemy = grid.getEnemyNeighborCount(tile.row, tile.col, this.color);
      const score = -dist
        + friendly * CONFIG.CLAIM_NEIGHBOR_WEIGHT
        + enemy * CONFIG.CLAIM_ENEMY_WEIGHT
        + randomRange(-CONFIG.CLAIM_RANDOM_JITTER, CONFIG.CLAIM_RANDOM_JITTER);
      if (score > bestScore) {
        bestScore = score;
        best = tile;
      }
    }

    if (!best) best = frontier[Math.floor(Math.random() * frontier.length)];

    this.targetRow = best.row;
    this.targetCol = best.col;
    this.targetX = (best.col + 0.5) * grid.tileSize;
    this.targetY = (best.row + 0.5) * grid.tileSize;
    this.hasTarget = true;
    reserved?.add(this._key());
  }

  draw(ctx) {
    if (!this.alive || this.eliminated) return;

    const glowSize = this.radius + 7 + Math.sin(Date.now() * 0.005) * 2;
    const gradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.5, this.x, this.y, glowSize);
    gradient.addColorStop(0, hexToRgba(this.color, 0.9));
    gradient.addColorStop(0.7, hexToRgba(this.color, 0.35));
    gradient.addColorStop(1, hexToRgba(this.color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    if (this.avatarImage && this.avatarImage.complete && this.avatarImage.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.avatarImage, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = this.overcharge ? '#FFFF00' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (this.converting) {
      const ratio = this.convertProgress / this.convertTime;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(this.name, this.x, this.y - this.radius - 6);
  }
}
