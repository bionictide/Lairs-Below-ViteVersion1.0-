import { getHealthFromVIT, getPhysicalAttackFromSTR, getDefenseFromVIT } from './StatDefinitions.js';

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
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
}
function _to_consumable_array(arr) {
    return _array_without_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_spread();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
import Phaser from 'https://esm.sh/phaser@3.60.0';
import { itemData } from './BagManager.js'; // Import itemData directly
import { getCharacterDefinition } from './CharacterTypes.js'; // Import the helper function
// Helper function for weighted random selection
function weightedRandom(items) {
    var totalWeight = items.reduce(function(sum, item) {
        return sum + item.weight;
    }, 0);
    var random = Math.random() * totalWeight;
    var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
    try {
        for(var _iterator = items[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
            var item = _step.value;
            if (random < item.weight) {
                return item.type;
            }
            random -= item.weight;
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally{
        try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
                _iterator.return();
            }
        } finally{
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
    // Fallback (shouldn't happen if totalWeight > 0)
    return items.length > 0 ? items[0].type : null;
}
export var EncounterManager = /*#__PURE__*/ function() {
    "use strict";
    function EncounterManager(scene, playerStats, playerId, combatVisuals) {
        _class_call_check(this, EncounterManager);
        this.scene = scene;
        this.playerStats = playerStats; // Store the PlayerStats instance
        this.playerId = playerId; // Store the unique player ID
        this.combatVisuals = combatVisuals; // Store the CombatVisuals instance
        this.dungeonService = scene.dungeonService; // Inject DungeonService
        this.entities = new Map(); // id: { type, health, roomId }
        this.turnQueue = [];
        this.currentTurn = null;
        this.pendingTalks = new Map(); // initiatorId: { targetId, message }
        // REMOVED: this.entityDisplayNames map. Will use getCharacterDefinition(type).name
        this.lastEncounterTime = {}; // Stores timestamp of last DEFEAT for each type
        this.lastFleeTime = {}; // Stores timestamp of last FLEE for each type
        this.defeatCooldowns = {
            elvaan: 120000,
            dwarf: 180000,
            gnome: 60000,
            bat: 30000 // 30 seconds
        };
        this.FLEE_COOLDOWN = 30000; // 30 seconds cooldown for *any* type after fleeing from it
        this.WAITING_DURATION = 30000; // 30 seconds enemy waits in room after player flees
        this.encounterWeights = {
            bat: 40,
            gnome: 30,
            elvaan: 20,
            dwarf: 10
        };
        this.ROOM_COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes
        this.waitingTimers = new Map(); // entityId -> TimerEvent
        // Add at EncounterManager initialization
        this.socket = scene.socket; // Assume socket is passed or available on scene
        this.socket.on('attack_result', (data) => {
          // Show prompt, play visuals, update UI
          this.scene.events.emit('showActionPrompt', data.prompt);
          if (data.targetId === this.playerId && data.damage > 0 && this.combatVisuals) {
            this.combatVisuals.playPlayerDamageEffect();
          } else if (data.damage > 0 && this.combatVisuals) {
            this.combatVisuals.playEnemyDamageEffect(data.targetId);
          }
        });
        this.socket.on('health_update', ({ playerId, health, maxHealth }) => {
          if (playerId === this.playerId) {
            this.playerStats._currentHealth = health;
            this.playerStats._maxHealth = maxHealth;
            this.scene.events.emit('healthChanged', health, maxHealth);
          }
          // TODO: Update health for other entities if needed
        });
        this.socket.on('entity_died', ({ entityId, attackerId }) => {
          this.scene.events.emit('entityDied', { entityId, attackerId });
          // TODO: End encounter, handle loot, etc.
        });
        this.socket.on('steal_result', (data) => {
          // Show prompt and update UI
          this.scene.events.emit('showActionPrompt', data.prompt);
          // Optionally update inventories if needed
          if (data.initiatorId === this.playerId || data.targetId === this.playerId) {
            if (this.scene.bagManager) {
              this.scene.bagManager.setInventory(data.inventory);
            }
          }
        });
    }
    _create_class(EncounterManager, [
        {
            // Added triggerType ('dynamic' or 'playerEntry')
            key: "initializeEncounter",
            value: function initializeEncounter(room) {
                var _this = this;
                var triggerType = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'playerEntry';
                var _definition_baseStats;
                var enemyStartsFirst = false; // Default to player starting
                // 0. Check Room Cooldown
                if (room.lastEncounterEndTime && Date.now() - room.lastEncounterEndTime < this.ROOM_COOLDOWN_DURATION) {
                    console.log("[DEBUG] Encounter check: Room ".concat(room.id, " is on cooldown. Skipping."));
                    return;
                }
                // 1. Check if an entity already exists in this room
                var existingEntity = Array.from(this.entities.values()).find(function(entity) {
                    return entity.roomId === room.id;
                });
                if (existingEntity) {
                    console.log("[DEBUG] Encounter check: Entity already exists in room ".concat(room.id, "."));
                    // Determine who starts based on re-entry
                    enemyStartsFirst = true; // Enemy always starts first on re-entry
                    console.log("[DEBUG] Setting enemyStartsFirst = true (re-entry)");
                    // If an entity exists, ensure the scene knows we are in an encounter (e.g., after fleeing and returning)
                    // Find the entityId associated with this existing entity
                    var entityEntry = Array.from(this.entities.entries()).find(function(entry) {
                        return entry[1].roomId === room.id;
                    });
                    if (entityEntry && !this.scene.isInEncounter) {
                        var entityId = entityEntry[0];
                        var entity = entityEntry[1];
                        console.log("[DEBUG] Re-entering room with existing entity: ".concat(entityId, " (").concat(entity.type, ")"));
                        // --- Check and Cancel Waiting Timer ---
                        if (this.waitingTimers.has(entityId)) {
                            var timer = this.waitingTimers.get(entityId);
                            timer.remove(false); // Cancel the timer
                            this.waitingTimers.delete(entityId); // Remove from map
                            console.log("[DEBUG] Flee waiting timer cancelled for entity ".concat(entityId, " upon re-entry."));
                        }
                        // --- End Timer Cancellation ---
                        // Pass the calculated enemyStartsFirst flag
                        this.startTurnBasedEncounter(entityId, room.id, enemyStartsFirst);
                    }
                    return; // Don't create a new one
                }
                // 2. Roll for a new encounter (only if no existing entity)
                if (Math.random() > room.encounterChance) {
                    console.log("[DEBUG] Encounter check: Roll failed for room ".concat(room.id, " (Chance: ").concat(room.encounterChance, ")"));
                    return; // Roll failed
                }
                // Determine who starts based on trigger type for NEW encounters
                if (triggerType === 'dynamic') {
                    enemyStartsFirst = true;
                    console.log("[DEBUG] Setting enemyStartsFirst = true (dynamic trigger)");
                } else {
                    enemyStartsFirst = false;
                    console.log("[DEBUG] Setting enemyStartsFirst = false (playerEntry trigger)");
                }
                // 3. Determine available encounter types based on cooldowns
                var possibleTypes = [
                    'elvaan',
                    'dwarf',
                    'gnome',
                    'bat'
                ];
                var now = Date.now();
                var availableTypes = possibleTypes.filter(function(type) {
                    // Check DEFEAT cooldown
                    var lastDefeat = _this.lastEncounterTime[type] || 0;
                    var defeatCooldown = _this.defeatCooldowns[type] || 0; // Use defeatCooldowns here
                    var defeatOk = now - lastDefeat >= defeatCooldown;
                    // Check FLEE cooldown
                    var lastFlee = _this.lastFleeTime[type] || 0;
                    var fleeCooldown = _this.FLEE_COOLDOWN; // It's a fixed value now
                    var fleeOk = now - lastFlee >= fleeCooldown;
                    // Both must be ok for the type to be available
                    return defeatOk && fleeOk;
                });
                // 4. If no types are available (all on cooldown), skip encounter
                if (availableTypes.length === 0) {
                    console.log('[DEBUG] Encounter check: Roll succeeded, but all possible types are on cooldown (defeat or flee).');
                    return;
                }
                // 5. Perform weighted random selection from the *available* ones
                var weightedAvailableTypes = availableTypes.map(function(type) {
                    return {
                        type: type,
                        weight: _this.encounterWeights[type] || 1
                    };
                });
                var selectedType = weightedRandom(weightedAvailableTypes);
                if (!selectedType) {
                    console.log('[DEBUG] Encounter check: Weighted selection failed (no types or weights found).');
                    return; // Should not happen if availableTypes was not empty, but good practice
                }
                // Insert selectedType into the entityId
                var entityId1 = "entity-".concat(selectedType, "-").concat(Phaser.Math.RND.uuid());
                console.log("[DEBUG] Encounter check: Roll succeeded! Creating new ".concat(selectedType, " (ID: ").concat(entityId1, ") in room ").concat(room.id));
                // 6. Create entity (Cooldown recording moved to endEncounter)
                // REMOVED: this.lastEncounterTime[selectedType] = now;
                // --- Set Initial Stats Based on Character Definition ---
                var definition = getCharacterDefinition(selectedType);
                var stats = definition && definition.stats ? definition.stats : { vit: 6, str: 5, int: 0, dex: 5, mnd: 5, spd: 5 };
                // Use StatDefinitions.js for derived stats
                var maxHealth = getHealthFromVIT(stats.vit);
                var physicalBaseDamage = getPhysicalAttackFromSTR(stats.str);
                var defense = getDefenseFromVIT(stats.vit);
                // Store stat block and derived stats in entity
                this.entities.set(entityId1, {
                    type: selectedType,
                    statBlock: stats,
                    maxHealth: maxHealth,
                    health: maxHealth,
                    physicalBaseDamage: physicalBaseDamage,
                    defense: defense,
                    roomId: room.id,
                    mood: 'neutral',
                    instanceLoot: this.calculateInitialLoot(selectedType)
                });
                // Pass the calculated enemyStartsFirst flag
                this.startTurnBasedEncounter(entityId1, room.id, enemyStartsFirst);
            }
        },
        {
            // --- NEW Method: Calculate Initial Loot ---
            key: "calculateInitialLoot",
            value: function calculateInitialLoot(entityType) {
                var initialLoot = [];
                var definition = getCharacterDefinition(entityType); // Get the full definition
                var lootTier = definition === null || definition === void 0 ? void 0 : definition.lootTier; // Get the loot tier from the definition
                if (lootTier) {
                    // Assuming npcLootManager provides the loot table structure { itemKey: probability } based on tier
                    var lootProbabilities = this.scene.npcLootManager.getLootForTier(lootTier); // Use getLootForTier with the tier
                    if (lootProbabilities) {
                        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                        try {
                            for(var _iterator = Object.entries(lootProbabilities)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                                var _step_value = _sliced_to_array(_step.value, 2), itemKey = _step_value[0], probability = _step_value[1];
                                if (Math.random() < probability) {
                                    initialLoot.push(itemKey);
                                }
                            }
                        } catch (err) {
                            _didIteratorError = true;
                            _iteratorError = err;
                        } finally{
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return != null) {
                                    _iterator.return();
                                }
                            } finally{
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                        }
                        console.log("[DEBUG] Initial loot for ".concat(entityType, " (Tier: ").concat(lootTier, "): [").concat(initialLoot.join(', '), "]"));
                    } else {
                        console.warn("[WARN] calculateInitialLoot: No loot probabilities found for tier '".concat(lootTier, "' for ").concat(entityType, "."));
                    }
                } else {
                    console.warn("[WARN] calculateInitialLoot: No lootTier defined for ".concat(entityType, ". No loot calculated."));
                }
                return initialLoot;
            }
        },
        {
            // --- END NEW Method ---
            // Added enemyStartsFirst parameter
            key: "startTurnBasedEncounter",
            value: function startTurnBasedEncounter(entityId, roomId, enemyStartsFirst) {
                var _this = this;
                // Use the stored unique playerId
                var entity = this.entities.get(entityId);
                // Set turn order and current turn based on who starts first
                if (enemyStartsFirst) {
                    this.turnQueue = [
                        entityId,
                        this.playerId
                    ];
                    this.currentTurn = entityId;
                    console.log("[DEBUG] Enemy starts first. Queue:", this.turnQueue.join(', '));
                } else {
                    this.turnQueue = [
                        this.playerId,
                        entityId
                    ];
                    this.currentTurn = this.playerId;
                    console.log("[DEBUG] Player starts first. Queue:", this.turnQueue.join(', '));
                }
                // Set state and update UI *before* emitting the event
                this.scene.isInEncounter = true;
                this.scene.setupNavigationButtons(); // Hide nav buttons immediately
                // Pass entity details on start, including mood
                // Removed HealthBar creation/update logic
                this.scene.events.emit('encounterStarted', entityId, entity.type, entity.mood);
                // Initiate the first turn's action *after* setup and event emission
                if (enemyStartsFirst) {
                    console.log("[DEBUG] Enemy's turn (first). Handling AI action.");
                    // Add a slight delay before the AI acts
                    this.scene.time.delayedCall(500, function() {
                        // Re-check if encounter is still active before AI acts
                        if (_this.scene.isInEncounter && _this.currentTurn === entityId) {
                            // --- Call Standard AI on First Turn ---
                            // REMOVED: Explicit 'firstMove' checks for Elvaan, Bat, Gnome.
                            // The standard handleAIAction call below will now use the defined
                            // aiBehavior.standardAction (Attack, AttemptSteal, ShowPrompt, etc.)
                            console.log("[DEBUG] Enemy's first turn. Using standard handleAIAction for ".concat(entityId, "."));
                            _this.handleAIAction(entityId, _this.playerId); // Standard AI targets player using unique ID
                        // --- End Standard AI on First Turn ---
                        } else {
                            console.log("[DEBUG] AI first turn aborted (delay check), encounter ended or turn changed.");
                        }
                    });
                } else {
                    console.log("[DEBUG] Player's turn (first). Showing action menu.");
                    this.showActionMenu(this.playerId, entityId, roomId); // Player initiates menu
                }
            }
        },
        {
            // Refactored to accept menuContext and handle different menu types
            key: "showActionMenu",
            value: function showActionMenu(initiatorId, targetId, roomId) {
                var _this = this;
                var menuContext = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {
                    type: './main.js',
                    page: 1
                }, keepTimer = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : false;
                var target = this.entities.get(targetId);
                console.log('[DEBUG] EncounterManager.showActionMenu called:', {initiatorId, targetId, roomId, menuContext});
                if (!target) {
                    console.error("[ERROR] showActionMenu: Target entity ".concat(targetId, " not found!"));
                    this.endTurn(initiatorId); // End turn if target invalid
                    return;
                }
                var targetDef = getCharacterDefinition(target.type);
                var targetName = targetDef ? targetDef.name : target.type;
                var actions = [];
                var isPlayerTurn = initiatorId === this.playerId;
                var isSubMenu = true; // Default to true for attack/spells, override for main
                console.log("[DEBUG] showActionMenu called with context:", menuContext, "keepTimer: ".concat(keepTimer));
                switch(menuContext.type){
                    case './main.js':
                        isSubMenu = false; // Main menu is not a sub-menu
                        actions = [
                            {
                                text: "Talk",
                                callback: function() {
                                    return _this.handleTalk(initiatorId, targetId);
                                }
                            },
                            // Call showActionMenu with 'attack' context when Attack is clicked
                            {
                                text: "Attack",
                                callback: function() {
                                    return _this.showActionMenu(initiatorId, targetId, roomId, {
                                        type: 'attack'
                                    }, true);
                                }
                            },
                            {
                                text: "Offer Trade",
                                callback: function() {
                                    return _this.handleTrade(initiatorId, targetId);
                                }
                            },
                            {
                                text: "Examine",
                                callback: function() {
                                    return _this.handleExamine(initiatorId, targetId);
                                }
                            },
                            {
                                text: "Attempt to Flee",
                                callback: function() {
                                    return _this.handleFlee(initiatorId, roomId);
                                }
                            },
                            {
                                text: "Invite to Team",
                                callback: function() {
                                    return _this.handleInvite(initiatorId, targetId);
                                }
                            }
                        ];
                        break;
                    case 'attack':
                        actions = [
                            {
                                text: 'Physical Attack',
                                callback: function() {
                                    _this.socket.emit('attack_intent', {
                                        initiatorId: _this.playerId,
                                        targetId,
                                        attackType: 'physical',
                                        roomId
                                    });
                                    // Optionally, close menu or show waiting UI
                                }
                            },
                            // Call showActionMenu with 'spells' context when Spells/Abilities is clicked
                            {
                                text: 'Spells/Abilities',
                                callback: function() {
                                    return _this.showActionMenu(initiatorId, targetId, roomId, {
                                        type: 'spells',
                                        page: 1
                                    }, true);
                                }
                            },
                            {
                                text: 'Steal',
                                callback: function() {
                                    return _this.handleSteal(initiatorId, targetId);
                                }
                            },
                            {
                                text: 'Back',
                                callback: function() {
                                    console.log("[DEBUG] Back button clicked from Attack submenu. Showing main menu, keeping timer.");
                                    // Go back to the main menu, keep timer
                                    _this.showActionMenu(initiatorId, targetId, roomId, {
                                        type: './main.js'
                                    }, true);
                                }
                            }
                        ];
                        break;
                    case 'spells':
                        const availableSpells = this.scene.spellManager.getAllSpells();
                        const validSpells = this.scene.spellManager.getValidSpells();
                        
                        const spellsPerPage = 5;
                        const page = menuContext.page || 1;
                        const totalPages = Math.ceil(availableSpells.length / spellsPerPage);
                        const startIndex = (page - 1) * spellsPerPage;
                        const endIndex = Math.min(startIndex + spellsPerPage, availableSpells.length);
                        const spellsOnPage = availableSpells.slice(startIndex, endIndex);

                        // Add each spell to the actions array
                        spellsOnPage.forEach(spellName => {
                            const isValid = validSpells.includes(spellName);
                            const requirements = this.scene.spellManager.getSpellRequirements(spellName);
                            const gemText = requirements.join(", ");
                            const gemCount = requirements.length;
                            const countText = gemCount > 0 ? `${gemCount} Gem${gemCount > 1 ? 's' : ''} required: ` : "";

                            actions.push({
                                text: spellName,
                                callback: function() {
                                    if (isValid) {
                                        _this.handleSpellCast(initiatorId, targetId, spellName);
                                    } else {
                                        console.log(`[DEBUG] Player clicked spell: ${spellName}, showing gem requirements`);
                                        this.scene.events.emit('showActionPrompt', `${spellName}: ${countText}${gemText}`);
                                    }
                                },
                                disabled: !isValid
                            });
                        });

                        // Add pagination and navigation
                        if (page < totalPages) {
                            actions.push({
                                text: 'Next Page',
                                callback: function() {
                                    return _this.showActionMenu(initiatorId, targetId, roomId, { type: 'spells', page: page + 1 }, true);
                                }
                            });
                        }

                        // Conditional Back Button
                        if (page > 1) {
                            actions.push({
                                text: 'Back',
                                callback: function() {
                                    return _this.showActionMenu(initiatorId, targetId, roomId, { type: 'spells', page: page - 1 }, true);
                                }
                            });
                        } else {
                            actions.push({
                                text: 'Back',
                                callback: function() {
                                    return _this.showActionMenu(initiatorId, targetId, roomId, { type: 'attack' }, true);
                                }
                            });
                        }
                        break;
                    default:
                        console.warn("[WARN] showActionMenu: Unknown menu context type '".concat(menuContext.type, "'. Defaulting to main menu."));
                        isSubMenu = false;
                        // Fallback to main menu actions
                        actions = [
                            {
                                text: "Talk",
                                callback: function() {
                                    return _this.handleTalk(initiatorId, targetId);
                                }
                            },
                            {
                                text: "Attack",
                                callback: function() {
                                    return _this.showActionMenu(initiatorId, targetId, roomId, {
                                        type: 'attack'
                                    }, true);
                                }
                            },
                            {
                                text: "Offer Trade",
                                callback: function() {
                                    return _this.handleTrade(initiatorId, targetId);
                                }
                            },
                            {
                                text: "Examine",
                                callback: function() {
                                    return _this.handleExamine(initiatorId, targetId);
                                }
                            },
                            {
                                text: "Attempt to Flee",
                                callback: function() {
                                    return _this.handleFlee(initiatorId, roomId);
                                }
                            },
                            {
                                text: "Invite to Team",
                                callback: function() {
                                    return _this.handleInvite(initiatorId, targetId);
                                }
                            }
                        ];
                }
                // After actions are built:
                console.log('[DEBUG] EncounterManager.showActionMenu actions:', actions);
                this.scene.events.emit('showActionMenu', actions, isPlayerTurn, isSubMenu, keepTimer);
            }
        },
        {
            key: "handleTalk",
            value: function handleTalk(initiatorId, targetId) {
                var _this = this;
                var target = this.entities.get(targetId);
                // REMOVED: Immediate de-escalation on player talk attempt.
                // Mood change will be handled based on AI response or other actions.
                if (initiatorId === this.playerId) {
                    // Emit event for DungeonScene to handle input display
                    // Timer continues running
                    this.scene.events.emit('displayTalkInput', initiatorId, targetId);
                // NOTE: Turn ending is now handled by DungeonScene after player hits Enter.
                // REMOVED: this.scene.stopActionMenuTimer();
                // REMOVED: this.scene.events.emit('showTalkDialog', ...);
                // REMOVED: this.endTurn(initiatorId);
                } else {
                    // AI Talk logic (receiving message) - remains the same for now
                    var talk = this.pendingTalks.get(targetId);
                    if (talk && talk.targetId === initiatorId) {
                        var initiatorDef = getCharacterDefinition(this.entities.get(initiatorId).type); // Get definition
                        var initiatorName = initiatorDef ? initiatorDef.name : initiatorId; // Use name from definition
                        this.scene.events.emit('showTalkMessage', "".concat(initiatorName, " says: ").concat(talk.message), function(message) {
                            _this.scene.events.emit('showActionPrompt', "You reply to the ".concat(initiatorName, ".")); // Player reply prompt
                            _this.endTurn(initiatorId);
                        });
                        this.pendingTalks.delete(targetId);
                    } else {
                        this.handleAIAction(initiatorId, targetId);
                    }
                }
            }
        },
        {
            // Removed extra closing brace from previous line
            key: "handleAttack",
            value: function handleAttack(initiatorId, targetId) {
                // Only allow local logic for AI/NPCs (if not yet migrated), otherwise emit to server
                if (initiatorId === this.playerId) {
                    // Already migrated: player attacks now emit to server
                    return;
                }
                // TODO: Migrate AI/NPC attacks to server authority
                // For now, keep legacy logic for AI/NPCs until migration is complete
                // ... (existing AI/NPC attack logic, to be migrated next) ...
            }
        },
        {
            // REMOVED handleSpells - Logic moved into showActionMenu 'spells' case
            key: "handleSteal",
            value: function handleSteal(initiatorId, targetId) {
                // Add roomId to payload
                const roomId = this.entities.get(targetId)?.roomId;
                this.socket.emit('steal_intent', { initiatorId, targetId, roomId });
                // Optionally, show waiting UI or close menu
                if (this.scene.actionMenu) {
                    this.scene.actionMenu.destroy();
                    this.scene.actionMenu = null;
                }
            }
        },
        {
            key: "handleTrade",
            value: function handleTrade(initiatorId, targetId) {
                // Timer stopped by main menu click already
                // Destroy menu and end turn if player action
                if (initiatorId === this.playerId) {
                    if (this.scene.actionMenu) {
                        this.scene.actionMenu.destroy();
                        this.scene.actionMenu = null;
                    }
                    this.endTurn(initiatorId); // End turn immediately
                }
                // --- Then, handle the trade logic ---
                var target = this.entities.get(targetId);
                if (!target) {
                    console.error("[ERROR] handleTrade: Target entity ".concat(targetId, " not found."));
                    // Turn was already ended if it was the player.
                    return;
                }
                var targetDef = getCharacterDefinition(target.type); // Get definition
                var targetName = targetDef ? targetDef.name : target.type; // Use name from definition
                if (target.type === 'dwarf' && initiatorId === this.playerId) {
                    // Player initiates trade with dwarf.
                    // Mood/Prompt logic is handled based on refusal or success (hypothetical success path not fully implemented yet).
                    // endTurn was already called for the player *before* this point.
                    this.scene.events.emit('showActionPrompt', "You offer to trade with the ".concat(targetName, "."));
                    // Placeholder: Assume trade fails for now for mood demonstration.
                    // In a real implementation, you'd have UI confirmation, then potential mood change.
                    // --- Emit current mood even on refusal ---
                    this.scene.events.emit('enemyMoodChanged', targetId, target.mood);
                } else {
                    // Handle refusal for non-player or non-dwarf targets.
                    // endTurn was already called for the player.
                    // --- Show generic offer prompt ---
                    if (initiatorId === this.playerId) {
                        this.scene.events.emit('showActionPrompt', "You offer to trade with the ".concat(targetName, "."));
                    }
                    // --- Emit current mood even on refusal ---
                    this.scene.events.emit('enemyMoodChanged', targetId, target.mood);
                    // If it wasn't the player (e.g., AI tried trading?), end turn now.
                    if (initiatorId !== this.playerId) {
                        this.endTurn(initiatorId);
                    }
                }
            }
        },
        {
            key: "handleExamine",
            value: function handleExamine(initiatorId, targetId) {
                // Timer stopped by main menu click already
                // Destroy menu and end turn if player action
                if (initiatorId === this.playerId) {
                    if (this.scene.actionMenu) {
                        this.scene.actionMenu.destroy();
                        this.scene.actionMenu = null;
                    }
                    this.endTurn(initiatorId); // End turn immediately
                }
                // --- Then, show the examine prompt ---
                var target = this.entities.get(targetId);
                if (!target) {
                    console.error("[ERROR] handleExamine: Target entity ".concat(targetId, " not found."));
                    // Turn was already ended if it was the player.
                    return;
                }
                var targetDef = getCharacterDefinition(target.type); // Get definition
                var targetName = targetDef ? targetDef.name : target.type; // Use name from definition
                // TODO: Enhance description using targetDef.baseStats etc. later?
                var desc = {
                    elvaan: 'An aggressive warrior with high attack strength.',
                    dwarf: 'A sturdy individual, seemingly neutral but defensive.',
                    gnome: 'A cunning character, likely to steal valuables.',
                    bat: 'A fast, fluttering creature with relatively low health.' // Removed 'Bat' from desc
                };
                this.scene.events.emit('showActionPrompt', "Examining ".concat(targetName, ": ").concat(desc[target.type] || 'An unknown creature.'));
                // DO NOT call endTurn here again if player action.
                // If it wasn't the player, end turn now.
                if (initiatorId !== this.playerId) {
                    this.endTurn(initiatorId);
                }
            }
        },
        {
            key: "handleFlee",
            value: function handleFlee(initiatorId, roomId) {
                var _this_entities_get;
                // Timer stopped by main menu click (if player action)
                // Destroy menu if player action
                if (initiatorId === this.playerId) {
                    if (this.scene.actionMenu) {
                        this.scene.actionMenu.destroy();
                        this.scene.actionMenu = null;
                    }
                // IMPORTANT: Don't end turn here yet for player! Need to check success first.
                }
                // --- Check for flee success (Increased base chance) ---
                // Note: Dwarf's talk-triggered flee bypasses this function entirely.
                var success = Math.random() < 0.2; // 20% flee success chance
                var initiatorDef = getCharacterDefinition((_this_entities_get = this.entities.get(initiatorId)) === null || _this_entities_get === void 0 ? void 0 : _this_entities_get.type); // Get definition
                var initiatorName = initiatorId === this.playerId ? 'You' : initiatorDef ? initiatorDef.name : initiatorId;
                // Consistent failure message
                var message = "".concat(initiatorName, " attempt").concat(initiatorId === this.playerId ? '' : 's', " to flee... ").concat(success ? 'succeeds!' : 'but failed!');
                this.scene.events.emit('showActionPrompt', message);
                if (success) {
                    if (initiatorId === this.playerId) {
                        // Find the entityId associated with this room encounter
                        var entityEntry = Array.from(this.entities.entries()).find(function(entry) {
                            return entry[1].roomId === roomId;
                        });
                        if (entityEntry) {
                            var entityId = entityEntry[0];
                            this.endEncounter(entityId, false); // Player flees: Keep entity temporarily
                        }
                        this.scene.events.emit('fleeToPreviousRoom', roomId);
                    // Don't call endTurn here, room change handles turn progression away from encounter.
                    } else {
                        // AI successfully fled: Treat as defeat (remove entity immediately)
                        console.log("[DEBUG] AI Flee Success: ".concat(initiatorName, " fled. Calling endEncounter(true)."));
                        this.endEncounter(initiatorId, true);
                    // Don't call endTurn here, endEncounter resets the turn state.
                    }
                } else {
                    // If flee fails (for player OR AI), end the turn.
                    this.endTurn(initiatorId);
                }
            // DO NOT call endTurn unconditionally here.
            }
        },
        {
            key: "handleInvite",
            value: function handleInvite(initiatorId, targetId) {
                // Timer stopped by main menu click already
                // Destroy menu and end turn if player action
                if (initiatorId === this.playerId) {
                    if (this.scene.actionMenu) {
                        this.scene.actionMenu.destroy();
                        this.scene.actionMenu = null;
                    }
                    this.endTurn(initiatorId); // End turn immediately
                }
                // --- Then, show the invite prompt ---
                var target = this.entities.get(targetId);
                if (!target) {
                    console.error("[ERROR] handleInvite: Target entity ".concat(targetId, " not found."));
                    // Turn already ended if player
                    return;
                }
                var targetDef = getCharacterDefinition(target.type); // Get definition
                var targetName = targetDef ? targetDef.name : target.type; // Use name from definition
                var message = target.type === 'bat' ? "The ".concat(targetName, " screeches and cannot join your team!") : "You invited the ".concat(targetName, " to your team!");
                this.scene.events.emit('showActionPrompt', message);
                // DO NOT call endTurn here again if player action.
                // If it wasn't the player, end turn now.
                if (initiatorId !== this.playerId) {
                    this.endTurn(initiatorId);
                }
            }
        },
        {
            key: "handleAIAction",
            value: function handleAIAction(initiatorId, targetId) {
                var _entityDef_baseStats;
                var entity = this.entities.get(initiatorId);
                var entityDef = getCharacterDefinition(entity.type); // Get definition
                var entityName = entityDef ? entityDef.name : entity.type; // Use name from definition
                var aiBehavior = entityDef === null || entityDef === void 0 ? void 0 : entityDef.aiBehavior; // Get the AI behavior definition
                var _entityDef_baseStats_fleeThreshold;
                // Calculate dynamic flee threshold based on definition and max health
                var fleeThresholdPercent = (_entityDef_baseStats_fleeThreshold = entityDef === null || entityDef === void 0 ? void 0 : (_entityDef_baseStats = entityDef.baseStats) === null || _entityDef_baseStats === void 0 ? void 0 : _entityDef_baseStats.fleeThreshold) !== null && _entityDef_baseStats_fleeThreshold !== void 0 ? _entityDef_baseStats_fleeThreshold : 0.2; // Default to 20% if undefined
                var fleeHealthValue = entity.maxHealth * fleeThresholdPercent;
                // REMOVED: const LOW_HEALTH_THRESHOLD_VALUE = 150;
                // --- PRIORITY 1: Low Health Check (Guard Clause) ---
                if (entity.health < fleeHealthValue) {
                    console.log("[DEBUG] AI Action (".concat(entityName, ", health ").concat(entity.health, "/").concat(entity.maxHealth, "): Low health check vs threshold ").concat(fleeHealthValue.toFixed(0), " (").concat((fleeThresholdPercent * 100).toFixed(0), "%). (PRIORITY 1)."));
                    // Check AI Behavior Definition for low health action
                    var lowHealthDef = aiBehavior === null || aiBehavior === void 0 ? void 0 : aiBehavior.lowHealthAction;
                    // Dwarf low health: Use definition if available and matches 'HealAndStand'
                    if (entity.type === 'dwarf' && (lowHealthDef?.type) === 'HealAndStand') {
                        // Only allow once per encounter if specified
                        if (lowHealthDef.oncePerEncounter && entity.standFirmUsed) {
                            // Already used, fall through to other logic
                        } else {
                            // Check chance if specified
                            if (!lowHealthDef.chance || Math.random() < lowHealthDef.chance) {
                                var healAmount = lowHealthDef.amount ?? 0;
                                if (healAmount > 0) {
                                    entity.health += healAmount;
                                    entity.health = Math.min(entity.health, entity.maxHealth);
                                    this.scene.events.emit('showActionPrompt', `The ${entityName} glares weakly, but stands firm. (Regains some health!)`);
                                    console.log(`[DEBUG] AI Action (${entityName}, low health): Dwarf stands firm & heals ${healAmount} HP from definition (New HP: ${entity.health}).`);
                                } else {
                                    this.scene.events.emit('showActionPrompt', `The ${entityName} glares weakly, but stands firm.`);
                                    console.log(`[DEBUG] AI Action (${entityName}, low health): Dwarf stands firm (no heal defined or amount 0).`);
                                }
                                if (lowHealthDef.oncePerEncounter) entity.standFirmUsed = true;
                                this.endTurn(initiatorId);
                                return;
                            }
                            // If chance fails, fall through to other low health logic
                        }
                    } else {
                        // No specific 'AttemptFlee' defined OR lowHealthAction missing - Do nothing special here, proceed to other checks
                        console.log("[DEBUG] AI Action (".concat(entityName, ", low health): No 'AttemptFlee' action defined. Proceeding to other checks."));
                    }
                // Fall through if flee wasn't attempted or failed
                }
                // --- PRIORITY 2: Check Mood (Guard Clause - runs if NOT low health OR low health flee attempt failed) ---
                // Angry enemies use their defined angryAction if available, otherwise default to attack.
                if (entity.mood === 'angry') {
                    console.log("[DEBUG] AI Action (".concat(entityName, ", angry, health ").concat(entity.health, "): Mood is angry. Checking for defined angryAction (PRIORITY 2)."));
                    var angryActionDef = aiBehavior === null || aiBehavior === void 0 ? void 0 : aiBehavior.angryAction;
                    if (angryActionDef) {
                        // --- Handle Defined Angry Action ---
                        switch(angryActionDef.type){
                            case 'WeightedChoice':
                                if (angryActionDef.choices && angryActionDef.choices.length > 0) {
                                    // Use existing weightedRandom helper function
                                    var chosenActionType = weightedRandom(angryActionDef.choices); // Assumes choices have { type, weight }
                                    console.log("[DEBUG] AI Action (".concat(entityName, ", angry): WeightedChoice selected '").concat(chosenActionType, "' based on angryAction definition."));
                                    // Execute the chosen action
                                    if (chosenActionType === 'Attack') {
                                        this.handleAttack(initiatorId, targetId);
                                    } else if (chosenActionType === 'AttemptSteal') {
                                        // Note: The 'chance' inside the WeightedChoice definition (e.g., 1.0 for Gnome)
                                        // applies to the steal *roll* itself IF 'AttemptSteal' is chosen by weight.
                                        // We still call handleSteal which performs the actual success check.
                                        this.handleSteal(initiatorId, targetId);
                                    } else {
                                        console.warn("[WARN] AI Action (".concat(entityName, ", angry): Unknown action type '").concat(chosenActionType, "' chosen from WeightedChoice."));
                                        // Fallback to attack if chosen action is unknown
                                        this.handleAttack(initiatorId, targetId);
                                    }
                                } else {
                                    console.warn("[WARN] AI Action (".concat(entityName, ", angry): WeightedChoice defined but no choices found. Falling back to attack."));
                                    this.handleAttack(initiatorId, targetId);
                                }
                                break; // End WeightedChoice
                            case 'Attack':
                                console.log("[DEBUG] AI Action (".concat(entityName, ", angry): Using defined angryAction: Attack."));
                                this.handleAttack(initiatorId, targetId);
                                break;
                            case 'AttemptSteal':
                                var _angryActionDef_chance;
                                // Note: If 'AttemptSteal' is the direct angryAction, the 'chance' property within it applies.
                                var stealChance = (_angryActionDef_chance = angryActionDef.chance) !== null && _angryActionDef_chance !== void 0 ? _angryActionDef_chance : 1.0; // Default to 100% chance *to attempt* if undefined
                                console.log("[DEBUG] AI Action (".concat(entityName, ", angry): Using defined angryAction: AttemptSteal (Base attempt chance: ").concat(stealChance * 100, "%)."));
                                if (Math.random() < stealChance) {
                                    this.handleSteal(initiatorId, targetId);
                                } else {
                                    console.log("[DEBUG] AI Action (".concat(entityName, ", angry): Skipped AttemptSteal based on angryAction chance. Ending turn."));
                                    this.endTurn(initiatorId); // Steal attempt itself was skipped
                                }
                                break;
                            // Add cases for other potential angry actions here later (e.g., 'UseAbility')
                            default:
                                console.warn("[WARN] AI Action (".concat(entityName, ", angry): Unknown angryAction type '").concat(angryActionDef.type, "' defined. Falling back to attack."));
                                this.handleAttack(initiatorId, targetId);
                                break;
                        }
                    } else {
                        // --- Default Angry Action (Attack if no definition) ---
                        console.log("[DEBUG] AI Action (".concat(entityName, ", angry, health ").concat(entity.health, "): No specific angryAction defined. Defaulting to attack (PRIORITY 2 - Fallback)."));
                        this.handleAttack(initiatorId, targetId); // targetId is player (or should be this.playerId)
                    }
                    return; // Stop processing further priorities if mood was angry
                }
                // --- PRIORITY 3: Pending Player Talk (Guard Clause - runs if NOT low health flee AND NOT angry) ---
                // Check if the player sent a message intended for this entity.
                var pendingPlayerTalk = this.pendingTalks.get(this.playerId); // Use player's unique ID as key
                if (pendingPlayerTalk && pendingPlayerTalk.targetId === initiatorId) {
                    var playerMessage = pendingPlayerTalk.message.toLowerCase();
                    console.log("[DEBUG] AI Action (".concat(entityName, ", health ").concat(entity.health, ", mood ").concat(entity.mood, "): Handling pending player talk (from ").concat(this.playerId, '): "').concat(playerMessage, '" (PRIORITY 3).'));
                    var responsePrompt = '';
                    // REMOVED: handledBySpecificLogic flag
                    var responseHandledByDefinition = false; // Track if a definition-based response was found
                    // --- Priority 3a: Handle Talk via AI Behavior Definition ---
                    if (aiBehavior === null || aiBehavior === void 0 ? void 0 : aiBehavior.talkResponses) {
                        var _talkDef_default;
                        var talkDef = aiBehavior.talkResponses;
                        // Check keywords
                        if (talkDef.keywords && Array.isArray(talkDef.keywords)) {
                            var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                            try {
                                for(var _iterator = talkDef.keywords[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                                    var keywordDef = _step.value;
                                    if (keywordDef.words && Array.isArray(keywordDef.words)) {
                                        var matchFound = keywordDef.words.some(function(word) {
                                            return playerMessage.includes(word.toLowerCase());
                                        });
                                        if (matchFound) {
                                            // Format the prompt
                                            responsePrompt = (keywordDef.prompt || '').replace(/{NAME}/g, entityName);
                                            console.log("[DEBUG] Talk reaction (".concat(entityName, "): Found keyword match from definition: [").concat(keywordDef.words.join(', '), ']. Prompt: "').concat(responsePrompt, '"'));
                                            // Handle defined action
                                            if (keywordDef.action) {
                                                switch(keywordDef.action.type){
                                                    case 'SetMood':
                                                        if (keywordDef.action.mood && entity.mood !== keywordDef.action.mood) {
                                                            entity.mood = keywordDef.action.mood;
                                                            console.log("[DEBUG] Talk action (".concat(entityName, "): Setting mood to '").concat(entity.mood, "' from definition."));
                                                            this.scene.events.emit('enemyMoodChanged', initiatorId, entity.mood);
                                                        }
                                                        break;
                                                    case 'FleeAndEndEncounter':
                                                        console.log("[DEBUG] Talk action (".concat(entityName, "): Triggering FleeAndEndEncounter from definition."));
                                                        this.scene.events.emit('showActionPrompt', responsePrompt); // Show prompt before ending
                                                        this.pendingTalks.delete(this.playerId);
                                                        this.endEncounter(initiatorId, true); // Flee like defeat
                                                        return; // IMPORTANT: Stop all further processing
                                                    // Add more action types here later (e.g., GiveItem, StartQuest)
                                                    default:
                                                        console.warn("[WARN] Talk action (".concat(entityName, "): Unknown action type in definition: ").concat(keywordDef.action.type));
                                                }
                                            }
                                            responseHandledByDefinition = true;
                                            break; // Stop checking keywords once a match is found
                                        }
                                    }
                                }
                            } catch (err) {
                                _didIteratorError = true;
                                _iteratorError = err;
                            } finally{
                                try {
                                    if (!_iteratorNormalCompletion && _iterator.return != null) {
                                        _iterator.return();
                                    }
                                } finally{
                                    if (_didIteratorError) {
                                        throw _iteratorError;
                                    }
                                }
                            }
                        }
                        // Handle default response if no keyword matched
                        if (!responseHandledByDefinition && ((_talkDef_default = talkDef.default) === null || _talkDef_default === void 0 ? void 0 : _talkDef_default.prompt)) {
                            responsePrompt = talkDef.default.prompt.replace(/{NAME}/g, entityName).replace(/{MESSAGE}/g, pendingPlayerTalk.message); // Inject player message
                            console.log("[DEBUG] Talk reaction (".concat(entityName, '): Using default response from definition: "').concat(responsePrompt, '"'));
                            responseHandledByDefinition = true;
                        }
                    }
                    // REMOVED: Priority 3b fallback block. Talk is now fully handled by definitions or defaults within Priority 3a.
                    // --- Priority 3c: Process FINAL Talk Response and End Turn ---
                    this.pendingTalks.delete(this.playerId); // Always clear the pending talk message using player ID *after* processing.
                    // Show the final prompt (either from definition or fallback) if one exists
                    if (responsePrompt) {
                        this.scene.events.emit('showActionPrompt', responsePrompt);
                        this.endTurn(initiatorId); // End turn after showing the response.
                        return; // Stop further processing.
                    }
                    // --- If NO responsePrompt was generated AT ALL (by definition or fallback) ---
                    // Execution automatically falls through to PRIORITY 4 below.
                    console.log("[DEBUG] No talk response generated for ".concat(entityName, " at all. Proceeding to standard AI action (Priority 4)."));
                } // End of PRIORITY 3 talk handling
                // --- PRIORITY 4: Standard AI Action Logic (Fallback) ---
                // This block executes only if:
                // 1. Entity is NOT at low health OR the low-health flee attempt failed.
                // 2. Entity mood is NOT 'angry'.
                // 3. There was NO pending player talk OR the talk attempt did not generate/handle a specific response.
                console.log("[DEBUG] AI Action (".concat(entityName, ", health ").concat(entity.health, ", mood ").concat(entity.mood, "): Performing standard action (PRIORITY 4 - Fallback)."));
                // --- Priority 4a: Use Standard Action from Definition if available ---
                if (aiBehavior === null || aiBehavior === void 0 ? void 0 : aiBehavior.standardAction) {
                    var standardActionDef = aiBehavior.standardAction;
                    switch(standardActionDef.type){
                        case 'ShowPrompt':
                            var prompt = (standardActionDef.prompt || 'The {NAME} stands there.').replace(/{NAME}/g, entityName);
                            console.log("[DEBUG] AI Action (".concat(entityName, '): Standard action from definition: ShowPrompt "').concat(prompt, '"'));
                            this.scene.events.emit('showActionPrompt', prompt);
                            this.endTurn(initiatorId);
                            return; // Handled by definition
                        case 'AttemptSteal':
                            var _standardActionDef_chance;
                            var stealChance1 = (_standardActionDef_chance = standardActionDef.chance) !== null && _standardActionDef_chance !== void 0 ? _standardActionDef_chance : 0.0; // Default to 0 chance if undefined
                            if (Math.random() < stealChance1) {
                                console.log("[DEBUG] AI Action (".concat(entityName, "): Standard action from definition: AttemptSteal (Chance: ").concat(stealChance1 * 100, "%) - Success!"));
                                this.handleSteal(initiatorId, targetId);
                            } else {
                                var failPrompt = (standardActionDef.failPrompt || 'The {NAME} eyes your belongings suspiciously.').replace(/{NAME}/g, entityName);
                                console.log("[DEBUG] AI Action (".concat(entityName, "): Standard action from definition: AttemptSteal (Chance: ").concat(stealChance1 * 100, '%) - Failed roll. Prompt: "').concat(failPrompt, '"'));
                                this.scene.events.emit('showActionPrompt', failPrompt);
                                this.endTurn(initiatorId);
                            }
                            return; // Handled by definition (either steal or fail prompt)
                        case 'Attack':
                            console.log("[DEBUG] AI Action (".concat(entityName, "): Standard action from definition: Attack."));
                            this.handleAttack(initiatorId, targetId);
                            return; // Handled by definition
                        // Add other standard action types here later (e.g., 'Patrol', 'UseAbility')
                        default:
                            console.warn("[WARN] AI Action (".concat(entityName, "): Unknown standard action type in definition: ").concat(standardActionDef.type));
                    }
                }
                // --- Priority 4b: Ultimate Fallback Action ---
                // This executes ONLY if Priority 1, 2, 3 didn't handle the turn, AND
                // Priority 4a (standardAction definition) didn't handle the turn (e.g., no definition, or unknown type).
                console.log("[DEBUG] AI Action (".concat(entityName, "): Reached ultimate fallback. Default menacing stance."));
                this.scene.events.emit('showActionPrompt', "The ".concat(entityName, " stands there menacingly."));
                this.endTurn(initiatorId);
            // endTurn is now consistently called by the action that handles the turn, or this fallback.
            }
        },
        {
            // REMOVED: _aiActionElvaan helper method. Logic is now handled by the aiBehavior definition.
            key: "endTurn",
            value: function endTurn(initiatorId) {
                var _this = this;
                // Ensure the initiator is still valid and in the queue before proceeding
                if (!this.currentTurn || !this.turnQueue.includes(initiatorId)) {
                    console.warn("[DEBUG] Initiator ".concat(initiatorId, " not found or invalid in turn queue during endTurn. Current: ").concat(this.currentTurn, ". Queue: ").concat(this.turnQueue.join(','), ". Encounter might have ended."));
                    return;
                }
                // Rotate queue
                this.turnQueue.push(this.turnQueue.shift());
                this.currentTurn = this.turnQueue[0];
                console.log("[DEBUG] End Turn: Initiator was ".concat(initiatorId, ". New turn for ").concat(this.currentTurn, ". Queue: ").concat(this.turnQueue.join(', ')));
                // Determine the target for the next turn (always the other entity in a 1v1)
                // Need to handle potential defeat of the *next* entity in the queue
                var nextEntityId = this.turnQueue.find(function(id) {
                    return id !== _this.currentTurn;
                });
                if (!nextEntityId) {
                    console.log("[DEBUG] Could not determine next entity ID in endTurn. Encounter likely ended or invalid state.");
                    // Attempt cleanup if possible
                    var remainingEntity = this.turnQueue[0];
                    // Check if remaining entity is player or an actual entity ID before ending
                    if (remainingEntity) this.endEncounter(remainingEntity === this.playerId ? 'unknown_enemy' : remainingEntity, true);
                    return;
                }
                // Check if the *target* entity for the upcoming turn still exists
                if (nextEntityId !== this.playerId && !this.entities.has(nextEntityId)) {
                    console.log("[DEBUG] Target entity ".concat(nextEntityId, " for next turn not found in endTurn, likely defeated."));
                    this.endEncounter(nextEntityId, true); // Ensure cleanup if target defeated
                    return;
                }
                // Check if the *current* entity (whose turn it now is) still exists
                if (this.currentTurn !== this.playerId && !this.entities.has(this.currentTurn)) {
                    console.log("[DEBUG] Current turn entity ".concat(this.currentTurn, " not found in endTurn, likely defeated."));
                    this.endEncounter(this.currentTurn, true); // Ensure cleanup if current turn entity defeated
                    return;
                }
                // --- Universal Delay Before Next Turn Action ---
                this.scene.time.delayedCall(2000, function() {
                    // Re-check validity *inside* the delay callback, as state might change significantly
                    if (!_this.scene.isInEncounter || !_this.currentTurn) {
                        console.log("[DEBUG] Turn aborted inside delay (endTurn), encounter ended.");
                        return;
                    }
                    if (_this.currentTurn !== _this.playerId && !_this.entities.has(_this.currentTurn)) {
                        console.log("[DEBUG] Turn aborted for ".concat(_this.currentTurn, " inside delay (endTurn), entity gone."));
                        // Entity might have been removed by another process, ensure encounter ends if so
                        _this.endEncounter(_this.currentTurn, true);
                        return;
                    }
                    var currentValidTargetId = _this.turnQueue.find(function(id) {
                        return id !== _this.currentTurn;
                    });
                    if (!currentValidTargetId || currentValidTargetId !== _this.playerId && !_this.entities.has(currentValidTargetId)) {
                        console.log("[DEBUG] Turn aborted for ".concat(_this.currentTurn, " inside delay (endTurn), target ").concat(currentValidTargetId, " gone."));
                        // Target might have been removed, ensure encounter ends if so
                        if (currentValidTargetId && currentValidTargetId !== _this.playerId) _this.endEncounter(currentValidTargetId, true); // Check against unique player ID
                        return;
                    }
                    // --- Decide next action based on whose turn it is ---
                    if (_this.currentTurn === _this.playerId) {
                        // Player's turn: Show the main action menu, targeting the enemy
                        var enemyEntity = _this.entities.get(currentValidTargetId); // Use re-validated target
                        if (!enemyEntity) {
                            console.error("[ERROR] Cannot show player menu, enemy entity ".concat(currentValidTargetId, " not found!"));
                            _this.endEncounter(currentValidTargetId, true);
                            return;
                        }
                        console.log("[DEBUG] Player's turn. Showing action menu (initial display).");
                        // Call showActionMenu with default context and keepTimer=false (the default)
                        _this.showActionMenu(_this.currentTurn, currentValidTargetId, enemyEntity.roomId); // Removed incorrect 'false' argument
                    } else {
                        // Enemy's turn: Execute AI action, targeting the player
                        console.log("[DEBUG] Enemy's turn (".concat(_this.currentTurn, "). Handling AI action targeting player ").concat(_this.playerId, "."));
                        _this.handleAIAction(_this.currentTurn, _this.playerId); // Target is always the player using unique ID
                    }
                }); // End of delayedCall
            }
        },
        {
            key: "startRoomCooldown",
            value: function startRoomCooldown(roomId) {
                // Ensure DungeonService is available before using it
                if (!this.dungeonService) {
                    console.error("[ERROR] startRoomCooldown: DungeonService not initialized!");
                    return;
                }
                var room = this.dungeonService.getRoomById(roomId);
                if (room) {
                    room.lastEncounterEndTime = Date.now();
                    console.log("[DEBUG] Room Cooldown: Started 5min cooldown for room ".concat(roomId, " at ").concat(room.lastEncounterEndTime, "."));
                } else {
                    console.warn("[WARN] startRoomCooldown: Room ".concat(roomId, " not found."));
                }
            }
        },
        {
            // Added 'removeEntity' flag to distinguish defeat vs flee
            key: "endEncounter",
            value: function endEncounter(entityId) {
                var _this = this;
                var removeEntity = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true;
                if (!this.entities.has(entityId)) {
                    console.warn("[WARN] endEncounter called for non-existent entityId: ".concat(entityId));
                    // Still reset encounter state even if entity gone? Yes, probably safer.
                    this.turnQueue = [];
                    this.currentTurn = null;
                    this.scene.events.emit('endEncounter'); // Signal encounter end
                    return;
                }
                var entity = this.entities.get(entityId);
                var entityType = entity.type;
                var roomId = entity.roomId; // Capture roomId *before* deleting entity
                if (removeEntity) {
                    // --- Handle DEFEAT ---
                    // Record defeat time for the type-specific long cooldown
                    this.lastEncounterTime[entityType] = Date.now();
                    console.log("[DEBUG] Defeat: Type cooldown started for ".concat(entityType, " at ").concat(this.lastEncounterTime[entityType], " (Duration: ").concat(this.defeatCooldowns[entityType] / 1000, "s)"));
                    // --- Prepare Loot using instanceLoot ---
                    // The final loot is simply whatever is currently in the entity's instanceLoot.
                    var finalLootItems = entity.instanceLoot ? _to_consumable_array(entity.instanceLoot) : [];
                    // Convert all item keys to objects with itemKey and instanceId
                    var finalLootObjects = finalLootItems.map(itemKey => ({ itemKey, instanceId: `${itemKey}-${Date.now()}-${Math.floor(Math.random()*10000)}` }));
                    console.log("[DEBUG] Loot for defeated ".concat(entityId, " directly from instanceLoot: [").concat(finalLootItems.join(', '), "]"));
                    // --- Register Loot and Create Bag (always) ---
                    console.log("[DEBUG] Final loot for defeated ".concat(entityId, " from instanceLoot: [").concat(finalLootItems.join(', '), "]")); // Log the final list (even if empty)
                    // Register the actual loot list to be retrieved by LootUIManager later (can be empty)
                    this.scene.lootUIManager.registerNpcLoot(entityId, finalLootObjects);
                    // Get room and direction info needed for bag creation
                    var currentRoomId = this.scene.roomManager.currentRoomId; // Should match entity.roomId, but use current for safety
                    var playerFacing = this.scene.playerDirection;
                    // Create the visual bag sprite regardless of loot content
                    this.scene.bagManager.createBagForNPC(entityId, currentRoomId, 'player', playerFacing, finalLootObjects);
                    console.log("[DEBUG] Loot bag created for ".concat(entityId, " in room ").concat(currentRoomId, " (Loot count: ").concat(finalLootObjects.length, ")."));
                    // Remove entity immediately after handling loot registration/bag creation
                    this.entities.delete(entityId);
                    console.log("[DEBUG] Defeat: Removed entity ".concat(entityId, " (").concat(entityType, ") from room ").concat(roomId, "."));
                    // Start the room cooldown *after* removing the entity
                    this.startRoomCooldown(roomId);
                } else {
                    // --- Handle FLEE ---
                    // Record flee time for the fixed short flee cooldown
                    this.lastFleeTime[entityType] = Date.now();
                    console.log("[DEBUG] Flee: Type cooldown started for ".concat(entityType, " at ").concat(this.lastFleeTime[entityType], " (Duration: ").concat(this.FLEE_COOLDOWN / 1000, "s)"));
                    // Schedule the entity removal after the waiting duration
                    console.log("[DEBUG] Flee: Entity ".concat(entityId, " (").concat(entityType, ") will wait in room ").concat(roomId, " for ").concat(this.WAITING_DURATION / 1000, "s."));
                    var waitingTimer = this.scene.time.delayedCall(this.WAITING_DURATION, function() {
                        // Clear timer reference *before* potential removal/cooldown logic
                        _this.waitingTimers.delete(entityId);
                        // Check if entity still exists before removing
                        if (_this.entities.has(entityId)) {
                            // Removed healthBar destruction logic
                            _this.entities.delete(entityId);
                            console.log("[DEBUG] Flee: Waiting time expired. Removed entity ".concat(entityId, " (").concat(entityType, ") from room ").concat(roomId, "."));
                            // Start the room cooldown *after* the fleeing entity is removed
                            _this.startRoomCooldown(roomId);
                        } else {
                            console.log("[DEBUG] Flee: Waiting time expired for ".concat(entityId, ", but entity was already removed (likely defeated/re-entered). Room cooldown will be set by defeat logic if needed."));
                        // Don't call startRoomCooldown here, it was handled by the defeat path or cancelled on re-entry
                        }
                    });
                    // Store the timer reference
                    this.waitingTimers.set(entityId, waitingTimer);
                }
                // --- Reset Encounter State (Common for both Defeat and Flee) ---
                this.turnQueue = [];
                this.currentTurn = null;
                this.scene.events.emit('endEncounter'); // Signal encounter end
            }
        },
        {
            // --- New Method: submitTalk ---
            key: "submitTalk",
            value: function submitTalk(message) {
                var initiatorId = this.playerId; // Always player initiating from input, use unique ID
                // Find the target entity ID from the current turn queue
                var targetId = this.turnQueue.find(function(id) {
                    return id !== initiatorId;
                });
                if (!targetId || !this.entities.has(targetId)) {
                    console.error("[ERROR] submitTalk: Cannot find valid target entity ID for player's turn. Target: ".concat(targetId, ", Queue: ").concat(this.turnQueue.join(',')));
                    // Attempt to cleanup or end turn gracefully if possible
                    this.scene.stopActionMenuTimer(); // Stop timer even if target is invalid
                    this.endTurn(initiatorId);
                    return;
                }
                var target = this.entities.get(targetId);
                var targetDef = getCharacterDefinition(target.type); // Get definition
                var targetName = targetDef ? targetDef.name : target.type; // Use name from definition
                console.log('[DEBUG] submitTalk: Player submitting message "'.concat(message, '" to ').concat(targetId, " (").concat(targetName, ")."));
                // 1. Stop the action menu timer in DungeonScene
                this.scene.stopActionMenuTimer();
                // NOTE: The menu destruction itself is handled by DungeonScene's handleTalkSubmit
                // which calls removeTalkInputAndListeners()
                // 2. Store the message in pendingTalks (player is initiator) - Use player's ID as key
                this.pendingTalks.set(initiatorId, {
                    targetId: targetId,
                    message: message
                });
                // 3. Show specific action prompt confirming what the player said, based on punctuation
                var confirmationPrompt = '';
                if (message.endsWith('!')) {
                    confirmationPrompt = 'You yell "'.concat(message, '" at the ').concat(targetName, ".");
                } else if (message.endsWith('.')) {
                    confirmationPrompt = 'You say "'.concat(message, '" to the ').concat(targetName, ".");
                } else {
                    confirmationPrompt = 'You say "'.concat(message, '" to the ').concat(targetName, "."); // Default if no specific punctuation
                }
                this.scene.events.emit('showActionPrompt', confirmationPrompt);
                // 4. End the player's turn
                this.endTurn(initiatorId);
            }
        },
        {
            // --- End New Method ---
            // Handle spell casting
            key: "handleSpellCast",
            value: function handleSpellCast(initiatorId, targetId, spellName) {
                if (initiatorId === this.playerId) {
                    // Add roomId to payload
                    const roomId = this.entities.get(targetId)?.roomId;
                    this.socket.emit('attack_intent', {
                        initiatorId: this.playerId,
                        targetId,
                        attackType: 'spell',
                        spellName,
                        roomId
                    });
                    return;
                }
                // TODO: Migrate AI/NPC spell attacks to server authority
                // For now, keep legacy logic for AI/NPCs until migration is complete
                // ... (existing AI/NPC spell logic, to be migrated next) ...
            }
        },
        {
            // Helper method to generate spell effect text
            key: "getSpellEffectText",
            value: function getSpellEffectText(spellName, spellResult) {
                let text = `It deals ${spellResult.damage} damage`;
                if (spellResult.effects && spellResult.effects.length > 0) {
                    text += ` and ${spellResult.effects.join(", ")}`;
                }
                text += ".";
                return text;
            }
        }
    ]);
    return EncounterManager;
}();
