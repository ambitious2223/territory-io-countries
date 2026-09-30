import { CONFIG } from './config.js';

export class Sword {
  constructor(marble) {
    this.marble = marble;
    this.angle = Math.random() * Math.PI * 2;
    this.orbitRadius = CONFIG.SWORD_ORBIT_RADIUS;
    this.bladeLength = CONFIG.SWORD_LENGTH;
    this.rotationSpeed = CONFIG.SWORD_ROTATION_SPEED;
  }

  update(dt) {
    this.angle += this.rotationSpeed * dt;
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
  }

  getBladeTip() {
    return {
      x: this.marble.x + Math.cos(this.angle) * (this.orbitRadius + this.bladeLength),
      y: this.marble.y + Math.sin(this.angle) * (this.orbitRadius + this.bladeLength),
    };
  }

  getBladeBase() {
    return {
      x: this.marble.x + Math.cos(this.angle) * this.orbitRadius,
      y: this.marble.y + Math.sin(this.angle) * this.orbitRadius,
    };
  }

  getBladeSegment() {
    return {
      x1: this.marble.x + Math.cos(this.angle) * (this.orbitRadius - 5),
      y1: this.marble.y + Math.sin(this.angle) * (this.orbitRadius - 5),
      x2: this.getBladeTip().x,
      y2: this.getBladeTip().y,
    };
  }

  draw(ctx) {
    const base = this.getBladeBase();
    const tip = this.getBladeTip();

    ctx.strokeStyle = 'rgba(150,150,150,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.marble.x, this.marble.y);
    ctx.lineTo(base.x, base.y);
    ctx.stroke();

    const perpX = -Math.sin(this.angle);
    const perpY = Math.cos(this.angle);
    const bladeWidth = 3;

    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(base.x + perpX * bladeWidth, base.y + perpY * bladeWidth);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(base.x - perpX * bladeWidth, base.y - perpY * bladeWidth);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(base.x + perpX * bladeWidth, base.y + perpY * bladeWidth);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(base.x - perpX * bladeWidth, base.y - perpY * bladeWidth);
    ctx.stroke();
  }
}
