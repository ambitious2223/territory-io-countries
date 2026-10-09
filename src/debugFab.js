import { t, getLanguage } from './i18n.js';

const STORAGE_KEY = 'twf.debugFab';
const DRAG_THRESHOLD = 4;

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    void 0;
  }
}

export function initDebugFab(game) {
  const fab = document.getElementById('debug-fab');
  const panel = document.getElementById('debug-panel');
  if (!fab || !panel) return;

  const state = loadState();
  if (Number.isFinite(state.x) && Number.isFinite(state.y)) {
    fab.style.left = `${state.x}px`;
    fab.style.top = `${state.y}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  }

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  function applyOpen(open) {
    game.debugMode = open;
    panel.classList.toggle('visible', open);
    fab.classList.toggle('active', open);
    saveState({ x: parseFloat(fab.style.left) || state.x, y: parseFloat(fab.style.top) || state.y, open });
  }

  if (state.open) applyOpen(true);

  fab.addEventListener('pointerdown', (event) => {
    dragging = true;
    moved = false;
    const rect = fab.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    originX = rect.left;
    originY = rect.top;
    fab.setPointerCapture(event.pointerId);
  });

  fab.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) moved = true;
    if (!moved) return;
    const maxX = window.innerWidth - fab.offsetWidth;
    const maxY = window.innerHeight - fab.offsetHeight;
    const x = Math.max(0, Math.min(maxX, originX + dx));
    const y = Math.max(0, Math.min(maxY, originY + dy));
    fab.style.left = `${x}px`;
    fab.style.top = `${y}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  });

  fab.addEventListener('pointerup', (event) => {
    if (!dragging) return;
    dragging = false;
    fab.releasePointerCapture(event.pointerId);
    if (moved) {
      saveState({ x: parseFloat(fab.style.left), y: parseFloat(fab.style.top), open: game.debugMode });
    } else {
      applyOpen(!game.debugMode);
    }
  });

  fab.addEventListener('dblclick', (event) => event.preventDefault());
}

export function initDebugTabs() {
  const tabs = document.getElementById('debug-tabs');
  if (!tabs) return;
  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('.debug-tab');
    if (!button) return;
    const name = button.dataset.tab;
    tabs.querySelectorAll('.debug-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
    document.querySelectorAll('.debug-tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.tabPanel === name);
    });
  });
}

export function initOverlayLink(game) {
  const input = document.getElementById('overlay-url');
  const copy = document.getElementById('btn-copy-overlay');
  const open = document.getElementById('btn-open-overlay');
  const statusEl = document.getElementById('overlay-tunnel-status');
  const toggle = document.getElementById('btn-tunnel-toggle');
  if (!input) return;

  const localUrl = `${window.location.origin}/leaderboard.html`;
  let overlayUrl = localUrl;

  const update = () => {
    const tunnel = game?.tunnel || { status: 'off' };
    const live = tunnel.status === 'on' && tunnel.url;
    const base = live ? `${tunnel.url}/leaderboard.html` : localUrl;
    overlayUrl = `${base}?lang=${encodeURIComponent(getLanguage())}`;
    input.value = overlayUrl;
    if (statusEl) {
      const labels = {
        off: t('debug.tunnelOff'),
        starting: t('debug.tunnelStarting'),
        on: t('debug.tunnelOn'),
        error: t('debug.tunnelError'),
      };
      statusEl.textContent = labels[tunnel.status] || labels.off;
      statusEl.classList.remove('ok', 'bad', 'warn');
      statusEl.classList.add(tunnel.status === 'on' ? 'ok' : tunnel.status === 'error' ? 'bad' : 'warn');
      statusEl.title = tunnel.error || '';
    }
    if (toggle) {
      const busy = tunnel.status === 'on' || tunnel.status === 'starting';
      toggle.textContent = busy ? t('debug.tunnelStop') : t('debug.tunnelStart');
      toggle.dataset.action = busy ? 'stop' : 'start';
    }
  };

  copy?.addEventListener('click', () => {
    input.select();
    navigator.clipboard?.writeText(overlayUrl).catch(() => document.execCommand('copy'));
  });
  open?.addEventListener('click', () => window.open(overlayUrl, '_blank'));

  toggle?.addEventListener('click', async () => {
    const action = toggle.dataset.action || 'start';
    try {
      const response = await fetch(`${game.bridge.url}/api/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) game.tunnel = await response.json();
    } catch {
      void 0;
    }
    update();
  });

  game?.bridge?.onTunnel?.((status) => {
    game.tunnel = status;
    update();
  });

  update();
  return update;
}

export { DRAG_THRESHOLD };
