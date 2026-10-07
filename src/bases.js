import { CONFIG } from './config.js';
import { shade } from './utils.js';
import { getCapitalScale, getFlagImage } from './teamRegistry.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

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

function drawNamePill(ctx, team, x, y, fontSize) {
  const label = team.name?.en || '';
  if (!label) return;
  const padX = 10;
  const height = fontSize + 10;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const width = ctx.measureText(label).width + padX * 2;
  const left = x - width / 2;

  roundRect(ctx, left, y, width, height, height / 2);
  ctx.fillStyle = 'rgba(8, 8, 10, 0.78)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = team.color;
  ctx.stroke();

  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#fff';
  ctx.fillText(label, x, y + height / 2 + 0.5);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

export function drawBases(ctx, game) {
  const scale = getCapitalScale();
  const radius = (CONFIG.MARBLE_RADIUS + 6) * scale;

  for (let i = 0; i < game.teams.length; i++) {
    const team = game.teams[i];
    if (team.eliminated) continue;
    const point = game.baseCenters[i];
    if (!point) continue;

    ctx.beginPath();
    ctx.arc(point.x, point.y + 3 * scale, radius + 2, 0, Math.PI * 2);
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
      ctx.font = `bold ${Math.round(15 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(team.emoji || (team.name?.en || '?').slice(0, 1).toUpperCase(), point.x, point.y);
    }

    ctx.beginPath();
    ctx.ellipse(point.x - radius * 0.35, point.y - radius * 0.45, radius * 0.34, radius * 0.18, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();

    drawNamePill(ctx, team, point.x, point.y + radius + 6, Math.round(CONFIG.BANNER_FONT_PX * scale));
  }
}
