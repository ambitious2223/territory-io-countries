import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, unlinkSync } from 'fs';
import * as Map from './game/map.js';
import * as Factions from './game/factions.js';
import * as Engine from './game/engine.js';
import * as AI from './game/ai.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(join(__dirname, 'public')));
app.use(express.json({ limit: '5mb' }));

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.post('/api/upload-icon', (req, res) => {
  const { factionId, imageData } = req.body;
  if (factionId === undefined || !imageData) {
    return res.status(400).json({ error: 'Missing factionId or imageData' });
  }
  io.emit('icon_update', { factionId, imageData });
  res.json({ success: true });
});

Map.loadMap(join(__dirname, 'config'));
Factions.loadTeams(join(__dirname, 'config'));

let tiktokClient = null;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('init', {
    territories: Map.getConfig().territories,
    factions: Factions.getFactions().map(f => ({
      id: f.id, name: f.name, color: f.color, icon: f.icon
    })),
    adjacency: Map.getConfig().adjacency,
    config: Map.getConfig()
  });
  socket.on('start_game', (data) => {
    const state = Engine.startGame();
    state.duration = data && data.duration ? data.duration : 180;
    io.emit('game_started', state);
    io.emit('territory_updates', Engine.getTerritoryUpdates());
    console.log('Game started');
  });
  socket.on('stop_game', () => {
    const state = Engine.stopGame();
    io.emit('game_stopped', state);
    console.log('Game stopped');
  });
  socket.on('set_debug', (enabled) => {
    io.emit('debug_mode', enabled);
  });
  socket.on('randomize_map', () => {
    Map.randomizePositions();
    io.emit('map_update', { territories: Map.getConfig().territories, adjacency: Map.getConfig().adjacency });
  });
  socket.on('request_state', () => {
    socket.emit('territory_updates', Engine.getTerritoryUpdates());
  });
  socket.on('inject_troops', (data) => {
    Engine.injectTroops(data.factionId, data.count, data.targetId);
    io.emit('territory_updates', Engine.getTerritoryUpdates());
  });
  socket.on('set_territory', (data) => {
    if (data.troops !== undefined) Map.addTroops(data.id, data.troops - Map.getTerritory(data.id).troops);
    if (data.owner !== undefined) Map.setOwner(data.id, data.owner);
    io.emit('territory_updates', Engine.getTerritoryUpdates());
  });
  socket.on('set_troop_cap', (data) => {
    Engine.setMaxTroops(data.maxTroops);
    io.emit('territory_updates', Engine.getTerritoryUpdates());
  });
  socket.on('purge_queues', () => {
    Engine.purgeAll();
    io.emit('territory_updates', Engine.getTerritoryUpdates());
    console.log('Queues purged by', socket.id);
  });
  socket.on('add_faction', (data) => {
    const f = Factions.addFaction(data);
    const neutrals = Map.getAllTerritories().filter(t => t.owner === -1);
    if (neutrals.length > 0) {
      const t = neutrals[Math.floor(Math.random() * neutrals.length)];
      Map.setOwner(t.id, f.id);
      Map.setTroops(t.id, 50);
    }
    io.emit('factions_updated', Factions.getFactions().map(ff => ({ id: ff.id, name: ff.name, color: ff.color, icon: ff.icon, commentKeyword: ff.commentKeyword })));
    io.emit('territory_updates', Engine.getTerritoryUpdates());
  });
  socket.on('remove_faction', (data) => {
    Factions.removeFaction(data.id);
    io.emit('factions_updated', Factions.getFactions().map(ff => ({ id: ff.id, name: ff.name, color: ff.color, icon: ff.icon, commentKeyword: ff.commentKeyword })));
  });
  socket.on('copy_faction', (data) => {
    const copy = Factions.copyFaction(data.id);
    if (copy) {
      const neutrals = Map.getAllTerritories().filter(t => t.owner === -1);
      if (neutrals.length > 0) {
        const t = neutrals[Math.floor(Math.random() * neutrals.length)];
        Map.setOwner(t.id, copy.id);
        Map.setTroops(t.id, 50);
      }
    }
    io.emit('factions_updated', Factions.getFactions().map(ff => ({ id: ff.id, name: ff.name, color: ff.color, icon: ff.icon, commentKeyword: ff.commentKeyword })));
    io.emit('territory_updates', Engine.getTerritoryUpdates());
  });
  socket.on('update_faction', (data) => {
    Factions.updateFaction(data.id, data);
    io.emit('factions_updated', Factions.getFactions().map(ff => ({ id: ff.id, name: ff.name, color: ff.color, icon: ff.icon, commentKeyword: ff.commentKeyword })));
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.post('/api/join', (req, res) => {
  const { username, factionKeyword, profilePic } = req.body;
  if (!username || !factionKeyword) {
    return res.status(400).json({ error: 'Missing username or factionKeyword' });
  }
  const factionId = Factions.getFactionIdByKeyword(factionKeyword);
  if (factionId === -1) {
    return res.status(400).json({ error: `Unknown faction: ${factionKeyword}` });
  }
  const added = Factions.addSupporter(factionId, username, profilePic);
  if (added) {
    io.emit('player_joined', {
      username, factionId, factionKeyword,
      faction: Factions.getFaction(factionId)
    });
  }
  res.json({ success: added, factionId });
});

app.post('/api/event', (req, res) => {
  const { type, username, value, factionKeyword } = req.body;
  if (!type || !username || !factionKeyword) {
    return res.status(400).json({ error: 'Missing type, username, or factionKeyword' });
  }
  const factionId = Factions.getFactionIdByKeyword(factionKeyword);
  if (factionId === -1) {
    return res.status(400).json({ error: 'Unknown faction' });
  }
  Factions.addSupporter(factionId, username, null);
  handleTikTokEvent({ type, username, value: value || 1, factionId });
  res.json({ success: true });
});

app.post('/api/mock-event', (req, res) => {
  const { type, username, factionKeyword, value, mult } = req.body;
  if (type === 'join') {
    const factionId = Factions.getFactionIdByKeyword(factionKeyword);
    if (factionId === -1) {
      return res.status(400).json({ error: 'Unknown faction' });
    }
    Factions.addSupporter(factionId, username, null);
    io.emit('player_joined', {
      username, factionId, factionKeyword,
      faction: Factions.getFaction(factionId)
    });
  } else {
    const factionId = Factions.getFactionIdByKeyword(factionKeyword);
    if (factionId === -1) {
      return res.status(400).json({ error: 'Unknown faction' });
    }
    Factions.addSupporter(factionId, username || 'viewer', null);
    handleTikTokEvent({ type, username: username || 'viewer', value: value || 1, factionId, mult });
  }
  res.json({ success: true });
});

function handleTikTokEvent(event) {
  const { type, username, value, factionId } = event;
  if (type === 'like' || type === 'share' || type === 'follow') {
    const troops = type === 'follow' ? 2 : 1;
    Factions.addTroopsToPool(factionId, troops, username);
    io.emit('troops_added', {
      type, username, factionId,
      troops, pool: Factions.getPoolSize(factionId)
    });
  } else if (type === 'gift') {
    const coinValue = value || 1;
    let tier, defaultMult, effectType;
    if (coinValue <= 10) { tier = 1; defaultMult = 5; effectType = 'arrow'; }
    else if (coinValue <= 50) { tier = 2; defaultMult = 8; effectType = 'burst'; }
    else if (coinValue <= 100) { tier = 3; defaultMult = 12; effectType = 'barrage'; }
    else { tier = 4; defaultMult = 15; effectType = 'lightning'; }
    const troopMult = event.mult || defaultMult;
    const damageMult = troopMult / defaultMult;
    const troops = Math.min(Math.ceil(coinValue * troopMult), 200);
    Factions.addTroopsToPool(factionId, troops, username);
    io.emit('troops_added', { type, username, factionId, troops, pool: Factions.getPoolSize(factionId), tier, effectType });
    const owned = Map.getOwnedTerritories(factionId);
    if (owned.length === 0) return;
    const source = owned.sort((a, b) => b.troops - a.troops)[0];
    const all = Map.getAllTerritories();
    const enemyTargets = all.filter(t => t.owner !== factionId && t.owner !== -1).sort((a, b) => a.troops - b.troops);
    const neutralTargets = all.filter(t => t.owner === -1).sort((a, b) => a.troops - b.troops);
    const targets = [];
    let weakenAmount = 0;
    let deployTroops = 0;
    if (effectType === 'arrow') {
      const t = enemyTargets[0] || neutralTargets[0];
      if (t) { weakenAmount = Math.min(t.troops, Math.ceil(troops * 0.15 * damageMult)); targets.push(t); deployTroops = troops; }
    } else if (effectType === 'burst') {
      const picks = [...enemyTargets, ...neutralTargets].slice(0, 2);
      for (const t of picks) { weakenAmount += Math.min(t.troops, Math.ceil(troops * 0.1 * damageMult)); targets.push(t); }
      deployTroops = troops;
    } else if (effectType === 'barrage') {
      const picks = [...enemyTargets, ...neutralTargets].slice(0, 4);
      for (const t of picks) { weakenAmount += Math.min(t.troops, Math.ceil(troops * 0.08 * damageMult)); targets.push(t); }
      deployTroops = troops;
    } else {
      const picks = [...enemyTargets, ...neutralTargets].slice(0, 5);
      for (const t of picks) { weakenAmount += Math.min(t.troops, Math.ceil(troops * 0.1 * damageMult)); targets.push(t); }
      deployTroops = troops;
    }
    for (const t of targets) {
      const hit = Math.min(t.troops, Math.ceil(weakenAmount / targets.length));
      Map.removeTroops(t.id, hit);
      if (t.troops <= 0 && t.owner >= 0 && t.owner !== factionId) {
        Map.setOwner(t.id, factionId);
        Map.setTroops(t.id, Math.min(5, troops));
      }
    }
    if (targets.length > 0) {
      io.emit('lightning_strike', {
        factionId, factionColor: Factions.getFactionById(factionId)?.color || '#fff',
        fromX: source.x, fromY: source.y,
        targets: targets.map(t => ({ id: t.id, hit: Math.min(t.troops, Math.ceil(weakenAmount / targets.length)) })),
        value: coinValue, effectType
      });
    }
    if (targets.length > 0 && source.troops > 2) {
      const perTarget = Math.ceil(Math.min(deployTroops * 0.5, source.troops - 1) / targets.length);
      for (const t of targets) {
        const sendCount = Math.min(source.troops - 1, perTarget, 30);
        if (sendCount > 0) {
          Map.removeTroops(source.id, sendCount);
          for (let k = 0; k < sendCount; k++) Engine.spawnDirectTroop(factionId, source.id, t.id, 1);
        }
      }
    }
    io.emit('territory_updates', Engine.getTerritoryUpdates());
  }
}

async function connectTikTok() {
  const username = process.env.TIKTOK_USERNAME;
  if (!username) {
    console.log('No TIKTOK_USERNAME set. Use /api/event or /api/mock-event for testing.');
    return;
  }
  try {
    const mod = await import('tiktok-live-connector');
    const TikTokLiveConnector = mod.TikTokLiveConnector;
    tiktokClient = new TikTokLiveConnector(username);
    tiktokClient.connect();
    tiktokClient.on('chat', (data) => {
      const keyword = data.text.toLowerCase().trim();
      const factionId = Factions.getFactionIdByKeyword(keyword);
      if (factionId !== -1) {
        Factions.addSupporter(factionId, data.user.uniqueId, data.user.profilePicture);
        io.emit('player_joined', {
          username: data.user.uniqueId, factionId,
          factionKeyword: keyword,
          faction: Factions.getFaction(factionId)
        });
      }
    });
    tiktokClient.on('like', (data) => {
      handleTikTokEvent({
        type: 'like',
        username: data.user.uniqueId,
        factionId: getFactionForUser(data.user.uniqueId),
        value: 1
      });
    });
    tiktokClient.on('share', (data) => {
      handleTikTokEvent({
        type: 'share',
        username: data.user.uniqueId,
        factionId: getFactionForUser(data.user.uniqueId),
        value: 1
      });
    });
    tiktokClient.on('follow', (data) => {
      handleTikTokEvent({
        type: 'follow',
        username: data.user.uniqueId,
        factionId: getFactionForUser(data.user.uniqueId),
        value: 1
      });
    });
    tiktokClient.on('gift', (data) => {
      handleTikTokEvent({
        type: 'gift',
        username: data.user.uniqueId,
        factionId: getFactionForUser(data.user.uniqueId),
        value: data.gift?.diamondCount || 1
      });
    });
    console.log(`Connected to TikTok Live: ${username}`);
  } catch (err) {
    console.error('TikTok connection failed:', err.message);
    console.log('Running in offline mode. Use /api/event for testing.');
  }
}

function getFactionForUser(username) {
  for (const f of Factions.getFactions()) {
    if (f.supporters.has(username)) return f.id;
  }
  return 0;
}

setInterval(() => {
  const now = performance.now();
  const events = Engine.update(now);
  io.emit('territory_updates', Engine.getTerritoryUpdates());
  const spawns = Engine.drainSpawns();
  if (spawns.length > 0) io.emit('troop_spawns', spawns);
  if (events.length > 0) {
    io.emit('game_events', events);
  }
}, 1000 / 60);

server.listen(0, () => {
  const port = server.address().port;
  console.log(`State.io Live running on port ${port}`);
  console.log(`Game: http://localhost:${port}`);
  console.log(`Admin: http://localhost:${port}/admin.html`);
  writeFileSync(join(__dirname, '.port'), String(port));
  connectTikTok();
});
