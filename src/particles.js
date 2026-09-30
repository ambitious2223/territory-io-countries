import { CONFIG } from './config.js';
import { randomRange, hexToRgba } from './utils.js';

class Particle {
  constructor() {
    this.alive = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.color = '#fff';
    this.size = 1;
    this.lifetime = 1;
    this.maxLifetime = 1;
  }

  activate(x, y, vx, vy, color, size, lifetime) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.alive = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.alive = false;
  }

  draw(ctx) {
    const alpha = this.lifetime / this.maxLifetime;
    ctx.fillStyle = hexToRgba(this.color, alpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class ParticleSystem {
  constructor(maxParticles = CONFIG.MAX_PARTICLES) {
    this.maxParticles = maxParticles;
    this.pool = new Array(maxParticles);
    this.active = [];
    this.activeCount = 0;

    for (let i = 0; i < maxParticles; i++) {
      this.pool[i] = new Particle();
    }
    this._freeTop = maxParticles;
  }

  _acquire() {
    if (this._freeTop > 0) {
      return this.pool[--this._freeTop];
    }
    return null;
  }

  _release(p) {
    p.alive = false;
    if (this._freeTop < this.pool.length) {
      this.pool[this._freeTop++] = p;
    }
  }

  emitSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const p = this._acquire();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(2, 6);
      p.activate(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        randomRange(2, 5),
        randomRange(15, 30)
      );
      this.active.push(p);
    }
  }

  emitTrail(x, y, color) {
    const p = this._acquire();
    if (!p) return;
    p.activate(
      x + randomRange(-2, 2),
      y + randomRange(-2, 2),
      randomRange(-0.5, 0.5),
      randomRange(-0.5, 0.5),
      '#ffffff',
      randomRange(1, 3),
      randomRange(8, 15)
    );
    this.active.push(p);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.update(dt);
      if (!p.alive) {
        this.active[i] = this.active[this.active.length - 1];
        this.active.pop();
        this._release(p);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.active.length; i++) {
      this.active[i].draw(ctx);
    }
  }

  reset() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this._release(this.active[i]);
    }
    this.active.length = 0;
  }
}
