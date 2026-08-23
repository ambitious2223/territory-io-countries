import * as Map from './map.js';
import * as Factions from './factions.js';
import * as AI from './ai.js';

let gameState = {
  running: false,
  winner: null,
  troops: [],
  productionTimer: 0,
  deployTimer: 0,
  tickRate: 1000 / 60,
  lastTick: 0
};

const PRODUCTION_INTERVAL = 1000;
const DEPLOY_INTERVAL = 500;
const MAX_TROOP_POOL_DRAIN_PER_DEPLOY = 20;

export function getState() {
  return gameState;
}

export function startGame() {
  gameState.running = true;
  gameState.winner = null;
  gameState.troops = [];
  gameState.productionTimer = 0;
  gameState.deployTimer = 0;
  gameState.lastTick = performance.now();
  Map.resetMap();
  Factions.resetFactions();
  return gameState;
}

export function stopGame() {
  gameState.running = false;
  return gameState;
}

export function update(now) {
  if (!gameState.running) return [];
  const dt = now - gameState.lastTick;
  gameState.lastTick = now;
  gameState.productionTimer += dt;
  gameState.deployTimer += dt;
  const events = [];
  if (gameState.productionTimer >= PRODUCTION_INTERVAL) {
    gameState.productionTimer -= PRODUCTION_INTERVAL;
    produceTroops();
  }
  if (gameState.deployTimer >= DEPLOY_INTERVAL) {
    gameState.deployTimer -= DEPLOY_INTERVAL;
    deployTroops(events);
  }
  moveTroops(dt, events);
  checkWinCondition(events);
  updateFactionStats();
  return events;
}

function produceTroops() {
  const all = Map.getAllTerritories();
  for (const t of all) {
    if (t.owner >= 0 && t.troops < t.maxTroops) {
      Map.addTroops(t.id, 1);
    }
  }
}

function deployTroops(events) {
  const factions = Factions.getActiveFactions();
  for (const faction of factions) {
    const pool = Factions.getPoolSize(faction.id);
    if (pool < 1) continue;
    const owned = Map.getOwnedTerritories(faction.id);
    if (owned.length === 0) continue;
    const target = AI.findBestTarget(faction.id, false);
    if (!target) continue;
    const amount = Math.min(pool, MAX_TROOP_POOL_DRAIN_PER_DEPLOY);
    const deployed = Factions.withdrawFromPool(faction.id, amount);
    if (deployed > 0) {
      const event = {
        type: 'troop_deploy',
        from: target.from.id,
        to: target.to.id,
        troops: deployed,
        factionId: faction.id,
        factionColor: faction.color,
        factionIcon: faction.icon,
        timestamp: Date.now()
      };
      gameState.troops.push({
        fromX: target.from.x,
        fromY: target.from.y,
        toX: target.to.x,
        toY: target.to.y,
        progress: 0,
        speed: 0.3,
        troops: deployed,
        factionId: faction.id,
        factionColor: faction.color,
        targetId: target.to.id,
        fromId: target.from.id
      });
      events.push(event);
    }
  }
}

function moveTroops(dt, events) {
  const speed = dt / 1000;
  for (let i = gameState.troops.length - 1; i >= 0; i--) {
    const troop = gameState.troops[i];
    troop.progress += troop.speed * speed;
    if (troop.progress >= 1) {
      resolveCombat(troop, events);
      gameState.troops.splice(i, 1);
    }
  }
}

function resolveCombat(troop, events) {
  const target = Map.getTerritory(troop.targetId);
  if (!target) return;
  if (target.owner === troop.factionId) {
    Map.addTroops(troop.targetId, troop.troops);
    events.push({
      type: 'troop_arrive',
      territoryId: troop.targetId,
      troops: troop.troops,
      factionId: troop.factionId,
      action: 'reinforce'
    });
    return;
  }
  if (troop.troops > target.troops) {
    const remaining = troop.troops - target.troops;
    Map.setTroops(troop.targetId, remaining);
    Map.setOwner(troop.targetId, troop.factionId);
    events.push({
      type: 'territory_captured',
      territoryId: troop.targetId,
      newOwner: troop.factionId,
      troops: remaining,
      previousOwner: target.owner
    });
  } else {
    Map.removeTroops(troop.targetId, troop.troops);
    events.push({
      type: 'troop_clash',
      territoryId: troop.targetId,
      attackerLost: troop.troops,
      defenderRemaining: target.troops,
      factionId: troop.factionId
    });
  }
}

function checkWinCondition(events) {
  const all = Map.getAllTerritories();
  const owners = new Set(all.map(t => t.owner).filter(o => o >= 0));
  if (owners.size === 1) {
    const winnerId = [...owners][0];
    gameState.running = false;
    gameState.winner = winnerId;
    events.push({
      type: 'game_over',
      winnerId,
      winnerName: Factions.getFaction(winnerId)?.name,
      winnerColor: Factions.getFaction(winnerId)?.color,
      winnerIcon: Factions.getFaction(winnerId)?.icon,
      stats: Factions.getFactionStats()
    });
  }
}

function updateFactionStats() {
  const factions = Factions.getFactions();
  for (const f of factions) {
    const owned = Map.getOwnedTerritories(f.id);
    Factions.updateTerritoryCount(f.id, owned.length);
  }
}

export function injectTroops(factionId, count, targetId) {
  const owned = Map.getOwnedTerritories(factionId);
  if (owned.length === 0) return;
  const target = targetId !== undefined ? Map.getTerritory(targetId) : owned[0];
  if (!target) return;
  Map.addTroops(target.id, count);
}

export function getDeployableTarget(factionId, preferStrongest) {
  return AI.findBestTarget(factionId, preferStrongest);
}
