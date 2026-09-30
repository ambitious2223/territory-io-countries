export class TerritoryManager {
  constructor(grid) {
    this.grid = grid;
    this.waves = [];
    this.totalTiles = grid.rows * grid.cols;
    this.onSweepStart = null;
    this.onSweepEnd = null;
  }

  convertWave(oldColor, newColor, onComplete) {
    const tiles = [];
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        if (this.grid.tiles[r][c] === oldColor) {
          tiles.push(r * this.grid.cols + c);
        }
      }
    }

    if (tiles.length === 0) return;

    const wave = {
      tiles,
      newColor,
      index: 0,
      speed: Math.max(1, Math.floor(tiles.length / 60)),
      onComplete,
      shimmer: 0,
    };
    this.waves.push(wave);

    if (this.onSweepStart && this.waves.length === 1) {
      this.onSweepStart();
    }
  }

  update(dt) {
    for (let w = this.waves.length - 1; w >= 0; w--) {
      const wave = this.waves[w];
      wave.shimmer += dt * 0.5;
      const toProcess = Math.min(wave.speed, wave.tiles.length - wave.index);
      for (let i = 0; i < toProcess; i++) {
        const idx = wave.tiles[wave.index];
        const row = Math.floor(idx / this.grid.cols);
        const col = idx % this.grid.cols;
        this.grid.paintTile(row, col, wave.newColor);
        wave.index++;
      }
      if (wave.index >= wave.tiles.length) {
        if (wave.onComplete) wave.onComplete();
        this.waves.splice(w, 1);
      }
    }

    if (this.waves.length === 0 && this.onSweepEnd) {
      this.onSweepEnd();
    }
  }

  paintUnderMarble(marble) {
    this.grid.paintAtWorld(marble.x, marble.y, marble.color);
  }
}
