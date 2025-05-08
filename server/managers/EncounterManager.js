// EncounterManager for server authority
// Migrated from src/EncounterManager.js
// All logic/state is server-side; visuals/Phaser code is client-side only

import { getHealthFromVIT, getPhysicalAttackFromSTR, getDefenseFromVIT } from './StatDefinitions.js';
import { itemData } from './BagManager.js';
import { getCharacterDefinition } from './CharacterTypes.js';
import { PlayerStats } from './PlayerStats.js';

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

    initializeEncounter(room, playerId) {
        // TODO: Implement server-side encounter initialization logic
    }

    startTurnBasedEncounter(entityId, roomId, enemyStartsFirst, playerId) {
        // TODO: Implement server-side turn-based encounter logic
    }

    handleAttack(initiatorId, targetId, playerId, dungeon, players) {
        // Validate entities
        const initiator = this.entities.get(initiatorId);
        const target = this.entities.get(targetId);
        if (!initiator || !target) {
            return { success: false, message: 'Invalid attacker or target.' };
        }
        // Get stats
        const initiatorStats = new PlayerStats(initiatorId, initiator.statBlock);
        const targetStats = new PlayerStats(targetId, target.statBlock);
        // Calculate damage
        const damage = initiatorStats.getPhysicalDamage();
        const actualDamage = targetStats.applyDamage(damage);
        // Update health
        target.health = Math.max(0, targetStats._currentHealth);
        // Check for death
        const died = target.health <= 0;
        // Build result
        return {
            success: true,
            initiatorId,
            targetId,
            damage: actualDamage,
            targetHealth: target.health,
            died,
            message: `${initiator.type} attacked ${target.type} for ${actualDamage} damage${died ? ' and killed them!' : '.'}`
        };
    }

    endTurn(initiatorId) {
        // TODO: Implement server-side turn rotation logic
    }

    endEncounter(entityId) {
        // TODO: Implement server-side encounter cleanup logic
    }

    handleSteal(initiatorId, targetId, playerId, dungeon, players) {
        // Validate entities
        const initiator = this.entities.get(initiatorId) || players.get(initiatorId);
        const target = this.entities.get(targetId) || players.get(targetId);
        if (!initiator || !target) {
            return { success: false, message: 'Invalid initiator or target.' };
        }
        // Determine if target is player or NPC
        let success = false;
        let itemStolen = null;
        let message = '';
        if (target.inventory && target.inventory.length > 0) {
            // Steal from player
            const idx = Math.floor(Math.random() * target.inventory.length);
            itemStolen = target.inventory.splice(idx, 1)[0];
            if (initiator.inventory) {
                initiator.inventory.push(itemStolen);
                success = true;
                message = `${initiatorId} stole ${itemStolen.name || itemStolen.itemKey} from ${targetId}!`;
            } else {
                // NPCs may not have inventory, just remove from player
                success = true;
                message = `${initiatorId} stole ${itemStolen.name || itemStolen.itemKey} from ${targetId}!`;
            }
        } else if (target.instanceLoot && target.instanceLoot.length > 0) {
            // Steal from NPC
            const idx = Math.floor(Math.random() * target.instanceLoot.length);
            itemStolen = target.instanceLoot.splice(idx, 1)[0];
            if (initiator.inventory) {
                initiator.inventory.push(itemStolen);
            }
            success = true;
            message = `${initiatorId} stole ${itemStolen} from ${targetId}!`;
        } else {
            message = `${initiatorId} tried to steal from ${targetId}, but nothing was available!`;
        }
        return {
            success,
            initiatorId,
            targetId,
            item: itemStolen,
            message
        };
    }
}

export default EncounterManager; 