import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

let cameraPanel

function makeEl(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    listeners: {},
    className: '',
    textContent: '',
    dataset: {},
    style: { setProperty: vi.fn() },
    classList: {
      classes: new Set(),
      toggle(name, force) {
        if (force === undefined) {
          if (this.classes.has(name)) this.classes.delete(name)
          else this.classes.add(name)
        } else if (force) this.classes.add(name)
        else this.classes.delete(name)
      },
      add(name) { this.classes.add(name) },
      remove(name) { this.classes.delete(name) },
      contains(name) { return this.classes.has(name) },
    },
    addEventListener(type, fn) {
      if (!el.listeners[type]) el.listeners[type] = []
      el.listeners[type].push(fn)
    },
    appendChild(child) { el.children.push(child); return child },
    querySelectorAll() { return [] },
  }
  Object.defineProperty(el, 'innerHTML', {
    get() { return '' },
    set() { el.children = [] },
  })
  return el
}

const elements = new Map()

function mount(id) {
  const el = makeEl()
  elements.set(id, el)
  return el
}

function fakeGame(viewers) {
  const marbles = []
  for (const viewer of viewers) {
    if (viewer.marble) marbles.push(viewer.marble)
  }
  return {
    debugMode: true,
    teams: [],
    marbles,
    viewers: { viewers: new Map(viewers.map((viewer) => [viewer.id, viewer])) },
    manualCamera: {
      follow: null,
      followBall: vi.fn(),
      reset: vi.fn(),
      focusLeader: vi.fn(),
      focusTeam: vi.fn(),
    },
  }
}

function human(id, marble, extra = {}) {
  return {
    id,
    username: id,
    name: extra.name || id,
    teamId: 1,
    team: { id: 1, color: '#FF2222' },
    marble,
    queued: false,
    isBot: false,
    ...extra,
  }
}

function aliveBall() {
  return { x: 1, y: 2, alive: true, eliminated: false, color: '#FF2222' }
}

beforeAll(async () => {
  globalThis.document = {
    getElementById: (id) => elements.get(id) || null,
    createElement: (tag) => makeEl(tag),
  }
  cameraPanel = await import('../src/cameraPanel.js')
})

beforeEach(() => {
  elements.clear()
})

describe('cameraPlayerList', () => {
  it('lists living human viewers only', () => {
    const dead = aliveBall()
    dead.alive = false
    const game = fakeGame([
      human('a', aliveBall()),
      human('b', dead),
      human('c', null),
      { ...human('bot', aliveBall()), isBot: true },
    ])
    const list = cameraPanel.cameraPlayerList(game)
    expect(list.map((entry) => entry.id)).toEqual(['a'])
    expect(list[0].name).toBe('a')
    expect(list[0].color).toBe('#FF2222')
  })

  it('clears when the match is gone', () => {
    expect(cameraPanel.cameraPlayerList(fakeGame([]))).toEqual([])
    const gone = fakeGame([human('a', null)])
    expect(cameraPanel.cameraPlayerList(gone)).toEqual([])
  })
})

describe('player buttons in the Camera tab', () => {
  it('renders a button per player and follows on click', () => {
    const container = mount('cam-players')
    const ball = aliveBall()
    const game = fakeGame([human('ahmad', ball, { name: 'Ahmad ❤' })])

    cameraPanel.updateCameraPanel(game)
    expect(container.children).toHaveLength(1)
    const button = container.children[0]
    expect(button.textContent).toBe('Ahmad ❤')
    expect(button.style.setProperty).toHaveBeenCalledWith('--team-color', '#FF2222')

    button.listeners.click[0]()
    expect(game.manualCamera.followBall).toHaveBeenCalledWith(ball)
  })

  it('rebuilds when the roster changes and empties on round reset', () => {
    const container = mount('cam-players')
    const ball = aliveBall()
    const game = fakeGame([human('ahmad', ball)])

    cameraPanel.updateCameraPanel(game)
    expect(container.children).toHaveLength(1)

    game.viewers.viewers.get('ahmad').marble = aliveBall()
    cameraPanel.updateCameraPanel(game)
    expect(container.children).toHaveLength(1)

    game.viewers.viewers.get('ahmad').marble = null
    cameraPanel.updateCameraPanel(game)
    expect(container.children).toHaveLength(0)
  })

  it('highlights the button whose ball is being followed', () => {
    const container = mount('cam-players')
    const ballA = aliveBall()
    const ballB = aliveBall()
    const game = fakeGame([human('a', ballA), human('b', ballB)])

    cameraPanel.updateCameraPanel(game)
    const [buttonA, buttonB] = container.children
    expect(buttonA.classList.contains('active')).toBe(false)

    game.manualCamera.follow = ballB
    cameraPanel.updateCameraPanel(game)
    expect(buttonB.classList.contains('active')).toBe(true)
    expect(buttonA.classList.contains('active')).toBe(false)
  })

  it('does nothing when the panel is closed or absent', () => {
    const game = fakeGame([human('a', aliveBall())])
    game.debugMode = false
    expect(() => cameraPanel.updateCameraPanel(game)).not.toThrow()
    game.debugMode = true
    expect(() => cameraPanel.updateCameraPanel(game)).not.toThrow()
  })
})

describe('initCameraPanel presets', () => {
  it('wires Arena, Leader and nation chips without throwing', () => {
    const arena = mount('cam-arena')
    const leader = mount('cam-leader')
    const nations = mount('cam-nations')
    const game = fakeGame([])
    game.teams = [{ id: 1, emoji: '🇪🇬', color: '#FF2222', name: { en: 'Egypt' } }]

    cameraPanel.initCameraPanel(game)
    arena.listeners.click[0]()
    leader.listeners.click[0]()
    expect(game.manualCamera.reset).toHaveBeenCalled()
    expect(game.manualCamera.focusLeader).toHaveBeenCalled()
    expect(nations.children).toHaveLength(1)
    nations.children[0].listeners.click[0]()
    expect(game.manualCamera.focusTeam).toHaveBeenCalledWith(1)
  })

  it('returns quietly when the markup is missing', () => {
    expect(() => cameraPanel.initCameraPanel(fakeGame([]))).not.toThrow()
  })
})
