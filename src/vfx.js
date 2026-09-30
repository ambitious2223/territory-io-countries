import { hexToRgba } from './utils.js';

class FloatingText {
  constructor(x, y, text, color, duration = 0.8, size = 14) {
    this.x = x;
    this.y = y;
    this.startY = y;
    this.text = text;
    this.color = color;
    this.duration = duration;
    this.timer = 0;
    this.alive = true;
    this.size = size;
    this.totalDistance = 30;
  }

  update(dt) {
    if (!this.alive) return;
    this.timer += dt / 60;
    const progress = Math.min(this.timer / this.duration, 1);
    this.y = this.startY - this.totalDistance * progress;
    if (progress >= 1) {
      this.alive = false;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    const progress = Math.min(this.timer / this.duration, 1);
    const alpha = 1 - progress;

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.font = `bold ${this.size}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(this.text, 1, 1);

    ctx.fillStyle = hexToRgba(this.color, alpha);
    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  }
}

export class VFXSystem {
  constructor() {
    this.texts = [];
  }

  reset() {
    this.texts.length = 0;
  }

  addText(x, y, text, color, duration = 0.8, size = 14) {
    this.texts.push(new FloatingText(x, y, text, color, duration, size));
  }

  addPickupText(x, y, type) {
    const labels = {
      overcharge: 'OVERCHARGED!',
      shield: 'SHIELDED!',
      colorbomb: 'COLOR BOMB!',
    };
    const colors = {
      overcharge: '#FFFF00',
      shield: '#00FFEE',
      colorbomb: '#FF4444',
    };
    this.addText(x, y - 20, labels[type] || type.toUpperCase(), colors[type] || '#fff');
  }

  addColorBombText(x, y, tiles) {
    this.addText(x, y - 30, `+${tiles} TILES!`, '#FFD700', 0.8, 16);
  }

  addInterruptText(x, y) {
    this.addText(x, y - 20, 'INTERRUPTED!', '#FF8C00', 0.8, 14);
  }

  addEliminatedText(x, y, name) {
    this.addText(x, y - 20, 'ELIMINATED!', '#8B0000', 0.8, 18);
  }

  addDominationText(x, y, name) {
    this.addText(x, y - 20, 'DOMINATION!', '#FFD700', 0.8, 22);
  }

  update(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      this.texts[i].update(dt);
      if (!this.texts[i].alive) {
        this.texts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const t of this.texts) {
      t.draw(ctx);
    }
  }
}
