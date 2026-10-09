import './overlay.css';
import { BridgeClient } from '../net/bridgeClient.js';
import { setLanguage, getLanguage, t } from '../i18n.js';
import { overlayRows, overlaySignature } from './overlayModel.js';

const params = new URLSearchParams(window.location.search);
const OPTIONS = {
  rows: Number(params.get('rows')) || 12,
  theme: params.get('theme') || 'glass',
  bg: params.get('bg') === '1',
  rtl: params.get('rtl') === '1',
  scale: Number(params.get('scale')) || 1,
};

function initialLang() {
  const explicit = params.get('lang');
  if (explicit) return explicit;
  try {
    return localStorage.getItem('twf_language') || 'en';
  } catch {
    return 'en';
  }
}

setLanguage(initialLang());

let currentLang = getLanguage();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

function formatTime(seconds) {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const root = document.getElementById('overlay-root');
const rowsById = new Map();
let view = null;
let emptyRow = null;
let lastSignature = '';

function buildSkeleton() {
  root.innerHTML = `<div class="ov" data-theme="${escapeHtml(OPTIONS.theme)}" data-bg="${OPTIONS.bg ? 'on' : 'off'}" style="--scale:${OPTIONS.scale};" dir="${OPTIONS.rtl ? 'rtl' : 'ltr'}">
    <header class="ov-head">
      <span class="ov-title">${escapeHtml(t('app.title'))}</span>
      <span class="ov-meta">
        <span class="ov-state"></span>
        <span class="ov-timer"></span>
      </span>
    </header>
    <ol class="ov-board"></ol>
  </div>`;
  view = {
    state: root.querySelector('.ov-state'),
    timer: root.querySelector('.ov-timer'),
    board: root.querySelector('.ov-board'),
  };
  rowsById.clear();
  emptyRow = null;
}

function cell(row, className) {
  const el = document.createElement('span');
  el.className = className;
  row.appendChild(el);
  return el;
}

function makeRow(model) {
  const li = document.createElement('li');
  li.classList.add('ov-row');
  li.dataset.teamId = model.id;
  li._rank = cell(li, 'ov-rank');
  li._flag = cell(li, 'ov-flag');
  li._name = cell(li, 'ov-name');
  li._pct = cell(li, 'ov-pct');
  li.classList.add('ov-new');
  li.addEventListener('animationend', () => li.classList.remove('ov-new'), { once: true });
  return li;
}

function paintFlag(container, model) {
  if (model.flagImage) {
    let img = container.querySelector('img');
    if (!img) {
      container.innerHTML = '<img alt="" />';
      img = container.querySelector('img');
    }
    if (img.getAttribute('src') !== model.flagImage) img.setAttribute('src', model.flagImage);
  } else {
    let span = container.querySelector('.emoji');
    if (!span) {
      container.innerHTML = '<span class="emoji"></span>';
      span = container.querySelector('.emoji');
    }
    if (span.textContent !== model.emoji) span.textContent = model.emoji;
  }
}

function paintRow(li, model) {
  li.classList.toggle('ov-out', model.eliminated);
  for (const name of [...li.classList]) {
    if (name.startsWith('ov-rank-')) li.classList.remove(name);
  }
  li.classList.add(`ov-rank-${model.rank}`);

  const rank = String(model.rank);
  if (li._rank.textContent !== rank) li._rank.textContent = rank;

  paintFlag(li._flag, model);

  const nameHtml = escapeHtml(model.label) + (model.crown ? '<span class="ov-crown">♛</span>' : '');
  if (li.dataset.nameHtml !== nameHtml) {
    li._name.innerHTML = nameHtml;
    li.dataset.nameHtml = nameHtml;
  }

  const pct = `${model.percent}%`;
  if (li._pct.textContent !== pct) li._pct.textContent = pct;
}

function ensureEmpty(show) {
  if (show) {
    if (!emptyRow) {
      emptyRow = document.createElement('li');
      emptyRow.className = 'ov-empty';
      emptyRow.textContent = 'Waiting for game…';
      view.board.appendChild(emptyRow);
    }
    return;
  }
  if (emptyRow) {
    emptyRow.remove();
    emptyRow = null;
  }
}

function render(payload) {
  if (!view || !root.isConnected) buildSkeleton();

  const incomingLang = payload.lang || currentLang;
  if (incomingLang !== currentLang) {
    currentLang = incomingLang;
    setLanguage(incomingLang);
    buildSkeleton();
    lastSignature = '';
  }

  const signature = overlaySignature(payload, { rows: OPTIONS.rows, lang: currentLang });
  if (signature === lastSignature) return;
  lastSignature = signature;

  const state = (payload.round && payload.round.state) || 'idle';
  const stateLabel = t(`round.${state}`);
  if (view.state.textContent !== stateLabel) view.state.textContent = stateLabel;
  const stateClass = `ov-state ov-${state}`;
  if (view.state.className !== stateClass) view.state.className = stateClass;
  const time = formatTime((payload.round && payload.round.timeLeft) || 0);
  if (view.timer.textContent !== time) view.timer.textContent = time;

  const models = overlayRows(payload, { rows: OPTIONS.rows, lang: currentLang });
  const board = view.board;
  if (models.length > 0) ensureEmpty(false);

  const wanted = new Set(models.map((model) => model.id));
  for (const [id, li] of [...rowsById]) {
    if (!wanted.has(id)) {
      li.remove();
      rowsById.delete(id);
    }
  }

  models.forEach((model, index) => {
    let li = rowsById.get(model.id);
    if (!li) {
      li = makeRow(model);
      rowsById.set(model.id, li);
      board.appendChild(li);
    }
    paintRow(li, model);
    const current = board.children[index];
    if (current !== li) board.insertBefore(li, current || null);
  });

  if (models.length === 0) ensureEmpty(true);
}

const bridge = new BridgeClient();
bridge.onOverlay(render);
bridge.connect();
