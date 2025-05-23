// Placeholder item data structure (mirroring BagManager for potential reuse)
// We don't strictly *need* all item data here, just the keys, but it might be useful later.
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
var itemData = {
    'sword1': {
        name: 'Sword',
        asset: 'Sword1',
        width: 3,
        height: 1
    },
    'helm1': {
        name: 'Helm',
        asset: 'Helm1',
        width: 2,
        height: 2
    },
    'Potion1(red)': {
        name: 'Red Potion',
        asset: 'Potion1(red)',
        width: 1,
        height: 1
    },
    'Key1': {
        name: 'Key',
        asset: 'Key1',
        width: 2,
        height: 1
    }
};
// Define loot probabilities per Tier
// Structure: { itemKey: probability (0.0-1.0) }
var lootTiers = {
    'Common': {
        'Potion1(red)': 0.30 // 30% chance of red potions
    },
    'Uncommon': {
        'Potion1(red)': 0.30,
        'helm1': 0.20 // 20% chance of helms (Unchanged)
    },
    'Rare': {
        'Potion1(red)': 0.20,
        'helm1': 0.30,
        'sword1': 0.20 // 20% chance of swords
    },
    'Epic': {
        'Potion1(red)': 0.50,
        'helm1': 0.40,
        'sword1': 0.30,
        'Key1': 0.20 // 20% chance of key (+10%)
    },
    'Legendary': {
        'Potion1(red)': 0.70,
        'helm1': 0.60,
        'sword1': 0.40,
        'Key1': 0.35 // 35% chance of key (+10%)
    }
};
export var NPCLootManager = /*#__PURE__*/ function() {
    "use strict";
    function NPCLootManager(scene) {
        _class_call_check(this, NPCLootManager);
        this.scene = scene;
        console.log("[NPCLootManager] Initialized with Tier system.");
    }
    _create_class(NPCLootManager, [
        {
            /**
     * Returns an object mapping item keys to their drop probabilities for a given loot tier.
     * Used by EncounterManager to calculate initial `instanceLoot` for newly created entities.
     * @param {string} tierName - The name of the loot tier (e.g., 'Common', 'Rare').
     * @returns {object|null} An object like { 'itemKey': probability (0.0-1.0) } or null if the tier is not found.
     */ key: "getLootForTier",
            value: function getLootForTier(tierName) {
                var tierProbabilities = lootTiers[tierName];
                if (!tierProbabilities) {
                    console.warn("[NPCLootManager - getLootForTier] No loot tier definition found for tier: ".concat(tierName));
                    return null;
                }
                // Validate item keys exist in this module's itemData
                var validatedProbabilities = {};
                for(var itemKey in tierProbabilities){
                    if (tierProbabilities.hasOwnProperty(itemKey)) {
                        if (itemData[itemKey]) {
                            validatedProbabilities[itemKey] = tierProbabilities[itemKey];
                        } else {
                            console.warn("[NPCLootManager - getLootForTier] Loot tier '".concat(tierName, "' references item key '").concat(itemKey, "' which is not defined in NPCLootManager's itemData."));
                        }
                    }
                }
                // console.log(`[NPCLootManager - getLootForTier] Probabilities for tier ${tierName}:`, validatedProbabilities);
                return validatedProbabilities;
            }
        }
    ]);
    return NPCLootManager;
}();
