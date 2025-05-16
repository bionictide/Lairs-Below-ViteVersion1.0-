// NPCLootManager.js (Server)
// All loot tables, item data, and loot probability logic for server-authoritative loot generation.

const itemData = {
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
const lootTiers = {
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

function getLootForTier(tierName) {
    const tierProbabilities = lootTiers[tierName];
    if (!tierProbabilities) {
        console.warn(`[NPCLootManager - getLootForTier] No loot tier definition found for tier: ${tierName}`);
        return null;
    }
    // Validate item keys exist in this module's itemData
    const validatedProbabilities = {};
    for (const itemKey in tierProbabilities) {
        if (itemData[itemKey]) {
            validatedProbabilities[itemKey] = tierProbabilities[itemKey];
        } else {
            console.warn(`[NPCLootManager - getLootForTier] Loot tier '${tierName}' references item key '${itemKey}' which is not defined in itemData.`);
        }
    }
    return validatedProbabilities;
}

module.exports = {
    itemData,
    lootTiers,
    getLootForTier
}; 