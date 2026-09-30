import { CONFIG } from './config.js';

export class DebugOverlay {
  constructor() {
    this.fpsHistory = new Array(CONFIG.DEBUG_FPS_HISTORY).fill(60);
    this.frameTimeHistory = new Array(CONFIG.DEBUG_FPS_HISTORY).fill(16.67);
  }

  pushFrame(fps, frameTime) {
    this.fpsHistory.push(fps);
    this.fpsHistory.shift();
    this.frameTimeHistory.push(frameTime);
    this.frameTimeHistory.shift();
  }

  draw(ctx, marbles, grid, particles, fps, frameTime) {
    this.drawFPSGraph(ctx, fps, frameTime);
    this.drawPoolStats(ctx, particles, marbles, grid);
    this.drawVelocityArrows(ctx, marbles);
    this.drawHitboxes(ctx, marbles);
    this.drawGridOverlay(ctx, grid);
  }

  drawFPSGraph(ctx, fps, frameTime) {
    const gx = 10;
    const gy = 10;
    const gw = CONFIG.DEBUG_FPS_GRAPH_WIDTH;
    const gh = CONFIG.DEBUG_FPS_GRAPH_HEIGHT;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(gx, gy, gw, gh + 20);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    const maxFps = 70;
    for (let i = 0; i <= 4; i++) {
      const y = gy + (gh / 4) * i;
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx + gw, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.fpsHistory.length; i++) {
      const x = gx + (i / (this.fpsHistory.length - 1)) * gw;
      const y = gy + gh - (this.fpsHistory[i] / maxFps) * gh;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#f80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.frameTimeHistory.length; i++) {
      const x = gx + (i / (this.frameTimeHistory.length - 1)) * gw;
      const clamped = Math.min(this.frameTimeHistory[i], 50);
      const y = gy + gh - (clamped / 50) * gh;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#0f0';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${fps} FPS`, gx + 4, gy + 12);
    ctx.fillStyle = '#f80';
    ctx.fillText(`${frameTime.toFixed(1)}ms`, gx + 70, gy + 12);

    ctx.fillStyle = '#666';
    ctx.font = '8px monospace';
    ctx.fillText('0', gx + 2, gy + gh - 2);
    ctx.fillText('70', gx + 2, gy + 10);
  }

  drawPoolStats(ctx, particles, marbles, grid) {
    const sx = 10;
    let sy = 60;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(sx, sy, 180, 100);

    ctx.fillStyle = '#0ff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Particles: ${particles.active.length} / ${particles.maxParticles}`, sx + 6, sy + 14);
    ctx.fillStyle = '#666';
    ctx.fillText(`Pool free: ${particles.pool.length}`, sx + 6, sy + 26);

    sy += 38;
    ctx.fillStyle = '#ff0';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Tile Ownership:', sx + 6, sy + 4);
    sy += 14;

    const seen = new Set();
    ctx.font = '9px monospace';
    let col = 0;
    let row = 0;
    for (const m of marbles) {
      if (seen.has(m.color)) continue;
      seen.add(m.color);
      const c = grid.countTiles(m.color);
      ctx.fillStyle = m.color;
      const tx = sx + 6 + col * 90;
      const ty = sy + row * 12;
      ctx.fillRect(tx, ty - 8, 6, 6);
      ctx.fillStyle = '#ccc';
      ctx.fillText(`${c}`, tx + 10, ty);
      col++;
      if (col >= 2) { col = 0; row++; }
    }
  }

  drawVelocityArrows(ctx, marbles) {
    for (const m of marbles) {
      if (!m.alive) continue;
      const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
      if (speed < 0.05) continue;

      const nx = m.vx / speed;
      const ny = m.vy / speed;
      const len = speed * 22;

      const ex = m.x + nx * len;
      const ey = m.y + ny * len;

      ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 200, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - nx * 7 + ny * 4, ey - ny * 7 - nx * 4);
      ctx.lineTo(ex - nx * 7 - ny * 4, ey - ny * 7 + nx * 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawHitboxes(ctx, marbles) {
    for (const m of marbles) {
      if (!m.alive) continue;

      ctx.strokeStyle = 'rgba(255, 60, 60, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.stroke();

      const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy) || 1;
      ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.beginPath();
      ctx.arc(m.x + (m.vx / speed) * m.radius, m.y + (m.vy / speed) * m.radius, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGridOverlay(ctx, grid) {
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.08)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= grid.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * grid.tileSize);
      ctx.lineTo(grid.cols * grid.tileSize, r * grid.tileSize);
      ctx.stroke();
    }
    for (let c = 0; c <= grid.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * grid.tileSize, 0);
      ctx.lineTo(c * grid.tileSize, grid.rows * grid.tileSize);
      ctx.stroke();
    }
  }
}
