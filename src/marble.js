import { CONFIG } from './config.js';
import { randomRange, hexToRgba } from './utils.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Marble {
  constructor(x, y, color, name, options = {}) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.name = name;
    this.radius = CONFIG.MARBLE_RADIUS;

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

    this.alive = true;
    this.eliminated = false;
    this.overcharge = false;
    this.frozenTimer = 0;
    this.powerupTimer = 0;
    this.conversions = 0;
    this.bounceFlash = 0;

    const angle = randomRange(0, Math.PI * 2);
    const speed = CONFIG.MARBLE_SPEED * (1 + randomRange(-CONFIG.BALL_SPAWN_SPEED_JITTER, CONFIG.BALL_SPAWN_SPEED_JITTER));
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  applyPowerup(type, duration) {
    if (type === 'overcharge') {
      this.overcharge = true;
      this.powerupTimer = duration;
    }
  }

  freeze(seconds) {
    this.frozenTimer = Math.max(this.frozenTimer, Math.max(0, seconds));
  }

  update(dt, grid) {
    if (!this.alive || this.eliminated) return null;

    if (this.powerupTimer > 0) {
      this.powerupTimer -= dt / 60;
      if (this.powerupTimer <= 0) {
        this.overcharge = false;
        this.powerupTimer = 0;
      }
    }
    if (this.bounceFlash > 0) this.bounceFlash -= dt / 60;

    if (!this._rescueIfTrapped(grid)) {
      this.alive = false;
      this.eliminated = true;
      return null;
    }

    if (this.frozenTimer > 0) {
      this.frozenTimer -= dt / 60;
      return null;
    }

    const speedScale = this.overcharge ? CONFIG.BALL_OVERCHARGE_MULT : 1;
    const travel = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * dt * speedScale;
    const maxStep = grid.tileSize * CONFIG.BALL_MAX_SUBSTEP;
    const steps = Math.max(1, Math.ceil(travel / maxStep));
    const stepDt = (dt * speedScale) / steps;

    const events = [];
    for (let i = 0; i < steps; i++) {
      const event = this._moveStep(stepDt, grid);
      if (event) events.push(event);
    }
    return events.length ? events : null;
  }

  _rescueIfTrapped(grid) {
    const { row, col } = grid.worldToGrid(this.x, this.y);
    if (grid.getOwner(row, col) === this.color) return true;
    const tile = grid.nearestOwnedTile(row, col, this.color);
    if (!tile) return false;
    const center = grid.gridToWorld(tile.row, tile.col);
    this.x = center.x;
    this.y = center.y;
    return true;
  }

  _moveStep(dt, grid) {
    let x = this.x;
    let y = this.y;
    let bounced = false;
    let converted = null;

    const tx = x + this.vx * dt;
    if (grid.blocksAt(tx, y, this.color)) {
      const { row, col } = grid.worldToGrid(tx, y);
      const hit = grid.convertOnHit(row, col, this.color);
      this.vx = -this.vx;
      bounced = true;
      if (hit.owned) {
        converted = { row, col };
        this.conversions += 1;
      }
    } else {
      x = tx;
    }

    const ty = y + this.vy * dt;
    if (grid.blocksAt(x, ty, this.color)) {
      const { row, col } = grid.worldToGrid(x, ty);
      const hit = grid.convertOnHit(row, col, this.color);
      this.vy = -this.vy;
      bounced = true;
      if (hit.owned) {
        converted = { row, col };
        this.conversions += 1;
      }
    } else {
      y = ty;
    }

    const maxX = grid.cols * grid.tileSize - this.radius;
    const maxY = grid.rows * grid.tileSize - this.radius;
    if (x < this.radius) { x = this.radius; this.vx = Math.abs(this.vx); bounced = true; }
    if (x > maxX) { x = maxX; this.vx = -Math.abs(this.vx); bounced = true; }
    if (y < this.radius) { y = this.radius; this.vy = Math.abs(this.vy); bounced = true; }
    if (y > maxY) { y = maxY; this.vy = -Math.abs(this.vy); bounced = true; }

    this.x = x;
    this.y = y;

    if (!bounced) return null;

    this._jitter();
    this.bounceFlash = 0.12;
    return { bounced: true, converted, x: this.x, y: this.y, color: this.color };
  }

  _jitter() {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || CONFIG.MARBLE_SPEED;
    const angle = Math.atan2(this.vy, this.vx) + randomRange(-CONFIG.BALL_BOUNCE_JITTER, CONFIG.BALL_BOUNCE_JITTER);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  draw(ctx) {
    if (!this.alive || this.eliminated) return;

    const glowSize = this.radius + 9 + Math.sin(Date.now() * 0.005) * 2;
    const gradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.6, this.x, this.y, glowSize);
    gradient.addColorStop(0, hexToRgba(this.color, 0.55));
    gradient.addColorStop(0.7, hexToRgba(this.color, 0.28));
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
      ctx.fillStyle = hexToRgba(this.color, 0.22);
      ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2.5;
    const innerRing = this.overcharge ? '#FFFF00' : this.frozenTimer > 0 ? '#9fe8ff' : '#ffffff';
    ctx.strokeStyle = innerRing;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
    ctx.stroke();

    if (this.bounceFlash > 0) {
      const alpha = this.bounceFlash / 0.12;
      ctx.strokeStyle = hexToRgba('#ffffff', alpha * 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + (1 - alpha) * 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    this.drawNameplate(ctx);
  }

  drawNameplate(ctx) {
    const label = this.name || '';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const width = ctx.measureText(label).width;
    const pad = 6;
    const plateW = width + pad * 2;
    const plateH = 15;
    const x = this.x - plateW / 2;
    const y = this.y - this.radius - 8 - plateH;
    roundRect(ctx, x, y, plateW, plateH, 5);
    ctx.fillStyle = hexToRgba(this.color, 0.9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, this.x, y + plateH / 2 + 0.5);
  }
}
