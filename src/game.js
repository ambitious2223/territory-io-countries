import { CONFIG } from './config.js';
import { shuffle } from './utils.js';
import { Grid } from './grid.js';
import { Marble } from './marble.js';
import { TerritoryManager } from './territory.js';
import { ParticleSystem } from './particles.js';
import { processCombat } from './combat.js';
import { PowerUpManager } from './powerups.js';
import { AudioEngine } from './audio.js';
import { Analytics } from './analytics.js';
import { Camera } from './renderer.js';
import { DebugOverlay } from './debug.js';
import { VFXSystem } from './vfx.js';
import { updateMarbleAI } from './ai.js';
import { generateMap } from './map.js';
import {
  updateLeaderboard, updateGameOver, hideGameOver,
  updateControlBar, updatePauseOverlay,
  initControls, initDebugPanel, updateDebugPanel,
  getSelectedMap,
} from './ui.js';

const SUPPORTERS = {
  marbleLegends: ['Aurelius', 'Zephyrine', 'Ironveil', 'Starfall'],
  marbleKings: ['Gladius', 'Thornwick', 'Emberlyn', 'Crestfall', 'Duskara'],
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.camera = new Camera();
    this.debug = new DebugOverlay();
    this.grid = new Grid();
    this.territory = new TerritoryManager(this.grid);
    this.particles = new ParticleSystem();
    this.vfx = new VFXSystem();
    this.marbles = [];
    this.powerups = new PowerUpManager();
    this.audio = new AudioEngine();
    this.analytics = new Analytics();

    this.running = false;
    this.paused = false;
    this.gameOver = false;
    this.winner = null;
    this.winColor = null;
    this.frameCount = 0;
    this.debugMode = false;
    this.speed = 1;
    this.currentMap = 'Empty';

    this.victoryFillRow = 0;
    this.victoryFillCol = 0;

    this.fps = 60;
    this.fpsFrames = 0;
    this.fpsTime = 0;
    this.lastFrameTime = 16.67;

    this._sweepKiller = null;

    this._bindInput();
    this._bindAudio();
    initControls(this);
    initDebugPanel();
  }

  _bindInput() {
    const unlockAudio = () => {
      this.audio.init();
      this.audio.unlock();
    };

    window.addEventListener('keydown', (e) => {
      unlockAudio();
      switch (e.key) {
        case 'd': case 'D':
          this.debugMode = !this.debugMode;
          document.getElementById('debug-panel').classList.toggle('visible', this.debugMode);
          break;
        case ' ':
          e.preventDefault();
          this.togglePause();
          break;
        case '1': this.speed = 1; break;
        case '2': this.speed = 2; break;
        case '3': this.speed = 4; break;
        case 'm': case 'M':
          this.audio.toggle();
          break;
        case 'r': case 'R':
          if (this.gameOver) this.restart();
          break;
      }
    });

    this.canvas.addEventListener('click', () => {
      unlockAudio();
    });
  }

  _bindAudio() {
    this.territory.onSweepStart = () => {
      this.audio.startSweep(this._sweepKiller || CONFIG.CANVAS_WIDTH / 2);
    };
    this.territory.onSweepEnd = () => {};
  }

  togglePause() {
    if (this.gameOver) return;
    this.paused = !this.paused;
  }

  restart() {
    this.currentMap = getSelectedMap();
    const walls = generateMap(this.currentMap, CONFIG.GRID_COLS, CONFIG.GRID_ROWS);
    this.grid = new Grid();
    this.grid.init(walls);
    this.territory = new TerritoryManager(this.grid);
    this._bindAudio();
    this.particles.reset();
    this.vfx.reset();
    this.marbles = [];
    this.gameOver = false;
    this.paused = false;
    this.winner = null;
    this.winColor = null;
    this.camera.reset();
    this.victoryFillRow = 0;
    this.victoryFillCol = 0;
    this.powerups.reset();
    this.analytics.reset();
    this._sweepKiller = null;
    hideGameOver();
    this.spawnMarbles();
  }

  start() {
    this.audio.init();
    this.currentMap = getSelectedMap();
    const walls = generateMap(this.currentMap, CONFIG.GRID_COLS, CONFIG.GRID_ROWS);
    this.grid = new Grid();
    this.grid.init(walls);
    this.territory = new TerritoryManager(this.grid);
    this._bindAudio();
    this.spawnMarbles();
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  spawnMarbles() {
    const names = shuffle(CONFIG.MARBLE_NAMES).slice(0, CONFIG.MARBLE_COUNT);
    const zoneNames = ['YELLOW', 'GREEN', 'ORANGE', 'PURPLE', 'BLUE', 'RED', 'MAGENTA', 'CYAN'];
    const zoneMap = CONFIG.ZONE_LAYOUT;
    const zoneRows = zoneMap.length;
    const zoneCols = zoneMap[0].length;
    const tpc = this.grid.cols / zoneCols;
    const tpr = this.grid.rows / zoneRows;

    for (let i = 0; i < CONFIG.MARBLE_COUNT; i++) {
      const zone = zoneNames[i];
      let zr = 0, zc = 0;
      for (let r = 0; r < zoneRows; r++) {
        for (let c = 0; c < zoneCols; c++) {
          if (zoneMap[r][c] === zone) { zr = r; zc = c; }
        }
      }
      const cx = (zc * tpc + tpc / 2) * CONFIG.TILE_SIZE;
      const cy = (zr * tpr + tpr / 2) * CONFIG.TILE_SIZE;
      const marble = new Marble(cx, cy, CONFIG.COLORS[zone], names[i]);
      marble.onInterrupt = (m) => {
        this.camera.shake(4, 0.08);
        this.audio.playInterruption(m.x);
        this.vfx.addInterruptText(m.x, m.y);
      };
      this.marbles.push(marble);
      this.analytics.registerMarble(marble);
    }
  }

  victoryPaint() {
    if (!this.winColor) return;
    const speed = CONFIG.VICTORY_PAINT_SPEED * this.speed;
    let painted = 0;
    while (painted < speed && this.victoryFillRow < this.grid.rows) {
      this.grid.paintTile(this.victoryFillRow, this.victoryFillCol, this.winColor);
      painted++;
      this.victoryFillCol++;
      if (this.victoryFillCol >= this.grid.cols) {
        this.victoryFillCol = 0;
        this.victoryFillRow++;
      }
    }
  }

  checkDomination() {
    if (this.gameOver) return;
    const alive = this.marbles.filter(m => m.alive);
    for (const m of alive) {
      const tiles = this.grid.countTiles(m.color);
      const ratio = tiles / this.grid.claimableTiles;
      if (ratio >= CONFIG.DOMINATION_THRESHOLD) {
        this.gameOver = true;
        this.winner = m;
        this.winColor = m.color;
        this.analytics.updateDuration();
        this.audio.playVictory();
        this.vfx.addDominationText(m.x, m.y, m.name);
        return;
      }
    }
  }

  checkElimination() {
    for (const m of this.marbles) {
      if (!m.alive || m.eliminated) continue;
      const tiles = this.grid.countTiles(m.color);
      if (tiles === 0) {
        m.zeroTileTimer += 1 / 60 * this.speed;
        if (m.zeroTileTimer >= CONFIG.ELIMINATION_ZERO_TILE_TIME) {
          m.eliminated = true;
          this.vfx.addEliminatedText(m.x, m.y, m.name);
        }
      } else {
        m.zeroTileTimer = 0;
      }
    }
  }

  loop() {
    if (!this.running) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 16.667;
    this.lastTime = now;
    this.lastFrameTime = rawDt * 16.667;

    this.fpsFrames++;
    this.fpsTime += this.lastFrameTime;
    if (this.fpsTime >= 1000) {
      this.fps = Math.round(this.fpsFrames * 1000 / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
    this.debug.pushFrame(this.fps, this.lastFrameTime);

    if (!this.paused) {
      const dt = Math.min(rawDt, 3) * this.speed;
      this.update(dt);
    }

    this.render();
    this.frameCount++;
    requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    this.camera.update(dt);

    if (this.gameOver) {
      this.victoryPaint();
      this.particles.update(dt);
      this.vfx.update(dt);
      return;
    }

    const alive = this.marbles.filter(m => m.alive && !m.eliminated);

    for (const m of alive) {
      updateMarbleAI(m, this.marbles, this.grid);
    }

    for (const m of alive) {
      const result = m.update(dt, this.grid, this.marbles);
      if (result && result.claimed) {
        this.particles.emitSparks(result.x, result.y, result.color, 4);
        this.audio.playClaim(result.x, result.combo);
        const filled = this.grid.autoFillEnclosures(m.color);
        if (filled > 0) {
          this.particles.emitSparks(result.x, result.y, result.color, filled * 2);
        }
      }
    }

    const { kills, hits, damageEvents } = processCombat(alive, this.particles);

    for (const hit of hits) {
      const intensity = hit.blade
        ? CONFIG.CAMERA_SHAKE_DEFLECT
        : hit.blocked
          ? CONFIG.CAMERA_SHAKE_HIT * 0.6
          : CONFIG.CAMERA_SHAKE_HIT;
      this.camera.shake(intensity, 0.15);

      if (hit.blocked) {
        this.audio.playDeflect(hit.x);
      } else if (hit.blade) {
        this.audio.playDeflect(hit.x);
      } else {
        this.audio.playHit(hit.x);
      }
    }

    for (const { attacker, victim, amount } of damageEvents) {
      this.analytics.recordDamage(attacker, victim, amount);
    }

    for (const { killer, victim, x, y } of kills) {
      this._sweepKiller = x;
      this.territory.convertWave(victim.color, killer.color);
      this.camera.shake(8, 0.18);
      this.analytics.recordKill(killer, victim);
      this.audio.playElimination(x);
      this.vfx.addEliminatedText(victim.x, victim.y, victim.name);
    }

    const collected = this.powerups.update(dt, this.marbles, this.grid);
    for (const { marble, powerup } of collected) {
      if (powerup.type === 'colorbomb') {
        const { row, col } = this.grid.worldToGrid(marble.x, marble.y);
        const painted = this.grid.paintColorBomb(col, row, marble.color, CONFIG.POWERUP_COLOR_BOMB_RADIUS);
        this.particles.emitSparks(marble.x, marble.y, marble.color, painted * 3);
        this.camera.shake(14, 0.25);
        this.audio.playColorBomb(marble.x);
        this.vfx.addColorBombText(marble.x, marble.y, painted);
        const filled = this.grid.autoFillEnclosures(marble.color);
        if (filled > 0) {
          this.particles.emitSparks(marble.x, marble.y, marble.color, filled * 2);
        }
      } else {
        marble.applyPowerup(powerup.type,
          powerup.type === 'overcharge' ? CONFIG.POWERUP_OVERCHARGE_DURATION : CONFIG.POWERUP_SHIELD_DURATION);
        this.audio.playPickup(powerup.type, marble.x);
        this.vfx.addPickupText(marble.x, marble.y, powerup.type);
      }
    }

    this.territory.update(dt);
    this.particles.update(dt);
    this.vfx.update(dt);

    for (const m of alive) {
      this.analytics.updateTerritory(m, this.grid.countTiles(m.color));
    }

    this.checkDomination();
    this.checkElimination();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.camera.apply(this.ctx);

    this.grid.draw(this.ctx);
    this.powerups.draw(this.ctx);
    this.particles.draw(this.ctx);

    for (const m of this.marbles) {
      if (m.alive && !m.eliminated) m.sword.draw(this.ctx);
    }
    for (const m of this.marbles) {
      if (m.alive && !m.eliminated) m.draw(this.ctx);
    }

    this.vfx.draw(this.ctx);

    if (this.debugMode) {
      this.debug.draw(this.ctx, this.marbles, this.grid, this.particles, this.fps, this.lastFrameTime);
    }

    this.ctx.restore();

    updateLeaderboard(this.marbles);
    updateControlBar(this);
    updatePauseOverlay(this.paused);
    updateDebugPanel(this, this.particles, this.marbles, this.grid);

    if (this.gameOver) {
      const tileCount = this.grid.countTiles(this.winColor);
      const domination = tileCount / this.grid.claimableTiles;
      updateGameOver(this.winner, this.analytics.duration, SUPPORTERS, tileCount, domination);
    }
  }
}
