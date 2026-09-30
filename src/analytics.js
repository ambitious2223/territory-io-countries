export class Analytics {
  constructor() {
    this.reset();
  }

  reset() {
    this.startTime = Date.now();
    this.duration = 0;
  }

  updateDuration() {
    this.duration = Math.floor((Date.now() - this.startTime) / 1000);
  }
}
