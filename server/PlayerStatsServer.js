// PlayerStatsServer.js
// Server-authoritative player stats and stat manipulation utilities.

import * as StatDefinitions from './StatDefinitionsServer.js';

export class PlayerStats {
  constructor(baseStats = {}) {
    this.vit = baseStats.vit || 0;
    this.str = baseStats.str || 0;
    this.int = baseStats.int || 0;
    this.dex = baseStats.dex || 0;
    this.mnd = baseStats.mnd || 0;
    this.spd = baseStats.spd || 0;
    // Derived stats
    this.health = StatDefinitions.getHealthFromVIT(this.vit);
    this.defense = StatDefinitions.getDefenseFromVIT(this.vit);
    this.physicalAttack = StatDefinitions.getPhysicalAttackFromSTR(this.str);
    this.magicBonus = StatDefinitions.getMagicBonusFromINT(this.int);
    this.magicDefense = StatDefinitions.getMagicDefenseFromINT(this.int);
    this.stealBonus = StatDefinitions.getStealBonusFromDEX(this.dex);
    this.critDamage = StatDefinitions.getCritDamageFromDEX(this.dex);
    this.mana = StatDefinitions.getManaFromMND(this.mnd);
    this.critSpellBonus = StatDefinitions.getCritSpellBonusFromMND(this.mnd);
    this.fleeChance = StatDefinitions.getFleeChanceFromSPD(this.spd);
  }

  // Utility to update derived stats after a change
  recalculateDerived() {
    this.health = StatDefinitions.getHealthFromVIT(this.vit);
    this.defense = StatDefinitions.getDefenseFromVIT(this.vit);
    this.physicalAttack = StatDefinitions.getPhysicalAttackFromSTR(this.str);
    this.magicBonus = StatDefinitions.getMagicBonusFromINT(this.int);
    this.magicDefense = StatDefinitions.getMagicDefenseFromINT(this.int);
    this.stealBonus = StatDefinitions.getStealBonusFromDEX(this.dex);
    this.critDamage = StatDefinitions.getCritDamageFromDEX(this.dex);
    this.mana = StatDefinitions.getManaFromMND(this.mnd);
    this.critSpellBonus = StatDefinitions.getCritSpellBonusFromMND(this.mnd);
    this.fleeChance = StatDefinitions.getFleeChanceFromSPD(this.spd);
  }

  // Clone utility
  clone() {
    return new PlayerStats({
      vit: this.vit,
      str: this.str,
      int: this.int,
      dex: this.dex,
      mnd: this.mnd,
      spd: this.spd
    });
  }
}

// Utility to create a PlayerStats from a character definition
export function createStatsFromDefinition(def) {
  return new PlayerStats(def.stats);
}
