// SpellManager for server authority
// Migrated from src/SpellManager.js
// All logic/state is server-side; visuals/Phaser code is client-side only

class SpellManager {
    constructor(bagManager, playerStats) {
        this.bagManager = bagManager;
        this.playerStats = playerStats;
        this.spellGemRequirements = new Map([
            ["Blizzard", ["Blue Apatite"]],
            ["Firestorm", ["Raw Ruby"]],
            ["Void Blast", ["Amethyst"]],
            ["Neutron Crucible", ["Raw Ruby", "Amethyst", "Blue Apatite", "Emerald"]],
            ["Toxic Gaze", ["Emerald"]],
            ["Stop Breathing", ["Blue Apatite", "Raw Ruby", "Emerald"]],
            ["Break Time", ["Amethyst", "Blue Apatite", "Emerald"]],
            ["Earthquake", ["Blue Apatite", "Emerald"]],
            ["Bullet Hell", ["Amethyst", "Blue Apatite", "Raw Ruby"]]
        ]);
        this.spellData = new Map([
            ["Blizzard", { magicalBaseDamage: 75, element: "ice", effects: [] }],
            ["Firestorm", { magicalBaseDamage: 100, element: "fire", effects: [] }],
            ["Void Blast", { magicalBaseDamage: 125, element: "void", effects: [] }],
            ["Neutron Crucible", { magicalBaseDamage: 300, element: "all", effects: [] }],
            ["Toxic Gaze", { magicalBaseDamage: 80, element: "poison", effects: ["poison"] }],
            ["Stop Breathing", { magicalBaseDamage: 175, element: "air", effects: ["stun"] }],
            ["Break Time", { magicalBaseDamage: 150, element: "time", effects: ["slow"] }],
            ["Bullet Hell", { magicalBaseDamage: 200, element: "physical", effects: [] }],
            ["Earthquake", { magicalBaseDamage: 125, element: "earth", effects: ["knockdown"] }]
        ]);
    }
    getAllSpells() {
        return Array.from(this.spellGemRequirements.keys());
    }
    hasRequiredGemsForSpell(spellName) {
        const requiredGems = this.spellGemRequirements.get(spellName);
        if (!requiredGems) return false;
        return requiredGems.every(gem => this.bagManager.hasItem(gem));
    }
    getValidSpells() {
        return this.getAllSpells().filter(spell => this.hasRequiredGemsForSpell(spell));
    }
    getSpellRequirements(spellName) {
        return this.spellGemRequirements.get(spellName) || [];
    }
    getSpellData(spellName) {
        const data = this.spellData.get(spellName);
        if (!data) return null;
        return { ...data };
    }
    processSpellCast(spellName) {
        if (!this.hasRequiredGemsForSpell(spellName)) return null;
        const spellData = this.getSpellData(spellName);
        if (!spellData) return null;
        return this.playerStats.modifyMagicalDamage(spellData);
    }
}

export { SpellManager }; 