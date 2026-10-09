import { CONFIG } from './config.js';
import { t, getLanguage } from './i18n.js';
import { ConfettiSystem } from './confetti.js';
import { buildStandings } from './scoreboard.js';
import { teamLabel } from './teams.js';
import { getFlagImage } from './teamRegistry.js';
import { hexToRgba, shade } from './utils.js';

function formatDuration(seconds) {
  const clamped = Math.max(0, Math.round(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function drawFlagMedallion(ctx, image, emoji, color, x, y, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();

  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.2, x, y, radius);
  gradient.addColorStop(0, shade(color, 0.4));
  gradient.addColorStop(1, shade(color, -0.35));
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  if (image && image.complete && image.naturalWidth > 0) {
    const sw = image.naturalWidth;
    const sh = image.naturalHeight;
    const s = Math.min(sw, sh);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius - 4, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, (sw - s) / 2, (sh - s) / 2, s, s, x - (radius - 4), y - (radius - 4), (radius - 4) * 2, (radius - 4) * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(radius * 0.8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji || '🏆', x, y);
  }

  ctx.beginPath();
  ctx.ellipse(x - radius * 0.3, y - radius * 0.4, radius * 0.32, radius * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.restore();
}

function drawSupporter(ctx, supporter, image, x, y) {
  const radius = 26;
  const teamColor = supporter.color || '#888';

  ctx.beginPath();
  ctx.arc(x, y + radius + 8, radius + 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();

  if (image && image.complete && image.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((supporter.name || '?').slice(0, 1).toUpperCase(), x, y);
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = teamColor;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(supporter.name || '', x, y + radius + 12);
  ctx.fillStyle = hexToRgba(teamColor, 0.95);
  ctx.font = '11px monospace';
  ctx.fillText(String(Math.round(supporter.score)), x, y + radius + 26);
}

export class WinScreen {
  constructor(game) {
    this.game = game;
    this.visible = false;
    this.alpha = 0;
    this.timer = 0;
    this.confetti = new ConfettiSystem();
    this.snapshot = null;
    this.podiumShown = false;
    this.revealPlayed = false;
    this.avatarImages = new Map();
  }

  show() {
    const game = this.game;
    const team = game.teams.find((entry) => entry.color === game.winColor) || null;
    const winner = game.winner || null;
    const standings = buildStandings(game);
    const percent = game.grid.claimableTiles && winner
      ? Math.round((winner.tiles / game.grid.claimableTiles) * 100)
      : 0;

    const supporters = game.scoring.topContributors(3).map((entry) => ({
      ...entry,
      color: (game.teams.find((candidate) => candidate.id === entry.teamId) || {}).color || '#888',
    }));
    for (const supporter of supporters) {
      if (supporter.avatar && !this.avatarImages.has(supporter.avatar)) {
        const image = new Image();
        image.src = supporter.avatar;
        this.avatarImages.set(supporter.avatar, image);
      }
    }

    this.snapshot = {
      team,
      winnerName: winner?.name || (team ? teamLabel(team, getLanguage()) : ''),
      color: game.winColor || '#FFD700',
      tiles: winner?.tiles || 0,
      percent,
      duration: game.analytics.duration,
      reason: game.winReason,
      nations: standings.slice(0, 3),
      supporters,
    };
    this.visible = true;
    this.timer = 0;
    this.alpha = 0;
    this.podiumShown = false;
    this.revealPlayed = false;
    const flag = team ? getFlagImage(team) : null;
    this.confetti.start([this.snapshot.color, '#FFD700', '#ffffff'], flag && flag.complete ? flag : null);
    game.audio.playVictory();
    game.audio.playConfetti();
  }

  hide() {
    this.visible = false;
    this.snapshot = null;
    this.podiumShown = false;
    this.revealPlayed = false;
    this.confetti.stop();
  }

  update(dt) {
    if (!this.visible || !this.snapshot) return;
    const step = dt / 60;
    this.timer += step;
    this.alpha += (1 - this.alpha) * Math.min(1, dt * 0.12);
    if (!this.revealPlayed && this.timer >= CONFIG.WIN_MEDALLION_REVEAL) {
      this.revealPlayed = true;
      this.game.audio.playReveal();
    }
    if (!this.podiumShown && this.timer >= CONFIG.WIN_PODIUM_DELAY) {
      this.podiumShown = true;
      this.game.audio.playPodium();
    }
    this.confetti.update(dt);
  }

  draw(ctx) {
    const snapshot = this.snapshot;
    if (!this.visible || !snapshot || this.alpha < 0.01) return;

    const width = CONFIG.CANVAS_WIDTH;
    const height = CONFIG.CANVAS_HEIGHT;
    const alpha = Math.min(1, this.alpha);

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = hexToRgba(snapshot.color, 0.3);
    ctx.fillRect(0, 0, width, height);
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.28, width / 2, height / 2, height * 0.78);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    this.confetti.draw(ctx);

    const pop = Math.min(1, this.timer / CONFIG.WIN_MEDALLION_REVEAL);
    const eased = 1 - Math.pow(1 - pop, 3);
    const medallionR = 58 * eased;
    if (medallionR > 2) {
      drawFlagMedallion(
        ctx,
        snapshot.team ? getFlagImage(snapshot.team) : null,
        snapshot.team?.emoji || '🏆',
        snapshot.color,
        width / 2,
        150,
        medallionR
      );
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    ctx.font = 'bold 50px sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(t('win.victory'), width / 2, 268);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(t('win.victory'), width / 2, 268);

    ctx.font = 'bold 28px sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeText(snapshot.winnerName, width / 2, 312);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(snapshot.winnerName, width / 2, 312);

    const reasonKey = snapshot.reason === 'domination' || snapshot.reason === 'timeout'
      ? `gameover.${snapshot.reason}`
      : '';
    const statLine = [
      `${snapshot.tiles} ${t('gameover.tiles')}`,
      `${snapshot.percent}%`,
      formatDuration(snapshot.duration),
      reasonKey ? t(reasonKey) : '',
    ].filter(Boolean).join('  ·  ');
    ctx.font = '15px monospace';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(statLine, width / 2, 348);
    ctx.fillStyle = '#e8eef2';
    ctx.fillText(statLine, width / 2, 348);

    if (this.podiumShown) {
      this.drawPodium(ctx, snapshot);
    }

    ctx.restore();
  }

  drawPodium(ctx, snapshot) {
    const width = CONFIG.CANVAS_WIDTH;
    const nations = snapshot.nations || [];

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = hexToRgba('#00e0ff', 0.95);
    ctx.fillText(t('win.topNations').toUpperCase(), width / 2, 412);

    const cardWidth = 200;
    const gap = 18;
    const total = nations.length * cardWidth + (nations.length - 1) * gap;
    let x = (width - total) / 2 + cardWidth / 2;
    nations.forEach((row, index) => {
      const cy = 452;
      const left = x - cardWidth / 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(left, cy - 22, cardWidth, 44, 10);
      else ctx.rect(left, cy - 22, cardWidth, 44);
      ctx.fillStyle = 'rgba(8, 9, 13, 0.72)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = index === 0 ? '#FFD700' : hexToRgba(row.team?.color || '#888', 0.7);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#9aa';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(String(row.rank), left + 12, cy);

      const team = row.team;
      const flagX = left + 42;
      const image = team ? getFlagImage(team) : null;
      if (image && image.complete && image.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(flagX - 14, cy - 10, 28, 20);
        ctx.clip();
        ctx.drawImage(image, flagX - 14, cy - 10, 28, 20);
        ctx.restore();
      } else {
        ctx.font = '15px sans-serif';
        ctx.fillText(team?.emoji || '🏳️', flagX - 10, cy);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(row.name || teamLabel(team || {}, getLanguage()), left + 66, cy - 8);
      ctx.fillStyle = hexToRgba(row.team?.color || '#888', 0.95);
      ctx.font = '12px monospace';
      ctx.fillText(`${row.percent}%`, left + 66, cy + 9);
      x += cardWidth + gap;
    });

    ctx.textAlign = 'center';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = hexToRgba('#00e0ff', 0.95);
    ctx.fillText(t('win.contributors').toUpperCase(), width / 2, 540);

    const supporters = snapshot.supporters || [];
    if (supporters.length === 0) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#9aa';
      ctx.fillText(t('state.waiting'), width / 2, 585);
      return;
    }

    const avatarGap = 130;
    const startX = width / 2 - ((supporters.length - 1) * avatarGap) / 2;
    supporters.forEach((supporter, index) => {
      const sx = startX + index * avatarGap;
      const image = supporter.avatar ? this.avatarImages.get(supporter.avatar) : null;
      drawSupporter(ctx, supporter, image, sx, 595);
    });
  }
}
