import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let config = null;
let factions = [];

export function loadTeams(configPath) {
  const raw = readFileSync(join(configPath || __dirname, '..', 'config', 'teams.json'), 'utf-8');
  config = JSON.parse(raw);
  factions = config.teams.map(t => ({
    ...t,
    troopPool: 0,
    supporters: new Map(),
    stats: {
      totalDeployed: 0,
      territoriesHeld: 0,
      peakTroops: 0
    }
  }));
  return factions;
}

export function getConfig() {
  return config;
}

export function getFactions() {
  return factions;
}

export function getFaction(id) {
  return factions.find(f => f.id === id);
}

export function getFactionById(id) { return factions.find(f => f.id === id) || null; }

export function getActiveFactions() {
  return factions.filter(f => f.supporters.size > 0);
}

export function addSupporter(factionId, username, profilePic) {
  const faction = getFaction(factionId);
  if (!faction) return false;
  if (faction.supporters.has(username)) return true;
  faction.supporters.set(username, {
    username,
    profilePic: profilePic || null,
    troopsContributed: 0,
    joinedAt: Date.now()
  });
  return true;
}

export function addTroopsToPool(factionId, count, username) {
  const faction = getFaction(factionId);
  if (!faction) return;
  faction.troopPool += count;
  faction.stats.totalDeployed += count;
  if (faction.troopPool > faction.stats.peakTroops) {
    faction.stats.peakTroops = faction.troopPool;
  }
  if (username && faction.supporters.has(username)) {
    const supporter = faction.supporters.get(username);
    supporter.troopsContributed += count;
  }
}

export function withdrawFromPool(factionId, count) {
  const faction = getFaction(factionId);
  if (!faction) return 0;
  const withdrawn = Math.min(faction.troopPool, count);
  faction.troopPool -= withdrawn;
  return withdrawn;
}

export function getPoolSize(factionId) {
  const faction = getFaction(factionId);
  return faction ? faction.troopPool : 0;
}

export function getTopContributors(factionId, limit = 10) {
  const faction = getFaction(factionId);
  if (!faction) return [];
  return [...faction.supporters.values()]
    .sort((a, b) => b.troopsContributed - a.troopsContributed)
    .slice(0, limit);
}

export function updateTerritoryCount(factionId, count) {
  const faction = getFaction(factionId);
  if (faction) faction.stats.territoriesHeld = count;
}

export function getFactionIdByKeyword(keyword) {
  if (!keyword) return -1;
  const lower = keyword.toLowerCase().trim();
  const faction = factions.find(f => f.commentKeyword === lower);
  return faction ? faction.id : -1;
}

export function addFaction(data) {
  const maxId = factions.reduce((max, f) => Math.max(max, f.id), -1);
  const newId = maxId + 1;
  const faction = {
    id: newId,
    name: data.name || 'Team ' + newId,
    color: data.color || '#888888',
    icon: data.icon || '⚪',
    commentKeyword: (data.name || 'team' + newId).toLowerCase(),
    troopPool: 0,
    supporters: new Map(),
    stats: { totalDeployed: 0, territoriesHeld: 0, peakTroops: 0 }
  };
  factions.push(faction);
  return faction;
}

export function removeFaction(id) {
  const idx = factions.findIndex(f => f.id === id);
  if (idx === -1) return false;
  factions.splice(idx, 1);
  return true;
}

export function copyFaction(id) {
  const src = getFaction(id);
  if (!src) return null;
  const maxId = factions.reduce((max, f) => Math.max(max, f.id), -1);
  const newId = maxId + 1;
  const copy = {
    ...src,
    id: newId,
    name: src.name + ' Copy',
    commentKeyword: src.commentKeyword + newId,
    troopPool: 0,
    supporters: new Map(),
    stats: { totalDeployed: 0, territoriesHeld: 0, peakTroops: 0 }
  };
  factions.push(copy);
  return copy;
}

export function updateFaction(id, data) {
  const f = getFaction(id);
  if (!f) return null;
  if (data.name !== undefined) f.name = data.name;
  if (data.color !== undefined) f.color = data.color;
  if (data.icon !== undefined) f.icon = data.icon;
  if (data.commentKeyword !== undefined) f.commentKeyword = data.commentKeyword;
  return f;
}

export function resetFactions() {
  for (const f of factions) {
    f.troopPool = 0;
    f.stats = { totalDeployed: 0, territoriesHeld: 0, peakTroops: 0 };
    f.supporters.clear();
  }
}

export function getFactionStats() {
  return factions.map(f => ({
    id: f.id,
    name: f.name,
    color: f.color,
    icon: f.icon,
    pool: f.troopPool,
    supporters: f.supporters.size,
    stats: { ...f.stats },
    topContributors: getTopContributors(f.id, 5).map(c => ({
      username: c.username,
      troopsContributed: c.troopsContributed
    }))
  }));
}

export function getMaxPoolDisplay() {
  return 50;
}

export function getPoolPercentage(factionId) {
  return Math.min(1, getPoolSize(factionId) / getMaxPoolDisplay());
}

export function getPoolTroopsPerSecond(factionId) {
  const size = getPoolSize(factionId);
  return size / 10;
}
