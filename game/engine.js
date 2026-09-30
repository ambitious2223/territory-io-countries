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

let pendingSpawns = [];

const PRODUCTION_INTERVAL = 1000;
const DEPLOY_INTERVAL = 60;
const MAX_TROOP_POOL_DRAIN_PER_DEPLOY = 1;
const RUBBERBAND_BUFF_THRESHOLD = 1;
const RUBBERBAND_SPEED_MULT = 1.25;

let deployAccumulators = {};

let gameSpeedMultiplier = 1;
let productionMultiplier = 1;
let productionAccumulator = 0;

export function setGameSpeed(multiplier) {
  gameSpeedMultiplier = Math.max(0.5, Math.min(3.0, multiplier));
}

export function setProductionRate(multiplier) {
  productionMultiplier = Math.max(0.5, Math.min(5.0, multiplier));
}

let maxTroopsPerTerritory = 120;

export function setMaxTroops(val) {
  maxTroopsPerTerritory = Math.max(10, Math.min(9999, val));
  const all = Map.getAllTerritories();
  for (const t of all) {
    if (t.troops > maxTroopsPerTerritory) t.troops = maxTroopsPerTerritory;
    t.maxTroops = maxTroopsPerTerritory;
  }
}

export function getSpeedConfig() {
  return { gameSpeed: gameSpeedMultiplier, productionRate: productionMultiplier };
}

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
  productionAccumulator = 0;
  deployAccumulators = {};
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
  let dt = now - gameState.lastTick;
  gameState.lastTick = now;
  dt *= gameSpeedMultiplier;
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
    if (t.troops > 0 && t.troops < maxTroopsPerTerritory) {
      productionAccumulator += productionMultiplier;
      if (productionAccumulator >= 1) {
        const whole = Math.floor(productionAccumulator);
        const overflow = Map.addTroops(t.id, whole);
        if (overflow > 0 && t.owner >= 0) redirectOverflow(t.owner, t.id, overflow);
        productionAccumulator -= whole;
      }
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
    const target = AI.findNeutralTarget(faction.id) || AI.findBestTarget(faction.id, false);
    if (!target) continue;
    const isTrailing = owned.length <= RUBBERBAND_BUFF_THRESHOLD;
    const rate = isTrailing ? MAX_TROOP_POOL_DRAIN_PER_DEPLOY * RUBBERBAND_SPEED_MULT : MAX_TROOP_POOL_DRAIN_PER_DEPLOY;
    if (!deployAccumulators[faction.id]) deployAccumulators[faction.id] = 0;
    deployAccumulators[faction.id] += rate;
    const amount = Math.min(pool, Math.floor(deployAccumulators[faction.id]));
    if (amount < 1) continue;
    deployAccumulators[faction.id] -= amount;
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
      pendingSpawns.push({
        fromId: target.from.id,
        toId: target.to.id,
        troops: deployed,
        factionId: faction.id,
        factionColor: faction.color,
        speed: 0.3
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
    const overflow = Map.addTroops(troop.targetId, troop.troops);
    if (overflow > 0) redirectOverflow(troop.factionId, troop.targetId, overflow);
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
    if (remaining > Map.getTerritory(troop.targetId).maxTroops) {
      const overflow = remaining - Map.getTerritory(troop.targetId).maxTroops;
      Map.setTroops(troop.targetId, Map.getTerritory(troop.targetId).maxTroops);
      redirectOverflow(troop.factionId, troop.targetId, overflow);
    }
    events.push({
      type: 'territory_captured',
      territoryId: troop.targetId,
      newOwner: troop.factionId,
      troops: Math.min(remaining, Map.getTerritory(troop.targetId).maxTroops),
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

function redirectOverflow(factionId, fromId, overflow) {
  const neighbors = Map.getNeighbors(fromId);
  const candidates = neighbors
    .map(id => Map.getTerritory(id))
    .filter(t => t && (t.owner === factionId || t.owner === -1) && t.troops < t.maxTroops)
    .sort((a, b) => (a.maxTroops - a.troops) - (b.maxTroops - b.troops));
  let remaining = overflow;
  for (const t of candidates) {
    if (remaining <= 0) break;
    const space = t.maxTroops - t.troops;
    const added = Math.min(remaining, space);
    Map.addTroops(t.id, added);
    remaining -= added;
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

export function spawnDirectTroop(factionId, fromId, toId, troops) {
  const from = Map.getTerritory(fromId);
  const to = Map.getTerritory(toId);
  if (!from || !to) return;
  const f = Factions.getFaction(factionId);
  gameState.troops.push({ fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, progress: 0, speed: 0.45, troops, factionId, factionColor: f?.color || '#fff', targetId: toId, fromId });
  pendingSpawns.push({ fromId, toId, troops, factionId, factionColor: f?.color || '#fff', speed: 0.45 });
}
export function injectTroops(factionId, count, targetId) {
  const owned = Map.getOwnedTerritories(factionId);
  if (owned.length === 0) return;
  let target;
  if (targetId !== undefined) {
    const t = Map.getTerritory(targetId);
    target = (t && t.owner === factionId) ? t : owned[0];
  } else {
    target = owned[0];
  }
  Map.addTroops(target.id, count);
}

export function getDeployableTarget(factionId, preferStrongest) {
  return AI.findBestTarget(factionId, preferStrongest);
}

export function drainSpawns() {
  const spawns = pendingSpawns;
  pendingSpawns = [];
  return spawns;
}

export function purgeAll() {
  gameState.troops = [];
  pendingSpawns = [];
}

export function getTerritoryUpdates() {
  return Map.getAllTerritories().map(t => ({
    id: t.id, owner: t.owner, troops: t.troops
  }));
}
