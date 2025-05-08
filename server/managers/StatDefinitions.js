// StatDefinitions.js (server authority)
// Centralized stat conversion functions for all base stats.
// Use these functions everywhere you need to convert base stats to derived stats.

export function getHealthFromVIT(vit) {
  return 50 * vit;
}

export function getDefenseFromVIT(vit) {
  return 0.5 * vit;
}

export function getPhysicalAttackFromSTR(str) {
  return 10 * str;
}

export function getMagicBonusFromINT(intStat) {
  return 0.10 * intStat;
}

export function getMagicDefenseFromINT(intStat) {
  return 0.5 * intStat;
}

export function getStealBonusFromDEX(dex) {
  return 0.02 * dex;
}

export function getCritDamageFromDEX(dex) {
  return 0.10 * dex;
}

export function getManaFromMND(mnd) {
  return 10 * mnd;
}

export function getCritSpellBonusFromMND(mnd) {
  return 0.10 * mnd;
}

export function getFleeChanceFromSPD(spd) {
  return 0.02 * spd;
}

export const BASE_CRIT_CHANCE = 0.05;
export const BASE_CRIT_DAMAGE = 1.5;
export const BASE_CRIT_SPELL_CHANCE = 0.10;
export const BASE_CRIT_SPELL_DAMAGE = 2.0; 