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
import Phaser from 'https://esm.sh/phaser@3.60.0'; // For EventEmitter
import { getHealthFromVIT, getPhysicalAttackFromSTR, getDefenseFromVIT, getMagicBonusFromINT, getMagicDefenseFromINT } from './StatDefinitions.js';

export var PlayerStats = /*#__PURE__*/ function() {
    "use strict";
    function PlayerStats(scene, playerId, statBlock, socket) {
        _class_call_check(this, PlayerStats);
        this.scene = scene; // Store the scene reference
        this.playerId = playerId; // Store the unique player ID
        this.socket = socket;
        // --- Stat Block Initialization ---
        // statBlock: { vit, str, int, dex, mnd, spd }
        statBlock = statBlock || { vit: 20, str: 20, int: 20, dex: 20, mnd: 20, spd: 20 }; // fallback defaults
        this.statBlock = statBlock;
        // Derived stats from stat block
        this._maxHealth = getHealthFromVIT(statBlock.vit);
        this._currentHealth = this._maxHealth;
        this.physicalBaseDamage = getPhysicalAttackFromSTR(statBlock.str);
        this.magicalBaseDamage = getMagicBonusFromINT(statBlock.int) * 100; // Example: scale base magic damage
        this.elementalBaseDamage = 0; // Extend as needed
        this._defenseRating = getDefenseFromVIT(statBlock.vit);
        this.events = new Phaser.Events.EventEmitter();
        this.itemDefenseBonus = 0; // Additive defense bonus from items
        this.swordCount = 0; // Count of swords for multiplicative damage
        // Damage multipliers
        this.physicalDamageMultiplier = 1.0;
        this.magicalDamageMultiplier = 1.0;
        this.elementalDamageMultiplier = 1.0;
        // Define base stats/effects for known items
        this.ITEM_STATS = {
            'sword1': {
                physicalDamageMultiplier: 1.5
            },
            'helm1': {
                defense: 0.10
            }
        };
    }
    _create_class(PlayerStats, [
        {
            // --- Getters ---
            key: "getMaxHealth",
            value: function getMaxHealth() {
                // TODO: Apply buffs/equipment effects
                return this._maxHealth;
            }
        },
        {
            key: "getCurrentHealth",
            value: function getCurrentHealth() {
                return this._currentHealth;
            }
        },
        {
            key: "getPhysicalDamage",
            value: function getPhysicalDamage() {
                var _this_scene_debugHelper, _this_scene;
                // Check if debug mode is active via the scene's debugHelper
                if ((_this_scene = this.scene) === null || _this_scene === void 0 ? void 0 : (_this_scene_debugHelper = _this_scene.debugHelper) === null || _this_scene_debugHelper === void 0 ? void 0 : _this_scene_debugHelper.visible) {
                    return 500; // Boosted damage in debug mode
                }
                // Calculate base damage (potentially including debug boost first)
                let finalPhysicalDamage = this.physicalBaseDamage;
                
                // Apply multiplicative damage bonus from swords
                if (this.swordCount > 0) {
                    finalPhysicalDamage *= Math.pow(this.ITEM_STATS['sword1'].physicalDamageMultiplier, this.swordCount);
                }
                
                // Round UP to the nearest whole number
                return Math.ceil(finalPhysicalDamage);
            }
        },
        {
            key: "getDefenseRating",
            value: function getDefenseRating() {
                // Apply defense bonus from items, capped at 90% reduction
                var totalDefense = this._defenseRating + this.itemDefenseBonus;
                return Math.min(0.9, totalDefense * 0.01); // 1 DEF = 1% mitigation, cap at 90%
            }
        },
        {
            key: "getStealSuccessBonus",
            value: function getStealSuccessBonus() {
                // TODO: Calculate based on skills, equipment, buffs
                return 0; // Base steal bonus (0% additive)
            }
        },
        {
            key: "getStealProtection",
            value: function getStealProtection() {
                // TODO: Calculate based on skills, equipment, buffs
                return 0; // Base protection against being stolen from (0% reduction in opponent's success)
            }
        },
        {
            // --- Modifiers ---
            key: "applyDamage",
            value: function applyDamage(rawDamage) {
                var mitigation = 1.0 - this.getDefenseRating();
                var finalPhysicalDamage = Math.max(0, Math.floor(rawDamage * mitigation)); // Ensure non-negative damage
                var previousHealth = this._currentHealth;
                this._currentHealth = Math.max(0, this._currentHealth - finalPhysicalDamage); // Prevent health going below 0
                console.log("[PlayerStats] Applied Damage: Raw=".concat(rawDamage, ", Mitigated=").concat(mitigation.toFixed(2), ", Actual=").concat(finalPhysicalDamage, ". Health: ").concat(previousHealth, " -> ").concat(this._currentHealth));
                this.events.emit('healthChanged', this._currentHealth, this.getMaxHealth());
                if (this._currentHealth <= 0) {
                    this.events.emit('playerDied');
                    console.log("[PlayerStats] Player Died!");
                }
                return finalPhysicalDamage; // Return how much damage was actually dealt
            }
        },
        {
            key: "applyHealing",
            value: function applyHealing(amount) {
                var previousHealth = this._currentHealth;
                this._currentHealth = Math.min(this.getMaxHealth(), this._currentHealth + amount); // Cap at max health
                console.log("[PlayerStats] Applied Healing: Amount=".concat(amount, ". Health: ").concat(previousHealth, " -> ").concat(this._currentHealth));
                if (this._currentHealth > previousHealth) {
                    this.events.emit('healthChanged', this._currentHealth, this.getMaxHealth());
                }
                return this._currentHealth - previousHealth; // Return amount actually healed
            }
        },
        {
            // --- Setters (for potential future direct modification/resetting) ---
            key: "setHealth",
            value: function setHealth(newHealth) {
                var previousHealth = this._currentHealth;
                this._currentHealth = Phaser.Math.Clamp(newHealth, 0, this.getMaxHealth());
                console.log("[PlayerStats] Health Set To: ".concat(this._currentHealth));
                if (this._currentHealth !== previousHealth) {
                    this.events.emit('healthChanged', this._currentHealth, this.getMaxHealth());
                }
                if (this._currentHealth <= 0 && previousHealth > 0) {
                    this.events.emit('playerDied');
                    console.log("[PlayerStats] Player Died (via setHealth)!");
                }
            }
        },
        {
            // --- Inventory Stat Calculation ---
            key: "updateStatsFromInventory",
            value: function updateStatsFromInventory() {
                var _this = this;
                var items = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
                // Reset bonuses before recalculating
                this.itemDefenseBonus = 0;
                this.swordCount = 0;
                var healthChanged = false; // Flag if max health changes
                var oldMaxHealth = this.getMaxHealth(); // Get current max before recalc
                // TODO: Recalculate max health bonus from items here if needed in future
                // Iterate through the inventory array of item *instances*
                items.forEach(function(itemInstance) {
                    // Access the itemKey from the instance
                    var itemKey = itemInstance.itemKey;
                    var stats = _this.ITEM_STATS[itemKey];
                    if (stats) {
                        if (stats.defense) {
                            _this.itemDefenseBonus += stats.defense;
                        }
                        if (stats.physicalDamageMultiplier && itemKey === 'sword1') {
                            _this.swordCount++;
                        }
                    // Example for max health bonus later:
                    // if (stats.maxHealth) { this.itemMaxHealthBonus += stats.maxHealth; healthChanged = true; }
                    }
                });
                var newMaxHealth = this.getMaxHealth(); // Get new max after recalc
                // Updated console log
                var damageMultiplier = this.swordCount > 0 ? Math.pow(this.ITEM_STATS['sword1'].physicalDamageMultiplier, this.swordCount).toFixed(2) : '1.00';
                console.log("[PlayerStats] Stats updated from inventory. Swords: ".concat(this.swordCount, " (x").concat(damageMultiplier, " dmg), Defense Bonus: +").concat((this.itemDefenseBonus * 100).toFixed(0), "%"));
                // If max health changed, emit event and potentially adjust current health
                if (healthChanged && newMaxHealth !== oldMaxHealth) {
                    // Optional: Adjust current health proportionally or just clamp
                    this._currentHealth = Math.min(this._currentHealth, newMaxHealth); // Clamp current health
                    this.events.emit('healthChanged', this._currentHealth, newMaxHealth);
                    console.log("[PlayerStats] Max Health changed: ".concat(oldMaxHealth, " -> ").concat(newMaxHealth));
                }
            }
        },
        {
            // Add this method after the existing methods
            key: "modifyMagicalDamage",
            value: function modifyMagicalDamage(spellData) {
                if (!spellData) return null;

                // Clone the data to avoid modifying the original
                const modifiedSpell = { ...spellData };

                // Apply any spell damage modifiers from equipment, buffs, etc.
                // For now we'll just pass through the base damage
                modifiedSpell.damage = modifiedSpell.magicalBaseDamage;

                // Keep track of the original base damage
                modifiedSpell.originalBase = modifiedSpell.magicalBaseDamage;
                delete modifiedSpell.magicalBaseDamage; // Remove base now that we've calculated final

                // Return the modified spell data
                return modifiedSpell;
            }
        },
        {
            // Get final magical damage after applying modifiers
            key: "getMagicalDamage",
            value: function getMagicalDamage(spellData) {
                // Start with damage value (already processed by modifyMagicalDamage)
                let finalMagicalDamage = spellData.damage;

                // Apply magic damage multiplier (can be modified by equipment, buffs, etc)
                finalMagicalDamage *= this.magicalDamageMultiplier;

                // Apply element-specific modifiers if needed
                if (spellData.element) {
                    const elementMultiplier = this.getElementalDamageMultiplier(spellData.element);
                    finalMagicalDamage *= elementMultiplier;
                }

                // Round to nearest integer
                return Math.round(finalMagicalDamage);
            }
        },
        {
            // Get magical damage multiplier (can be modified by equipment/buffs)
            key: "getMagicalDamageMultiplier",
            value: function getMagicalDamageMultiplier() {
                return this.magicalDamageMultiplier;
            }
        },
        {
            // Get elemental damage multiplier (can be modified by equipment/buffs)
            key: "getElementalDamageMultiplier",
            value: function getElementalDamageMultiplier(element) {
                return this.elementalDamageMultiplier;
            }
        }
    ]);

    // Listen for authoritative stat and health updates from server
    this.socket.on('PLAYER_STATS_UPDATE', ({ playerId, statBlock }) => {
        if (playerId === this.playerId) {
            this.statBlock = statBlock;
            // Update derived stats as needed
            this._maxHealth = getHealthFromVIT(statBlock.vit);
            this._currentHealth = Math.min(this._currentHealth, this._maxHealth);
            this.physicalBaseDamage = getPhysicalAttackFromSTR(statBlock.str);
            this.magicalBaseDamage = getMagicBonusFromINT(statBlock.int) * 100;
            this._defenseRating = getDefenseFromVIT(statBlock.vit);
            // Re-render UI or emit events as needed
            this.events.emit('healthChanged', this._currentHealth, this.getMaxHealth());
        }
    });

    this.socket.on('PLAYER_HEALTH_UPDATE', ({ playerId, health }) => {
        if (playerId === this.playerId) {
            this._currentHealth = health;
            this.events.emit('healthChanged', this._currentHealth, this.getMaxHealth());
        }
    });

    return PlayerStats;
}();
