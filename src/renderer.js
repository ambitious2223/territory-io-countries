import { CONFIG } from './config.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.intensity = 0;
    this.duration = 0;
    this.timer = 0;
  }

  shake(intensity, duration = 0.2) {
    if (intensity > this.intensity) {
      this.intensity = intensity;
      this.duration = duration;
      this.timer = 0;
    }
  }

  update(dt) {
    if (this.intensity > 0.1) {
      this.timer += dt / 60;
      const progress = this.timer / this.duration;
      const currentIntensity = this.intensity * (1 - progress);

      this.x = (Math.random() - 0.5) * currentIntensity * 2;
      this.y = (Math.random() - 0.5) * currentIntensity * 2;
      this.angle = (Math.random() - 0.5) * CONFIG.CAMERA_SHAKE_MAX_ANGLE * (currentIntensity / 14);
    } else {
      this.x = 0;
      this.y = 0;
      this.angle = 0;
      this.intensity = 0;
      this.timer = 0;
    }
  }

  apply(ctx) {
    ctx.translate(this.x, this.y);
    if (Math.abs(this.angle) > 0.0001) {
      ctx.translate(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
      ctx.rotate(this.angle);
      ctx.translate(-CONFIG.CANVAS_WIDTH / 2, -CONFIG.CANVAS_HEIGHT / 2);
    }
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.intensity = 0;
    this.duration = 0;
    this.timer = 0;
  }
}
