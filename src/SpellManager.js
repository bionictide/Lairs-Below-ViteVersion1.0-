import Phaser from 'https://esm.sh/phaser@3.60.0';

export class SpellManager {
    constructor(bagManager, playerStats, combatVisuals) {
        this.bagManager = bagManager;
        this.playerStats = playerStats;
        this.combatVisuals = combatVisuals;

        // Define spell requirements
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

        // Define spell base data
        this.spellData = new Map([
            ["Blizzard", {
                magicalBaseDamage: 75,
                element: "ice",
                effects: []
            }],
            ["Firestorm", {
                magicalBaseDamage: 100,
                element: "fire",
                effects: []
            }],
            ["Void Blast", {
                magicalBaseDamage: 125,
                element: "void",
                effects: []
            }],
            ["Neutron Crucible", {
                magicalBaseDamage: 300,
                element: "all",
                effects: []
            }],
            ["Toxic Gaze", {
                magicalBaseDamage: 80,
                element: "poison",
                effects: ["poison"]
            }],
            ["Stop Breathing", {
                magicalBaseDamage: 175,
                element: "air",
                effects: ["stun"]
            }],
            ["Break Time", {
                magicalBaseDamage: 150,
                element: "time",
                effects: ["slow"]
            }],
            ["Bullet Hell", {
                magicalBaseDamage: 200,
                element: "physical",
                effects: []
            }],
            ["Earthquake", {
                magicalBaseDamage: 125,
                element: "earth",
                effects: ["knockdown"]
            }]
        ]);

        console.log("SpellManager initialized with", this.spellGemRequirements.size, "spells");
    }

    // Get list of all available spells
    getAllSpells() {
        return Array.from(this.spellGemRequirements.keys());
    }

    // Check if player has required gems for a spell
    hasRequiredGemsForSpell(spellName) {
        const requiredGems = this.spellGemRequirements.get(spellName);
        if (!requiredGems) return false;
        
        return requiredGems.every(gem => this.bagManager.hasItem(gem));
    }

    // Get list of spells that can be cast based on available gems
    getValidSpells() {
        return this.getAllSpells().filter(spell => this.hasRequiredGemsForSpell(spell));
    }

    // Get requirements for a spell
    getSpellRequirements(spellName) {
        return this.spellGemRequirements.get(spellName) || [];
    }

    // Get base spell data for PlayerStats to modify
    getSpellData(spellName) {
        const data = this.spellData.get(spellName);
        if (!data) {
            console.warn(`No spell data found for ${spellName}`);
            return null;
        }
        return { ...data }; // Return a copy to prevent modification of base data
    }

    // Process spell cast request
    processSpellCast(spellName) {
        // Verify spell exists and requirements are met
                if (!this.hasRequiredGemsForSpell(spellName)) {
            console.warn(`Cannot cast ${spellName}: missing required gems`);
            return null;
                }

        // Get base spell data
        const spellData = this.getSpellData(spellName);
        if (!spellData) return null;

        // Send to PlayerStats for modification and return the result
        return this.playerStats.modifyMagicalDamage(spellData);
            }
        }
