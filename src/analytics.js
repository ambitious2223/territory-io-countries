export class Analytics {
  constructor() {
    this.reset();
  }

  reset() {
    this.startTime = Date.now();
    this.duration = 0;
    this.totalKills = 0;
    this.marbleStats = new Map();
    this.peakTerritory = new Map();
  }

  registerMarble(marble) {
    this.marbleStats.set(marble.name, {
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      territoryPeak: 0,
      territoryCurrent: 0,
      alive: true,
      color: marble.color,
    });
  }

  recordDamage(attacker, victim, amount) {
    const aStats = this.marbleStats.get(attacker.name);
    const vStats = this.marbleStats.get(victim.name);
    if (aStats) aStats.damageDealt += amount;
    if (vStats) vStats.damageTaken += amount;
  }

  recordKill(killer, victim) {
    this.totalKills++;
    const kStats = this.marbleStats.get(killer.name);
    const vStats = this.marbleStats.get(victim.name);
    if (kStats) kStats.kills++;
    if (vStats) vStats.alive = false;
  }

  updateTerritory(marble, tileCount) {
    const stats = this.marbleStats.get(marble.name);
    if (!stats) return;
    stats.territoryCurrent = tileCount;
    if (tileCount > stats.territoryPeak) {
      stats.territoryPeak = tileCount;
    }
  }

  updateDuration() {
    this.duration = Math.floor((Date.now() - this.startTime) / 1000);
  }

  getResults() {
    this.updateDuration();
    const results = [];
    for (const [name, stats] of this.marbleStats) {
      results.push({ name, ...stats });
    }
    results.sort((a, b) => b.kills - a.kills || b.damageDealt - a.damageDealt);
    return {
      duration: this.duration,
      totalKills: this.totalKills,
      marbles: results,
    };
  }
}
