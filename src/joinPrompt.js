import { CONFIG } from './config.js';
import { t } from './i18n.js';
import { hexToRgba } from './utils.js';

const ACCENT = '#00e0ff';

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function matches(item, keys) {
  if (!item) return false;
  const username = String(item.username || '').toLowerCase();
  const userId = String(item.userId || '');
  for (const key of keys) {
    const raw = String(key || '');
    if (!raw) continue;
    if (username && raw.toLowerCase() === username) return true;
    if (userId && raw === userId) return true;
  }
  return false;
}

export class JoinPrompt {
  constructor() {
    this.pending = [];
    this.current = null;
    this.alpha = 0;
  }

  get count() {
    return this.pending.length + (this.current ? 1 : 0);
  }

  request(entry) {
    if (!entry || !entry.username) return false;
    const keys = [entry.username, entry.userId];
    if (matches(this.current, keys) || this.pending.some((item) => matches(item, keys))) {
      return false;
    }
    const item = { ...entry, timer: 0 };
    if (item.avatar) {
      const image = new Image();
      image.src = item.avatar;
      item.image = image;
    }
    this.pending.push(item);
    return true;
  }

  resolve(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    let item = null;
    if (matches(this.current, list)) {
      item = this.current;
      this.current = null;
    } else {
      const index = this.pending.findIndex((entry) => matches(entry, list));
      if (index >= 0) item = this.pending.splice(index, 1)[0];
    }
    return item || null;
  }

  clear() {
    this.pending.length = 0;
    this.current = null;
    this.alpha = 0;
  }

  update(dt) {
    const step = dt / 60;
    if (!this.current && this.pending.length > 0) {
      this.current = this.pending.shift();
      this.current.timer = 0;
    }
    if (this.current) {
      this.current.timer += step;
      if (this.current.timer >= CONFIG.JOIN_PROMPT_TIMEOUT) {
        this.current = null;
      }
    }
    const target = this.current ? 1 : 0;
    this.alpha += (target - this.alpha) * Math.min(1, dt * 0.18);
  }

  draw(ctx) {
    if (!this.current || this.alpha < 0.01) return;

    const width = 340;
    const height = 96;
    const x = (CONFIG.CANVAS_WIDTH - width) / 2;
    const y = CONFIG.CANVAS_HEIGHT - height - 130;
    const pulse = 0.6 + Math.sin(Date.now() * 0.006) * 0.4;
    const name = this.current.name || this.current.username || '';

    ctx.save();
    ctx.globalAlpha = Math.min(1, this.alpha);

    ctx.fillStyle = 'rgba(10, 10, 14, 0.9)';
    roundRect(ctx, x, y, width, height, 12);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = hexToRgba(ACCENT, 0.55 + pulse * 0.45);
    ctx.stroke();

    const cx = x + 52;
    const cy = y + height / 2;
    const radius = 30;
    const image = this.current.image;
    if (image && image.complete && image.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(image, cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    const textX = cx + radius + 14;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(name, textX, cy - 24);

    ctx.fillStyle = hexToRgba(ACCENT, 0.6 + pulse * 0.4);
    ctx.font = 'bold 15px monospace';
    ctx.fillText(t('prompt.title'), textX, cy - 1);

    ctx.fillStyle = '#9aa';
    ctx.font = '12px monospace';
    ctx.fillText(t('prompt.body'), textX, cy + 21);

    ctx.restore();
  }
}
