// EncounterManager for server authority
// Migrated from src/EncounterManager.js
// All logic/state is server-side; visuals/Phaser code is client-side only

import { getHealthFromVIT, getPhysicalAttackFromSTR, getDefenseFromVIT } from './StatDefinitions.js';
import { itemData } from './BagManager.js';
import { getCharacterDefinition } from './CharacterTypes.js';

function weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
        if (random < item.weight) return item.type;
        random -= item.weight;
    }
    return items.length > 0 ? items[0].type : null;
}

class EncounterManager {
    constructor() {
        this.entities = new Map(); // id: { type, health, roomId }
        this.turnQueue = [];
        this.currentTurn = null;
        this.pendingTalks = new Map();
        this.lastEncounterTime = {};
        this.lastFleeTime = {};
        this.defeatCooldowns = { elvaan: 120000, dwarf: 180000, gnome: 60000, bat: 30000 };
        this.FLEE_COOLDOWN = 30000;
        this.WAITING_DURATION = 30000;
        this.encounterWeights = { bat: 40, gnome: 30, elvaan: 20, dwarf: 10 };
        this.ROOM_COOLDOWN_DURATION = 5 * 60 * 1000;
        this.waitingTimers = new Map();
    }
    // ... (migrate all logic methods, remove Phaser/scene/UI code, keep only state/logic)
}

export default EncounterManager; 