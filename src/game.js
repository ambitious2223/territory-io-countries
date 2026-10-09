import { CONFIG } from './config.js';
import { randomRange } from './utils.js';
import { getLanguage, t } from './i18n.js';
import { teamLabel } from './teams.js';
import { generateBaseLayout, baseCentroids, baseSpawnTiles } from './zones.js';
import { ViewerManager } from './viewerManager.js';
import { JoinCinematic } from './joinCinematic.js';
import { JoinPrompt } from './joinPrompt.js';
import { Onboarding } from './onboarding.js';
import { ManualCamera } from './cameraControls.js';
import { updateCameraPanel } from './cameraPanel.js';
import { WinScreen } from './winScreen.js';
import { ScoringEngine } from './scoring.js';
import { RoundManager, ROUND } from './round.js';
import { renderScoreboard } from './scoreboard.js';
import { buildOverlayPayload } from './overlaySnapshot.js';
import { addWinner } from './winnersStore.js';
import { executeEffect, autoGiftSpeed } from './giftEffects.js';
import { TikoraHub } from './tikora.js';
import { Grid } from './grid.js';
import { Marble } from './marble.js';
import { ParticleSystem } from './particles.js';
import { PowerUpManager } from './powerups.js';
import { AudioEngine } from './audio.js';
import { Analytics } from './analytics.js';
import { Camera } from './renderer.js';
import { VFXSystem } from './vfx.js';
import { generateMap } from './map.js';
import { drawBases } from './bases.js';
import {
  updateTimer, updateGameOver, hideGameOver,
  updateControlBar, updatePauseOverlay,
  initControls, initDebugPanel, updateDebugPanel,
  updateConnectionPanel, updateViewersPanel, updateCinematicPanel, updateTikoraPanel, updateWinnersPanel,
  getSelectedMap,
} from './ui.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.camera = new Camera();
    this.cinematic = new JoinCinematic(this.camera);
    this.joinPrompt = new JoinPrompt();
    this.onboarding = new Onboarding(this);
    this.manualCamera = new ManualCamera(this);
    this.winScreen = new WinScreen(this);
    this.lastRoundState = null;
    this.grid = new Grid();
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
    this.baseCenters = [];
    this.walls = null;
    this.winReason = null;
    this.tikora = new TikoraHub(this);
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
    this.territoryCounts = new Map();

    this.victoryFillRow = 0;
    this.victoryFillCol = 0;

    this.fps = 60;
    this.fpsFrames = 0;
    this.fpsTime = 0;
    this.lastFrameTime = 16.67;
    this.claimSfxTimer = 0;
    this.overlayTimer = 0;
    this.effectStats = { received: 0, lastKey: '', outcome: '-' };

    this._bindInput();
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
          document.getElementById('debug-panel')?.classList.toggle('visible', this.debugMode);
          document.getElementById('debug-fab')?.classList.toggle('active', this.debugMode);
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

    this.canvas.addEventListener('click', (event) => {
      unlockAudio();
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
      this.onboarding?.handlePointer(x, y);
    });
  }

  togglePause() {
    if (this.gameOver) return;
    this.paused = !this.paused;
  }

  setTeams(teams) {
    this.teams = Array.isArray(teams) && teams.length > 0 ? teams : this.defaultTeams();
    for (const team of this.teams) team.eliminated = false;
  }

  defaultTeams() {
    return CONFIG.MARBLE_NAMES.map((name, i) => ({
      id: i + 1,
      index: i + 1,
      name: { en: name, ar: '' },
      iso2: '',
      emoji: '',
      color: CONFIG.TEAM_COLORS[i % CONFIG.TEAM_COLORS.length],
      flagImage: null,
      aliases: [],
      eliminated: false,
    }));
  }

  setupMatch() {
    if (!this.teams || this.teams.length === 0) this.setTeams(null);
    const layout = generateBaseLayout(this.teams.length, CONFIG.GRID_ROWS, CONFIG.GRID_COLS, CONFIG.BASE_SIZE);
    const colors = this.teams.map((team) => team.color);
    const spawnTiles = baseSpawnTiles(layout, CONFIG.TILE_SIZE);
    const walls = generateMap(this.currentMap, CONFIG.GRID_COLS, CONFIG.GRID_ROWS, spawnTiles);
    this.zoneLayout = layout;
    this.zoneColors = colors;
    this.spawnTiles = spawnTiles;
    this.baseCenters = baseCentroids(layout, CONFIG.TILE_SIZE);
    this.walls = walls;
    this.grid = new Grid();
    this.grid.init(walls, layout, colors);
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

  resetPlayers() {
    this.viewers.clearHumans();
    this.marbles = this.marbles.filter((m) => m.alive);
    this.scoring.clearUsers();
    this.joinPrompt.clear();
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
    const rows = this.teams
      .map((team) => ({
        team,
        tiles: this.grid.countTiles(team.color),
        viewers: this.countTeamMarbles(team.id),
      }))
      .sort((a, b) => b.tiles - a.tiles || b.viewers - a.viewers);
    const top = rows[0];
    const team = top?.team;
    this.gameOver = true;
    this.winReason = reason;
    if (team) {
      this.winColor = team.color;
      this.winner = { name: teamLabel(team, getLanguage()) || t('misc.winner'), color: team.color, tiles: top.tiles };
      this.saveWinner(team, top);
    }
    this.analytics.updateDuration();
    if (team) this.winScreen.show();
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
    this.manualCamera.follow = null;
    this.cinematic.skip();
    this.joinPrompt.clear();
    this.winScreen.hide();
    this.victoryFillRow = 0;
    this.victoryFillCol = 0;
    this.powerups.reset();
    this.analytics.reset();
    for (const team of this.teams) team.eliminated = false;
    if (this.walls) {
      this.grid = new Grid();
      this.grid.init(this.walls, this.zoneLayout, this.zoneColors);
    }
    hideGameOver();
    this.suppressCinematic = true;
    this.viewers.respawn();
    this.viewers.seed(this.teams);
    this.suppressCinematic = false;
    for (const viewer of this.viewers.viewers.values()) {
      if (viewer.teamId === null || viewer.teamId === undefined) continue;
      this.scoring.registerUser(viewer.id, viewer.teamId);
      if (viewer.username && viewer.username !== viewer.id) {
        this.scoring.registerUser(viewer.username, viewer.teamId);
      }
    }
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
      score: row?.tiles || 0,
    });
  }

  handleBridgeEvent(event) {
    const userId = event.userId ?? event.username;
    const username = event.username ?? '';
    const result = this.viewers.handleEvent(event, this.teams);

    let teamId = null;
    if (result && result.viewer) {
      teamId = result.viewer.teamId;
      this.onboarding?.notify('join');
    } else {
      const known =
        (userId && this.viewers.viewers.get(String(userId))) ||
        (username && this.viewers.viewers.get(String(username)));
      if (known) teamId = known.teamId;
    }

    if (teamId !== null && teamId !== undefined) {
      this.scoring.registerUser(userId, teamId);
      if (username && String(username) !== String(userId)) {
        this.scoring.registerUser(username, teamId);
      }
    }

    if (event.type === 'chat' && teamId !== null && teamId !== undefined) {
      const resolved = this.joinPrompt.resolve([userId ?? '', username]);
      if (resolved) {
        executeEffect(this, resolved.effect, resolved.params, {
          userId: resolved.userId,
          username: resolved.username,
          name: resolved.name,
          avatar: resolved.avatar,
          teamId
        });
      }
    }

    this.scoring.applyEvent(event);
    if (event && event.type === 'gift') {
      this.audio.playGift(CONFIG.CANVAS_WIDTH / 2);
      autoGiftSpeed(this, event);
    }
  }

  tileCountsByTeam() {
    const counts = new Map();
    for (const team of this.teams) {
      counts.set(team.id, this.grid.countTiles(team.color));
    }
    return counts;
  }

  spawnViewerMarble(profile, team) {
    const teamIndex = this.teams.findIndex((entry) => entry.id === team.id);
    const tile = this.spawnTiles[teamIndex] || this.spawnTiles[0] || { row: 0, col: 0 };
    const { x, y } = this.grid.gridToWorld(tile.row, tile.col);
    const jitter = CONFIG.TILE_SIZE * 0.35;
    const marble = new Marble(
      x + randomRange(-jitter, jitter),
      y + randomRange(-jitter, jitter),
      team.color,
      profile.name || t('misc.viewer'),
      { teamId: team.id, viewerId: profile.id, isBot: !!profile.isBot, avatar: profile.avatar }
    );
    this.marbles.push(marble);
    if (!profile.isBot && !this.suppressCinematic) {
      this.audio.playJoin(marble.x);
      if (CONFIG.AUTOZOOM_ON_JOIN) {
        this.cinematic.enqueue({
          x: marble.x,
          y: marble.y,
          name: marble.name,
          avatar: profile.avatar,
          color: team.color,
          teamName: teamLabel(team, getLanguage()),
          track: marble
        });
      }
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
      this.grid.paintTile(this.victoryFillRow, this.victoryFillCol, this.winColor, true);
      painted++;
      this.victoryFillCol++;
      if (this.victoryFillCol >= this.grid.cols) {
        this.victoryFillCol = 0;
        this.victoryFillRow++;
      }
    }
  }

  checkDomination() {
    if (this.gameOver || !this.grid.claimableTiles) return;
    const counts = this.tileCountsByTeam();
    for (const team of this.teams) {
      if (team.eliminated) continue;
      const ratio = (counts.get(team.id) || 0) / this.grid.claimableTiles;
      if (ratio >= CONFIG.DOMINATION_THRESHOLD) {
        this.finishRound('domination');
        return;
      }
    }
  }

  checkElimination() {
    if (this.gameOver) return;
    for (const team of this.teams) {
      if (team.eliminated) continue;
      if (this.grid.countTiles(team.color) === 0) this.eliminateTeam(team);
    }
  }

  eliminateTeam(team) {
    team.eliminated = true;
    this.viewers.handleTeamEliminated(team.id);
    for (const marble of this.marbles) {
      if (marble.teamId === team.id) {
        marble.alive = false;
        marble.eliminated = true;
      }
    }
    this.vfx.addEliminatedText(this.baseCenters[this.teams.indexOf(team)]?.x || CONFIG.CANVAS_WIDTH / 2,
      this.baseCenters[this.teams.indexOf(team)]?.y || CONFIG.CANVAS_HEIGHT / 2, teamLabel(team, getLanguage()));
    this.audio.playElimination(CONFIG.CANVAS_WIDTH / 2);
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
    this.joinPrompt.update(dt);
    this.onboarding.update(dt);
    this.manualCamera.update();
    this.winScreen.update(dt);
    this.camera.update(dt);

    const transition = this.round.update(dt);
    if (transition) this.onRoundTransition(transition);

    const roundState = this.round.state;
    if (roundState !== this.lastRoundState) {
      if (roundState === ROUND.COUNTDOWN) this.onboarding.startRound();
      this.lastRoundState = roundState;
    }
    if (roundState === ROUND.IDLE && this.round.autoLoop && !this.gameOver) {
      this.round.start();
    }
    if (roundState === ROUND.PLAYING) this.onboarding.checkPhase(this.round.timeLeft);

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

    this.grid.tick(dt);
    if (this.claimSfxTimer > 0) this.claimSfxTimer -= dt / 60;

    const alive = this.marbles.filter((m) => m.alive && !m.eliminated);
    const changedColors = new Set();

    for (const m of alive) {
      const events = m.update(dt, this.grid);
      if (!events) continue;
      for (const event of events) {
        if (!event.converted) continue;
        changedColors.add(m.color);
        this.particles.emitSparks(event.x, event.y, event.color, CONFIG.SPARK_COUNT);
        if (this.claimSfxTimer <= 0) {
          this.audio.playClaim(event.x);
          this.claimSfxTimer = CONFIG.CLAIM_SFX_MIN_INTERVAL;
        }
      }
    }

    for (const color of changedColors) {
      const filled = this.grid.autoFillEnclosures(color);
      if (filled > 0) {
        const center = this.baseCenters[this.teams.findIndex((t) => t.color === color)];
        if (center) this.particles.emitSparks(center.x, center.y, color, Math.min(24, filled * 2));
      }
    }

    const collected = this.powerups.update(dt, this.marbles, this.grid);
    for (const { marble, powerup } of collected) {
      if (powerup.type === 'colorbomb') {
        const { row, col } = this.grid.worldToGrid(marble.x, marble.y);
        const painted = this.grid.paintColorBomb(col, row, marble.color, CONFIG.POWERUP_COLOR_BOMB_RADIUS);
        this.particles.emitSparks(marble.x, marble.y, marble.color, painted * 3);
        this.camera.shake(12, 0.22);
        this.audio.playColorBomb(marble.x);
        this.vfx.addColorBombText(marble.x, marble.y, painted);
        const filled = this.grid.autoFillEnclosures(marble.color);
        if (filled > 0) this.particles.emitSparks(marble.x, marble.y, marble.color, filled * 2);
      } else {
        marble.applyPowerup(powerup.type, CONFIG.POWERUP_OVERCHARGE_DURATION);
        this.audio.playPickup(powerup.type, marble.x);
        this.vfx.addPickupText(marble.x, marble.y, powerup.type);
      }
    }

    this.particles.update(dt);
    this.vfx.update(dt);
    this.viewers.update(dt, this.teams);

    this.checkElimination();
    this.checkDomination();
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
      if (m.alive && !m.eliminated) m.draw(this.ctx);
    }

    drawBases(this.ctx, this);

    this.vfx.draw(this.ctx);

    this.ctx.restore();

    if (this.cinematic.active) {
      this.cinematic.draw(this.ctx);
    }
    this.joinPrompt.draw(this.ctx);
    this.onboarding.draw(this.ctx);
    this.winScreen.draw(this.ctx);

    this.territoryCounts = this.tileCountsByTeam();
    this.overlayTimer += this.lastFrameTime / 1000;
    if (this.overlayTimer >= CONFIG.OVERLAY_BROADCAST_INTERVAL) {
      this.overlayTimer = 0;
      this.broadcastOverlay();
    }
    renderScoreboard(this);
    updateControlBar(this);
    updateTimer(this.round.timeLeft);
    updatePauseOverlay(this.paused);
    updateDebugPanel(this, this.particles, this.grid);
    updateConnectionPanel(this);
    updateViewersPanel(this);
    updateCameraPanel(this);
    updateCinematicPanel(this);
    updateTikoraPanel(this);
    updateWinnersPanel(this);

    if (this.gameOver) {
      const tileCount = this.grid.countTiles(this.winColor);
      const domination = this.grid.claimableTiles ? tileCount / this.grid.claimableTiles : 0;
      updateGameOver(this.winner, this.analytics.duration, tileCount, domination, this.winReason);
    }
  }

  broadcastOverlay() {
    if (!this.bridge) return;
    this.bridge.sendOverlay(buildOverlayPayload(this));
  }

}
