import { Game } from './game.js';
import { BridgeClient } from './net/bridgeClient.js';
import { createDebugPanel } from './debugPanel.js';
import { initSpeedControl } from './speedControl.js';
import { initDebugFab, initDebugTabs, initOverlayLink } from './debugFab.js';
import { initConnectionPanel, initViewersPanel, initCinematicPanel, initScoringPanel, initOnboardingPanel } from './ui.js';
import { initCameraPanel } from './cameraPanel.js';
import { initGiftPanel } from './giftPanel.js';
import { initGiftTuning } from './giftTuning.js';
import { applyLanguage, getLanguage, setLanguage } from './i18n.js';
import { initTeamsPanel, renderTeamsPanel } from './teamsPanel.js';
import { getTeams, loadFromServer, subscribeGame, setBaseUrl as setTeamBaseUrl } from './teamRegistry.js';
import { setBaseUrl, loadWinners } from './winnersStore.js';

createDebugPanel();
initSpeedControl();
initGiftTuning();

const canvas = document.getElementById('game-canvas');
canvas.width = 1200;
canvas.height = 800;

const game = new Game(canvas);
const bridge = new BridgeClient();

game.bridge = bridge;
game.bridgeState = { bridgeOk: false, source: 'none', tiktokState: 'idle' };
game.tunnel = { status: 'off', url: null, error: null };
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
    initScoringPanel(game);
    updateOverlay?.();
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

async function bootstrapTunnel() {
  try {
    const response = await fetch(`${bridge.url}/api/tunnel`);
    if (response.ok) {
      game.tunnel = await response.json();
      updateOverlay?.();
    }
  } catch {
    void 0;
  }
}

initDebugTabs();
initDebugFab(game);
const updateOverlay = initOverlayLink(game);
initConnectionPanel(game);
initCameraPanel(game);
initViewersPanel(game);
initCinematicPanel(game);
initOnboardingPanel(game);
initScoringPanel(game);
initGiftPanel();
initTeamsPanel(game);
initLanguageSelector();

setBaseUrl(bridge.url);
setTeamBaseUrl(bridge.url);
bridge.connect();
loadFromServer(bridge.url);
loadWinners();
bootstrapTikora();
bootstrapTunnel();
game.start();
