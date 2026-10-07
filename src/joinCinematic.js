import { CONFIG } from './config.js';
import { hexToRgba } from './utils.js';
import { t } from './i18n.js';

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export class JoinCinematic {
  constructor(camera) {
    this.camera = camera;
    this.queue = [];
    this.current = null;
    this.phase = 'idle';
    this.timer = 0;
    this.cardAlpha = 0;
  }

  get active() {
    return this.phase !== 'idle' || this.queue.length > 0;
  }

  get pending() {
    return this.queue.length + (this.current ? 1 : 0);
  }

  enqueue(entry) {
    if (!entry) return;
    const item = { ...entry };
    if (item.avatar) {
      const image = new Image();
      image.src = item.avatar;
      item.image = image;
    }
    this.queue.push(item);
  }

  _track() {
    const target = this.current && this.current.track;
    if (target && target.alive && !target.eliminated) {
      this.camera.focusOn(target.x, target.y, CONFIG.CINEMATIC_ZOOM);
    }
  }

  skip() {
    this.queue.length = 0;
    this.current = null;
    this.phase = 'idle';
    this.timer = 0;
    this.cardAlpha = 0;
    this.camera.resetFocus();
    this.camera.setBlur(0);
  }

  update(dt) {
    const step = dt / 60;

    if (this.phase === 'idle') {
      if (this.queue.length === 0) return;
      this.current = this.queue.shift();
      this.camera.focusOn(this.current.x, this.current.y, CONFIG.CINEMATIC_ZOOM);
      this.camera.setBlur(1);
      this.phase = 'focus';
      this.timer = 0;
    } else if (this.phase === 'focus') {
      this._track();
      this.timer += step;
      if (this.timer >= CONFIG.CINEMATIC_FOCUS_TIME) {
        this.phase = 'hold';
        this.timer = 0;
      }
    } else if (this.phase === 'hold') {
      this._track();
      this.timer += step;
      if (this.timer >= CONFIG.CINEMATIC_HOLD_TIME) {
        this.camera.resetFocus();
        this.camera.setBlur(0);
        this.phase = 'return';
        this.timer = 0;
      }
    } else if (this.phase === 'return') {
      this.timer += step;
      if (this.timer >= CONFIG.CINEMATIC_RETURN_TIME) {
        this.phase = 'idle';
        this.current = null;
      }
    }

    const targetAlpha = this.phase === 'focus' || this.phase === 'hold' ? 1 : 0;
    this.cardAlpha += (targetAlpha - this.cardAlpha) * Math.min(1, dt * 0.15);
  }

  draw(ctx) {
    if (!this.current || this.cardAlpha < 0.01) return;

    const width = 280;
    const height = 86;
    const x = (CONFIG.CANVAS_WIDTH - width) / 2;
    const y = CONFIG.CANVAS_HEIGHT - height - 28;
    const color = this.current.color || '#ffffff';
    const name = this.current.name || t('misc.viewer');
    const teamName = this.current.teamName || '';

    ctx.save();
    ctx.globalAlpha = Math.min(1, this.cardAlpha);

    ctx.fillStyle = 'rgba(10,10,14,0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.stroke();

    const cx = x + 48;
    const cy = y + height / 2;
    const radius = 28;

    if (this.current.image && this.current.image.complete && this.current.image.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.current.image, cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = hexToRgba(color, 0.9);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(name, cx + radius + 14, cy - 9);

    ctx.fillStyle = hexToRgba(color, 0.95);
    ctx.font = 'bold 12px monospace';
    ctx.fillText(teamName, cx + radius + 14, cy + 12);

    ctx.restore();
  }
}
