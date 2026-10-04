import { CONFIG } from './config.js';
import { shade } from './utils.js';
import { getFlagImage } from './teamRegistry.js';

function drawPhoto(ctx, image, x, y, size) {
  const sw = image.naturalWidth;
  const sh = image.naturalHeight;
  const s = Math.min(sw, sh);
  const sx = (sw - s) / 2;
  const sy = (sh - s) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(image, sx, sy, s, s, x - size, y - size, size * 2, size * 2);
  ctx.restore();
}

export function drawBases(ctx, game) {
  for (let i = 0; i < game.teams.length; i++) {
    const team = game.teams[i];
    if (team.eliminated) continue;
    const point = game.baseCenters[i];
    if (!point) continue;

    const radius = CONFIG.MARBLE_RADIUS + 6;

    ctx.beginPath();
    ctx.arc(point.x, point.y + 3, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    const gradient = ctx.createRadialGradient(
      point.x - radius * 0.4, point.y - radius * 0.45, radius * 0.15,
      point.x, point.y, radius * 1.05
    );
    gradient.addColorStop(0, shade(team.color, 0.5));
    gradient.addColorStop(0.55, team.color);
    gradient.addColorStop(1, shade(team.color, -0.45));
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();

    const image = getFlagImage(team);
    if (image && image.complete && image.naturalWidth > 0) {
      drawPhoto(ctx, image, point.x, point.y, radius - 4);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(team.emoji || (team.name?.en || '?').slice(0, 1).toUpperCase(), point.x, point.y);
    }

    ctx.beginPath();
    ctx.ellipse(point.x - radius * 0.35, point.y - radius * 0.45, radius * 0.34, radius * 0.18, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();

    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = team.name?.en || '';
    const w = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(point.x - w / 2 - 4, point.y + radius + 6, w + 8, 16);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, point.x, point.y + radius + 8);
  }
}
