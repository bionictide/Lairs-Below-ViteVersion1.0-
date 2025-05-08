// HintManager for server authority
// Migrated from src/HintManager.js
// All logic/state is server-side; visuals/Phaser code is client-side only

class HintManager {
    constructor() {
        this.hints = new Map();
        this.hintWallDirections = new Map();
    }
    initializeHints(room) {
        if (!room.hintContent) return;
        if (this.hints.has(room.id)) return;
        this.hints.set(room.id, room.hintContent);
    }
    getHint(room) {
        if (!room.hintContent) return null;
        return room.hintContent;
    }
    clearHints() {
        this.hints.clear();
    }
}

export { HintManager }; 