import Phaser from "phaser";
import { BagManager } from "./BagManager.js";
import { LootUIManager } from "./LootUIManager.js";
import { CombatVisuals } from "./CombatVisuals.js";
import HintManager from "./HintManager.js";
import { CharacterSprites } from '../server/CharacterSpritesServer.js';
import { EVENTS } from './shared/events.js';
import Menu from './Menu.js';
import HealthBar from './HealthBar.js';

function getEffectColor(effectType) {
  switch (effectType) {
    case 'poison': return '#00ff00'; // green
    case 'burn': return '#ff4444'; // red
    case 'freeze': return '#44aaff'; // blue
    case 'regen': return '#44ff44'; // light green
    default: return '#ffffff'; // white
  }
}

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
    this.roomBackground = null;
    this.menuSprite = null;
    this.menuOpen = false;
    this.menuInstance = null;
    this.playerHealthBar = null;
  }

  init(data) {
    this.socket = data.socket;
    this.player = data.playerData;
    this.dungeon = data.serverDungeon;
    console.log('[DEBUG 1] DungeonScene.init playerData:', data.playerData);
    console.log('[DEBUG 2] DungeonScene.init this.player:', this.player);
    console.log('[DEBUG 3] DungeonScene.init this.socket:', this.socket, 'Type:', typeof this.socket);
  }

  preload() {
    console.log('[DEBUG] DungeonScene preload START');
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

    // --- Preload menu animation frames ---
    this.load.image('Menu1', 'Assets/Menu1.png');
    this.load.image('Menu2', 'Assets/Menu2.png');
    this.load.image('Menu3', 'Assets/Menu3.png');
    this.load.image('Menu4', 'Assets/Menu4.png');

    console.log('[DEBUG] DungeonScene preload END');
  }

  create() {
    console.log('[DEBUG 4] DungeonScene create START');
    console.log('[DEBUG 5] DungeonScene.create this.socket:', this.socket, 'Type:', typeof this.socket);
    this.add.image(400, 300, "floor");
    this.add.sprite(400, 500, "player");

    this.bagManager = new BagManager(this);
    this.lootUIManager = new LootUIManager(this, this.socket, this.player?.id);
    this.combatVisuals = new CombatVisuals(this);
    this.hintManager = new HintManager(this);
    const initialHealth = this.player?.health;
    const maxHealth = this.player?.maxHealth;
    console.log('[DEBUG] Creating HealthBar with:', { initialHealth, maxHealth, player: this.player });
    this.playerHealthBar = new HealthBar(this, 20, 20, initialHealth, maxHealth, this.player?.id);

    this.setupSocketListeners();
    this.createRoom();
    // Listen for effect tick events for floating numbers
    this.socket.on(EVENTS.ENCOUNTER_EFFECT_TICK, ({ playerId, effectType, tickResult }) => {
      const { amount } = tickResult;
      if (!amount || amount === 0) return;
      const color = getEffectColor(effectType);
      const isPlayer = playerId === this.player?.id;
      let x, y, z;
      if (isPlayer) {
        // Place below health bar (assume health bar at y=60, adjust as needed)
        x = 400;
        y = 80;
        z = 201;
      } else {
        // Place above enemy sprite
        const sprite = this.getSpriteForEntity(playerId);
        if (!sprite) return;
        x = sprite.x;
        y = sprite.y - (sprite.height ? sprite.height / 2 : 40);
        z = (sprite.depth || 100) + 1;
      }
      const floatText = this.add.text(x, y, `-${amount}`, {
        font: '16px Arial',
        fill: color,
        fontStyle: 'bold',
        stroke: '#222',
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(z);
      this.tweens.add({
        targets: floatText,
        y: y - 30,
        alpha: 0,
        duration: 1000,
        onComplete: () => floatText.destroy()
      });
    });
    if (this.socket && this.socket.on) {
      console.log('[DEBUG 6] Registering ROOM_UPDATE on socket:', this.socket, 'Type:', typeof this.socket);
      this.socket.on(EVENTS.ROOM_UPDATE, (data) => {
        try {
          console.log('[DEBUG 7] ROOM_UPDATE assetKey:', data.assetKey, 'Loaded keys:', this.textures.getTextureKeys(), 'Time:', performance.now());
        } catch (err) {
          console.error('[DEBUG 8] Error in ROOM_UPDATE handler:', err);
        }
        // Remove any existing background image
        if (this.roomBackground) {
          this.roomBackground.destroy();
        }
        // Use the assetKey provided by the server
        if (data.assetKey) {
          this.roomBackground = this.add.image(this.game.config.width / 2, this.game.config.height / 2, data.assetKey).setDepth(0);
        }
        // Ensure menu sprite is always above background
        if (this.menuSprite) {
          this.menuSprite.setDepth(1001);
        }
        // Optionally update other room state here
        if (this.hintManager) this.hintManager.clearHint();
      });
      // List all event names registered on this socket (if possible)
      if (this.socket.eventNames) {
        console.log('[DEBUG 9] Registered socket event names:', this.socket.eventNames());
      }
    } else {
      console.warn('[DEBUG 10] this.socket is not valid or does not support .on');
    }
    console.log('[DEBUG 11] DungeonScene create END');
    // Emit ROOM_ENTER after scene is ready and handler is registered
    if (this.socket && this.player && this.player.roomId && this.player.id) {
      this.socket.emit(EVENTS.ROOM_ENTER, {
        playerId: this.player.id,
        roomId: this.player.roomId,
        facing: this.player.facing || 'north'
      });
      console.log('[DEBUG 12] Emitted ROOM_ENTER after scene create', {
        playerId: this.player.id,
        roomId: this.player.roomId,
        facing: this.player.facing || 'north'
      });
    }
    // MENU SPRITE LOGIC
    this.createMenuSprite();
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
        const txt = this.add.text(400, 100, 'Attack dodged!', { font: '20px Arial', fill: '#00ffcc', backgroundColor: '#222' }).setOrigin(0.5).setDepth(3002);
        this.tempCombatTexts.push(txt);
        this.time.delayedCall(1200, () => this.clearTempCombatTexts());
      } else {
        this.combatVisuals.playPlayerDamageEffect();
        const txt = this.add.text(400, 100, `Hit for ${data.damageDealt} damage!`, { font: '20px Arial', fill: '#ff4444', backgroundColor: '#222' }).setOrigin(0.5).setDepth(3002);
        this.tempCombatTexts.push(txt);
        this.time.delayedCall(1200, () => this.clearTempCombatTexts());
      }
    });

    this.socket.on("ENCOUNTER_SPELL_RESULT", (data) => {
      this.clearTempCombatTexts();
      if (data.dodged) {
        const txt = this.add.text(400, 140, 'Spell dodged!', { font: '20px Arial', fill: '#00ffcc', backgroundColor: '#222' }).setOrigin(0.5).setDepth(3002);
        this.tempCombatTexts.push(txt);
        this.time.delayedCall(1200, () => this.clearTempCombatTexts());
      } else {
        this.combatVisuals.playPlayerDamageEffect();
        const txt = this.add.text(400, 140, `Spell hit for ${data.damageDealt} damage!`, { font: '20px Arial', fill: '#44aaff', backgroundColor: '#222' }).setOrigin(0.5).setDepth(3002);
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

    this.socket.on('HEALTH_UPDATE', ({ playerId, health, maxHealth }) => {
      if (playerId === this.player?.id && this.playerHealthBar) {
        if (typeof maxHealth === 'number') {
          this.playerHealthBar.maxHealth = maxHealth;
        }
        this.playerHealthBar.updateHealth(health);
      }
    });
  }

  createRoom() {
    // No background rendering here; handled by ROOM_UPDATE event
    const room = this.dungeon.rooms.find(r => r.id === this.player.roomId);
    console.log('[DEBUG] createRoom found room:', room);
    const { doors } = room;
    console.log(`[DEBUG] Room ${this.player.roomId}: doors=${doors}`);
    this.bagManager.createToggleButton();
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
      .setOrigin(0.5).setDepth(3002);
    this.time.delayedCall(1800, () => prompt.destroy());
  }

  createMenuSprite() {
    // Remove if already exists
    if (this.menuSprite) this.menuSprite.destroy();
    // Add Menu1 at 10% scale, bottom-left
    this.menuSprite = this.add.sprite(0, 0, 'Menu1')
      .setOrigin(0.5, 0.5)
      .setScale(0.15)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true });
    this.updateMenuPosition();
    this.scale.on('resize', this.updateMenuPosition, this);
    this.menuSprite.on('pointerdown', () => {
      if (this.menuOpen) return;
      this.openMenuAnimation();
    });
  }

  updateMenuPosition() {
    if (!this.menuSprite) return;
    const smallYOffset = 24;
    if (this.menuOpen) {
      // If menu is open, keep it centered
      this.menuSprite.x = this.game.config.width / 2;
      this.menuSprite.y = this.game.config.height / 2;
      this.menuSprite.setScale(1);
    } else {
      // Closed state: bottom-left
      this.menuSprite.setScale(0.15);
      this.menuSprite.x = this.menuSprite.displayWidth / 2;
      this.menuSprite.y = this.game.config.height - this.menuSprite.displayHeight / 2 + smallYOffset;
    }
  }

  openMenuAnimation() {
    this.menuOpen = true;
    this.menuSprite.disableInteractive();
    const centerX = this.game.config.width / 2;
    const centerY = this.game.config.height / 2;
    this.tweens.add({
      targets: this.menuSprite,
      x: centerX,
      y: centerY,
      scale: 1,
      duration: 700,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.playMenuFramesForward();
      }
    });
  }

  playMenuFramesForward() {
    const frames = ['Menu1', 'Menu2', 'Menu3', 'Menu4'];
    let frameIndex = 0;
    const nextFrame = () => {
      frameIndex++;
      if (frameIndex < frames.length) {
        this.menuSprite.setTexture(frames[frameIndex]);
        this.time.delayedCall(120, nextFrame);
      } else {
        // Menu is now open, show your debug GUI here if needed
        this.addMenuCloseButton();
        this.showMenu();
      }
    };
    nextFrame();
  }

  showMenu() {
    if (this.menuInstance) this.menuInstance.clearMenu();
    this.menuInstance = new Menu(this, { socket: this.socket });
  }

  addMenuCloseButton() {
    // No longer needed: close button is now handled by the menu system itself
  }

  closeMenuAnimation() {
    // Destroy menu instance if present
    if (this.menuInstance) {
      this.menuInstance.clearMenu();
      this.menuInstance = null;
    }
    // Play frames in reverse: Menu4 -> Menu3 -> Menu2 -> Menu1
    const frames = ['Menu4', 'Menu3', 'Menu2', 'Menu1'];
    let frameIndex = 0;
    const playReverseFrames = () => {
      this.menuSprite.setTexture(frames[frameIndex]);
      frameIndex++;
      if (frameIndex < frames.length) {
        this.time.delayedCall(120, playReverseFrames);
      } else {
        // Calculate the final small position and scale
        const targetScale = 0.15;
        // Temporarily set scale to target to get correct displayWidth/Height
        this.menuSprite.setScale(targetScale);
        const targetX = this.menuSprite.displayWidth / 2;
        const smallYOffset = 24;
        const targetY = this.game.config.height - this.menuSprite.displayHeight / 2 + smallYOffset;
        // Restore scale for tween start
        this.menuSprite.setScale(1);
        this.tweens.add({
          targets: this.menuSprite,
          x: targetX,
          y: targetY,
          scale: targetScale,
          duration: 700,
          ease: 'Cubic.easeInOut',
          onComplete: () => {
            this.menuSprite.setInteractive({ useHandCursor: true });
            this.menuOpen = false;
            this.updateMenuPosition();
          }
        });
      }
    };
    playReverseFrames();
  }
}
