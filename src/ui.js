import { t, getLanguage } from './i18n.js';
import { teamLabel } from './teams.js';
import { CONFIG } from './config.js';
import { getSoldierSpeed, setSoldierSpeed } from './speedControl.js';
import { getWinners } from './winnersStore.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

export function updateGameOver(winner, duration, tileCount, domination, winReason) {
  const panel = document.getElementById('game-over-panel');
  panel.classList.add('visible');

  document.getElementById('go-winner').textContent = winner ? winner.name : '—';
  document.getElementById('go-winner').style.color = winner ? winner.color : '#888';
  document.getElementById('go-tiles').textContent = winner
    ? `${t('gameover.tiles')}: ${tileCount} (${Math.round(domination * 100)}%)`
    : '';
  document.getElementById('go-duration').textContent = `${t('gameover.duration')}: ${formatDuration(duration)}`;

  const reasonEl = document.getElementById('go-reason');
  if (reasonEl) {
    const reasons = {
      domination: t('gameover.domination'),
      timeout: t('gameover.timeout'),
      elimination: t('gameover.elimination'),
    };
    reasonEl.textContent = reasons[winReason] || '';
  }
}

export function hideGameOver() {
  document.getElementById('game-over-panel').classList.remove('visible');
}

export function updateControlBar(game) {
  const pauseBtn = document.getElementById('btn-pause');
  pauseBtn.textContent = game.paused ? t('control.play') : t('control.pause');
  pauseBtn.classList.toggle('active', game.paused);

  document.getElementById('btn-1x').classList.toggle('speed-active', game.speed === 1);
  document.getElementById('btn-2x').classList.toggle('speed-active', game.speed === 2);
  document.getElementById('btn-4x').classList.toggle('speed-active', game.speed === 4);

  document.getElementById('btn-mute').textContent = game.audio.enabled ? t('control.mute') : t('control.unmute');
  document.getElementById('btn-mute').classList.toggle('active', !game.audio.enabled);
}

export function updatePauseOverlay(paused) {
  document.getElementById('pause-overlay').classList.toggle('visible', paused);
}

export function updateTimer(seconds) {
  const el = document.getElementById('game-timer');
  if (!el) return;
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  el.classList.toggle('timer-warning', clamped <= 15 && clamped > 5);
  el.classList.toggle('timer-critical', clamped <= 5);
}

export function getSelectedMap() {
  return document.getElementById('map-select').value;
}

export function initControls(game) {
  document.getElementById('btn-pause').addEventListener('click', () => {
    game.audio.init(); game.audio.unlock();
    game.togglePause();
  });
  document.getElementById('btn-1x').addEventListener('click', () => { game.speed = 1; });
  document.getElementById('btn-2x').addEventListener('click', () => { game.speed = 2; });
  document.getElementById('btn-4x').addEventListener('click', () => { game.speed = 4; });
  document.getElementById('btn-mute').addEventListener('click', () => {
    game.audio.init(); game.audio.unlock();
    game.audio.toggle();
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    if (game.gameOver) game.restart();
  });
  document.getElementById('btn-round-start').addEventListener('click', () => {
    game.audio.init(); game.audio.unlock();
    game.startRound();
  });
  document.getElementById('btn-round-end').addEventListener('click', () => {
    game.endRound();
  });
  document.getElementById('btn-round-auto').addEventListener('click', (event) => {
    game.round.autoLoop = !game.round.autoLoop;
    event.currentTarget.classList.toggle('active', game.round.autoLoop);
  });
  document.getElementById('go-restart').addEventListener('click', () => {
    if (game.gameOver) game.restart();
  });
}

export function initDebugPanel() {
  const panel = document.getElementById('debug-panel');
  const handle = document.getElementById('debug-drag-handle');
  const collapseBtn = document.getElementById('debug-collapse-btn');

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    e.preventDefault();
  });

  handle.addEventListener('touchstart', (e) => {
    dragging = true;
    const touch = e.touches[0];
    offsetX = touch.clientX - panel.offsetLeft;
    offsetY = touch.clientY - panel.offsetTop;
    e.preventDefault();
  }, { passive: false });

  function onMove(clientX, clientY) {
    if (!dragging) return;
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = clamp(clientX - offsetX, 0, vw - pw);
    const y = clamp(clientY - offsetY, 0, vh - ph);
    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
    panel.style.right = 'auto';
  }

  window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  window.addEventListener('touchmove', (e) => {
    if (dragging) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('touchend', () => { dragging = false; });

  collapseBtn.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    collapseBtn.innerHTML = panel.classList.contains('collapsed') ? '&#9650;' : '&#9660;';
  });
}

export function updateDebugPanel(game, particles, grid) {
  if (!game.debugMode) return;

  document.getElementById('dbg-fps').textContent = game.fps;
  document.getElementById('dbg-frametime').textContent = game.lastFrameTime.toFixed(1) + 'ms';
  document.getElementById('dbg-particles').textContent = particles.active.length + ' / ' + particles.maxParticles;
  document.getElementById('dbg-pool-free').textContent = particles.pool.length;
  const mapName = game.currentMap || 'Empty';
  document.getElementById('dbg-map').textContent = t(`map.${String(mapName).toLowerCase()}`, mapName);
  document.getElementById('dbg-walls').textContent = grid.claimableTiles + ' / ' + (grid.rows * grid.cols);

  const tileContainer = document.getElementById('dbg-tiles');
  let html = '';
  for (const team of game.teams) {
    const count = grid.countTiles(team.color);
    html += `<div class="debug-tile-item">
      <span class="debug-tile-dot" style="background:${team.color}"></span>
      <span>${escapeHtml(teamLabel(team, getLanguage()).slice(0, 5))}:${count}</span>
    </div>`;
  }
  tileContainer.innerHTML = html;
}

export function initConnectionPanel(game) {
  initSpeedSlider(game);
  const connectBtn = document.getElementById('btn-conn-connect');
  if (!connectBtn) return;

  connectBtn.addEventListener('click', () => {
    const username = document.getElementById('conn-username').value.trim();
    const mode = document.getElementById('conn-mode').value;
    const tikfinityHost = document.getElementById('conn-tikfinity-host').value.trim();
    const tikfinityPort = Number(document.getElementById('conn-tikfinity-port').value) || undefined;
    game.bridge?.requestConnect({
      username,
      mode,
      tikfinityHost: tikfinityHost || undefined,
      tikfinityPort,
    });
  });

  document.getElementById('btn-conn-disconnect').addEventListener('click', () => {
    game.bridge?.requestDisconnect();
  });

  document.getElementById('btn-mock-inject').addEventListener('click', () => {
    const body = {
      type: document.getElementById('mock-type').value,
      username: document.getElementById('mock-username').value.trim() || 'mock_viewer',
      value: Number(document.getElementById('mock-value').value) || 1,
    };
    game.bridge?.injectMock(body);
  });
}

function initSpeedSlider(game) {
  const slider = document.getElementById('soldier-speed');
  const label = document.getElementById('soldier-speed-value');
  if (!slider || !label) return;
  slider.min = String(CONFIG.SPEED_CTRL_MIN);
  slider.max = String(CONFIG.SPEED_CTRL_MAX);
  slider.step = String(CONFIG.SPEED_CTRL_STEP);
  const sync = () => {
    slider.value = String(getSoldierSpeed());
    label.textContent = getSoldierSpeed().toFixed(1);
  };
  sync();
  slider.addEventListener('input', () => {
    setSoldierSpeed(slider.value, game.marbles);
    sync();
  });
}

export function initViewersPanel(game) {
  const cap = document.getElementById('viewer-cap');
  if (cap) {
    cap.value = String(game.viewers.cap);
    cap.addEventListener('change', () => game.viewers.setCap(cap.value));
  }
  const aiFill = document.getElementById('viewer-aifill');
  if (aiFill) {
    aiFill.checked = game.viewers.aiFill;
    aiFill.addEventListener('change', () => game.viewers.setAiFill(aiFill.checked));
  }
}

export function updateViewersPanel(game) {
  if (!game.debugMode) return;
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('dbg-viewers-active', game.viewers.activeCount);
  set('dbg-viewers-queued', game.viewers.queuedCount);
  set('dbg-viewers-total', game.viewers.totalCount);
}

export function initCinematicPanel(game) {
  const blur = document.getElementById('cine-blur');
  if (blur) {
    blur.value = String(Math.round(game.camera.blurScale * 100));
    blur.addEventListener('input', () => {
      game.camera.blurScale = Number(blur.value) / 100;
    });
  }
  const skip = document.getElementById('btn-cine-skip');
  if (skip) {
    skip.addEventListener('click', () => game.cinematic.skip());
  }
  const autozoom = document.getElementById('cine-autozoom');
  if (autozoom) {
    try {
      const saved = localStorage.getItem('twf.autozoom');
      if (saved !== null) CONFIG.AUTOZOOM_ON_JOIN = saved === '1';
    } catch {
      void 0;
    }
    autozoom.checked = CONFIG.AUTOZOOM_ON_JOIN;
    autozoom.addEventListener('change', () => {
      CONFIG.AUTOZOOM_ON_JOIN = autozoom.checked;
      try {
        localStorage.setItem('twf.autozoom', autozoom.checked ? '1' : '0');
      } catch {
        void 0;
      }
    });
  }
}

const SCORING_FIELDS = ['giftPerCoin', 'like', 'comment', 'follow', 'share', 'tile'];

export function initScoringPanel(game) {
  const container = document.getElementById('scoring-panel-body');
  if (!container) return;
  container.innerHTML = SCORING_FIELDS.map((key) => (
    `<div class="debug-row"><span>${escapeHtml(t(`scoring.${key}`, key))}</span><input class="scoring-input" data-key="${key}" type="number" step="0.01" min="0" value="${game.scoring.weights[key]}" style="width:64px;background:#111;border:1px solid #333;color:#ddd;font-size:10px;padding:2px 4px;font-family:inherit;" /></div>`
  )).join('');
  container.querySelectorAll('input[data-key]').forEach((input) => {
    input.addEventListener('change', () => {
      const value = Number(input.value);
      if (Number.isFinite(value)) game.scoring.setWeights({ [input.dataset.key]: value });
    });
  });
}

export function updateWinnersPanel(game) {
  if (!game.debugMode) return;
  const container = document.getElementById('winners-panel-body');
  if (!container) return;
  const winners = getWinners().teams || [];
  if (winners.length === 0) {
    container.innerHTML = '<div class="debug-row" style="color:#555;"><span>—</span><span class="val"></span></div>';
    return;
  }
  container.innerHTML = winners.slice(0, 10).map((entry) => {
    const label = `${entry.emoji || ''} ${entry.name || ''}`.trim();
    return `<div class="debug-row"><span>${escapeHtml(label)}</span><span class="val">${entry.wins}</span></div>`;
  }).join('');
}

export function updateTikoraPanel(game) {
  if (!game.debugMode || !game.tikora) return;
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('dbg-tikora-status', game.tikora.status);
  set('dbg-tikora-slug', game.hubIdentity?.slug || '--');
  set('dbg-tikora-relay', game.hubIdentity?.relayUrl || '--');
}

export function updateCinematicPanel(game) {
  if (!game.debugMode) return;
  const el = document.getElementById('dbg-cine-queue');
  if (el) el.textContent = game.cinematic.pending;
}

export function updateConnectionPanel(game) {
  if (!game.debugMode) return;
  const state = game.bridgeState || {};
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('dbg-conn-bridge', state.bridgeOk ? 'online' : 'offline');
  set('dbg-conn-state', state.tiktokState || 'idle');
  set('dbg-conn-source', state.source || 'none');
  set('dbg-conn-events', game.eventCount ?? 0);
  set('dbg-conn-error', state.lastError || '-');
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
