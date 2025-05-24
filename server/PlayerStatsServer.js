// PlayerStatsServer.js
// Server-authoritative player stats and stat manipulation utilities.

import * as StatDefinitions from './StatDefinitionsServer.js';

export class PlayerStats {
  constructor(baseStats = {}, inventory = []) {
    if (
      baseStats.vit === undefined ||
      baseStats.str === undefined ||
      baseStats.int === undefined ||
      baseStats.dex === undefined ||
      baseStats.mnd === undefined ||
      baseStats.spd === undefined
    ) {
      throw new Error('All base stats (vit, str, int, dex, mnd, spd) must be provided');
    }
    this.vit = baseStats.vit;
    this.str = baseStats.str;
    this.int = baseStats.int;
    this.dex = baseStats.dex;
    this.mnd = baseStats.mnd;
    this.spd = baseStats.spd;
    // Derived stats
    this._maxHealth = StatDefinitions.getHealthFromVIT(this.vit);
    this._currentHealth = this._maxHealth;
    this.physicalBaseDamage = StatDefinitions.getPhysicalAttackFromSTR(this.str);
    this.magicalBaseDamage = StatDefinitions.getMagicBonusFromINT(this.int) * 100;
    this._defenseRating = StatDefinitions.getDefenseFromVIT(this.vit);
    this.itemDefenseBonus = 0;
    this.swordCount = 0;
    this.physicalDamageMultiplier = 1.0;
    this.magicalDamageMultiplier = 1.0;
    this.elementalDamageMultiplier = 1.0;
    this.ITEM_STATS = {
      'sword1': { physicalDamageMultiplier: 1.5 },
      'helm1': { defense: 0.10 }
    };
    this.updateStatsFromInventory(inventory);
  }

  getMaxHealth() {
    return this._maxHealth;
  }
  getCurrentHealth() {
    return this._currentHealth;
  }
  getPhysicalDamage() {
    let finalPhysicalDamage = this.physicalBaseDamage;
    if (this.swordCount > 0) {
      finalPhysicalDamage *= Math.pow(this.ITEM_STATS['sword1'].physicalDamageMultiplier, this.swordCount);
    }
    return Math.ceil(finalPhysicalDamage);
  }
  getDefenseRating() {
    const totalDefense = this._defenseRating + this.itemDefenseBonus;
    return Math.min(0.9, totalDefense * 0.01);
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
  getMagicalDamageMultiplier() {
    return this.magicalDamageMultiplier;
  }
  getElementalDamageMultiplier(element) {
    return this.elementalDamageMultiplier;
  }
  // Add more methods as needed for steal, crit, etc.
}

// Utility to create a PlayerStats from a character definition
export function createStatsFromDefinition(def, inventory = []) {
  return new PlayerStats(def.stats, inventory);
}
