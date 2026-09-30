import { describe, it, expect } from 'vitest'
import { ViewerManager } from '../src/viewerManager.js'

const TEAMS = [
  { id: 1, index: 1, name: { en: 'Saudi Arabia', ar: 'السعودية' }, iso2: 'SA', emoji: '🇸🇦', aliases: ['saudi'] },
  { id: 2, index: 2, name: { en: 'Egypt', ar: 'مصر' }, iso2: 'EG', emoji: '🇪🇬', aliases: ['masr'] }
]

function makeManager(overrides = {}) {
  const spawned = []
  const teamCounts = new Map()
  const manager = new ViewerManager({
    cap: 2,
    aiFill: false,
    spawn: (profile, team) => {
      const marble = { teamId: team.id, profile }
      spawned.push(marble)
      teamCounts.set(team.id, (teamCounts.get(team.id) || 0) + 1)
      return marble
    },
    countTeam: (teamId) => teamCounts.get(teamId) || 0,
    ...overrides
  })
  return { manager, spawned, teamCounts }
}

const chat = (username, message) => ({ type: 'chat', username, name: username, message })

describe('ViewerManager join', () => {
  it('spawns a viewer that matches a team', () => {
    const { manager, spawned } = makeManager()
    const result = manager.handleEvent(chat('ann', 'SA'), TEAMS)
    expect(result.type).toBe('spawn')
    expect(spawned).toHaveLength(1)
    expect(manager.activeCount).toBe(1)
  })

  it('ignores messages that do not match a team', () => {
    const { manager } = makeManager()
    expect(manager.handleEvent(chat('ann', 'hello'), TEAMS)).toBeNull()
    expect(manager.activeCount).toBe(0)
  })

  it('ignores duplicate joins from the same viewer', () => {
    const { manager, spawned } = makeManager()
    manager.handleEvent(chat('ann', 'SA'), TEAMS)
    expect(manager.handleEvent(chat('ann', 'EG'), TEAMS)).toBeNull()
    expect(spawned).toHaveLength(1)
  })
})

describe('ViewerManager cap + queue', () => {
  it('queues viewers beyond the cap', () => {
    const { manager } = makeManager()
    manager.handleEvent(chat('a', 'SA'), TEAMS)
    manager.handleEvent(chat('b', 'EG'), TEAMS)
    const third = manager.handleEvent(chat('c', 'SA'), TEAMS)
    expect(third.type).toBe('queue')
    expect(manager.activeCount).toBe(2)
    expect(manager.queuedCount).toBe(1)
  })

  it('promotes a queued viewer when an active one dies', () => {
    const { manager, spawned } = makeManager()
    manager.handleEvent(chat('a', 'SA'), TEAMS)
    manager.handleEvent(chat('b', 'EG'), TEAMS)
    manager.handleEvent(chat('c', 'SA'), TEAMS)
    const died = spawned[0]
    expect(manager.handleDeath(died)).toBe(true)
    expect(manager.activeCount).toBe(2)
    expect(manager.queuedCount).toBe(0)
    expect(spawned).toHaveLength(3)
  })

  it('ignores deaths of non-viewer marbles', () => {
    const { manager } = makeManager()
    expect(manager.handleDeath({ teamId: 1 })).toBe(false)
  })
})

describe('ViewerManager AI fill', () => {
  it('seeds a bot for teams with no marbles', () => {
    const { manager, spawned } = makeManager({ aiFill: true, cap: 5 })
    manager.seed(TEAMS)
    expect(spawned).toHaveLength(2)
  })

  it('does not seed when the team already has a marble', () => {
    const { manager, spawned } = makeManager({ aiFill: true, cap: 5 })
    manager.handleEvent(chat('a', 'SA'), TEAMS)
    manager.seed(TEAMS)
    expect(spawned).toHaveLength(2)
  })
})
