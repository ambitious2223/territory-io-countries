import { Game } from './game.js';
import { BridgeClient } from './net/bridgeClient.js';
import { initConnectionPanel, initViewersPanel, initCinematicPanel, initTikoraPanel } from './ui.js';
import { applyLanguage, getLanguage, setLanguage } from './i18n.js';
import { initTeamsPanel, renderTeamsPanel } from './teamsPanel.js';
import { getTeams, loadFromServer, subscribe } from './teamRegistry.js';
import { setBaseUrl, loadWinners } from './winnersStore.js';
import { initMappingsPanel } from './mappingsPanel.js';
import { setBaseUrl as setMappingsBaseUrl, loadFromServer as loadMappings } from './mappingsStore.js';

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

subscribe((config) => {
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
  try {
    const response = await fetch(`${bridge.url}/api/tikora/config`);
    if (!response.ok) return;
    const config = await response.json();
    const keyInput = document.getElementById('tikora-key');
    const relayInput = document.getElementById('tikora-relay');
    if (keyInput && config.key) keyInput.value = config.key;
    if (relayInput && config.relayUrl) relayInput.value = config.relayUrl;
    if (config.enabled && config.key) {
      game.tikora.connect({ key: config.key, relayUrl: config.relayUrl, slug: config.slug });
    }
  } catch {
    void 0;
  }
}

initConnectionPanel(game);
initViewersPanel(game);
initCinematicPanel(game);
initTikoraPanel(game);
initTeamsPanel(game);
initMappingsPanel();
initLanguageSelector();

setBaseUrl(bridge.url);
setMappingsBaseUrl(bridge.url);
bridge.connect();
loadFromServer(bridge.url);
loadWinners();
loadMappings();
bootstrapTikora();
game.start();
