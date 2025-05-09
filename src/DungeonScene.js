console.log('[DEBUG] DungeonScene.js loaded');
import { EVENTS } from './shared/events.js';
function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
}
function _array_without_holes(arr) {
    if (Array.isArray(arr)) return _array_like_to_array(arr);
}
function _assert_this_initialized(self) {
    if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
}
function _call_super(_this, derived, args) {
    derived = _get_prototype_of(derived);
    return _possible_constructor_return(_this, _is_native_reflect_construct() ? Reflect.construct(derived, args || [], _get_prototype_of(_this).constructor) : derived.apply(_this, args));
}
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _get_prototype_of(o) {
    _get_prototype_of = Object.setPrototypeOf ? Object.getPrototypeOf : function getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _get_prototype_of(o);
}
function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
            value: subClass,
            writable: true,
            configurable: true
        }
    });
    if (superClass) _set_prototype_of(subClass, superClass);
}
function _iterable_to_array(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _iterable_to_array_limit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _s, _e;
    try {
        for(_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true){
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
        }
    } catch (err) {
        _d = true;
        _e = err;
    } finally{
        try {
            if (!_n && _i["return"] != null) _i["return"]();
        } finally{
            if (_d) throw _e;
        }
    }
    return _arr;
}
function _non_iterable_rest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _non_iterable_spread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _possible_constructor_return(self, call) {
    if (call && (_type_of(call) === "object" || typeof call === "function")) {
        return call;
    }
    return _assert_this_initialized(self);
}
function _set_prototype_of(o, p) {
    _set_prototype_of = Object.setPrototypeOf || function setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
    };
    return _set_prototype_of(o, p);
}
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
}
function _to_consumable_array(arr) {
    return _array_without_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_spread();
}
function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
function _is_native_reflect_construct() {
    try {
        var result = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {}));
    } catch (_) {}
    return (_is_native_reflect_construct = function() {
        return !!result;
    })();
}
import Phaser from 'https://esm.sh/phaser@3.60.0';
import { gameConfig } from './Game.js';
import { DungeonService } from './DungeonService.js';
import { RoomManager } from './RoomManager.js';
import { DebugHelper } from './DebugHelper.js';
import { EncounterManager } from './EncounterManager.js';
import { PuzzleManager } from './PuzzleManager.js';
import { HintManager } from './HintManager.js';
import { ShelfManager } from './ShelfManager.js';
import { BagManager } from './BagManager.js';
import { HealthBar } from './HealthBar.js'; // Import the new HealthBar class
import { NPCLootManager } from './NPCLootManager.js'; // Import the new NPCLootManager
import { LootUIManager } from './LootUIManager.js'; // Import the new LootUIManager
import { ItemManager } from './ItemManager.js'; // Import ItemManager
import { characterDefinitions, getCharacterDefinition } from './CharacterTypes.js'; // Import definitions and helper
import { CombatVisuals } from './CombatVisuals.js'; // Import the new CombatVisuals class
import { PlayerStatsProxy } from './PlayerStatsProxy.js';
import { socket } from './socket.js';
// Define door configurations outside the class for clarity
var DOOR_CONFIGS = {
    forward: {
        xFactor: 0.50,
        yFactor: 0.46,
        wFactor: 0.25,
        hFactor: 0.55
    },
    right: {
        xFactor: 0.875,
        yFactor: 0.50,
        wFactor: 0.15,
        hFactor: 0.70
    },
    left: {
        xFactor: 0.125,
        yFactor: 0.50,
        wFactor: 0.15,
        hFactor: 0.70
    } // Mirrored right door
};
export var DungeonScene = /*#__PURE__*/ function(_Phaser_Scene) {
    "use strict";
    _inherits(DungeonScene, _Phaser_Scene);
    function DungeonScene() {
        console.log('[DEBUG] DungeonScene constructor called');
        _class_call_check(this, DungeonScene);
        var _this = _call_super(this, DungeonScene, ['default']);
        _this.playerPosition = {
            roomId: null,
            facing: 'north',
            entryRoomId: null
        };
        _this.dungeonService = new DungeonService();
        _this.roomManager = new RoomManager();
        _this.debugHelper = null;
        _this.encounterManager = null;
        _this.puzzleManager = null;
        _this.hintManager = null;
        _this.shelfManager = null; // Add ShelfManager instance
        _this.bagManager = null; // Add BagManager instance
        _this.npcLootManager = null; // Add NPCLootManager instance
        _this.lootUIManager = null; // Add LootUIManager instance
        _this.playerStats = null; // Add PlayerStats instance
        _this.itemManager = null; // Add ItemManager instance
        _this.combatVisuals = null; // Add CombatVisuals instance
        _this.dungeon = null;
        _this.playerCount = 6;
        _this.isRearranging = false;
        _this.isInEncounter = false; // Added encounter state flag
        _this.enemySprite = null; // Reference to the enemy sprite
        _this.encounterTimer = 0; // Timer for dynamic encounters
        _this.encounterInterval = 5000; // Check every 5 seconds (5000 ms)
        _this.promptText = null; // Reference to the current action prompt text object
        _this.promptTimer = null; // Reference to the timer event for the current prompt
        _this.actionMenuTimer = null; // Reference to the action menu timer event
        _this.actionMenuTimerBar = null; // Reference to the timer bar graphic
        _this.talkInputField = null; // Reference to the talk input text object
        _this.currentTalkInput = '';
        _this.talkInputListenersActive = false;
        _this.playerHealthBar = null; // Reference to the player's HealthBar instance
        _this.playerId = null; // Add property to store the player's unique ID
        _this.entitySprites = new Map(); // Map to store entityId -> sprite mapping
        _this.statBlock = null; // <-- Add this property for stat block injection
        return _this;
    }
    _create_class(DungeonScene, [
        {
            key: "init",
            value: function init(data) {
                console.log('[DEBUG] DungeonScene.init() called', data);
                if (data && data.character) {
                    this.character = data.character;
                }
                if (data && data.serverDungeon) {
                    this.serverDungeon = data.serverDungeon;
                }
            }
        },
        {
            key: "preload",
            value: function preload() {
                console.log('[DEBUG] DungeonScene.preload() called');
                var _this = this;
                Object.entries(this.roomManager.roomAssets).forEach(function(param) {
                    var _param = _sliced_to_array(param, 2), key = _param[0], url = _param[1];
                    _this.load.image(key, url);
                });
                // --- Dynamically preload enemy assets based on CharacterTypes ---
                console.log("[DEBUG] Preloading assets based on CharacterTypes...");
                for(var typeKey in characterDefinitions){
                    var definition = characterDefinitions[typeKey];
                    if (definition && definition.assetPrefix) {
                        var prefix = definition.assetPrefix;
                        var idleKey = `${prefix}1`;
                        var angryKey = `${prefix}2`;
                        // Use local asset paths
                        this.load.image(idleKey, `./Assets/${idleKey}.png`);
                        this.load.image(angryKey, `./Assets/${angryKey}.png`);
                    }
                }
                // Preload non-enemy specific assets
                this.load.image('Key1', './Assets/Key1.png');
                this.load.image('Sword1', './Assets/Sword1.png');
                this.load.image('Helm1', './Assets/Helm1.png');
                this.load.image('Bag1', './Assets/Bag1.png');
                this.load.image('Bag2', './Assets/Bag2.png');
                this.load.image('Potion1(red)', './Assets/Potion1(red).png');
                // Preload shelf assets
                this.load.image('ShelfEmpty', './Assets/ShelfEmpty.png');
                this.load.image('ShelfRawRuby', './Assets/ShelfRawRuby.png');
                this.load.image('ShelfAmethyst', './Assets/ShelfAmethyst.png');
                this.load.image('ShelfBlueApatite', './Assets/ShelfBlueApatite.png');
                this.load.image('ShelfEmerald', './Assets/ShelfEmerald.png');
                this.load.image('Shelf2Potion', './Assets/Shelf2Potion.png');
                this.load.image('Shelf2Empty', './Assets/Shelf2Empty.png');
                this.load.image('RawRuby', './Assets/RawRuby.png');
                this.load.image('BlueApatite', './Assets/BlueApatite.png');
                this.load.image('Amethyst', './Assets/Amethyst.png');
                this.load.image('Emerald', './Assets/Emerald.png');
                // Preload perspective shelf assets
                this.load.image('ShelfEmptyLeft', './Assets/ShelfEmptyLeft.png');
                this.load.image('ShelfEmptyRight', './Assets/ShelfEmptyRight.png');
                this.load.image('ShelfRawRubyLeft', './Assets/ShelfRawRubyLeft.png');
                this.load.image('ShelfRawRubyRight', './Assets/ShelfRawRubyRight.png');
                this.load.image('ShelfAmethystLeft', './Assets/ShelfAmethystLeft.png');
                this.load.image('ShelfAmethystRight', './Assets/ShelfAmethystRight.png');
                this.load.image('ShelfBlueApatiteLeft', './Assets/ShelfBlueApatiteLeft.png');
                this.load.image('ShelfBlueApatiteRight', './Assets/ShelfBlueApatiteRight.png');
                this.load.image('ShelfEmeraldLeft', './Assets/ShelfEmeraldLeft.png');
                this.load.image('ShelfEmeraldRight', './Assets/ShelfEmeraldRight.png');
                this.load.image('Shelf2EmptyLeft', './Assets/Shelf2EmptyLeft.png');
                this.load.image('Shelf2EmptyRight', './Assets/Shelf2EmptyRight.png');
                this.load.image('Shelf2PotionLeft', './Assets/Shelf2PotionLeft.png');
                this.load.image('Shelf2PotionRight', './Assets/Shelf2PotionRight.png');
                // --- Preload the broken glass effect textures ---
                this.load.image('GlassBroke1', './Assets/GlassBroke1.png');
                this.load.image('GlassBroke2', './Assets/GlassBroke2.png');
                this.load.image('GlassBroke3', './Assets/GlassBroke3.png');
                this.load.image('GlassBroke4', './Assets/GlassBroke4.png');
                this.load.image('GlassBroke5', './Assets/GlassBroke5.png');
                this.add.text(gameConfig.width / 2, gameConfig.height / 2, 'Loading Dungeon...', {
                    fontSize: '32px',
                    fill: '#ffffff'
                }).setOrigin(0.5);
            }
        },
        {
            key: "create",
            value: function create() {
                console.log('[DEBUG] DungeonScene.create() called', arguments, this, typeof data !== 'undefined' ? data : '[data not defined]');
                if (this.serverDungeon) {
                    this.dungeon = this.serverDungeon;
                    // Sync DungeonService with server dungeon data
                    this.dungeonService.roomList = this.dungeon.rooms;
                    this.dungeonService.dungeonGrid = this.dungeon.grid;
                } else {
                    console.error('[ERROR] No serverDungeon provided to DungeonScene!');
                    return;
                }
                console.log('[DEBUG] Passed serverDungeon check');
                if (!this.dungeon || !this.dungeon.rooms || !Array.isArray(this.dungeon.rooms)) {
                    console.error('[ERROR] Invalid dungeon object in DungeonScene:', this.dungeon);
                    return;
                }
                console.log('[DEBUG] Passed dungeon validity check');
                if (!this.character || !this.character.stats) {
                    console.error('[ERROR] Character or character.stats is undefined in DungeonScene.create', this.character);
                    return;
                }
                console.log('[DEBUG] Passed character check');
                this.placePlayerRandomly();
                console.log('[DEBUG] Player placed in room:', this.playerPosition.roomId);
                this.debugHelper = new DebugHelper(this);

                // --- Player ID Generation ---
                this.playerId = "player-".concat(Phaser.Math.RND.uuid());
                console.log("[DungeonScene] Generated Player ID: ".concat(this.playerId));

                // --- Initialize Managers in Dependency Order ---
                this.itemManager = new ItemManager(this);
                // Use injected statBlock if available, else fallback
                var statBlock = this.statBlock || { vit: 20, str: 20, int: 20, dex: 20, mnd: 20, spd: 20 };
                this.combatVisuals = new CombatVisuals(this);
                this.npcLootManager = new NPCLootManager(this);

                // Replace PlayerStats with PlayerStatsProxy
                this.playerStats = new PlayerStatsProxy(socket, this.playerId);

                // Then managers that depend on itemManager and playerStats
                this.bagManager = new BagManager(this, this.playerStats, this.itemManager);
                
                // Then managers that depend on bagManager
                // this.spellManager = new SpellManager(this.bagManager, this.playerStats, this.combatVisuals);
                this.lootUIManager = new LootUIManager(this, this.npcLootManager, this.bagManager);

                // Finally, managers that depend on multiple other managers
                this.encounterManager = new EncounterManager(this, this.playerStats, this.playerId, this.combatVisuals);
                this.puzzleManager = new PuzzleManager(this);
                this.hintManager = new HintManager(this);
                this.shelfManager = new ShelfManager(this);

                this.debugHelper.setVisibility(false); // Start with debug off
                // Listen for keydown event globally
                if (this.input && this.input.keyboard) {
                    this.input.keyboard.on('keydown', function(event) {
                        // Check for Ctrl + Alt + D combination
                        if (event.ctrlKey && event.altKey && event.code === 'KeyD') {
                            _this.debugHelper.toggleVisibility();
                        }
                    });
                } else {
                    console.error('[ERROR] this.input or this.input.keyboard is undefined in DungeonScene.create');
                }
                this.setupUIEvents();
                this.displayCurrentRoom();
                console.log('[DEBUG] displayCurrentRoom() finished');
                this.encounterTimer = this.encounterInterval;
                this.bagManager.createToggleButton();
                // Create the player's health bar using initial values from PlayerStats AND the new playerId
                this.playerHealthBar = new HealthBar(this, 20, 20, this.character.stats.health, this.character.stats.health, this.playerId);
                // Listen for health changes from PlayerStats to update the HealthBar display
                console.log('[DEBUG] About to add healthChanged listener', this.playerStats, this.playerStats && this.playerStats.events);
                if (this.playerStats && this.playerStats.events) {
                    this.playerStats.events.on('healthChanged', (current, max) => {
                        console.log('[DEBUG] healthChanged event received', { current, max, playerHealthBar: this.playerHealthBar });
                        if (this.playerHealthBar) {
                            this.playerHealthBar.updateHealth(current);
                        } else {
                            console.warn('[WARN] healthChanged event fired but playerHealthBar is not initialized');
                        }
                    });
                } else {
                    console.error('[ERROR] playerStats or playerStats.events is undefined', this.playerStats);
                }
                // Listen for generic entity death (emitted by HealthBar - might move source later)
                console.log('[DEBUG] About to add entityDied listener', this.events);
                if (this.events && this.events.on) {
                    this.events.on('entityDied', this.handleEntityDeath, this);
                } else {
                    console.error('[ERROR] this.events or this.events.on is undefined', this.events);
                }
                // Listen for specific player-killed-by-NPC event (emitted by HealthBar)
                console.log('[DEBUG] About to add playerKilledByNPC listener', this.events);
                if (this.events && this.events.on) {
                    this.events.on('playerKilledByNPC', this.handlePlayerKilledByNPC, this);
                } else {
                    console.error('[ERROR] this.events or this.events.on is undefined', this.events);
                }
                // Listen for loot bag clicks (emitted by HealthBar)
                console.log('[DEBUG] About to add lootBagClicked listener', this.events);
                if (this.events && this.events.on) {
                    this.events.on('lootBagClicked', this.handleLootBagClick, this);
                } else {
                    console.error('[ERROR] this.events or this.events.on is undefined', this.events);
                }
                console.log('[DEBUG] About to add treasurePickupResult listener', this.events, typeof this.events, this.events && this.events.on);
                if (this.events && typeof this.events.on === 'function') {
                    this.events.on('treasurePickupResult', (result) => {
                        if (result.success) {
                            this.events.emit('showActionPrompt', `You picked up a treasure: ${result.item.name || result.item.itemKey}`);
                        } else {
                            this.events.emit('showActionPrompt', result.message || 'Treasure pickup failed.');
                        }
                    });
                } else {
                    console.error('[ERROR] this.events or this.events.on is undefined or not a function', this.events);
                }
                console.log('[DEBUG] About to add EVENTS.TREASURE_PICKED_UP listener', this.events, typeof this.events, this.events && this.events.on);
                if (this.events && typeof this.events.on === 'function') {
                    this.events.on(EVENTS.TREASURE_PICKED_UP, ({ roomId }) => {
                        if (this.playerPosition.roomId === roomId && this.treasureSprite) {
                            this.treasureSprite.destroy();
                            this.treasureSprite = null;
                        }
                        const room = this.dungeonService.getRoomById(roomId);
                        if (room) room.treasureLevel = null;
                    });
                } else {
                    console.error('[ERROR] this.events or this.events.on is undefined or not a function', this.events);
                }
                console.log('[DEBUG] About to add attackResult listener', this.socket, typeof this.socket, this.socket && this.socket.on);
                if (this.socket && typeof this.socket.on === 'function') {
                    this.socket.on('attackResult', (result) => {
                        this.events.emit('showActionPrompt', result.message);
                    });
                } else {
                    console.error('[ERROR] this.socket or this.socket.on is undefined or not a function', this.socket);
                }
                console.log('[DEBUG] About to add stealResult listener', this.socket, typeof this.socket, this.socket && this.socket.on);
                if (this.socket && typeof this.socket.on === 'function') {
                    this.socket.on('stealResult', (result) => {
                        this.events.emit('showActionPrompt', result.message);
                        if (result.success && result.item) {
                            if (result.initiatorId === this.playerId) {
                                this.playerStats.addItemToInventory(result.item);
                            }
                            if (result.targetId === this.playerId) {
                                this.playerStats.removeItemFromInventory(result.item);
                            }
                        }
                    });
                } else {
                    console.error('[ERROR] this.socket or this.socket.on is undefined or not a function', this.socket);
                }
            }
        },
        {
            key: "setupUIEvents",
            value: function setupUIEvents() {
                var _this = this;
                var _this1 = this;
                // Add isSubMenu parameter
                // Add keepTimer as the fourth parameter
                this.events.on('showActionMenu', function(actions, isPlayer) {
                    var isSubMenu = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false, keepTimer = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : false;
                    // Decide whether to keep the existing timer - based *only* on keepTimer flag
                    var keepExistingTimer = keepTimer && _this1.actionMenuTimer && _this1.actionMenuTimer.getRemaining() > 0;
                    // Decide whether to keep the existing timer and its graphics (Removed duplicate declaration)
                    var timerElementsToKeep = {}; // Store timer graphics if keeping
                    // Detach timer graphics BEFORE destroying the old container if keeping timer
                    if (keepExistingTimer && _this1.actionMenu) {
                        if (_this1.actionMenuTimerBg) {
                            timerElementsToKeep.bg = _this1.actionMenuTimerBg;
                            _this1.actionMenu.remove(_this1.actionMenuTimerBg, false);
                        } // Don't destroy child yet
                        if (_this1.actionMenuTimerBar) {
                            timerElementsToKeep.bar = _this1.actionMenuTimerBar;
                            _this1.actionMenu.remove(_this1.actionMenuTimerBar, false);
                        }
                        if (_this1.actionMenuTimerText) {
                            timerElementsToKeep.text = _this1.actionMenuTimerText;
                            _this1.actionMenu.remove(_this1.actionMenuTimerText, false);
                        }
                    }
                    // Always destroy the previous menu container (graphics were removed if needed)
                    if (_this1.actionMenu) {
                        _this1.actionMenu.destroy(); // Now safe to destroy container
                        _this1.actionMenu = null; // Clear reference
                    }
                    // Destroy the talk input field if it exists when redrawing menu
                    if (_this1.talkInputField) {
                        // Use the cleanup function to ensure listeners are removed too
                        _this1.removeTalkInputAndListeners();
                    }
                    // Destroy timer EVENT and graphics ONLY if we are NOT keeping them
                    if (!keepExistingTimer) {
                        if (_this1.actionMenuTimer) {
                            _this1.actionMenuTimer.remove(false); // Stop existing timer event
                            _this1.actionMenuTimer = null;
                        }
                        // Destroy any detached graphics if we explicitly decided not to keep the timer
                        if (_this1.actionMenuTimerBar) {
                            _this1.actionMenuTimerBar.destroy();
                            _this1.actionMenuTimerBar = null;
                        }
                        if (_this1.actionMenuTimerBg) {
                            _this1.actionMenuTimerBg.destroy();
                            _this1.actionMenuTimerBg = null;
                        }
                        if (_this1.actionMenuTimerText) {
                            _this1.actionMenuTimerText.destroy();
                            _this1.actionMenuTimerText = null;
                        }
                    }
                    // Position menu on the left side
                    var menuX = gameConfig.width * 0.15; // Position closer to the left edge
                    var menuY = gameConfig.height * 0.5; // Centered vertically
                    _this1.actionMenu = _this1.add.container(menuX, menuY).setDepth(70); // Depth 70
                    var buttonWidth = 200;
                    var buttonHeight = 40;
                    var buttonSpacing = 50;
                    // Add the new action buttons
                    actions.forEach(function(action, i) {
                        var buttonY = i * buttonSpacing;
                        // Check if action is disabled (for spells)
                        var isDisabled = action.disabled === true;
                        var buttonColor = isDisabled ? 0x555555 : 0x333333; // Darker gray for disabled buttons
                        var textColor = isDisabled ? '#999999' : '#ffffff'; // Light gray text for disabled buttons
                        var button = _this1.add.rectangle(0, buttonY, buttonWidth, buttonHeight, buttonColor).setStrokeStyle(2, isDisabled ? 0x777777 : 0xffffff) // Lighter stroke for disabled
                        .setInteractive({
                            useHandCursor: !isDisabled
                        }); // Only show hand cursor if not disabled
                        var text = _this1.add.text(0, buttonY, action.text, {
                            fontSize: '16px',
                            color: textColor
                        }).setOrigin(0.5);
                        // Add the callback - for disabled buttons, it will still show the gem requirements
                        button.on('pointerdown', action.callback);
                        // Only add hover effects for non-disabled buttons
                        if (!isDisabled) {
                            button.on('pointerover', function() {
                                return button.setFillStyle(0x555555);
                            });
                            button.on('pointerout', function() {
                                return button.setFillStyle(0x333333);
                            });
                        }
                        _this1.actionMenu.add([
                            button,
                            text
                        ]);
                    });
                    // Add Timer Bar (if it's the player's turn)
                    if (isPlayer) {
                        var timerY = actions.length * buttonSpacing; // Position below the new buttons
                        if (keepExistingTimer) {
                            // Re-add DETACHED timer elements to the new container at the correct position
                            if (timerElementsToKeep.bg) {
                                timerElementsToKeep.bg.y = timerY;
                                _this1.actionMenu.add(timerElementsToKeep.bg);
                                _this1.actionMenuTimerBg = timerElementsToKeep.bg; // Re-assign reference
                            }
                            if (timerElementsToKeep.bar) {
                                timerElementsToKeep.bar.y = timerY - buttonHeight / 2; // Adjust Y pos
                                _this1.actionMenu.add(timerElementsToKeep.bar);
                                _this1.actionMenuTimerBar = timerElementsToKeep.bar; // Re-assign reference
                            }
                            if (timerElementsToKeep.text) {
                                timerElementsToKeep.text.y = timerY;
                                _this1.actionMenu.add(timerElementsToKeep.text);
                                _this1.actionMenuTimerText = timerElementsToKeep.text; // Re-assign reference
                            }
                            console.log("[DEBUG] Kept existing timer graphics for sub-menu.");
                        } else {
                            // Create new timer elements because we are not keeping the old one
                            _this1.actionMenuTimerBg = _this1.add.rectangle(0, timerY, buttonWidth, buttonHeight, 0x333333).setStrokeStyle(2, 0xffffff);
                            _this1.actionMenuTimerBar = _this1.add.rectangle(-(buttonWidth / 2), timerY - buttonHeight / 2, 0, buttonHeight, 0x8B0000) // Dark Red fill, starts at 0 width
                            .setOrigin(0, 0); // Top-left origin for easy width scaling
                            _this1.actionMenuTimerText = _this1.add.text(0, timerY, 'Skip Turn (30s)', {
                                fontSize: '16px',
                                color: '#ffffff'
                            }).setOrigin(0.5);
                            _this1.actionMenu.add([
                                _this1.actionMenuTimerBg,
                                _this1.actionMenuTimerBar,
                                _this1.actionMenuTimerText
                            ]); // Add new elements
                            // Make the background interactive to skip turn
                            _this1.actionMenuTimerBg.setInteractive({
                                useHandCursor: true
                            }).on('pointerdown', function() {
                                _this1.actionMenuTimerBg.disableInteractive(); // Prevent spam clicks
                                _this1.stopActionMenuTimer();
                                // Destroy menu explicitly *before* ending turn to prevent potential conflicts
                                if (_this1.actionMenu) {
                                    _this1.actionMenu.destroy();
                                    _this1.actionMenu = null;
                                }
                                // Destroy talk input if skipping turn
                                if (_this1.talkInputField) {
                                    // Use the cleanup function when skipping turn
                                    _this1.removeTalkInputAndListeners();
                                }
                                // End the player's turn directly using the stored unique player ID
                                _this1.encounterManager.endTurn(_this1.playerId);
                            });
                            // Start the NEW timer event *only if we didn't keep the old one*
                            if (!_this1.actionMenuTimer) {
                                var timerDuration = 30000; // 30 seconds
                                _this1.actionMenuTimer = _this1.time.addEvent({
                                    delay: timerDuration,
                                    callback: function() {
                                        console.log("Action menu timer expired!");
                                        _this1.actionMenuTimer = null; // Clear timer event reference
                                        if (_this1.actionMenu) _this1.actionMenu.destroy(); // Ensure menu is destroyed
                                        _this1.actionMenu = null;
                                        // Cleanup talk input if timer expires
                                        if (_this1.talkInputField) {
                                            _this1.removeTalkInputAndListeners();
                                        }
                                        // Automatically end player's turn using the stored unique player ID
                                        _this1.encounterManager.endTurn(_this1.playerId);
                                    },
                                    callbackScope: _this1,
                                    loop: false
                                });
                                console.log("[DEBUG] Created new timer event for menu.");
                            } else {
                                console.log("[DEBUG] Reusing existing timer event for sub-menu.");
                            }
                        }
                    }
                });
                console.log("Action menu timer expired!");
                this.actionMenuTimer = null; // Clear timer event reference
                if (this.actionMenu) this.actionMenu.destroy(); // Ensure menu is destroyed
                this.actionMenu = null;
                // Removed redundant lines from previous edit block
                this.events.on('showTalkDialog', function(callback) {
                    if (_this.dialogBox) _this.dialogBox.destroy();
                    // Position dialog box on the left, below the action menu if possible
                    var dialogX = gameConfig.width * 0.15;
                    var dialogY = gameConfig.height * 0.75; // Lower down
                    _this.dialogBox = _this.add.container(dialogX, dialogY).setDepth(100);
                    var bg = _this.add.rectangle(0, 0, 300, 100, 0x333333).setStrokeStyle(2, 0xffffff);
                    var input = _this.add.text(0, -20, 'Type message...', {
                        fontSize: '16px',
                        color: '#ffffff'
                    }).setOrigin(0.5);
                    input.setInteractive().on('pointerdown', function() {
                        var message = prompt('Enter your message:');
                        if (message) callback(message);
                    });
                    var enter = _this.add.text(0, 20, 'Enter', {
                        fontSize: '16px',
                        color: '#ffffff'
                    }).setOrigin(0.5).setInteractive({
                        useHandCursor: true
                    }).on('pointerdown', function() {
                        var message = prompt('Enter your message:');
                        if (message) {
                            callback(message);
                            _this.dialogBox.destroy();
                        }
                    });
                    _this.dialogBox.add([
                        bg,
                        input,
                        enter
                    ]);
                });
                // --- New Listener for Talk Input Display ---
                this.events.on('displayTalkInput', function(initiatorId, targetId) {
                    if (_this.talkInputField) {
                        _this.talkInputField.destroy();
                        _this.removeTalkInputAndListeners(); // Use cleanup function
                    }
                    if (!_this.actionMenu) return; // Need the menu container
                    _this.currentTalkInput = ''; // Reset input string
                    // Find the 'Talk' button to position above it
                    var talkButtonY = 0;
                    var buttonHeight = 40; // Must match showActionMenu
                    var buttonSpacing = 50; // Must match showActionMenu
                    _this.actionMenu.list.forEach(function(item) {
                        if (item.type === 'Text' && item.text === 'Talk') {
                            talkButtonY = item.y;
                        }
                    });
                    // Placeholder text object, styled like buttons
                    var inputFieldY = talkButtonY - buttonSpacing; // Position above Talk button
                    // Initial state: Empty
                    _this.talkInputField = _this.add.text(0, inputFieldY, '', {
                        fontSize: '16px',
                        color: '#ffffff',
                        backgroundColor: '#111111',
                        fixedWidth: 200,
                        fixedHeight: buttonHeight,
                        align: 'center',
                        padding: {
                            y: (buttonHeight - 16) / 2
                        } // Vertically center text (approx)
                    }).setOrigin(0.5) // Center origin like buttons
                    .setDepth(70); // Depth 70 (same as action menu)
                    _this.actionMenu.add(_this.talkInputField); // Add to menu container
                    // --- Activate Keyboard Listeners ---
                    if (!_this.talkInputListenersActive) {
                        _this.input.keyboard.on('keydown', _this.handleTalkTyping, _this);
                        // Use specific keydown events for control keys
                        _this.input.keyboard.on('keydown-ENTER', _this.handleTalkSubmit, _this);
                        _this.input.keyboard.on('keydown-BACKSPACE', _this.handleTalkBackspace, _this);
                        _this.talkInputListenersActive = true;
                        console.log("[DEBUG] Talk input listeners ACTIVATED.");
                    }
                // REMOVED: Blinking cursor logic
                });
                // --- End New Listener ---
                this.events.on('showTalkMessage', function(message, callback) {
                    _this.events.emit('showActionPrompt', "".concat(message));
                    callback('');
                });
                this.events.on('showActionPrompt', function(message) {
                    // --- Cleanup Previous Prompt ---
                    if (_this.promptTimer) {
                        _this.promptTimer.remove(false); // Stop the old timer
                        _this.promptTimer = null; // Clear the reference to the old timer event
                    }
                    if (_this.promptText) {
                        _this.promptText.destroy(); // Destroy the old text object
                        _this.promptText = null; // Clear the reference to the old text object
                    }
                    // --- Create New Prompt ---
                    var newPromptTextObject = _this.add.text(gameConfig.width / 2, gameConfig.height * 0.85, message, {
                        fontSize: '24px',
                        color: '#ffffff',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: {
                            x: 15,
                            y: 10
                        },
                        align: 'center',
                        wordWrap: {
                            width: gameConfig.width * 0.8
                        } // Wrap text if too long
                    }).setOrigin(0.5).setDepth(110); // Centered origin, high depth
                    // Store reference to the *currently visible* prompt object
                    _this.promptText = newPromptTextObject;
                    // --- Set New Timer ---
                    // Create a timer event specifically for this new text object
                    var newTimerEvent = _this.time.delayedCall(5000, function() {
                        // This callback executes after 5 seconds *for newPromptTextObject*
                        // Check if the text object this timer belongs to still exists
                        // AND if it is still the *currently displayed* prompt text.
                        if (newPromptTextObject && newPromptTextObject.scene && _this.promptText === newPromptTextObject) {
                            // Only destroy if it hasn't been replaced by a newer prompt
                            newPromptTextObject.destroy();
                            _this.promptText = null; // Clear the main reference as it's now gone
                        }
                        // Check if the main timer reference still points to *this specific* finished timer event
                        if (_this.promptTimer === newTimerEvent) {
                            _this.promptTimer = null; // Clear the main timer reference as this timer is done
                        }
                    });
                    // Store reference to the *currently active* timer event
                    _this.promptTimer = newTimerEvent;
                });
                this.events.on('addToInventory', function(itemKey) {
                    // Request server to add item
                    _this.events.emit('requestAddItem', itemKey);
                });
                this.events.on('fleeToPreviousRoom', function(roomId) {
                    var room = _this.dungeonService.getRoomById(roomId);
                    if (room && _this.playerPosition.entryRoomId) {
                        _this.playerPosition.roomId = _this.playerPosition.entryRoomId;
                        _this.displayCurrentRoom();
                    }
                });
                this.events.on('endEncounter', function() {
                    // Ensure timer is stopped and menu destroyed on encounter end
                    _this.stopActionMenuTimer();
                    if (_this.actionMenu) {
                        _this.actionMenu.destroy();
                        _this.actionMenu = null;
                    }
                    _this.isInEncounter = false; // Reset state on encounter end
                    _this.bagManager.setBagButtonVisibility(true); // Show bag button when encounter ends
                    this.setupNavigationButtons(); // Restore nav buttons
                    if (_this.enemySprite) {
                        var _find;
                        // --- Remove sprite reference on destruction ---
                        var entityId = (_find = _to_consumable_array(_this.entitySprites.entries()).find(function(param) {
                            var _param = _sliced_to_array(param, 2), id = _param[0], sprite = _param[1];
                            return sprite === _this.enemySprite;
                        })) === null || _find === void 0 ? void 0 : _find[0];
                        if (entityId) {
                            _this.entitySprites.delete(entityId);
                            console.log("[DEBUG] Removed sprite reference for entityId: ".concat(entityId));
                        }
                        _this.enemySprite.destroy();
                        _this.enemySprite = null;
                    }
                    // Also destroy talk input on encounter end
                    if (_this.talkInputField) {
                        // Use cleanup function on encounter end
                        _this.removeTalkInputAndListeners();
                    }
                });
                // Listen for encounter start - now passes entity details
                this.events.on('encounterStarted', function(entityId, entityType) {
                    // State and nav buttons are now handled *before* this event fires in EncounterManager
                    // Automatically close the bag if it's open when an encounter starts
                    if (_this.bagManager.isOpen) {
                        _this.bagManager.toggleBag(); // Use toggle to ensure UI/state consistency
                        console.log("[DEBUG] Bag automatically closed due to encounter start.");
                    } else {
                        // Still hide button even if bag wasn't open
                        _this.bagManager.setBagButtonVisibility(false);
                    }
                    if (_this.enemySprite) _this.enemySprite.destroy();
                    // --- Use CharacterTypes definition to get the sprite key ---
                    var definition = getCharacterDefinition(entityType);
                    var spriteKey = definition ? _this.getEnemySpriteKey(entityType, 'idle') : null; // Get idle key using the refactored function
                    if (spriteKey && _this.textures.exists(spriteKey)) {
                        _this.enemySprite = _this.add.sprite(gameConfig.width / 2, gameConfig.height / 2, spriteKey).setDepth(60); // Depth 60
                        // --- Apply scaling and positioning for specific types ---
                        // Note: We still check entityType directly here, as scaling/positioning is view logic,
                        // not strictly part of the base character definition itself.
                        if (entityType === 'bat') {
                            _this.enemySprite.setScale(0.25);
                            console.log("[DEBUG] Encounter started: Displaying scaled (0.25) ".concat(spriteKey, " for ").concat(entityType));
                        } else if (entityType === 'gnome') {
                            _this.enemySprite.setScale(0.25);
                            _this.enemySprite.setPosition(gameConfig.width / 2, gameConfig.height * 0.9); // Position gnome at bottom-center
                            console.log("[DEBUG] Encounter started: Displaying scaled (0.25) and repositioned ".concat(spriteKey, " for ").concat(entityType));
                        } else {
                            console.log("[DEBUG] Encounter started: Displaying ".concat(spriteKey, " for ").concat(entityType));
                        }
                        // --- Store the sprite reference ---
                        if (_this.enemySprite) {
                            // Use the entityId passed into the 'encounterStarted' event
                            _this.entitySprites.set(entityId, _this.enemySprite);
                            console.log("[DEBUG] Stored sprite reference for entityId: ".concat(entityId));
                        }
                    } else {
                        console.error("[DEBUG] Enemy sprite key ".concat(spriteKey, " not found!"));
                        _this.enemySprite = null;
                    }
                });
                // Listen for mood changes
                this.events.on('enemyMoodChanged', function(entityId, mood) {
                    if (_this.enemySprite && _this.encounterManager.entities.has(entityId)) {
                        var entity = _this.encounterManager.entities.get(entityId);
                        var newKey = _this.getEnemySpriteKey(entity.type, mood);
                        if (_this.textures.exists(newKey) && _this.enemySprite.texture.key !== newKey) {
                            _this.enemySprite.setTexture(newKey);
                            // --- Re-apply scaling and positioning if necessary after texture change ---
                            if (entity.type === 'bat') {
                                _this.enemySprite.setScale(0.25);
                                _this.enemySprite.setPosition(gameConfig.width / 2, gameConfig.height / 2); // Bat remains centered
                                console.log("[DEBUG] Mood changed: Swapped scaled (0.25) bat sprite to ".concat(newKey));
                            } else if (entity.type === 'gnome') {
                                _this.enemySprite.setScale(0.25);
                                _this.enemySprite.setPosition(gameConfig.width / 2, gameConfig.height * 0.9); // Gnome stays at bottom-center
                                console.log("[DEBUG] Mood changed: Swapped scaled (0.25) and repositioned gnome sprite to ".concat(newKey));
                            } else {
                                _this.enemySprite.setScale(1);
                                _this.enemySprite.setPosition(gameConfig.width / 2, gameConfig.height / 2); // Reset position for others
                                console.log("[DEBUG] Mood changed: Swapped sprite to ".concat(newKey));
                            }
                        } else if (!_this.textures.exists(newKey)) {
                            console.error("[DEBUG] Mood changed: Sprite key ".concat(newKey, " not found!"));
                        }
                    }
                });
                this.events.on('rearrangeWarning', function() {
                    _this.isRearranging = true;
                    var warning = _this.scene.add.text(gameConfig.width / 2, gameConfig.height / 2, 'You hear rumbling in the distance', {
                        fontSize: '24px',
                        color: '#ffffff',
                        backgroundColor: '#333333',
                        padding: {
                            x: 20,
                            y: 10
                        }
                    }).setOrigin(0.5).setDepth(999); // Depth 999
                    _this.scene.time.delayedCall(2000, function() {
                        warning.destroy();
                        _this.isRearranging = false;
                    });
                });
            }
        },
        {
            key: "update",
            value: function update(time, delta) {
                console.log('[DEBUG] DungeonScene.update() called', { time, delta });
                // Update Action Menu Timer Bar
                if (this.actionMenuTimer && this.actionMenuTimerBar && this.actionMenu) {
                    var elapsed = this.actionMenuTimer.getElapsed();
                    var duration = this.actionMenuTimer.delay;
                    var progress = Math.min(1, elapsed / duration);
                    var maxWidth = 200; // Should match buttonWidth in setupUIEvents
                    this.actionMenuTimerBar.width = maxWidth * progress;
                }
                // --- Dynamic Encounter Timer ---
                if (!this.isInEncounter && !this.isRearranging) {
                    this.encounterTimer -= delta;
                    if (this.encounterTimer <= 0) {
                        this.encounterTimer = this.encounterInterval; // Reset timer
                        var room = this.dungeonService.getRoomById(this.playerPosition.roomId);
                        console.log("[DEBUG] Dynamic encounter timer check in room ".concat(room.id, ". Calling initializeEncounter..."));
                        // Let EncounterManager handle the chance check *and* cooldowns
                        this.encounterManager.initializeEncounter(room, 'dynamic');
                    }
                }
                // --- Debug Update ---
                if (this.debugHelper && this.debugHelper.visible) {
                    var _this_currentRoomSprite, _this_currentRoomSprite1;
                    var room1 = this.dungeonService.getRoomById(this.playerPosition.roomId);
                    this.debugHelper.updateDebugText({
                        x: room1.x,
                        y: room1.y
                    }, room1, this.playerPosition.facing, this.roomManager.getDoorsFromAssetKey(((_this_currentRoomSprite = this.currentRoomSprite) === null || _this_currentRoomSprite === void 0 ? void 0 : _this_currentRoomSprite.texture.key) || 'none').join(',') || 'none', ((_this_currentRoomSprite1 = this.currentRoomSprite) === null || _this_currentRoomSprite1 === void 0 ? void 0 : _this_currentRoomSprite1.texture.key) || 'none');
                    this.debugHelper.updateMinimap(this.dungeon.grid, {
                        x: Math.floor(room1.x),
                        y: Math.floor(room1.y),
                        facing: this.playerPosition.facing
                    });
                }
            }
        },
        {
            key: "placePlayerRandomly",
            value: function placePlayerRandomly() {
                console.log('[DEBUG] DungeonScene.placePlayerRandomly() called');
                var validRooms = this.dungeon.rooms.filter(function(r) {
                    return r.doors.length >= 1 && !r.isDeadEnd;
                });
                var room = validRooms[Math.floor(Math.random() * validRooms.length)] || this.dungeon.rooms[0];
                this.playerPosition.roomId = room.id;
                this.playerPosition.facing = 'north';
                this.playerPosition.entryRoomId = room.doors[0] || null;
            }
        },
        {
            key: "displayCurrentRoom",
            value: function displayCurrentRoom() {
                console.log('[DEBUG] displayCurrentRoom() start');
                if (this.currentRoomSprite) this.currentRoomSprite.destroy();
                console.log('[DEBUG] currentRoomSprite destroyed');
                if (this.actionMenu) this.actionMenu.destroy();
                console.log('[DEBUG] actionMenu destroyed');
                if (this.dialogBox) this.dialogBox.destroy();
                console.log('[DEBUG] dialogBox destroyed');
                if (this.promptText) this.promptText.destroy();
                console.log('[DEBUG] promptText destroyed');
                if (this.talkInputField) {
                    this.removeTalkInputAndListeners();
                    console.log('[DEBUG] talkInputField destroyed');
                }
                this.puzzleManager.clearPuzzles();
                console.log('[DEBUG] puzzleManager.clearPuzzles() called');
                this.hintManager.clearHints();
                console.log('[DEBUG] hintManager.clearHints() called');
                this.shelfManager.clearShelves();
                console.log('[DEBUG] shelfManager.clearShelves() called');
                if (this.bagManager.isOpen) this.bagManager.closeBagUI();
                console.log('[DEBUG] bagManager.closeBagUI() called if open');
                this.bagManager.updateBagVisibility(this.playerPosition.roomId, this.playerPosition.facing);
                console.log('[DEBUG] bagManager.updateBagVisibility() called');
                var room = this.dungeonService.getRoomById(this.playerPosition.roomId);
                console.log('[DEBUG] got room:', room);
                var imageKey = this.roomManager.getRoomImageKey(room, this.playerPosition.facing, this.dungeonService);
                console.log('[DEBUG] got imageKey:', imageKey);
                var assetKey = this.roomManager.findBestMatchingRoomAsset(imageKey);
                console.log('[DEBUG] got assetKey:', assetKey);
                if (!this.textures.exists(assetKey)) {
                    console.log('[DEBUG] Texture missing, using "none"');
                    assetKey = 'none';
                }
                this.currentRoomSprite = this.add.image(gameConfig.width / 2, gameConfig.height / 2, assetKey);
                console.log('[DEBUG] currentRoomSprite added');
                var visibleDoors = this.roomManager.getVisibleDoors(room, this.playerPosition.facing, this.dungeonService);
                console.log('[DEBUG] got visibleDoors:', visibleDoors);
                this.setupDoorInteractions(visibleDoors);
                console.log('[DEBUG] setupDoorInteractions() called');
                this.setupNavigationButtons();
                console.log('[DEBUG] setupNavigationButtons() called');
                this.puzzleManager.initializePuzzles(room);
                console.log('[DEBUG] puzzleManager.initializePuzzles() called');
                this.hintManager.initializeHints(room);
                console.log('[DEBUG] hintManager.initializeHints() called');
                this.shelfManager.initializeShelves(room);
                console.log('[DEBUG] shelfManager.initializeShelves() called');
                if (room.treasureLevel && !this.treasureSprite) {
                    const treasureKey = room.treasureLevel === 'sword1' ? 'Sword1' : room.treasureLevel === 'helm1' ? 'Helm1' : room.treasureLevel === 'Potion1(red)' ? 'Potion1(red)' : null;
                    if (treasureKey && this.textures.exists(treasureKey)) {
                        this.treasureSprite = this.add.sprite(gameConfig.width / 2, gameConfig.height * 0.7, treasureKey)
                            .setInteractive({ useHandCursor: true })
                            .setDepth(40)
                            .setScale(0.2);
                        this.treasureSprite.on('pointerdown', () => {
                            if (this.isInEncounter) {
                                this.events.emit('showActionPrompt', 'Cannot loot items during combat!');
                                return;
                            }
                            this.events.emit('requestTreasurePickup', { roomId: room.id });
                        });
                        console.log('[DEBUG] treasureSprite added');
                    }
                }
                if (!room.treasureLevel && this.treasureSprite) {
                    this.treasureSprite.destroy();
                    this.treasureSprite = null;
                    console.log('[DEBUG] treasureSprite destroyed');
                }
                console.log('[DEBUG] Room rendered');
            }
        },
        {
            key: "setupDoorInteractions",
            value: function setupDoorInteractions(doors) {
                var _this = this;
                // Clear existing door zones
                if (this.doorZones) {
                    this.doorZones.forEach(function(interactiveShape) {
                        return interactiveShape.destroy();
                    });
                }
                this.doorZones = [];
                console.log("[DEBUG] Setting up interactive zones for: ".concat(doors.join(',') || 'none'));
                var width = gameConfig.width;
                var height = gameConfig.height;
                // Determine visibility based on debug mode once
                var fillAlpha = this.debugHelper.visible ? 0.2 : 0;
                var strokeAlpha = this.debugHelper.visible ? 0.5 : 0;
                // Loop through the provided doors array
                doors.forEach(function(direction) {
                    var config = DOOR_CONFIGS[direction];
                    if (!config) {
                        console.warn("[WARN] No config found for door direction: ".concat(direction));
                        return; // Skip if config is missing for this direction
                    }
                    // Create the interactive rectangle using the configuration
                    var doorRect = _this.add.rectangle(width * config.xFactor, height * config.yFactor, width * config.wFactor, height * config.hFactor).setStrokeStyle(1, 0x0000ff, strokeAlpha) // Apply consistent stroke
                    .setFillStyle(0x0000ff, fillAlpha) // Apply consistent fill
                    .setInteractive({
                        useHandCursor: true
                    }).setDepth(20); // Depth 20
                    doorRect.name = direction; // Set name for debugging/identification
                    doorRect.on('pointerdown', function() {
                        return _this.handleDoorClick(direction);
                    }); // Assign click handler
                    _this.doorZones.push(doorRect); // Add to the list
                });
            }
        },
        {
            key: "setupNavigationButtons",
            value: function setupNavigationButtons() {
                var _this = this;
                if (this.navButtons) this.navButtons.destroy();
                // Only show nav buttons if not in encounter AND bag is closed AND loot UI is closed
                if (!this.isInEncounter && !this.bagManager.isOpen && !this.lootUIManager.isOpen) {
                    this.navButtons = this.add.container(gameConfig.width / 2, gameConfig.height - 50).setDepth(70); // Depth 70
                    var buttons = [
                        {
                            text: 'Turn Left',
                            callback: function() {
                                return _this.handleTurn('left');
                            },
                            x: -200
                        },
                        {
                            text: 'Turn Around',
                            callback: function() {
                                return _this.handleTurn('around');
                            },
                            x: 0
                        },
                        {
                            text: 'Turn Right',
                            callback: function() {
                                return _this.handleTurn('right');
                            },
                            x: 200
                        }
                    ];
                    buttons.forEach(function(button) {
                        var bg = _this.add.rectangle(button.x, 0, 150, 50, 0x333333).setStrokeStyle(2, 0xffffff).setInteractive({
                            useHandCursor: true
                        });
                        var text = _this.add.text(button.x, 0, button.text, {
                            fontSize: '20px',
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        bg.on('pointerdown', button.callback);
                        bg.on('pointerover', function() {
                            return bg.setFillStyle(0x555555);
                        });
                        bg.on('pointerout', function() {
                            return bg.setFillStyle(0x333333);
                        });
                        _this.navButtons.add([
                            bg,
                            text
                        ]);
                    });
                } else {
                    this.navButtons = null; // Ensure reference is cleared
                }
            }
        },
        {
            key: "handleDoorClick",
            value: function handleDoorClick(direction) {
                if (this.isRearranging || this.isInEncounter || this.bagManager.isOpen || this.lootUIManager.isOpen) return;
                // Request server to move to new room
                this.events.emit('requestRoomEnter', {
                    currentRoomId: this.playerPosition.roomId,
                    direction: direction,
                    facing: this.playerPosition.facing
                    });
            }
        },
        {
            key: "handleTurn",
            value: function handleTurn(rotation) {
                if (this.isRearranging || this.isInEncounter || this.bagManager.isOpen || this.lootUIManager.isOpen) return;
                this.events.emit('requestTurn', {
                    currentRoomId: this.playerPosition.roomId,
                    rotation: rotation,
                    facing: this.playerPosition.facing
                });
            }
        },
        {
            key: "updatePlayerCount",
            value: function updatePlayerCount(newCount) {
                if (newCount !== this.playerCount && this.dungeonService.rearrangeDungeon(newCount)) {
                    this.events.emit('rearrangeWarning');
                    this.dungeon = this.dungeonService.generateDungeon(newCount);
                    this.displayCurrentRoom();
                }
            }
        },
        {
            // Update door zone visibility based on debug mode AND bag state
            key: "updateDoorZoneVisibility",
            value: function updateDoorZoneVisibility(isVisible) {
                if (!this.doorZones) return;
                // Only show if isVisible (debug mode is on) AND bag is closed AND loot UI is closed
                var showZones = isVisible && !this.bagManager.isOpen && !this.lootUIManager.isOpen;
                var fillAlpha = showZones ? 0.2 : 0;
                var strokeAlpha = showZones ? 0.5 : 0;
                this.doorZones.forEach(function(zone) {
                    zone.setFillStyle(0x0000ff, fillAlpha);
                    zone.setStrokeStyle(1, 0x0000ff, strokeAlpha);
                });
            }
        },
        {
            // Method to specifically enable/disable door interactivity based on bag state
            key: "setDoorInteractivity",
            value: function setDoorInteractivity(isInteractive) {
                if (!this.doorZones) return;
                // Ensure interactivity is false if bag or loot UI is open
                var allowInteraction = isInteractive && !this.bagManager.isOpen && !this.lootUIManager.isOpen;
                this.doorZones.forEach(function(zone) {
                    zone.input.enabled = allowInteraction;
                    // Optionally change cursor style too
                    zone.input.cursor = allowInteraction ? 'pointer' : 'default';
                });
            }
        },
        {
            key: "getEnemySpriteKey",
            value: function getEnemySpriteKey(type) {
                var mood = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'idle';
                var definition = getCharacterDefinition(type);
                if (!definition || !definition.assetPrefix) {
                    console.warn("[WARN] getEnemySpriteKey: No definition or assetPrefix for type: ".concat(type, ". Falling back."));
                    // Fallback logic if definition or prefix is missing
                    return mood === 'angry' ? 'elvaan2' : 'elvaan1';
                }
                var prefix = definition.assetPrefix;
                var key = mood === 'angry' ? "".concat(prefix, "2") : "".concat(prefix, "1");
                // Check if the specific mood texture exists, otherwise fallback to idle
                if (this.textures.exists(key)) {
                    return key;
                } else if (mood !== 'idle' && this.textures.exists("".concat(prefix, "1"))) {
                    console.log("[INFO] getEnemySpriteKey: Texture for ".concat(key, " not found, falling back to idle ").concat(prefix, "1."));
                    return "".concat(prefix, "1"); // Fallback to idle state if mood state is missing
                } else {
                    console.warn("[WARN] getEnemySpriteKey: Neither ".concat(key, " nor idle ").concat(prefix, "1 found for type ").concat(type, ". Falling back to elvaan1."));
                    return 'elvaan1'; // Final fallback
                }
            }
        },
        {
            key: "stopActionMenuTimer",
            value: function stopActionMenuTimer() {
                if (this.actionMenuTimer) {
                    console.log("Stopping action menu timer.");
                    this.actionMenuTimer.remove(false);
                    this.actionMenuTimer = null;
                }
            // Don't destroy the bar here, menu closure or skip button handler handles it.
            }
        },
        {
            // --- Talk Input Handlers ---
            key: "handleTalkTyping",
            value: function handleTalkTyping(event) {
                if (!this.talkInputField || !this.talkInputListenersActive) return;
                var key = event.key;
                // Allow letters, numbers, spaces, and common punctuation
                if (/^[a-zA-Z0-9 !?,.'"]$/.test(key)) {
                    // REMOVED: Cursor handling
                    // Add new character
                    this.currentTalkInput += key;
                    // Update text field directly
                    this.talkInputField.text = this.currentTalkInput;
                    // Prevent spacebar from scrolling page (if applicable in Phaser context)
                    if (key === ' ') {
                        event.preventDefault();
                    }
                }
            }
        },
        {
            key: "handleTalkBackspace",
            value: function handleTalkBackspace(event) {
                if (!this.talkInputField || !this.talkInputListenersActive) return;
                // REMOVED: Cursor handling
                if (this.currentTalkInput.length > 0) {
                    this.currentTalkInput = this.currentTalkInput.slice(0, -1);
                    // Update text field directly
                    this.talkInputField.text = this.currentTalkInput;
                } else {
                    // Keep field empty if backspacing on empty string
                    this.talkInputField.text = '';
                }
                event.preventDefault(); // Prevent browser back navigation
            }
        },
        {
            key: "handleTalkSubmit",
            value: function handleTalkSubmit(event) {
                if (!this.talkInputField || !this.talkInputListenersActive) return;
                event.preventDefault(); // Prevent default Enter behavior
                var message = this.currentTalkInput.trim();
                console.log('[DEBUG] Talk Submit: "'.concat(message, '"'));
                // Call EncounterManager to handle the submission (create this next)
                this.encounterManager.submitTalk(message);
                // Cleanup input field and listeners immediately after submit
                this.removeTalkInputAndListeners();
                // Also destroy the main action menu container
                if (this.actionMenu) {
                    console.log("[DEBUG] Destroying action menu after talk submit.");
                    this.actionMenu.destroy();
                    this.actionMenu = null;
                }
            }
        },
        {
            key: "removeTalkInputAndListeners",
            value: function removeTalkInputAndListeners() {
                console.log("[DEBUG] Removing talk input field and listeners.");
                if (this.talkInputListenersActive) {
                    this.input.keyboard.off('keydown', this.handleTalkTyping, this);
                    this.input.keyboard.off('keydown-ENTER', this.handleTalkSubmit, this);
                    this.input.keyboard.off('keydown-BACKSPACE', this.handleTalkBackspace, this);
                    this.talkInputListenersActive = false;
                    console.log("[DEBUG] Talk input listeners DEACTIVATED.");
                }
                if (this.talkInputField) {
                    this.talkInputField.destroy();
                    this.talkInputField = null;
                }
                this.currentTalkInput = ''; // Reset input string
            }
        },
        {
            // --- End Talk Input Handlers ---
            key: "handleEntityDeath",
            value: function handleEntityDeath(data) {
                var entityId = data.entityId;
                // Check against the stored unique player ID
                if (entityId === this.playerId) {
                    // Player death handling
                    console.log("[DEBUG DungeonScene] Received 'entityDied' event for player (".concat(this.playerId, "). Handling inventory drop."));
                    // 1. Clear inventory and get items
                    var droppedItems = this.bagManager.clearInventory();
                    // 2. Check if there were items to drop
                    if (droppedItems.length > 0) {
                        // 3. Get current room ID and calculate opposite facing direction
                        var currentRoomId = this.playerPosition.roomId;
                        var playerFacing = this.playerPosition.facing;
                        // ---MODIFIED: Get killer's facing direction---
                        var killerFacingDirection = 'north'; // Default if killer unknown/not facing
                        var attackerId = data.attackerId;
                        if (attackerId && this.encounterManager && this.encounterManager.entities.has(attackerId)) {
                            var killerEntity = this.encounterManager.entities.get(attackerId);
                            killerFacingDirection = killerEntity.facing || 'north'; // Use killer's facing if available
                        }
                        // 4. Delegate creation and tracking to BagManager
                        this.bagManager.createPlayerDroppedBag(currentRoomId, droppedItems, killerFacingDirection);
                        console.log("[DEBUG DungeonScene] Called BagManager to create player bag in room ".concat(currentRoomId, ", using killer's facing: ").concat(killerFacingDirection));
                    } else {
                        console.log("[DEBUG DungeonScene] Player inventory was empty. No bag dropped.");
                    }
                    // 7. Ensure encounter state is cleaned up (if player died mid-encounter)
                    if (this.isInEncounter) {
                        this.events.emit('endEncounter');
                    }
                // Visuals/Input lock are handled in HealthBar.handleDeath
                } else {
                    // Handle NPC death: Call BagManager to create the loot bag
                    console.log("[DEBUG DungeonScene] Received 'entityDied' event for NPC: ".concat(entityId, ". Triggering NPC bag drop."));
                    // Pass the deceased entity ID, the current room ID, and the player's facing direction
                    var currentRoomId1 = this.playerPosition.roomId; // Get the room ID where the death occurred
                    var currentFacing = this.playerPosition.facing; // Get the direction player is facing
                    this.bagManager.createBagForNPC(entityId, currentRoomId1, data.attackerId, currentFacing);
                // DO NOT update visibility immediately. Let it stay centered until next room/turn update.
                // this.bagManager.updateBagVisibility(currentRoomId, currentFacing); // REMOVED
                // EncounterManager handles removing the NPC entity/sprite elsewhere
                }
            }
        },
        {
            key: "handlePlayerKilledByNPC",
            value: function handlePlayerKilledByNPC(data) {
                var npcId = data.npcId;
                console.log("[DEBUG DungeonScene] Handling player death by NPC (".concat(npcId, "). Instructing EncounterManager to remove NPC."));
                // Ensure encounter manager exists and the NPC ID is valid before trying to end
                if (this.encounterManager && npcId) {
                    // The 'true' flag indicates the NPC was defeated/removed
                    this.encounterManager.endEncounter(npcId, true);
                } else {
                    console.warn("[WARN] Could not remove NPC ".concat(npcId, ". EncounterManager or npcId invalid."));
                }
            // Note: Visuals/Input lock for player death are handled in HealthBar.handleDeath
            }
        },
        {
            // --- Loot Bag Click Handler ---
            key: "handleLootBagClick",
            value: function handleLootBagClick(deceasedId, bagSprite) {
                if (!this.isInEncounter && !this.bagManager.isOpen && !this.lootUIManager.isOpen) {
                    // Open the loot UI via the manager
                    this.lootUIManager.openLootUI(deceasedId, bagSprite);
                } else if (this.isInEncounter) {
                    this.events.emit('showActionPrompt', 'Cannot loot during encounter!');
                // Do not destroy the bag sprite here, let the player try again later
                } else if (this.bagManager.isOpen) {
                    this.events.emit('showActionPrompt', 'Close inventory before looting!');
                // Do not destroy bag sprite
                } else if (this.lootUIManager.isOpen) {
                    // This case should ideally not happen if openLootUI prevents double-opening
                    console.warn("[WARN] Loot bag clicked while loot UI is already open.");
                    this.lootUIManager.closeLootUI(); // Close the existing one maybe?
                }
            }
        },
        {
            /**
     * Retrieves the Phaser Sprite associated with a given entity ID.
     * @param {string} entityId The unique ID of the entity.
     * @returns {Phaser.GameObjects.Sprite | null} The sprite object or null if not found.
     */ key: "getSpriteForEntity",
            value: function getSpriteForEntity(entityId) {
                var sprite = this.entitySprites.get(entityId);
                if (!sprite) {
                    console.warn("[DungeonScene] getSpriteForEntity: Sprite not found for entityId: ".concat(entityId));
                }
                // Also include player sprite if needed in the future
                // if (entityId === this.playerId && this.playerSprite) { return this.playerSprite; }
                return sprite || null;
            }
        }
    ]);
    return DungeonScene;
}(Phaser.Scene);
