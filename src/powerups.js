import { CONFIG } from './config.js';

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.alive = true;
    this.radius = 12;
    this.pulse = 0;
  }

  getColor() {
    if (this.type === 'overcharge') return '#FFFF00';
    if (this.type === 'colorbomb') return '#FF4444';
    return '#ffffff';
  }

  getSymbol() {
    if (this.type === 'overcharge') return '\u26A1';
    if (this.type === 'colorbomb') return '\u2605';
    return '?';
  }

  update(dt) {
    this.pulse += dt * 0.15;
  }

  draw(ctx) {
    if (!this.alive) return;
    const scale = 1 + Math.sin(this.pulse) * 0.15;
    const r = this.radius * scale;

    ctx.fillStyle = this.getColor() + '33';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.getColor();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.getSymbol(), this.x, this.y);
  }
}

export class PowerUpManager {
  constructor() {
    this.powerups = [];
    this.spawnTimer = 0;
    this.nextSpawn = CONFIG.POWERUP_SPAWN_MIN;
  }

  reset() {
    this.powerups = [];
    this.spawnTimer = 0;
    this.nextSpawn = CONFIG.POWERUP_SPAWN_MIN;
  }

  spawn(marbles, grid) {
    if (this.powerups.length >= CONFIG.POWERUP_MAX_ON_BOARD) return;

    const alive = marbles.filter(m => m.alive);
    if (alive.length === 0) return;

    const type = CONFIG.POWERUP_TYPES[Math.floor(Math.random() * CONFIG.POWERUP_TYPES.length)];

    let x, y, valid;
    for (let attempt = 0; attempt < 30; attempt++) {
      const col = Math.floor(Math.random() * grid.cols);
      const row = Math.floor(Math.random() * grid.rows);
      if (grid.isWall(row, col)) continue;

      x = (col + 0.5) * grid.tileSize;
      y = (row + 0.5) * grid.tileSize;
      valid = true;
      for (const m of alive) {
        const dx = m.x - x;
        const dy = m.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < 80) {
          valid = false;
          break;
        }
      }
      if (valid) break;
    }

    if (valid) {
      this.powerups.push(new PowerUp(x, y, type));
    }
  }

  update(dt, marbles, grid) {
    this.spawnTimer += dt / 60;
    if (this.spawnTimer >= this.nextSpawn) {
      this.spawnTimer = 0;
      this.nextSpawn = CONFIG.POWERUP_SPAWN_MIN +
        Math.random() * (CONFIG.POWERUP_SPAWN_MAX - CONFIG.POWERUP_SPAWN_MIN);
      this.spawn(marbles, grid);
    }

    for (const p of this.powerups) {
      p.update(dt);
    }

    const collected = [];
    for (const p of this.powerups) {
      if (!p.alive) continue;
      for (const m of marbles) {
        if (!m.alive) continue;
        const dx = m.x - p.x;
        const dy = m.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < m.radius + p.radius) {
          p.alive = false;
          collected.push({ marble: m, powerup: p });
        }
      }
    }

    this.powerups = this.powerups.filter(p => p.alive);
    return collected;
  }

  draw(ctx) {
    for (const p of this.powerups) {
      p.draw(ctx);
    }
  }
}
