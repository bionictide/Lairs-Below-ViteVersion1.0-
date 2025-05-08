// ShelfManager for server authority
// Migrated from src/ShelfManager.js
// All logic/state is server-side; visuals/Phaser code is client-side only

class ShelfManager {
    constructor() {
        this.shelves = new Map();
        this.shelfWallDirections = new Map();
    }
    initializeShelves(room) {
        if (!room.hasShelfEmpty && !room.hasShelf2Empty) return;
        if (this.shelves.has(room.id)) return;
        const shelfData = {};
        if (room.hasShelfEmpty && room.gemType) {
            let gemKey = null;
            if (room.gemType === 'ShelfEmerald') gemKey = 'Emerald';
            else if (room.gemType === 'ShelfBlueApatite') gemKey = 'BlueApatite';
            else if (room.gemType === 'ShelfAmethyst') gemKey = 'Amethyst';
            else if (room.gemType === 'ShelfRawRuby') gemKey = 'RawRuby';
            if (gemKey) shelfData.gemKey = gemKey;
        }
        if (room.hasShelf2Empty && room.hasPotion) {
            shelfData.potion = 'Potion1(red)';
        }
        this.shelves.set(room.id, shelfData);
    }
    collectGem(room) {
        if (!room.hasShelfEmpty || !room.gemType) return null;
        let gemKey = null;
        if (room.gemType === 'ShelfEmerald') gemKey = 'Emerald';
        else if (room.gemType === 'ShelfBlueApatite') gemKey = 'BlueApatite';
        else if (room.gemType === 'ShelfAmethyst') gemKey = 'Amethyst';
        else if (room.gemType === 'ShelfRawRuby') gemKey = 'RawRuby';
        if (!gemKey) return null;
        room.gemType = null;
        return gemKey;
    }
    collectPotion(room) {
        if (!room.hasShelf2Empty || !room.hasPotion) return null;
        room.hasPotion = false;
        return 'Potion1(red)';
    }
    clearShelves() {
        this.shelves.clear();
    }
}

export { ShelfManager }; 