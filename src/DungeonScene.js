import Phaser from "phaser";
import { BagManager } from "./BagManager.js";
import { LootUIManager } from "./LootUIManager.js";
import { CombatVisuals } from "./CombatVisuals.js";
import HintManager from "./HintManager.js";

export default class DungeonScene extends Phaser.Scene {
  constructor() {
    super("default");
    this.socket = null;
    this.player = null;
    this.dungeon = null;
    this.bagManager = null;
    this.lootUIManager = null;
    this.combatVisuals = null;
    this.hintManager = null;
    this.tempCombatTexts = [];
  }

  init(data) {
    this.socket = data.socket;
    this.player = data.playerData;
    this.dungeon = data.serverDungeon;
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

    this.socket.on("ENCOUNTER_ATTACK_RESULT", (data) => {
      this.clearTempCombatTexts();
      if (data.dodged) {
        const txt = this.add.text(400, 100, 'Attack dodged!', { font: '20px Arial', fill: '#00ffcc', backgroundColor: '#222' }).setOrigin(0.5).setDepth(200);
        this.tempCombatTexts.push(txt);
        this.time.delayedCall(1200, () => this.clearTempCombatTexts());
      } else {
        this.combatVisuals.playPlayerDamageEffect();
        const txt = this.add.text(400, 100, `Hit for ${data.damageDealt} damage!`, { font: '20px Arial', fill: '#ff4444', backgroundColor: '#222' }).setOrigin(0.5).setDepth(200);
        this.tempCombatTexts.push(txt);
        this.time.delayedCall(1200, () => this.clearTempCombatTexts());
      }
    });

    this.socket.on("ENCOUNTER_SPELL_RESULT", (data) => {
      this.clearTempCombatTexts();
      if (data.dodged) {
        const txt = this.add.text(400, 140, 'Spell dodged!', { font: '20px Arial', fill: '#00ffcc', backgroundColor: '#222' }).setOrigin(0.5).setDepth(200);
        this.tempCombatTexts.push(txt);
        this.time.delayedCall(1200, () => this.clearTempCombatTexts());
      } else {
        this.combatVisuals.playPlayerDamageEffect();
        const txt = this.add.text(400, 140, `Spell hit for ${data.damageDealt} damage!`, { font: '20px Arial', fill: '#44aaff', backgroundColor: '#222' }).setOrigin(0.5).setDepth(200);
        this.tempCombatTexts.push(txt);
        this.time.delayedCall(1200, () => this.clearTempCombatTexts());
      }
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

  clearTempCombatTexts() {
    if (this.tempCombatTexts) {
      this.tempCombatTexts.forEach(txt => txt && txt.destroy());
      this.tempCombatTexts = [];
    }
  }
}
