export const ROUND = {
  IDLE: 'idle',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  ROUND_END: 'roundEnd',
  INTERMISSION: 'intermission',
}

export class RoundManager {
  constructor(options = {}) {
    this.roundDuration = options.roundDuration ?? 180
    this.intermission = options.intermission ?? 20
    this.countdown = options.countdown ?? 3
    this.autoLoop = options.autoLoop ?? true
    this.state = ROUND.IDLE
    this.timer = 0
  }

  get timeLeft() {
    return Math.max(0, this.timer)
  }

  get isRunning() {
    return this.state === ROUND.PLAYING || this.state === ROUND.COUNTDOWN
  }

  start() {
    if (this.isRunning) return false
    this.state = ROUND.COUNTDOWN
    this.timer = this.countdown
    return true
  }

  end() {
    if (this.state !== ROUND.PLAYING) return false
    this.state = ROUND.ROUND_END
    this.timer = 0
    return true
  }

  beginIntermission() {
    this.state = ROUND.INTERMISSION
    this.timer = this.intermission
  }

  stop() {
    this.state = ROUND.IDLE
    this.timer = 0
  }

  update(dt) {
    const step = dt / 60

    if (this.state === ROUND.COUNTDOWN) {
      this.timer -= step
      if (this.timer <= 0) {
        this.state = ROUND.PLAYING
        this.timer = this.roundDuration
        return ROUND.PLAYING
      }
    } else if (this.state === ROUND.PLAYING) {
      this.timer -= step
      if (this.timer <= 0) {
        this.state = ROUND.ROUND_END
        this.timer = 0
        return ROUND.ROUND_END
      }
    } else if (this.state === ROUND.INTERMISSION) {
      this.timer -= step
      if (this.timer <= 0) {
        if (this.autoLoop) {
          this.state = ROUND.COUNTDOWN
          this.timer = this.countdown
          return ROUND.COUNTDOWN
        }
        this.state = ROUND.IDLE
        return ROUND.IDLE
      }
    }

    return null
  }
}
