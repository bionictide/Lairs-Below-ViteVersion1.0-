// StatDefinitions.js
// Centralized stat conversion functions for all base stats.
// Use these functions everywhere you need to convert base stats to derived stats.

// --- Conversion Rates ---
// VIT: +50 health, +0.5 defense per point
// STR: +10 physical attack per point
// INT: +10% magic damage, +0.5 magic defense per point
// DEX: +2% steal, +10% crit damage per point
// MND: +10 mana, +10% crit spell damage per point
// SPD: +2% flee chance per point

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
  return 0.10 * intStat; // Returns as a multiplier (e.g., 0.2 for 2 INT)
}

export function getMagicDefenseFromINT(intStat) {
  return 0.5 * intStat;
}

export function getStealBonusFromDEX(dex) {
  return 0.02 * dex; // 2% per point
}

export function getCritDamageFromDEX(dex) {
  return 0.10 * dex; // 10% per point (additive to base 150%)
}

export function getManaFromMND(mnd) {
  return 10 * mnd;
}

export function getCritSpellBonusFromMND(mnd) {
  return 0.10 * mnd; // 10% per point (additive to base 200%)
}

export function getFleeChanceFromSPD(spd) {
  return 0.02 * spd; // 2% per point
}

// --- Base values for all characters ---
export const BASE_CRIT_CHANCE = 0.05; // 5% physical crit chance
export const BASE_CRIT_DAMAGE = 1.5;  // 150% physical crit damage (multiplier)
export const BASE_CRIT_SPELL_CHANCE = 0.10; // 10% spell crit chance
export const BASE_CRIT_SPELL_DAMAGE = 2.0;  // 200% spell crit damage (multiplier)

// StatDefinitions is stat helper only. No state mutation should occur here. 