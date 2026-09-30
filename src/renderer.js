import { CONFIG } from './config.js';

export class Camera {
  constructor() {
    this.fx = CONFIG.CANVAS_WIDTH / 2;
    this.fy = CONFIG.CANVAS_HEIGHT / 2;
    this.zoom = 1;
    this.tfx = this.fx;
    this.tfy = this.fy;
    this.tzoom = 1;
    this.blur = 0;
    this.tblur = 0;
    this.blurScale = 1;
    this.shakeX = 0;
    this.shakeY = 0;
    this.angle = 0;
    this.intensity = 0;
    this.duration = 0;
    this.timer = 0;
  }

  focusOn(x, y, zoom = CONFIG.CINEMATIC_ZOOM) {
    this.tfx = x;
    this.tfy = y;
    this.tzoom = zoom;
  }

  resetFocus() {
    this.tfx = CONFIG.CANVAS_WIDTH / 2;
    this.tfy = CONFIG.CANVAS_HEIGHT / 2;
    this.tzoom = 1;
  }

  setBlur(amount) {
    this.tblur = Math.max(0, Math.min(1, amount));
  }

  get blurPixels() {
    return this.blur * CONFIG.CINEMATIC_BLUR_MAX * this.blurScale;
  }

  shake(intensity, duration = 0.2) {
    if (intensity > this.intensity) {
      this.intensity = intensity;
      this.duration = duration;
      this.timer = 0;
    }
  }

  update(dt) {
    const k = Math.min(1, dt * CONFIG.CAMERA_FOCUS_LERP);
    this.fx += (this.tfx - this.fx) * k;
    this.fy += (this.tfy - this.fy) * k;
    this.zoom += (this.tzoom - this.zoom) * k;
    this.blur += (this.tblur - this.blur) * k;

    if (this.intensity > 0.1) {
      this.timer += dt / 60;
      const progress = Math.min(1, this.timer / this.duration);
      const currentIntensity = this.intensity * (1 - progress);

      this.shakeX = (Math.random() - 0.5) * currentIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * currentIntensity * 2;
      this.angle = (Math.random() - 0.5) * CONFIG.CAMERA_SHAKE_MAX_ANGLE * (currentIntensity / 14);

      if (progress >= 1) {
        this.intensity = 0;
        this.timer = 0;
      }
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.angle = 0;
      this.intensity = 0;
      this.timer = 0;
    }
  }

  apply(ctx) {
    ctx.translate(CONFIG.CANVAS_WIDTH / 2 + this.shakeX, CONFIG.CANVAS_HEIGHT / 2 + this.shakeY);
    if (Math.abs(this.angle) > 0.0001) {
      ctx.rotate(this.angle);
    }
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.fx, -this.fy);
  }

  reset() {
    this.fx = CONFIG.CANVAS_WIDTH / 2;
    this.fy = CONFIG.CANVAS_HEIGHT / 2;
    this.zoom = 1;
    this.tfx = this.fx;
    this.tfy = this.fy;
    this.tzoom = 1;
    this.blur = 0;
    this.tblur = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.angle = 0;
    this.intensity = 0;
    this.duration = 0;
    this.timer = 0;
  }
}
