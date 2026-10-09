import { CONFIG } from './config.js';
import { t } from './i18n.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const FOCUS_ZOOM = 1.8;
const PRESET_ZOOM = 1.6;
const WHEEL_STEP = 0.12;
const KEY_ZOOM_STEP = 0.15;
const PAN_STEP = 40;
const DRAG_THRESHOLD = 4;

export function zoomToward(camera, worldX, worldY, factor) {
  const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.tzoom * factor));
  if (next === camera.tzoom) return;
  const ratio = camera.tzoom / next;
  camera.tfx = worldX + (camera.tfx - worldX) * ratio;
  camera.tfy = worldY + (camera.tfy - worldY) * ratio;
  camera.tzoom = next;
}

function screenToWorld(game, event) {
  const rect = game.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 0, y: 0 };
  return {
    x: (event.clientX - rect.left) * (game.canvas.width / rect.width),
    y: (event.clientY - rect.top) * (game.canvas.height / rect.height),
  };
}

export class ManualCamera {
  constructor(game) {
    this.game = game;
    this.follow = null;
    this.dragStart = null;
    this.dragMoved = false;
    this._attach();
  }

  cancelCinematic() {
    this.game.cinematic?.skip();
  }

  toast(text) {
    this.game.vfx?.addText(CONFIG.CANVAS_WIDTH / 2, 130, text, '#FFD700', 1.6, 15);
  }

  focus(x, y, zoom = FOCUS_ZOOM) {
    this.cancelCinematic();
    this.follow = null;
    this.game.camera.focusOn(x, y, zoom);
    this.toast(t('camera.manual'));
  }

  followBall(marble) {
    this.cancelCinematic();
    this.follow = marble;
    this.toast(t('camera.manual'));
  }

  pan(dx, dy) {
    this.cancelCinematic();
    this.follow = null;
    this.game.camera.tfx += dx;
    this.game.camera.tfy += dy;
  }

  zoomBy(factor) {
    this.cancelCinematic();
    this.follow = null;
    zoomToward(this.game.camera, this.game.camera.tfx, this.game.camera.tfy, factor);
  }

  reset() {
    this.cancelCinematic();
    this.follow = null;
    this.game.camera.resetFocus();
    this.toast(t('camera.reset'));
  }

  focusTeam(teamId) {
    const index = this.game.teams.findIndex((team) => team.id === teamId);
    const point = this.game.baseCenters[index];
    if (!point) return;
    this.focus(point.x, point.y, PRESET_ZOOM);
  }

  focusLeader() {
    const teams = this.game.teams || [];
    let best = null;
    let bestTiles = -1;
    for (const team of teams) {
      const tiles = this.game.grid?.countTiles(team.color) ?? 0;
      if (tiles > bestTiles) {
        bestTiles = tiles;
        best = team;
      }
    }
    if (best) this.focusTeam(best.id);
    else this.reset();
  }

  update() {
    if (!this.follow) return;
    if (!this.follow.alive || this.follow.eliminated) {
      this.follow = null;
      this.game.camera.resetFocus();
      return;
    }
    this.game.camera.focusOn(this.follow.x, this.follow.y, Math.max(this.game.camera.tzoom, PRESET_ZOOM));
  }

  _attach() {
    const canvas = this.game.canvas;

    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const world = screenToWorld(this.game, event);
      this.cancelCinematic();
      this.follow = null;
      zoomToward(this.game.camera, world.x, world.y, event.deltaY < 0 ? 1 + WHEEL_STEP : 1 - WHEEL_STEP);
    }, { passive: false });

    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      this.dragStart = { x: event.clientX, y: event.clientY };
      this.dragMoved = false;
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!this.dragStart) return;
      const dx = event.clientX - this.dragStart.x;
      const dy = event.clientY - this.dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        this.dragMoved = true;
        this.cancelCinematic();
        this.follow = null;
        this.game.camera.tfx -= dx / this.game.camera.zoom;
        this.game.camera.tfy -= dy / this.game.camera.zoom;
        this.dragStart = { x: event.clientX, y: event.clientY };
      }
    });

    canvas.addEventListener('pointerup', (event) => {
      if (!this.dragStart) return;
      const wasTap = !this.dragMoved;
      this.dragStart = null;
      if (!wasTap) return;
      const world = screenToWorld(this.game, event);
      let nearest = null;
      let nearestDist = Infinity;
      for (const marble of this.game.marbles) {
        if (!marble.alive || marble.eliminated) continue;
        const dist = Math.hypot(marble.x - world.x, marble.y - world.y);
        if (dist < marble.radius + 12 && dist < nearestDist) {
          nearestDist = dist;
          nearest = marble;
        }
      }
      if (nearest) this.followBall(nearest);
      else this.focus(world.x, world.y);
    });

    canvas.addEventListener('pointercancel', () => { this.dragStart = null; });

    window.addEventListener('keydown', (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const step = PAN_STEP / Math.max(1, this.game.camera.zoom);
      switch (event.key) {
        case 'ArrowUp': this.pan(0, -step); break;
        case 'ArrowDown': this.pan(0, step); break;
        case 'ArrowLeft': this.pan(-step, 0); break;
        case 'ArrowRight': this.pan(step, 0); break;
        case '+': case '=': this.zoomBy(1 + KEY_ZOOM_STEP); break;
        case '-': case '_': this.zoomBy(1 - KEY_ZOOM_STEP); break;
        case '0': case 'Escape': this.reset(); break;
        default: return;
      }
      event.preventDefault();
    });
  }
}
