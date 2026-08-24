import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let config = null;
let initialState = null;
let adjacencyMap = new Map();

export function loadMap(configPath) {
  const raw = readFileSync(join(configPath || __dirname, '..', 'config', 'map.json'), 'utf-8');
  config = JSON.parse(raw);
  initialState = JSON.parse(raw).territories.map(t => ({ id: t.id, owner: t.owner, troops: t.troops }));
  buildAdjacencyGraph();
  return config;
}

function buildAdjacencyGraph() {
  adjacencyMap.clear();
  for (const t of config.territories) {
    adjacencyMap.set(t.id, []);
  }
  for (const [a, b] of config.adjacency) {
    adjacencyMap.get(a).push(b);
    adjacencyMap.get(b).push(a);
  }
}

export function getConfig() {
  return config;
}

export function getNeighbors(territoryId) {
  return adjacencyMap.get(territoryId) || [];
}

export function getTerritory(id) {
  return config.territories.find(t => t.id === id);
}

export function getAllTerritories() {
  return config.territories;
}

export function setOwner(id, ownerId) {
  const t = getTerritory(id);
  if (t) t.owner = ownerId;
}

export function setTroops(id, count) {
  const t = getTerritory(id);
  if (t) t.troops = Math.max(0, Math.min(count, t.maxTroops));
}

export function addTroops(id, count) {
  const t = getTerritory(id);
  if (!t) return count;
  const space = t.maxTroops - t.troops;
  if (count <= space) { t.troops += count; return 0; }
  t.troops = t.maxTroops;
  return count - space;
}

export function removeTroops(id, count) {
  const t = getTerritory(id);
  if (!t) return 0;
  const removed = Math.min(t.troops, count);
  t.troops -= removed;
  return removed;
}

export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getOwnedTerritories(ownerId) {
  return config.territories.filter(t => t.owner === ownerId);
}

export function resetMap() {
  if (!initialState) return;
  for (const init of initialState) {
    const t = getTerritory(init.id);
    if (t) { t.owner = init.owner; t.troops = init.troops; }
  }
}

export function randomizePositions() {
  const pad = 80;
  const w = config.canvas.width - pad * 2;
  const h = config.canvas.height - pad * 2;
  for (const t of config.territories) {
    t.x = Math.round(pad + Math.random() * w);
    t.y = Math.round(pad + Math.random() * h);
  }
  buildAdjacencyGraph();
}
