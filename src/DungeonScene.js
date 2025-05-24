import Phaser from "phaser";
import { BagManager } from "./BagManager.js";
import { LootUIManager } from "./LootUIManager.js";
import { CombatVisuals } from "./CombatVisuals.js";
import HintManager from "./HintManager.js";

export default class DungeonScene extends Phaser.Scene {
  constructor() {
    super("DungeonScene");
    this.socket = null;
    this.player = null;
    this.dungeon = null;
    this.bagManager = null;
    this.lootUIManager = null;
    this.combatVisuals = null;
    this.hintManager = null;
  }

  init(data) {
    this.socket = data.socket;
    this.player = data.player;
    this.dungeon = data.dungeon;
  }

  preload() {
    this.load.image("bag", "assets/bag.png");
    this.load.image("floor", "assets/floor.png");
    this.load.image("enemy", "assets/enemy.png");
    this.load.image("player", "assets/player.png");
  }

  create() {
    this.add.image(400, 300, "floor");
    this.add.sprite(400, 500, "player");

    this.bagManager = new BagManager(this);
    this.lootUIManager = new LootUIManager(this);
    this.combatVisuals = new CombatVisuals(this);
    this.hintManager = new HintManager(this);

    this.setupSocketListeners();
    this.createRoom();
  }

  setupSocketListeners() {
    this.socket.on("LOOT_BAG_UPDATE", (data) => {
      this.bagManager.updateBagVisibility([data]);
    });

    this.socket.on("NPC_LOOT_BAG_SPAWNED", (data) => {
      this.bagManager.addBagSprite(data);
    });

    this.socket.on("SHOW_HINT", ({ text }) => {
      this.hintManager.showHint(text);
    });

    this.socket.on("SPELL_CAST_RESULT", (data) => {
      this.combatVisuals.flashTarget(data.targetId);
    });

    this.socket.on("ENTITY_DEFEATED", (data) => {
      console.log("[DEBUG] Entity defeated:", data);
    });
  }

  createRoom() {
    const { doors, asset } = this.dungeon.rooms.find(r => r.id === this.player.roomId);
    console.log(`[DEBUG] Room ${this.player.roomId}: doors=${doors}, asset=${asset}`);
    this.bagManager.createToggleButton(20, 20);
  }

  getSpriteForEntity(entityId) {
    const sprite = this.entitySprites && this.entitySprites.get ? this.entitySprites.get(entityId) : null;
    if (!sprite) {
      console.warn(`[DungeonScene] getSpriteForEntity: Sprite not found for entityId: ${entityId}`);
    }
    return sprite || null;
  }
}
