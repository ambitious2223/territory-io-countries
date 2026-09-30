export const DEFAULT_WEIGHTS = {
  giftPerCoin: 1,
  like: 0.02,
  comment: 1,
  follow: 25,
  share: 50,
  tile: 0.5,
}

export class ScoringEngine {
  constructor(weights = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights }
    this.reset()
  }

  reset() {
    this.scores = new Map()
    this.territory = new Map()
    this.userTeam = new Map()
    this.commenters = new Set()
    this.followed = new Set()
    this.shared = new Set()
  }

  setWeights(weights) {
    this.weights = { ...this.weights, ...weights }
  }

  registerUser(userId, teamId) {
    if (userId === undefined || userId === null) return
    if (teamId === undefined || teamId === null) return
    this.userTeam.set(String(userId), teamId)
  }

  teamOf(userId) {
    if (userId === undefined || userId === null) return null
    return this.userTeam.get(String(userId)) ?? null
  }

  add(teamId, points) {
    if (!teamId || !points) return
    this.scores.set(teamId, (this.scores.get(teamId) || 0) + points)
  }

  applyEvent(event) {
    if (!event) return 0
    const id = String(event.userId ?? event.username ?? '')
    const teamId = this.teamOf(id)
    if (teamId === null) return 0

    let points = 0
    switch (event.type) {
      case 'gift':
        points = (Number(event.coins) || 0) * this.weights.giftPerCoin
        break
      case 'like':
        points = (Number(event.likeCount) || 0) * this.weights.like
        break
      case 'chat':
        if (!this.commenters.has(id)) {
          this.commenters.add(id)
          points = this.weights.comment
        }
        break
      case 'follow':
        if (!this.followed.has(id)) {
          this.followed.add(id)
          points = this.weights.follow
        }
        break
      case 'share':
        if (!this.shared.has(id)) {
          this.shared.add(id)
          points = this.weights.share
        }
        break
      default:
        break
    }

    if (points > 0) this.add(teamId, points)
    return points
  }

  setTerritory(teamId, tiles) {
    this.territory.set(teamId, tiles)
  }

  interactionScore(teamId) {
    return this.scores.get(teamId) || 0
  }

  territoryScore(teamId) {
    return (this.territory.get(teamId) || 0) * this.weights.tile
  }

  combined(teamId) {
    return this.interactionScore(teamId) + this.territoryScore(teamId)
  }

  leaderboard(teamIds) {
    return teamIds
      .map((teamId) => ({
        teamId,
        interaction: this.interactionScore(teamId),
        territory: this.territory.get(teamId) || 0,
        combined: this.combined(teamId),
      }))
      .sort((a, b) => b.combined - a.combined)
  }
}
