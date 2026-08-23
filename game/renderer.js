let canvas = null;
let ctx = null;
let debugMode = false;
let config = null;

export function init(canvasEl, mapConfig) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  config = mapConfig;
  canvas.width = mapConfig.canvas.width;
  canvas.height = mapConfig.canvas.height;
}

export function setDebug(enabled) {
  debugMode = enabled;
}

export function render(state, factions) {
  if (!ctx) return;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawAdjacency();
  drawTerritories(factions);
  drawTroopProjectiles(state);
  if (debugMode) {
    drawDebugInfo(state, factions);
  }
}

function drawAdjacency() {
  if (!debugMode) return;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (const [a, b] of config.adjacency) {
    const ta = config.territories.find(t => t.id === a);
    const tb = config.territories.find(t => t.id === b);
    if (!ta || !tb) continue;
    ctx.beginPath();
    ctx.moveTo(ta.x, ta.y);
    ctx.lineTo(tb.x, tb.y);
    ctx.stroke();
  }
}

function drawTerritories(factions) {
  const radius = config.nodeRadius;
  for (const t of config.territories) {
    const faction = factions.find(f => f.id === t.owner);
    const color = faction ? faction.color : '#555555';
    ctx.beginPath();
    ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.troops, t.x, t.y);
    if (faction && faction.icon) {
      ctx.font = '24px Arial';
      ctx.fillText(faction.icon, t.x, t.y - radius - 15);
    }
  }
}

function drawTroopProjectiles(state) {
  for (const troop of state.troops) {
    const x = troop.fromX + (troop.toX - troop.fromX) * troop.progress;
    const y = troop.fromY + (troop.toY - troop.fromY) * troop.progress;
    const size = Math.max(4, Math.min(10, troop.troops / 5));
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = troop.factionColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(troop.troops, x, y - size - 5);
  }
}

function drawDebugInfo(state, factions) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 10, 250, factions.length * 25 + 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let y = 20;
  ctx.fillText(`Running: ${state.running} | Troops: ${state.troops.length}`, 15, y);
  y += 25;
  for (const f of factions) {
    ctx.fillStyle = f.color;
    ctx.fillText(`${f.icon} ${f.name}: Pool=${f.pool} Supporters=${f.supporters}`, 15, y);
    y += 25;
  }
}

export function renderWinScreen(winner, stats) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = winner.color;
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${winner.icon} ${winner.name} Wins!`, canvas.width / 2, canvas.height / 2 - 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('Top Contributors', canvas.width / 2, canvas.height / 2 - 60);
  const contributors = stats.contributors || [];
  const top5 = contributors.slice(0, 5);
  ctx.font = '28px Arial';
  for (let i = 0; i < top5.length; i++) {
    const c = top5[i];
    ctx.fillText(
      `#${i + 1} ${c.username} - ${c.troopsContributed} troops`,
      canvas.width / 2,
      canvas.height / 2 + i * 40
    );
  }
  ctx.font = '24px Arial';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText('Stream to restart', canvas.width / 2, canvas.height / 2 + 260);
}

export function clear() {
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
