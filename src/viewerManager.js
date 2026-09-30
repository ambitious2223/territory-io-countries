import { matchTeam } from './teams.js'

export class ViewerManager {
  constructor(options = {}) {
    this.cap = options.cap ?? 24
    this.aiFill = options.aiFill ?? true
    this.aiInterval = options.aiInterval ?? 2
    this.spawn = options.spawn
    this.countTeam = options.countTeam ?? (() => 0)
    this.viewers = new Map()
    this.queue = []
    this.aiTimer = 0
  }

  setCap(cap) {
    this.cap = Math.max(1, Number(cap) || 1)
    this.dequeue()
  }

  setAiFill(enabled) {
    this.aiFill = Boolean(enabled)
  }

  get activeCount() {
    let count = 0
    for (const viewer of this.viewers.values()) {
      if (viewer.marble) count += 1
    }
    return count
  }

  get queuedCount() {
    return this.queue.length
  }

  get totalCount() {
    return this.viewers.size
  }

  reset() {
    this.viewers.clear()
    this.queue.length = 0
    this.aiTimer = 0
  }

  respawn() {
    for (const viewer of this.viewers.values()) {
      viewer.marble = null
      viewer.queued = false
    }
    this.queue.length = 0
    this.aiTimer = 0
    for (const viewer of this.viewers.values()) this.place(viewer)
  }

  handleEvent(event, teams) {
    if (!event || event.type !== 'chat') return null
    const team = matchTeam(teams, event.message)
    if (!team) return null
    const id = String(event.userId || event.username || '')
    if (!id || this.viewers.has(id)) return null

    const viewer = {
      id,
      name: event.name || event.username || 'Viewer',
      avatar: event.avatar || '',
      teamId: team.id,
      team,
      marble: null,
      queued: false,
      isBot: false
    }
    this.viewers.set(id, viewer)
    return this.place(viewer)
  }

  place(viewer) {
    if (this.activeCount < this.cap) {
      viewer.marble = this.spawn(viewer, viewer.team)
      viewer.queued = false
      return { type: 'spawn', viewer }
    }
    viewer.queued = true
    this.queue.push(viewer)
    return { type: 'queue', viewer }
  }

  handleDeath(marble) {
    const viewer = this.findViewerByMarble(marble)
    if (!viewer) return false
    viewer.marble = null
    viewer.queued = false
    this.dequeue()
    return true
  }

  dequeue() {
    while (this.queue.length > 0 && this.activeCount < this.cap) {
      const viewer = this.queue.shift()
      viewer.queued = false
      viewer.marble = this.spawn(viewer, viewer.team)
    }
  }

  seed(teams) {
    if (!this.aiFill || !teams) return
    for (const team of teams) this.spawnBotIfEmpty(team)
  }

  update(dt, teams) {
    if (!this.aiFill || !teams || teams.length === 0) return
    this.aiTimer += dt
    if (this.aiTimer < this.aiInterval) return
    this.aiTimer = 0
    for (const team of teams) this.spawnBotIfEmpty(team)
  }

  spawnBotIfEmpty(team) {
    if (this.countTeam(team.id) > 0) return null
    const bot = {
      id: `ai_${team.id}`,
      name: team.name?.en || 'AI',
      avatar: '',
      teamId: team.id,
      team,
      marble: null,
      queued: false,
      isBot: true
    }
    return this.spawn(bot, team)
  }

  findViewerByMarble(marble) {
    for (const viewer of this.viewers.values()) {
      if (viewer.marble === marble) return viewer
    }
    return null
  }
}
