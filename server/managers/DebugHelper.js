// DebugHelper for server authority
// Migrated from src/DebugHelper.js
// All logic/state is server-side; visuals/Phaser code is client-side only

class DebugHelper {
    constructor() {
        this.visible = false;
    }
    setVisibility(visible) {
        this.visible = visible;
    }
    toggleVisibility() {
        this.setVisibility(!this.visible);
    }
}

export { DebugHelper }; 