import { Game } from './game.js';
import { BridgeClient } from './net/bridgeClient.js';
import { createDebugPanel } from './debugPanel.js';
import { initSpeedControl } from './speedControl.js';
import { initDebugFab, initDebugTabs, initOverlayLink } from './debugFab.js';
import { initConnectionPanel, initViewersPanel, initCinematicPanel, initScoringPanel } from './ui.js';
import { applyLanguage, getLanguage, setLanguage } from './i18n.js';
import { initTeamsPanel, renderTeamsPanel } from './teamsPanel.js';
import { getTeams, loadFromServer, subscribeGame, setBaseUrl as setTeamBaseUrl } from './teamRegistry.js';
import { setBaseUrl, loadWinners } from './winnersStore.js';
import { initMappingsPanel } from './mappingsPanel.js';
import { setBaseUrl as setMappingsBaseUrl, loadFromServer as loadMappings } from './mappingsStore.js';

createDebugPanel();
initSpeedControl();

const canvas = document.getElementById('game-canvas');
canvas.width = 1200;
canvas.height = 800;

const game = new Game(canvas);
const bridge = new BridgeClient();

game.bridge = bridge;
game.bridgeState = { bridgeOk: false, source: 'none', tiktokState: 'idle' };
game.eventCount = 0;
game.setTeams(getTeams());

bridge.onStatus((status) => {
  game.bridgeState = { ...game.bridgeState, ...status };
});

bridge.onEvent((event) => {
  game.eventCount += 1;
  game.handleBridgeEvent(event);
});

subscribeGame((config) => {
  game.setTeams(config.teams);
});

function initLanguageSelector() {
  const select = document.getElementById('language-select');
  if (!select) return;
  select.value = getLanguage();
  select.addEventListener('change', () => {
    setLanguage(select.value);
    renderTeamsPanel();
  });
}

applyLanguage();
async function bootstrapTikora() {
  let config = {};
  try {
    const response = await fetch(`${bridge.url}/api/tikora/config`);
    if (response.ok) config = await response.json();
  } catch {
    void 0;
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('game') || config.slug || '';
  const key = params.get('key') || config.key || '';
  const relayUrl = params.get('relay') || config.relayUrl || '';

  game.hubIdentity = { slug, relayUrl };
  if (key && slug) {
    game.tikora.connect({ key, relayUrl, slug });
  }
}

initDebugTabs();
initDebugFab(game);
initOverlayLink();
initConnectionPanel(game);
initViewersPanel(game);
initCinematicPanel(game);
initScoringPanel(game);
initTeamsPanel(game);
initMappingsPanel();
initLanguageSelector();

setBaseUrl(bridge.url);
setMappingsBaseUrl(bridge.url);
setTeamBaseUrl(bridge.url);
bridge.connect();
loadFromServer(bridge.url);
loadWinners();
loadMappings();
bootstrapTikora();
game.start();
