// PuzzleManager for server authority
// Migrated from src/PuzzleManager.js
// All logic/state is server-side; visuals/Phaser code is client-side only

class PuzzleManager {
    constructor() {
        this.puzzles = new Map();
        this.keyWallDirections = new Map();
    }
    initializePuzzles(room) {
        if (room.puzzleType !== 'key') return;
        if (this.puzzles.has(room.id)) return;
        this.puzzles.set(room.id, { itemKey: 'Key1' });
    }
    collectPuzzle(room) {
        if (room.puzzleType !== 'key') return null;
        room.puzzleType = null;
        this.puzzles.delete(room.id);
        return 'Key1';
    }
    clearPuzzles() {
        this.puzzles.clear();
    }
}

export { PuzzleManager }; 