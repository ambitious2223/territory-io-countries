import { CONFIG } from './config.js';
import { randomRange } from './utils.js';

const RAIN_INTERVAL = 0.045;
const RAIN_BATCH = 3;
const SWAY_STRENGTH = 40;

class Piece {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.rot = 0;
    this.vr = 0;
    this.w = 6;
    this.h = 10;
    this.color = '#FFD700';
    this.life = 0;
    this.phase = 0;
    this.flag = false;
  }

  activate(x, y, vx, vy, color, life, flag = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.rot = randomRange(0, Math.PI * 2);
    this.vr = randomRange(-8, 8);
    this.w = randomRange(3, 8);
    this.h = randomRange(6, 14);
    this.color = color;
    this.life = life;
    this.phase = randomRange(0, Math.PI * 2);
    this.flag = flag;
    this.active = true;
  }

  update(step) {
    this.vy += CONFIG.WIN_CONFETTI_GRAVITY * step;
    this.vx += Math.sin(this.phase + this.x * 0.01) * SWAY_STRENGTH * step;
    this.x += this.vx * step;
    this.y += this.vy * step;
    this.rot += this.vr * step;
    this.life -= step;
  }
}

export class ConfettiSystem {
  constructor(maxPieces = CONFIG.WIN_CONFETTI_MAX) {
    this.pool = [];
    for (let i = 0; i < maxPieces; i++) this.pool.push(new Piece());
    this.active = false;
    this.colors = ['#FFD700'];
    this.flagImage = null;
    this.elapsed = 0;
    this.rainTimer = 0;
  }

  start(colors, flagImage = null) {
    for (const piece of this.pool) piece.active = false;
    this.colors = colors && colors.length ? colors : ['#FFD700'];
    this.flagImage = flagImage;
    this.active = true;
    this.elapsed = 0;
    this.rainTimer = 0;
    this.burst(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 40, 70);
  }

  stop() {
    this.active = false;
    for (const piece of this.pool) piece.active = false;
  }

  _acquire() {
    for (const piece of this.pool) {
      if (!piece.active) return piece;
    }
    return null;
  }

  _spawn(x, y, vx, vy) {
    const piece = this._acquire();
    if (!piece) return;
    const flag = Boolean(this.flagImage && Math.random() < 0.18);
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    piece.activate(x, y, vx, vy, color, randomRange(6, 12), flag);
  }

  burst(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(180, 480);
      this._spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 160);
    }
  }

  update(dt) {
    if (!this.active) return;
    const step = dt / 60;
    this.elapsed += step;

    if (this.elapsed < CONFIG.WIN_CONFETTI_TIME) {
      this.rainTimer -= step;
      while (this.rainTimer <= 0) {
        this.rainTimer += RAIN_INTERVAL;
        for (let i = 0; i < RAIN_BATCH; i++) {
          this._spawn(randomRange(0, CONFIG.CANVAS_WIDTH), randomRange(-60, -10), randomRange(-40, 40), randomRange(40, 110));
        }
      }
    }

    let alive = 0;
    for (const piece of this.pool) {
      if (!piece.active) continue;
      piece.update(step);
      if (piece.life <= 0 || piece.y > CONFIG.CANVAS_HEIGHT + 60) piece.active = false;
      else alive += 1;
    }
    if (this.elapsed > CONFIG.WIN_CONFETTI_TIME && alive === 0) this.active = false;
  }

  draw(ctx) {
    for (const piece of this.pool) {
      if (!piece.active) continue;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      if (piece.flag && this.flagImage && this.flagImage.complete && this.flagImage.naturalWidth > 0) {
        ctx.beginPath();
        ctx.rect(-piece.w, -piece.h, piece.w * 2, piece.h * 2);
        ctx.clip();
        const size = Math.max(piece.w, piece.h) * 2.4;
        ctx.drawImage(this.flagImage, -size / 2, -size / 2, size, size);
      } else {
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      }
      ctx.restore();
    }
  }
}
