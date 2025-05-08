// PlayerStats for server authority
// Migrated from src/PlayerStats.js
// All logic/state is server-side; visuals/Phaser code is client-side only
import { getHealthFromVIT, getPhysicalAttackFromSTR, getDefenseFromVIT, getMagicBonusFromINT } from './StatDefinitions.js';

class PlayerStats {
    constructor(playerId, statBlock) {
        this.playerId = playerId;
        statBlock = statBlock || { vit: 20, str: 20, int: 20, dex: 20, mnd: 20, spd: 20 };
        this.statBlock = statBlock;
        this._maxHealth = getHealthFromVIT(statBlock.vit);
        this._currentHealth = this._maxHealth;
        this.physicalBaseDamage = getPhysicalAttackFromSTR(statBlock.str);
        this.magicalBaseDamage = getMagicBonusFromINT(statBlock.int) * 100;
        this.elementalBaseDamage = 0;
        this._defenseRating = getDefenseFromVIT(statBlock.vit);
        this.itemDefenseBonus = 0;
        this.swordCount = 0;
        this.physicalDamageMultiplier = 1.0;
        this.magicalDamageMultiplier = 1.0;
        this.elementalDamageMultiplier = 1.0;
        this.ITEM_STATS = {
            'sword1': { physicalDamageMultiplier: 1.5 },
            'helm1': { defense: 0.10 }
        };
    }
    getMaxHealth() { return this._maxHealth; }
    getCurrentHealth() { return this._currentHealth; }
    getPhysicalDamage() {
        let finalPhysicalDamage = this.physicalBaseDamage;
        if (this.swordCount > 0) {
            finalPhysicalDamage *= Math.pow(this.ITEM_STATS['sword1'].physicalDamageMultiplier, this.swordCount);
        }
        return Math.ceil(finalPhysicalDamage);
    }
    getDefenseRating() {
        const totalDefense = this._defenseRating + this.itemDefenseBonus;
        return Math.min(0.9, totalDefense);
    }
    applyDamage(rawDamage) {
        const mitigation = 1.0 - this.getDefenseRating();
        const finalPhysicalDamage = Math.max(0, Math.floor(rawDamage * mitigation));
        this._currentHealth = Math.max(0, this._currentHealth - finalPhysicalDamage);
        return finalPhysicalDamage;
    }
    applyHealing(amount) {
        const previousHealth = this._currentHealth;
        this._currentHealth = Math.min(this.getMaxHealth(), this._currentHealth + amount);
        return this._currentHealth - previousHealth;
    }
    setHealth(newHealth) {
        this._currentHealth = Math.max(0, Math.min(newHealth, this.getMaxHealth()));
    }
    updateStatsFromInventory(items = []) {
        this.itemDefenseBonus = 0;
        this.swordCount = 0;
        items.forEach(itemInstance => {
            const itemKey = itemInstance.itemKey;
            const stats = this.ITEM_STATS[itemKey];
            if (stats) {
                if (stats.defense) this.itemDefenseBonus += stats.defense;
                if (stats.physicalDamageMultiplier && itemKey === 'sword1') this.swordCount++;
            }
        });
    }
    modifyMagicalDamage(spellData) {
        if (!spellData) return null;
        const modifiedSpell = { ...spellData };
        modifiedSpell.damage = modifiedSpell.magicalBaseDamage;
        modifiedSpell.originalBase = modifiedSpell.magicalBaseDamage;
        delete modifiedSpell.magicalBaseDamage;
        return modifiedSpell;
    }
    getMagicalDamage(spellData) {
        let finalMagicalDamage = spellData.damage;
        finalMagicalDamage *= this.magicalDamageMultiplier;
        if (spellData.element) {
            finalMagicalDamage *= this.getElementalDamageMultiplier(spellData.element);
        }
        return Math.round(finalMagicalDamage);
    }
    getMagicalDamageMultiplier() { return this.magicalDamageMultiplier; }
    getElementalDamageMultiplier(element) { return this.elementalDamageMultiplier; }
}

export { PlayerStats }; 