import { describe, it, expect, beforeAll } from 'vitest'

let html = ''

beforeAll(async () => {
  globalThis.document = {
    body: {
      insertAdjacentHTML: (_position, markup) => { html += markup },
    },
  }
  const debugPanel = await import('../src/debugPanel.js')
  debugPanel.createDebugPanel()
})

describe('debug panel markup', () => {
  it('contains every element the UI wires up', () => {
    const ids = [
      'debug-fab', 'debug-panel', 'debug-tabs', 'debug-body',
      'conn-username', 'conn-mode', 'conn-mode-segmented', 'btn-conn-connect', 'btn-conn-disconnect',
      'soldier-speed', 'soldier-speed-value',
      'dbg-tikora-status', 'dbg-tikora-slug', 'dbg-tikora-relay', 'dbg-tikora-effects', 'dbg-tikora-last',
      'capital-scale', 'capital-scale-value', 'teams-panel-body', 'btn-teams-add', 'btn-teams-save',
      'language-select', 'overlay-url', 'btn-copy-overlay', 'btn-open-overlay',
      'mock-type', 'mock-username', 'mock-value', 'btn-mock-inject', 'bypass-prompt',
      'guide-enabled', 'tips-enabled', 'hint-always', 'btn-guide-show',
      'viewer-cap', 'viewer-aifill', 'dbg-viewers-bar',
      'dbg-cine-queue', 'cine-blur', 'cine-blur-value', 'cine-autozoom', 'btn-cine-skip',
      'scoring-panel-body', 'winners-panel-body',
      'dbg-fps', 'dbg-frametime', 'dbg-map', 'dbg-walls', 'dbg-particles', 'dbg-pool-free', 'dbg-tiles',
    ]
    for (const id of ids) {
      expect(html, `missing #${id}`).toContain(`id="${id}"`)
    }
  })

  it('has no leftover gift-mapping elements', () => {
    expect(html).not.toContain('mappings-panel-body')
    expect(html).not.toContain('btn-mappings-')
  })

  it('keeps the four tabs', () => {
    for (const tab of ['connection', 'teams', 'overlay', 'advanced']) {
      expect(html).toContain(`data-tab="${tab}"`)
    }
  })
})
