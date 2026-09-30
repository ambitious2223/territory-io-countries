import { Game } from './game.js';
import { BridgeClient } from './net/bridgeClient.js';
import { initConnectionPanel, initViewersPanel, initCinematicPanel } from './ui.js';
import { applyLanguage, getLanguage, setLanguage } from './i18n.js';
import { initTeamsPanel, renderTeamsPanel } from './teamsPanel.js';
import { getTeams, loadFromServer, subscribe } from './teamRegistry.js';
import { setBaseUrl, loadWinners } from './winnersStore.js';

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
initConnectionPanel(game);
initViewersPanel(game);
initCinematicPanel(game);
initTeamsPanel(game);
initLanguageSelector();

setBaseUrl(bridge.url);
bridge.connect();
loadFromServer(bridge.url);
loadWinners();
game.start();
