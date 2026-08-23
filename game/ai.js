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

export function findBestTarget(factionId, preferStrongest = false) {
  if (preferStrongest) {
    return findStrongestEnemy(factionId);
  }
  const owned = Map.getOwnedTerritories(factionId);
  if (owned.length === 0) return null;
  let bestTarget = null;
  let bestScore = -Infinity;
  for (const territory of owned) {
    const neighbors = Map.getNeighbors(territory.id);
    for (const nid of neighbors) {
      const neighbor = Map.getTerritory(nid);
      if (neighbor.owner === factionId || neighbor.owner === -1) continue;
      const dist = Map.distance(territory, neighbor);
      const score = territory.troops / (dist + 1);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = { from: territory, to: neighbor };
      }
    }
  }
  return bestTarget;
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
