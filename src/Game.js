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
