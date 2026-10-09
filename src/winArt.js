import { CONFIG } from './config.js';
import { hexToRgba, shade } from './utils.js';

export function formatDuration(seconds) {
  const clamped = Math.max(0, Math.round(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function easeOutBack(value) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = Math.min(1, Math.max(0, value)) - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

export function drawRays(ctx, x, y, color, spin) {
  const count = CONFIG.WIN_RAY_COUNT;
  const edge = CONFIG.WIN_RAY_RADIUS;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const spread = 0.055;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle - spread) * edge, Math.sin(angle - spread) * edge);
    ctx.lineTo(Math.cos(angle + spread) * edge, Math.sin(angle + spread) * edge);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, i % 2 === 0 ? 0.16 : 0.08);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFlagBackdrop(ctx, image, width, height) {
  if (!image || !image.complete || image.naturalWidth <= 0) return;
  const size = Math.min(width, height) * 0.72;
  ctx.save();
  ctx.globalAlpha = CONFIG.WIN_BACKDROP_ALPHA;
  ctx.drawImage(image, (width - size) / 2, (height - size) / 2, size, size);
  ctx.restore();
}

export function drawFlagMedallion(ctx, image, emoji, color, x, y, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();

  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.2, x, y, radius);
  gradient.addColorStop(0, shade(color, 0.4));
  gradient.addColorStop(1, shade(color, -0.35));
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  if (image && image.complete && image.naturalWidth > 0) {
    const sw = image.naturalWidth;
    const sh = image.naturalHeight;
    const s = Math.min(sw, sh);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius - 4, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, (sw - s) / 2, (sh - s) / 2, s, s, x - (radius - 4), y - (radius - 4), (radius - 4) * 2, (radius - 4) * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(radius * 0.8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji || '🏆', x, y);
  }

  ctx.beginPath();
  ctx.ellipse(x - radius * 0.3, y - radius * 0.4, radius * 0.32, radius * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.restore();
}

export function drawSupporter(ctx, supporter, image, x, y, medalColor, crowned) {
  const radius = 26;
  const teamColor = supporter.color || '#888';

  ctx.beginPath();
  ctx.arc(x, y + radius + 8, radius + 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();

  if (image && image.complete && image.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((supporter.name || '?').slice(0, 1).toUpperCase(), x, y);
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = medalColor || teamColor;
  ctx.stroke();

  if (crowned) {
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♛', x, y - radius - 12);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(supporter.name || '', x, y + radius + 12);
  ctx.fillStyle = hexToRgba(teamColor, 0.95);
  ctx.font = '11px monospace';
  ctx.fillText(String(Math.round(supporter.score)), x, y + radius + 26);
}
