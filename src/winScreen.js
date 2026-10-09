import { CONFIG } from './config.js';
import { t, getLanguage } from './i18n.js';
import { ConfettiSystem } from './confetti.js';
import { buildStandings } from './scoreboard.js';
import { teamLabel } from './teams.js';
import { getFlagImage } from './teamRegistry.js';
import { getWinners } from './winnersStore.js';
import { hexToRgba } from './utils.js';
import {
  formatDuration, easeOutBack, drawRays, drawFlagBackdrop, drawFlagMedallion, drawSupporter,
} from './winArt.js';

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
    this.drumrollPlayed = false;
    this.crowdPlayed = false;
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

    const board = getWinners().teams || [];
    const prior = board.find((entry) => entry.id === team?.id);

    this.snapshot = {
      team,
      winnerName: winner?.name || (team ? teamLabel(team, getLanguage()) : ''),
      color: game.winColor || '#FFD700',
      tiles: winner?.tiles || 0,
      percent,
      duration: game.analytics.duration,
      reason: game.winReason,
      wins: (prior?.wins || 0) + 1,
      nations: standings.slice(0, 3),
      supporters,
    };
    this.visible = true;
    this.timer = 0;
    this.alpha = 0;
    this.podiumShown = false;
    this.revealPlayed = false;
    this.drumrollPlayed = false;
    this.crowdPlayed = false;
    const flag = team ? getFlagImage(team) : null;
    this.confetti.start([this.snapshot.color, '#FFD700', '#ffffff'], flag && flag.complete ? flag : null);
    game.audio.playAnthem(team);
    game.audio.playConfetti();
  }

  hide() {
    this.visible = false;
    this.snapshot = null;
    this.podiumShown = false;
    this.revealPlayed = false;
    this.drumrollPlayed = false;
    this.crowdPlayed = false;
    this.confetti.stop();
  }

  update(dt) {
    if (!this.visible || !this.snapshot) return;
    const step = dt / 60;
    this.timer += step;
    this.alpha += (1 - this.alpha) * Math.min(1, dt * 0.12);
    const drumrollAt = Math.max(0, CONFIG.WIN_MEDALLION_REVEAL - CONFIG.WIN_DRUMROLL_LEAD);
    if (!this.drumrollPlayed && this.timer >= drumrollAt) {
      this.drumrollPlayed = true;
      this.game.audio.playDrumroll();
    }
    if (!this.revealPlayed && this.timer >= CONFIG.WIN_MEDALLION_REVEAL) {
      this.revealPlayed = true;
      this.game.audio.playReveal();
      this.confetti.burst(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 40, CONFIG.WIN_CONFETTI_REVEAL_BURST);
    }
    if (!this.crowdPlayed && this.timer >= CONFIG.WIN_MEDALLION_REVEAL) {
      this.crowdPlayed = true;
      this.game.audio.playCrowd();
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
    vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const flag = snapshot.team ? getFlagImage(snapshot.team) : null;
    drawFlagBackdrop(ctx, flag, width, height);

    this.confetti.draw(ctx);

    const reveal = Math.min(1, this.timer / CONFIG.WIN_MEDALLION_REVEAL);
    const medallionR = 58 * easeOutBack(reveal);
    if (medallionR > 2) {
      drawRays(ctx, width / 2, 150, snapshot.color, this.timer * 0.35);
      drawFlagMedallion(ctx, flag, snapshot.team?.emoji || '🏆', snapshot.color, width / 2, 150, medallionR);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    const titleScale = 0.85 + 0.15 * easeOutBack(reveal);
    ctx.save();
    ctx.translate(width / 2, 268);
    ctx.scale(titleScale, titleScale);
    ctx.font = 'bold 50px sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(t('win.victory'), 0, 0);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(t('win.victory'), 0, 0);
    ctx.restore();

    ctx.font = 'bold 28px sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(snapshot.winnerName, width / 2, 312);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(snapshot.winnerName, width / 2, 312);

    const reasonLabel = this.reasonLabel(snapshot.reason);
    if (reasonLabel) {
      ctx.font = 'bold 18px sans-serif';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(reasonLabel, width / 2, 342);
      ctx.fillStyle = '#57e6ff';
      ctx.fillText(reasonLabel, width / 2, 342);
    }

    const countT = Math.min(1, this.timer / CONFIG.WIN_STATS_COUNT_TIME);
    const countEased = 1 - Math.pow(1 - countT, 3);
    const statLine = [
      `${Math.round(snapshot.tiles * countEased)} ${t('gameover.tiles')}`,
      `${Math.round(snapshot.percent * countEased)}%`,
      formatDuration(snapshot.duration * countEased),
    ].join('  ·  ');
    ctx.font = '15px monospace';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(statLine, width / 2, 372);
    ctx.fillStyle = '#e8eef2';
    ctx.fillText(statLine, width / 2, 372);

    if (snapshot.wins >= 1) {
      const badge = `${snapshot.wins} ${t('win.wins')}`;
      ctx.font = 'bold 13px sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(badge, width / 2, 400);
      ctx.fillStyle = '#FFD700';
      ctx.fillText(badge, width / 2, 400);
    }

    if (this.podiumShown) {
      this.drawPodium(ctx, snapshot);
    }

    this.drawCountdown(ctx);

    ctx.restore();
  }

  reasonLabel(reason) {
    if (reason === 'domination') return t('win.reasonDomination');
    if (reason === 'timeout') return t('win.reasonTimeout');
    if (reason === 'manual') return t('win.reasonManual');
    return '';
  }

  drawCountdown(ctx) {
    const round = this.game.round;
    if (!round || round.state !== 'intermission') return;
    const seconds = Math.ceil(round.timeLeft);
    if (seconds <= 0) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    const label = `${t('win.nextRound')} ${seconds}s`;
    ctx.strokeText(label, CONFIG.CANVAS_WIDTH / 2, 706);
    ctx.fillStyle = '#cfe3ea';
    ctx.fillText(label, CONFIG.CANVAS_WIDTH / 2, 706);
  }

  drawPodium(ctx, snapshot) {
    const width = CONFIG.CANVAS_WIDTH;
    const nations = snapshot.nations || [];
    const podiumElapsed = this.timer - CONFIG.WIN_PODIUM_DELAY;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = hexToRgba('#00e0ff', 0.95);
    ctx.fillText(t('win.topNations').toUpperCase(), width / 2, 430);

    const cardWidth = 200;
    const gap = 18;
    const total = nations.length * cardWidth + (nations.length - 1) * gap;
    const startX = (width - total) / 2 + cardWidth / 2;
    const order = nations.length === 3 ? [1, 0, 2] : nations.map((_, index) => index);

    order.forEach((nationIndex, slot) => {
      const row = nations[nationIndex];
      if (!row) return;
      const reveal = Math.min(1, Math.max(0, (podiumElapsed - slot * CONFIG.WIN_PODIUM_STAGGER) / 0.28));
      if (reveal <= 0) return;
      const eased = 1 - Math.pow(1 - reveal, 3);
      const baseCy = 474 + (nationIndex === 0 ? -CONFIG.WIN_RAISED_OFFSET : 0);
      const cy = baseCy + (1 - eased) * 24;
      const x = startX + slot * (cardWidth + gap);
      const left = x - cardWidth / 2;
      const medal = CONFIG.WIN_MEDAL_COLORS[nationIndex] || '#888888';

      ctx.save();
      ctx.globalAlpha *= eased;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(left, cy - 24, cardWidth, 48, 10);
      else ctx.rect(left, cy - 24, cardWidth, 48);
      ctx.fillStyle = 'rgba(8, 9, 13, 0.78)';
      ctx.fill();
      ctx.lineWidth = nationIndex === 0 ? 3 : 2;
      ctx.strokeStyle = medal;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = medal;
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
      ctx.restore();
    });

    const supportersElapsed = podiumElapsed - (nations.length + 1) * CONFIG.WIN_PODIUM_STAGGER;
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = hexToRgba('#00e0ff', 0.95);
    ctx.fillText(t('win.contributors').toUpperCase(), width / 2, 556);

    const supporters = snapshot.supporters || [];
    if (supporters.length === 0) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#9aa';
      ctx.fillText(t('state.waiting'), width / 2, 600);
      return;
    }

    const avatarGap = 130;
    const startX2 = width / 2 - ((supporters.length - 1) * avatarGap) / 2;
    supporters.forEach((supporter, index) => {
      const reveal = Math.min(1, Math.max(0, (supportersElapsed - index * CONFIG.WIN_PODIUM_STAGGER) / 0.28));
      if (reveal <= 0) return;
      const eased = 1 - Math.pow(1 - reveal, 3);
      const sx = startX2 + index * avatarGap;
      const image = supporter.avatar ? this.avatarImages.get(supporter.avatar) : null;
      const medal = CONFIG.WIN_MEDAL_COLORS[index] || null;
      ctx.save();
      ctx.globalAlpha *= eased;
      drawSupporter(ctx, supporter, image, sx, 610, medal, index === 0);
      ctx.restore();
    });
  }
}
