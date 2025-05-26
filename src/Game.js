import Phaser from "phaser";
import DungeonScene from "./DungeonScene.js";

export default class Game {
  constructor(config) {
    this.phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      scene: [DungeonScene],
      ...config,
    });
  }
}

export function initGame(parent, dungeon, player, socket) {
  const config = {
    type: Phaser.AUTO,
    width: 1456,
    height: 816,
    parent: parent,
    scene: [DungeonScene],
    backgroundColor: '#222222',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false }
    }
  };
  const game = new Phaser.Game(config);
  // Pass socket to DungeonScene
  game.scene.start('default', { serverDungeon: dungeon, playerData: player, socket });
  return game;
}
