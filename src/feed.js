let seq = 0;
const MAX_ITEMS = 6;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

export class ConquestFeed {
  constructor() {
    this.items = [];
    this.dirty = false;
  }

  reset() {
    this.items = [];
    this.dirty = true;
  }

  push(text, color) {
    if (!text) return;
    this.items.unshift({ id: ++seq, text, color });
    if (this.items.length > MAX_ITEMS) this.items.length = MAX_ITEMS;
    this.dirty = true;
  }

  update() {
    if (!this.dirty) return;
    this.dirty = false;
    const el = document.getElementById('conquest-feed');
    if (!el) return;
    el.innerHTML = this.items.map((item) => (
      `<div class="cf-item"><span class="cf-dot" style="background:${escapeHtml(item.color)}"></span><span class="cf-text">${escapeHtml(item.text)}</span></div>`
    )).join('');
  }
}
