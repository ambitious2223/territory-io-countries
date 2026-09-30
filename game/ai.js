import * as Map from './map.js';
import * as Factions from './factions.js';

export function findNearestEnemy(territoryId, factionId) {
  const source = Map.getTerritory(territoryId);
  if (!source) return null;
  const neighbors = Map.getNeighbors(territoryId);
  let nearest = null;
  let nearestDist = Infinity;
  for (const nid of neighbors) {
    const neighbor = Map.getTerritory(nid);
    if (neighbor.owner !== factionId && neighbor.owner !== -1) {
      const dist = Map.distance(source, neighbor);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = neighbor;
      }
    }
  }
  return nearest;
}

export function findStrongestEnemy(factionId) {
  const all = Map.getAllTerritories();
  let strongest = null;
  let maxTroops = 0;
  for (const t of all) {
    if (t.owner !== factionId && t.owner !== -1 && t.troops > maxTroops) {
      maxTroops = t.troops;
      strongest = t;
    }
  }
  return strongest;
}

export function findWeakestEnemy(factionId) {
  const all = Map.getAllTerritories();
  let weakest = null;
  let minTroops = Infinity;
  for (const t of all) {
    if (t.owner !== factionId && t.owner !== -1 && t.troops < minTroops) {
      minTroops = t.troops;
      weakest = t;
    }
  }
  return weakest;
}

export function findNeutralTarget(factionId) {
  const owned = Map.getOwnedTerritories(factionId);
  if (owned.length === 0) return null;
  let bestTarget = null;
  let bestScore = -Infinity;
  for (const territory of owned) {
    const neighbors = Map.getNeighbors(territory.id);
    for (const nid of neighbors) {
      const neighbor = Map.getTerritory(nid);
      if (neighbor.owner !== -1) continue;
      const dist = Map.distance(territory, neighbor);
      const score = territory.troops / (neighbor.troops + 1) * 10 + 1 / (dist + 1);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = { from: territory, to: neighbor };
      }
    }
  }
  return bestTarget;
}

export function findBestTarget(factionId, preferStrongest = false) {
  if (preferStrongest) {
    return findStrongestEnemy(factionId);
  }
  const owned = Map.getOwnedTerritories(factionId);
  if (owned.length === 0) return null;
  let bestTarget = null;
  let bestScore = -Infinity;
  let hasAdvantageous = false;
  let fallbackTarget = null;
  let fallbackScore = Infinity;
  for (const territory of owned) {
    const neighbors = Map.getNeighbors(territory.id);
    for (const nid of neighbors) {
      const neighbor = Map.getTerritory(nid);
      if (neighbor.owner === factionId || neighbor.owner === -1) continue;
      if (neighbor.troops > territory.troops * 2) continue;
      const dist = Map.distance(territory, neighbor);
      const troopRatio = territory.troops / (neighbor.troops + 1);
      const score = (troopRatio * 10) + (1 / (dist + 1)) + (territory.troops * 0.01);
      if (troopRatio >= 1.5) {
        hasAdvantageous = true;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = { from: territory, to: neighbor };
        }
      } else {
        if (neighbor.troops < fallbackScore) {
          fallbackScore = neighbor.troops;
          fallbackTarget = { from: territory, to: neighbor };
        }
      }
    }
  }
  if (hasAdvantageous && bestTarget) return bestTarget;
  if (fallbackTarget) return fallbackTarget;
  return findWeakestEnemy(factionId) ? { from: owned[0], to: findWeakestEnemy(factionId) } : null;
}

export function findFlankTarget(factionId) {
  const all = Map.getAllTerritories();
  const enemies = all.filter(t => t.owner !== factionId && t.owner !== -1);
  const grouped = {};
  for (const enemy of enemies) {
    if (!grouped[enemy.owner]) grouped[enemy.owner] = [];
    grouped[enemy.owner].push(enemy);
  }
  const owned = Map.getOwnedTerritories(factionId);
  if (owned.length === 0) return null;
  let bestFlank = null;
  let bestScore = -Infinity;
  for (const ownerEnemies of Object.values(grouped)) {
    if (ownerEnemies.length < 2) continue;
    for (let i = 0; i < ownerEnemies.length; i++) {
      for (let j = i + 1; j < ownerEnemies.length; j++) {
        const a = ownerEnemies[i];
        const b = ownerEnemies[j];
        const adj = Map.getNeighbors(a.id);
        if (!adj.includes(b.id)) continue;
        const weaker = a.troops <= b.troops ? a : b;
        for (const own of owned) {
          const dist = Map.distance(own, weaker);
          const ratio = own.troops / (weaker.troops + 1);
          const score = ratio * 5 + 1 / (dist + 1);
          if (score > bestScore && weaker.troops <= own.troops * 2) {
            bestScore = score;
            bestFlank = { from: own, to: weaker };
          }
        }
      }
    }
  }
  return bestFlank;
}

export function deployFromPool(factionId, preferStrongest = false) {
  const poolSize = Factions.getPoolSize(factionId);
  if (poolSize < 1) return null;
  const owned = Map.getOwnedTerritories(factionId);
  if (owned.length === 0) return null;
  const target = findBestTarget(factionId, preferStrongest);
  if (!target) return null;
  const deployAmount = Math.min(poolSize, Math.ceil(poolSize * 0.3));
  const deployed = Factions.withdrawFromPool(factionId, deployAmount);
  if (deployed <= 0) return null;
  Map.addTroops(target.from.id, deployed);
  return {
    from: target.from.id,
    to: target.to.id,
    troops: deployed,
    factionId
  };
}
