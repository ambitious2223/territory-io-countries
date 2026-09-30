import { t } from './i18n.js';

export function updateLeaderboard(marbles) {
  const container = document.getElementById('leaderboard');
  const sorted = marbles
    .slice()
    .sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.kills - a.kills;
    });

  let html = '';
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const cls = m.alive ? 'lb-entry' : (m.eliminated ? 'lb-entry eliminated-removed' : 'lb-entry eliminated');
    html += `<div class="${cls}">
      <span class="lb-rank">${i + 1}</span>
      <span class="lb-dot" style="background:${m.color}"></span>
      <span class="lb-name">${m.name}</span>
      <span class="lb-kills">${m.kills}</span>
    </div>`;
  }
  container.innerHTML = html;
}

export function updateGameOver(winner, duration, supporters, tileCount, domination, winReason) {
  const panel = document.getElementById('game-over-panel');
  panel.classList.add('visible');

  document.getElementById('go-winner').textContent = winner ? winner.name : '—';
  document.getElementById('go-winner').style.color = winner ? winner.color : '#888';
  document.getElementById('go-kills').textContent = winner ? `${t('gameover.kills')}: ${winner.kills}` : '';
  document.getElementById('go-tiles').textContent = winner ? `${t('gameover.tiles')}: ${tileCount} (${Math.round(domination * 100)}%)` : '';
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

  document.getElementById('btn-debug').classList.toggle('active', game.debugMode);
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
  document.getElementById('btn-debug').addEventListener('click', () => {
    game.debugMode = !game.debugMode;
    document.getElementById('debug-panel').classList.toggle('visible', game.debugMode);
  });
  document.getElementById('btn-mute').addEventListener('click', () => {
    game.audio.init(); game.audio.unlock();
    game.audio.toggle();
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    if (game.gameOver) game.restart();
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

export function updateDebugPanel(game, particles, marbles, grid) {
  if (!game.debugMode) return;

  document.getElementById('dbg-fps').textContent = game.fps;
  document.getElementById('dbg-frametime').textContent = game.lastFrameTime.toFixed(1) + 'ms';
  document.getElementById('dbg-particles').textContent = particles.active.length + ' / ' + particles.maxParticles;
  document.getElementById('dbg-pool-free').textContent = particles.pool.length;
  document.getElementById('dbg-map').textContent = game.currentMap || 'Empty';
  document.getElementById('dbg-walls').textContent = grid.claimableTiles + ' / ' + (grid.rows * grid.cols);

  const tileContainer = document.getElementById('dbg-tiles');
  const counts = {};
  for (const m of marbles) {
    counts[m.color] = (counts[m.color] || 0) + grid.countTiles(m.color);
  }
  let html = '';
  for (const m of marbles) {
    const c = counts[m.color] || 0;
    html += `<div class="debug-tile-item">
      <span class="debug-tile-dot" style="background:${m.color}"></span>
      <span>${m.name.slice(0, 5)}:${c}</span>
    </div>`;
  }
  tileContainer.innerHTML = html;
}

export function initConnectionPanel(game) {
  const connectBtn = document.getElementById('btn-conn-connect');
  if (!connectBtn) return;

  connectBtn.addEventListener('click', () => {
    const username = document.getElementById('conn-username').value.trim();
    const mode = document.getElementById('conn-mode').value;
    game.bridge?.requestConnect({ username, mode });
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
