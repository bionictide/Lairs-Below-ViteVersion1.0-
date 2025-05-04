//checkpoint
// Only Phaser/game logic here, no React, no JSX
import { initGame } from './Game.js';

var container = document.getElementById('renderDiv');
if (!container) {
    container = document.createElement('div');
    container.id = 'renderDiv';
    document.body.appendChild(container);
}
initGame(container);
