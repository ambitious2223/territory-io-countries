import './overlay.css';
import { BridgeClient } from '../net/bridgeClient.js';
import { STATE_LABELS } from '../scoreboard.js';

const params = new URLSearchParams(window.location.search);
const OPTIONS = {
  rows: Number(params.get('rows')) || 12,
  feed: params.get('feed') !== '0',
  theme: params.get('theme') || 'glass',
  bg: params.get('bg') === '1',
  rtl: params.get('rtl') === '1',
  scale: Number(params.get('scale')) || 1,
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

function flagMarkup(team) {
  if (team.flagImage) return `<img src="${escapeHtml(team.flagImage)}" alt="" />`;
  return `<span class="emoji">${escapeHtml(team.emoji || '🏳️')}</span>`;
}

function formatTime(seconds) {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function render(payload) {
  const root = document.getElementById('overlay-root');
  if (!root) return;

  const state = payload.round?.state || 'idle';
  const stateLabel = STATE_LABELS[state] || '';
  const teams = (payload.teams || []).slice(0, OPTIONS.rows);
  const maxPercent = Math.max(10, ...teams.map((t) => t.percent));

  const board = teams.map((team, index) => {
    const barWidth = Math.round((team.percent / maxPercent) * 100);
    const crown = index === 0 && team.tiles > 0 && !team.eliminated ? '<span class="ov-crown">♛</span>' : '';
    const cls = ['ov-row', `ov-rank-${index + 1}`];
    if (team.eliminated) cls.push('ov-out');
    return `<li class="${cls.join(' ')}">
      <span class="ov-rank">${index + 1}</span>
      <span class="ov-flag">${flagMarkup(team)}</span>
      <span class="ov-name">${escapeHtml(team.name)}${crown}</span>
      <span class="ov-bar"><i style="width:${barWidth}%;background:${escapeHtml(team.color)}"></i></span>
      <span class="ov-pct">${team.percent}%</span>
      <span class="ov-viewers">${team.viewers}</span>
    </li>`;
  }).join('');

  const feed = OPTIONS.feed
    ? (payload.feed || []).map((item) => (
      `<div class="ov-feed-item"><span class="ov-feed-dot" style="background:${escapeHtml(item.color)}"></span><span>${escapeHtml(item.text)}</span></div>`
    )).join('') || '<div class="ov-empty">Waiting for conquest…</div>'
    : '';

  root.innerHTML = `<div class="ov" data-theme="${escapeHtml(OPTIONS.theme)}" data-bg="${OPTIONS.bg ? 'on' : 'off'}" style="--scale:${OPTIONS.scale};" dir="${OPTIONS.rtl ? 'rtl' : 'ltr'}">
    <header class="ov-head">
      <span class="ov-title">Territory With Flags</span>
      <span class="ov-meta">
        <span class="ov-state ov-${escapeHtml(state)}">${escapeHtml(stateLabel)}</span>
        <span class="ov-timer">${formatTime(payload.round?.timeLeft || 0)}</span>
      </span>
    </header>
    <div class="ov-body">
      <ol class="ov-board">${board || '<li class="ov-empty">Waiting for game…</li>'}</ol>
      ${feed ? `<div class="ov-feed">${feed}</div>` : ''}
    </div>
  </div>`;
}

const bridge = new BridgeClient();
bridge.onOverlay(render);
bridge.connect();
