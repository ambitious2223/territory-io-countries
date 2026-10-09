import { CONFIG } from './config.js';
import { t, getLanguage } from './i18n.js';
import { teamLabel } from './teams.js';
import { hexToRgba } from './utils.js';

const GUIDE_STORE = 'twf.guide';
const TIPS_STORE = 'twf.tips';
const HINT_STORE = 'twf.hint';
const ACCENT = '#00e0ff';
const CHIPS_PER_ROW = 6;
const PAD = 20;

function readFlag(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    void 0;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

export class Onboarding {
  constructor(game = null) {
    this.game = game;
    this.joinVisible = false;
    this.joinTimer = 0;
    this.joinAlpha = 0;
    this.tips = [];
    this.tipTimer = 0;
    this.tipAlpha = 0;
    this.milestones = {};
    this.joinEnabled = readFlag(GUIDE_STORE) !== '0';
    this.tipsEnabled = readFlag(TIPS_STORE) !== '0';
    this.hintEnabled = readFlag(HINT_STORE) !== '0';
  }

  setHintEnabled(enabled) {
    this.hintEnabled = Boolean(enabled);
    writeFlag(HINT_STORE, this.hintEnabled ? '1' : '0');
  }

  setJoinEnabled(enabled) {
    this.joinEnabled = Boolean(enabled);
    writeFlag(GUIDE_STORE, this.joinEnabled ? '1' : '0');
    if (!this.joinEnabled) this.dismissJoin();
  }

  setTipsEnabled(enabled) {
    this.tipsEnabled = Boolean(enabled);
    writeFlag(TIPS_STORE, this.tipsEnabled ? '1' : '0');
    if (!this.tipsEnabled) {
      this.tips.length = 0;
      this.tipTimer = 0;
    }
  }

  startRound() {
    this.milestones = {};
    this.tips.length = 0;
    this.tipTimer = 0;
    this.joinVisible = false;
    this.joinTimer = 0;
    if (this.joinEnabled) {
      this.joinVisible = true;
      this.joinTimer = CONFIG.JOIN_GUIDE_TIME;
    }
  }

  showGuide() {
    if (!this.joinEnabled) return;
    this.joinVisible = true;
    this.joinTimer = CONFIG.JOIN_GUIDE_TIME;
  }

  dismissJoin() {
    this.joinVisible = false;
    this.joinTimer = 0;
  }

  notify(event) {
    if (!this.tipsEnabled || this.milestones[event]) return;
    this.milestones[event] = true;
    const wasIdle = this.tips.length === 0;
    this.tips.push(event);
    if (wasIdle) this.tipTimer = CONFIG.TIP_TIME;
  }

  checkPhase(timeLeft) {
    if (timeLeft <= CONFIG.TIP_FINAL_TIME) this.notify('final');
    else if (timeLeft <= CONFIG.ROUND_DURATION / 2) this.notify('mid');
  }

  update(dt) {
    const step = dt / 60;
    if (this.joinVisible) {
      this.joinTimer -= step;
      if (this.joinTimer <= 0) this.joinVisible = false;
    }
    if (this.tips.length > 0) {
      this.tipTimer -= step;
      if (this.tipTimer <= 0) {
        this.tips.shift();
        this.tipTimer = this.tips.length > 0 ? CONFIG.TIP_TIME : 0;
      }
    }
    this.joinAlpha += ((this.joinVisible ? 1 : 0) - this.joinAlpha) * Math.min(1, dt * 0.15);
    this.tipAlpha += ((this.tips.length > 0 ? 1 : 0) - this.tipAlpha) * Math.min(1, dt * 0.15);
  }

  joinRect() {
    const width = Math.round(CONFIG.CANVAS_WIDTH * CONFIG.JOIN_GUIDE_SHARE);
    const teams = (this.game && this.game.teams) || [];
    const rows = Math.max(1, Math.ceil(teams.length / CHIPS_PER_ROW));
    const height = PAD + 30 + 2 * 22 + 10 + rows * 28 + PAD;
    return {
      x: Math.round((CONFIG.CANVAS_WIDTH - width) / 2),
      y: Math.round((CONFIG.CANVAS_HEIGHT - height) / 2) - 16,
      w: width,
      h: height,
    };
  }

  tipRect() {
    const width = 470;
    const height = 34;
    return {
      x: Math.round((CONFIG.CANVAS_WIDTH - width) / 2),
      y: 14,
      w: width,
      h: height,
    };
  }

  closeRect(rect) {
    return { x: rect.x + rect.w - 32, y: rect.y + 4, w: 26, h: 26 };
  }

  handlePointer(x, y) {
    if (this.joinVisible) {
      const rect = this.joinRect();
      const close = this.closeRect(rect);
      if (x >= close.x && x <= close.x + close.w && y >= close.y && y <= close.y + close.h) {
        this.dismissJoin();
        return true;
      }
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return true;
    }
    if (this.tips.length > 0) {
      const rect = this.tipRect();
      const close = this.closeRect(rect);
      if (x >= close.x && x <= close.x + close.w && y >= close.y && y <= close.y + close.h) {
        this.tips.length = 0;
        this.tipTimer = 0;
        return true;
      }
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return true;
    }
    return false;
  }

  draw(ctx) {
    this.drawGuide(ctx);
    this.drawTip(ctx);
  }

  drawGuide(ctx) {
    if (this.joinAlpha < 0.01) return;
    const rect = this.joinRect();
    const teams = (this.game && this.game.teams) || [];

    ctx.save();
    ctx.globalAlpha = Math.min(1, this.joinAlpha);

    ctx.fillStyle = 'rgba(8, 9, 13, 0.92)';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();

    const innerX = rect.x + PAD;
    let cursorY = rect.y + PAD + 2;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(t('guide.title'), innerX, cursorY + 8);
    this.drawClose(ctx, rect);

    cursorY += 30;
    const steps = [t('guide.step1'), t('guide.step2')];
    steps.forEach((step, index) => {
      ctx.fillStyle = ACCENT;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${index + 1}.`, innerX, cursorY + 8);
      ctx.fillStyle = '#dfe6ea';
      ctx.font = '14px sans-serif';
      ctx.fillText(step, innerX + 22, cursorY + 8);
      cursorY += 22;
    });

    cursorY += 8;
    const chipArea = rect.w - PAD * 2;
    const chipW = Math.floor(chipArea / CHIPS_PER_ROW) - 8;
    const language = getLanguage();
    teams.forEach((team, index) => {
      const col = index % CHIPS_PER_ROW;
      const row = Math.floor(index / CHIPS_PER_ROW);
      const cx = innerX + col * (chipW + 8);
      const cy = cursorY + row * 28;
      roundRect(ctx, cx, cy, chipW, 24, 8);
      ctx.fillStyle = hexToRgba(team.color, 0.22);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = team.color;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      const label = (team.emoji ? `${team.emoji} ` : '') + teamLabel(team, language);
      ctx.fillText(fitText(ctx, label, chipW - 14), cx + 8, cy + 13);
    });

    ctx.restore();
  }

  drawTip(ctx) {
    if (this.tipAlpha < 0.01 || this.tips.length === 0) return;
    const rect = this.tipRect();

    ctx.save();
    ctx.globalAlpha = Math.min(1, this.tipAlpha);

    ctx.fillStyle = 'rgba(8, 9, 13, 0.9)';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 17);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = hexToRgba(ACCENT, 0.7);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ACCENT;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('!', rect.x + 16, rect.y + rect.h / 2 + 1);

    ctx.fillStyle = '#e8eef2';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(t(`tip.${this.tips[0]}`), rect.x + 34, rect.y + rect.h / 2);

    this.drawClose(ctx, rect);
    ctx.restore();
  }

  drawClose(ctx, rect) {
    const close = this.closeRect(rect);
    ctx.strokeStyle = '#c8d0d6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(close.x + 8, close.y + 8);
    ctx.lineTo(close.x + close.w - 8, close.y + close.h - 8);
    ctx.moveTo(close.x + close.w - 8, close.y + 8);
    ctx.lineTo(close.x + 8, close.y + close.h - 8);
    ctx.stroke();
  }
}
