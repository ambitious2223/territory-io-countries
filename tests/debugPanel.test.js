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
      'overlay-tunnel-status', 'btn-tunnel-toggle',
      'mock-type', 'mock-username', 'mock-value', 'btn-mock-inject', 'bypass-prompt',
      'guide-enabled', 'tips-enabled', 'hint-always', 'btn-guide-show',
      'cam-arena', 'cam-leader', 'cam-nations', 'cam-players',
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

  it('keeps the five tabs with the camera on its own', () => {
    for (const tab of ['connection', 'camera', 'teams', 'overlay', 'advanced']) {
      expect(html).toContain(`data-tab="${tab}"`)
    }
    expect(html).toContain('data-tab-panel="camera"')
  })

  it('houses the player buttons inside the camera panel', () => {
    const cameraPanel = html.slice(
      html.indexOf('data-tab-panel="camera"'),
      html.indexOf('data-tab-panel="teams"')
    )
    expect(cameraPanel).toContain('id="cam-players"')
    expect(cameraPanel).toContain('id="cam-arena"')
    expect(cameraPanel).toContain('id="cam-nations"')
    const connectionPanel = html.slice(
      html.indexOf('data-tab-panel="connection"'),
      html.indexOf('data-tab-panel="camera"')
    )
    expect(connectionPanel).not.toContain('id="cam-arena"')
  })
})
