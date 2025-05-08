// TreasureManager for server authority
// Migrated from src/TreasureManager.js
// All logic/state is server-side; visuals/Phaser code is client-side only

class TreasureManager {
    constructor() {
        this.treasures = new Map();
        this.treasureWallDirections = new Map();
    }
    initializeTreasures(room) {
        if (!room.treasureLevel) return;
        if (this.treasures.has(room.id)) return;
        let itemKey = null;
        if (room.treasureLevel === 'sword1') itemKey = 'sword1';
        else if (room.treasureLevel === 'helm1') itemKey = 'helm1';
        else if (room.treasureLevel === 'Potion1(red)') itemKey = 'Potion1(red)';
        else return;
        this.treasures.set(room.id, { itemKey });
    }
    collectTreasure(room) {
        if (!room.treasureLevel) return null;
        let itemKey = null;
        if (room.treasureLevel === 'sword1') itemKey = 'sword1';
        else if (room.treasureLevel === 'helm1') itemKey = 'helm1';
        else if (room.treasureLevel === 'Potion1(red)') itemKey = 'Potion1(red)';
        else return null;
        room.treasureLevel = null;
        this.treasures.delete(room.id);
        return itemKey;
    }
    clearTreasures() {
        this.treasures.clear();
    }
}

export { TreasureManager }; 