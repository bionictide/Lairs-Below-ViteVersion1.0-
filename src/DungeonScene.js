import Phaser from "phaser";
import { BagManager } from "./BagManager.js";
import { LootUIManager } from "./LootUIManager.js";
import { CombatVisuals } from "./CombatVisuals.js";
import HintManager from "./HintManager.js";
import { CharacterSprites } from '../server/CharacterSpritesServer.js';
import { EVENTS } from './shared/events.js';

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
    this.actionMenu = null;
    this.targetingMenu = null;
    this.currentActionContext = null;
    this.currentTargetList = null;
  }

  init(data) {
    this.socket = data.socket;
    this.player = data.playerData;
    this.dungeon = data.serverDungeon;
  }

  preload() {
    // --- Preload all room backgrounds (old RoomManager.roomAssets) ---
    const roomAssets = {
      'none': 'Assets/None.png',
      'left': 'Assets/Left.png',
      'right': 'Assets/Right.png',
      'forward': 'Assets/Forward.png',
      'left-forward': 'Assets/LeftForward.png',
      'forward-right': 'Assets/ForwardRight.png',
      'left-right': 'Assets/LeftRight.png',
      'left-forward-right': 'Assets/LeftForwardRight.png',
      'right-barrel': 'Assets/Right2(barrel).png',
      'forward-right2': 'Assets/ForwardRight2.png'
    };
    Object.entries(roomAssets).forEach(([key, url]) => {
      this.load.image(key, url);
    });

    // --- Preload all character sprites (idle, angry, dead) ---
    Object.values(CharacterSprites).forEach(spriteSet => {
      Object.values(spriteSet).forEach(filename => {
        this.load.image(filename.replace('.png',''), `Assets/${filename}`);
      });
    });

    // --- Preload loot, shelf, and effect assets (as in old code) ---
    const assetList = [
      'Key1', 'Sword1', 'Helm1', 'Bag1', 'Bag2', 'Potion1(red)',
      'ShelfEmpty', 'ShelfRawRuby', 'ShelfAmethyst', 'ShelfBlueApatite', 'ShelfEmerald', 'Shelf2Potion', 'Shelf2Empty',
      'RawRuby', 'BlueApatite', 'Amethyst', 'Emerald',
      'ShelfEmptyLeft', 'ShelfEmptyRight', 'ShelfRawRubyLeft', 'ShelfRawRubyRight',
      'ShelfAmethystLeft', 'ShelfAmethystRight', 'ShelfBlueApatiteLeft', 'ShelfBlueApatiteRight',
      'ShelfEmeraldLeft', 'ShelfEmeraldRight', 'Shelf2EmptyLeft', 'Shelf2EmptyRight',
      'Shelf2PotionLeft', 'Shelf2PotionRight',
      'GlassBroke1', 'GlassBroke2', 'GlassBroke3', 'GlassBroke4', 'GlassBroke5'
    ];
    assetList.forEach(key => {
      this.load.image(key, `Assets/${key}.png`);
    });
  }

  create() {
    this.add.image(400, 300, "floor");
    this.add.sprite(400, 500, "player");

    this.bagManager = new BagManager(this);
    this.lootUIManager = new LootUIManager(this, this.socket, this.player?.id);
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

    this.socket.on("ENCOUNTER_KO", (data) => {
      const { targetId, type, mood } = data;
      // Find the sprite for this entity
      const sprite = this.getSpriteForEntity(targetId);
      if (sprite && type && CharacterSprites[type] && CharacterSprites[type][mood]) {
        // Swap to the 'dead' sprite
        sprite.setTexture(CharacterSprites[type][mood].replace('.png',''));
        // Fade out and tint using CombatVisuals
        this.combatVisuals.fadeOutAndRemove(sprite, () => {
          if (this.entitySprites && this.entitySprites.delete) {
            this.entitySprites.delete(targetId);
          }
          sprite.destroy();
        });
      } else {
        // If no sprite or type, just remove if present
        if (sprite) sprite.destroy();
        if (this.entitySprites && this.entitySprites.delete) {
          this.entitySprites.delete(targetId);
        }
      }
    });

    this.socket.on("ENCOUNTER_ACTION_MENU", (data) => {
      this.renderActionMenu(data);
    });
    this.socket.on("ENCOUNTER_TARGET_SELECTION", (data) => {
      this.renderTargetingMenu(data);
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

  // --- Action Menu Rendering ---
  renderActionMenu({ actions, paginationInfo, actorId, encounterId, targetId, spellMenu }) {
    if (this.actionMenu) this.actionMenu.destroy();
    this.actionMenu = this.add.container(400, 300).setDepth(100);
    const buttonWidth = 220;
    const buttonHeight = 48;
    const buttonSpacing = 56;
    // If this is a spell menu, use the canonical spell order and requirements
    if (spellMenu && Array.isArray(spellMenu)) {
      // Canonical spell order
      const spellOrder = [
        'Blizzard', 'Cure', 'Firestorm', 'Void Blast', 'Toxic Gaze',
        'Earthquake', 'Healing Wind', 'Break Time', 'Stop Breathing', 'Bullet Hell', 'Neutron Crucible'
      ];
      // Map spellMenu to a lookup for quick access
      const spellMap = {};
      spellMenu.forEach(spell => { spellMap[spell.text] = spell; });
      spellOrder.forEach((spellName, i) => {
        const spell = spellMap[spellName];
        if (!spell) return;
        const y = i * buttonSpacing;
        const isDisabled = spell.enabled === false || spell.disabled === true;
        const btn = this.add.rectangle(0, y, buttonWidth, buttonHeight, isDisabled ? 0x555555 : 0x333333)
          .setStrokeStyle(2, isDisabled ? 0x777777 : 0xffffff)
          .setInteractive({ useHandCursor: !isDisabled });
        // Show gem requirements if present
        let label = spell.text;
        if (spell.requirements && spell.requirements.length > 0) {
          label += ` (${spell.requirements.join(', ')})`;
        }
        const txt = this.add.text(0, y, label, {
          fontSize: '18px', color: isDisabled ? '#999999' : '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: buttonWidth - 16 }
        }).setOrigin(0.5);
        if (!isDisabled) {
          btn.on('pointerover', () => btn.setFillStyle(0x555555));
          btn.on('pointerout', () => btn.setFillStyle(0x333333));
          btn.on('pointerdown', () => {
            this.socket.emit(EVENTS.ENCOUNTER_ACTION, {
              encounterId,
              actorId,
              action: spell.action,
              targetId,
              extra: spell.extra || null
            });
            this.actionMenu.destroy();
            this.actionMenu = null;
          });
        } else if (spell.info) {
          btn.on('pointerdown', () => {
            this.showActionPrompt(spell.info);
          });
        }
        this.actionMenu.add([btn, txt]);
      });
      // Pagination (if present)
      if (paginationInfo && paginationInfo.totalPages > 1) {
        const pageText = this.add.text(0, spellOrder.length * buttonSpacing + 10, `Page ${paginationInfo.page} / ${paginationInfo.totalPages}`,
          { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
        this.actionMenu.add(pageText);
      }
      return;
    }
    // Default: render generic actions
    actions.forEach((action, i) => {
      const y = i * buttonSpacing;
      const isDisabled = action.enabled === false || action.disabled === true;
      const btn = this.add.rectangle(0, y, buttonWidth, buttonHeight, isDisabled ? 0x555555 : 0x333333)
        .setStrokeStyle(2, isDisabled ? 0x777777 : 0xffffff)
        .setInteractive({ useHandCursor: !isDisabled });
      const txt = this.add.text(0, y, action.text, {
        fontSize: '18px', color: isDisabled ? '#999999' : '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: buttonWidth - 16 }
      }).setOrigin(0.5);
      if (!isDisabled) {
        btn.on('pointerover', () => btn.setFillStyle(0x555555));
        btn.on('pointerout', () => btn.setFillStyle(0x333333));
        btn.on('pointerdown', () => {
          this.socket.emit(EVENTS.ENCOUNTER_ACTION, {
            encounterId,
            actorId,
            action: action.action,
            targetId,
            extra: action.extra || null
          });
          this.actionMenu.destroy();
          this.actionMenu = null;
        });
      } else if (action.info) {
        btn.on('pointerdown', () => {
          this.showActionPrompt(action.info);
        });
      }
      this.actionMenu.add([btn, txt]);
    });
    if (paginationInfo && paginationInfo.totalPages > 1) {
      const pageText = this.add.text(0, actions.length * buttonSpacing + 10, `Page ${paginationInfo.page} / ${paginationInfo.totalPages}`,
        { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
      this.actionMenu.add(pageText);
    }
  }

  // --- Targeting Menu Rendering ---
  renderTargetingMenu({ validTargets, action, encounterId, actorId, extra }) {
    if (this.targetingMenu) this.targetingMenu.destroy();
    this.targetingMenu = this.add.container(400, 300).setDepth(101);
    const buttonWidth = 220;
    const buttonHeight = 48;
    const buttonSpacing = 56;
    validTargets.forEach((target, i) => {
      const y = i * buttonSpacing;
      const btn = this.add.rectangle(0, y, buttonWidth, buttonHeight, 0x333333)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(0, y, target.name || target.id, {
        fontSize: '18px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: buttonWidth - 16 }
      }).setOrigin(0.5);
      btn.on('pointerover', () => btn.setFillStyle(0x555555));
      btn.on('pointerout', () => btn.setFillStyle(0x333333));
      btn.on('pointerdown', () => {
        this.socket.emit('ENCOUNTER_TARGET_SELECTED', {
          encounterId,
          actorId,
          action,
          targetId: target.id,
          extra: extra || null
        });
        this.targetingMenu.destroy();
        this.targetingMenu = null;
      });
      this.targetingMenu.add([btn, txt]);
    });
  }

  showActionPrompt(text) {
    // Show a temporary prompt (reuse old logic or add a new text box)
    const prompt = this.add.text(400, 60, text, { fontSize: '20px', color: '#fff', backgroundColor: '#222', padding: { x: 12, y: 8 } })
      .setOrigin(0.5).setDepth(200);
    this.time.delayedCall(1800, () => prompt.destroy());
  }
}
