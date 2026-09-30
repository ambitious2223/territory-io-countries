import { Game } from './game.js';
import { BridgeClient } from './net/bridgeClient.js';
import { initConnectionPanel } from './ui.js';

const canvas = document.getElementById('game-canvas');
canvas.width = 1200;
canvas.height = 800;

const game = new Game(canvas);
const bridge = new BridgeClient();

game.bridge = bridge;
game.bridgeState = { bridgeOk: false, source: 'none', tiktokState: 'idle' };
game.eventCount = 0;

bridge.onStatus((status) => {
  game.bridgeState = { ...game.bridgeState, ...status };
});

bridge.onEvent(() => {
  game.eventCount += 1;
});

initConnectionPanel(game);
bridge.connect();
game.start();
