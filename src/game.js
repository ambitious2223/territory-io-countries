import { CONFIG } from './config.js';
import { randomRange } from './utils.js';
import { generateZoneLayout, zoneSpawnTiles } from './zones.js';
import { ViewerManager } from './viewerManager.js';
import { JoinCinematic } from './joinCinematic.js';
import { ScoringEngine } from './scoring.js';
import { RoundManager, ROUND } from './round.js';
import { renderScoreboard } from './scoreboard.js';
import { addWinner } from './winnersStore.js';
import { matchMapping } from './mappings.js';
import { getMappings } from './mappingsStore.js';
import { executeGiftEffect } from './giftEffects.js';
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
  updateTimer, updateGameOver, hideGameOver,
  updateControlBar, updatePauseOverlay,
  initControls, initDebugPanel, updateDebugPanel,
  updateConnectionPanel, updateViewersPanel, updateCinematicPanel,
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
    this.cinematic = new JoinCinematic(this.camera);
    this.debug = new DebugOverlay();
    this.grid = new Grid();
    this.territory = new TerritoryManager(this.grid);
    this.particles = new ParticleSystem();
    this.vfx = new VFXSystem();
    this.marbles = [];
    this.powerups = new PowerUpManager();
    this.audio = new AudioEngine();
    this.analytics = new Analytics();

    this.teams = [];
    this.zoneLayout = null;
    this.zoneColors = [];
    this.spawnTiles = [];
    this.walls = null;
    this.winReason = null;
    this.scoring = new ScoringEngine(CONFIG.SCORING);
    this.round = new RoundManager({
      roundDuration: CONFIG.ROUND_DURATION,
      intermission: CONFIG.ROUND_INTERMISSION,
      countdown: CONFIG.ROUND_COUNTDOWN,
    });
    this.viewers = new ViewerManager({
      cap: CONFIG.VIEWER_CAP,
      aiFill: CONFIG.AI_FILL_ENABLED,
      aiInterval: CONFIG.AI_FILL_INTERVAL,
      spawn: (profile, team) => this.spawnViewerMarble(profile, team),
      countTeam: (teamId) => this.countTeamMarbles(teamId),
    });

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

  setTeams(teams) {
    this.teams = Array.isArray(teams) && teams.length > 0 ? teams : this.defaultTeams();
  }

  defaultTeams() {
    const zoneNames = [];
    for (const row of CONFIG.ZONE_LAYOUT) {
      for (const zone of row) {
        if (!zoneNames.includes(zone)) zoneNames.push(zone);
      }
    }
    return zoneNames.map((zone, i) => ({
      id: i + 1,
      index: i + 1,
      name: { en: CONFIG.MARBLE_NAMES[i] || `Team ${i + 1}`, ar: '' },
      iso2: '',
      emoji: '',
      color: CONFIG.COLORS[zone],
      flagImage: null,
      aliases: [],
    }));
  }

  setupMatch() {
    if (!this.teams || this.teams.length === 0) this.setTeams(null);
    const layout = generateZoneLayout(this.teams.length, CONFIG.GRID_ROWS, CONFIG.GRID_COLS);
    const colors = this.teams.map((team) => team.color);
    const spawnTiles = zoneSpawnTiles(layout, CONFIG.TILE_SIZE);
    const walls = generateMap(this.currentMap, CONFIG.GRID_COLS, CONFIG.GRID_ROWS, spawnTiles);
    this.zoneLayout = layout;
    this.zoneColors = colors;
    this.spawnTiles = spawnTiles;
    this.walls = walls;
    this.grid = new Grid();
    this.grid.init(walls, layout, colors);
    this.territory = new TerritoryManager(this.grid);
    this._bindAudio();
  }

  restart() {
    this.currentMap = getSelectedMap();
    this.round.stop();
    this.setupMatch();
    this.paused = false;
    this.resetRound();
    this.round.start();
  }

  start() {
    this.audio.init();
    this.currentMap = getSelectedMap();
    this.setupMatch();
    this.scoring.reset();
    this.viewers.reset();
    this.viewers.seed(this.teams);
    this.round.start();
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  startRound() {
    if (this.round.isRunning) return;
    this.resetRound();
    this.round.start();
  }

  endRound() {
    if (this.round.state === ROUND.COUNTDOWN) {
      this.round.stop();
      return;
    }
    if (this.round.state === ROUND.PLAYING) {
      this.finishRound('manual');
    }
  }

  onRoundTransition(state) {
    if (state === ROUND.ROUND_END) {
      this.finishRound('timeout');
    } else if (state === ROUND.COUNTDOWN) {
      this.resetRound();
    }
  }

  finishRound(reason) {
    if (this.gameOver) return;
    this.updateTerritoryScores();
    const board = this.scoring.leaderboard(this.teams.map((team) => team.id));
    const top = board[0];
    const team = this.teams.find((entry) => entry.id === top?.teamId);
    this.gameOver = true;
    this.winReason = reason;
    if (team) {
      const kills = this.marbles
        .filter((marble) => marble.teamId === team.id)
        .reduce((sum, marble) => sum + (marble.kills || 0), 0);
      this.winColor = team.color;
      this.winner = { name: team.name?.en || 'Winner', color: team.color, kills };
      this.vfx.addDominationText(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, team.name?.en || '');
      this.saveWinner(team, top);
    }
    this.analytics.updateDuration();
    this.audio.playVictory();
    this.round.beginIntermission();
  }

  resetRound() {
    this.scoring.reset();
    this.particles.reset();
    this.vfx.reset();
    this.marbles = [];
    this.gameOver = false;
    this.winner = null;
    this.winColor = null;
    this.winReason = null;
    this.camera.reset();
    this.cinematic.skip();
    this.victoryFillRow = 0;
    this.victoryFillCol = 0;
    this.powerups.reset();
    this.analytics.reset();
    this._sweepKiller = null;
    if (this.walls) {
      this.grid.init(this.walls, this.zoneLayout, this.zoneColors);
      this.territory = new TerritoryManager(this.grid);
      this._bindAudio();
    }
    hideGameOver();
    this.suppressCinematic = true;
    this.viewers.respawn();
    this.viewers.seed(this.teams);
    this.suppressCinematic = false;
  }

  updateTerritoryScores() {
    for (const team of this.teams) {
      this.scoring.setTerritory(team.id, this.grid.countTiles(team.color));
    }
  }

  saveWinner(team, row) {
    addWinner('teams', {
      id: team.id,
      name: team.name?.en || '',
      emoji: team.emoji || '',
      color: team.color,
      score: Math.round(row?.combined || 0),
    });
  }

  handleBridgeEvent(event) {
    const result = this.viewers.handleEvent(event, this.teams);
    if (result && result.viewer) {
      this.scoring.registerUser(event.userId ?? event.username, result.viewer.teamId);
    }
    this.scoring.applyEvent(event);
    if (event && event.type === 'gift') {
      const mapping = matchMapping(getMappings(), event);
      if (mapping) executeGiftEffect(this, mapping, event);
    }
  }

  spawnViewerMarble(profile, team) {
    const teamIndex = this.teams.findIndex((entry) => entry.id === team.id);
    const tile = this.spawnTiles[teamIndex] || this.spawnTiles[0] || { row: 0, col: 0 };
    const { x, y } = this.grid.gridToWorld(tile.row, tile.col);
    const jitter = CONFIG.TILE_SIZE * 0.4;
    const marble = new Marble(
      x + randomRange(-jitter, jitter),
      y + randomRange(-jitter, jitter),
      team.color,
      profile.name || 'Viewer',
      { teamId: team.id, viewerId: profile.id, isBot: !!profile.isBot, avatar: profile.avatar }
    );
    marble.onInterrupt = (m) => {
      this.camera.shake(4, 0.08);
      this.audio.playInterruption(m.x);
      this.vfx.addInterruptText(m.x, m.y);
    };
    this.marbles.push(marble);
    this.analytics.registerMarble(marble);
    if (!profile.isBot && !this.suppressCinematic) {
      this.cinematic.enqueue({
        x: marble.x,
        y: marble.y,
        name: marble.name,
        avatar: profile.avatar,
        color: team.color,
        teamName: team.name?.en || '',
      });
    }
    return marble;
  }

  countTeamMarbles(teamId) {
    let count = 0;
    for (const marble of this.marbles) {
      if (marble.teamId === teamId && marble.alive && !marble.eliminated) count += 1;
    }
    return count;
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
    if (!this.grid.claimableTiles) return;
    for (const marble of this.marbles) {
      if (!marble.alive || marble.eliminated) continue;
      const ratio = this.grid.countTiles(marble.color) / this.grid.claimableTiles;
      if (ratio >= CONFIG.DOMINATION_THRESHOLD) {
        this.finishRound('domination');
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
    this.cinematic.update(dt);
    this.camera.update(dt);

    const transition = this.round.update(dt);
    if (transition) this.onRoundTransition(transition);

    if (this.gameOver) {
      this.victoryPaint();
      this.particles.update(dt);
      this.vfx.update(dt);
      return;
    }

    if (this.round.state === ROUND.COUNTDOWN) {
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

    for (const { killer, victim, x } of kills) {
      this._sweepKiller = x;
      this.territory.convertWave(victim.color, killer.color);
      this.camera.shake(8, 0.18);
      this.analytics.recordKill(killer, victim);
      this.audio.playElimination(x);
      this.vfx.addEliminatedText(victim.x, victim.y, victim.name);
      this.viewers.handleDeath(victim);
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
    this.viewers.update(dt, this.teams);

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
    if (this.camera.blurPixels > 0.1) {
      this.ctx.filter = `blur(${this.camera.blurPixels.toFixed(1)}px)`;
    }

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

    if (this.cinematic.active) {
      this.cinematic.draw(this.ctx);
    }

    renderScoreboard(this);
    updateControlBar(this);
    updateTimer(this.round.timeLeft);
    updatePauseOverlay(this.paused);
    updateDebugPanel(this, this.particles, this.marbles, this.grid);
    updateConnectionPanel(this);
    updateViewersPanel(this);
    updateCinematicPanel(this);

    if (this.gameOver) {
      const tileCount = this.grid.countTiles(this.winColor);
      const domination = tileCount / this.grid.claimableTiles;
      updateGameOver(this.winner, this.analytics.duration, SUPPORTERS, tileCount, domination, this.winReason);
    }
  }
}
