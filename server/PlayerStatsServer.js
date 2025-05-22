// PlayerStatsServer.js
// Handles stat construction for players and NPCs

import { getHealthFromVIT, getDefenseFromVIT, getPhysicalAttackFromSTR, getMagicBonusFromINT, getMagicDefenseFromINT, getManaFromMND, getCritSpellBonusFromMND, getFleeChanceFromSPD, getEvasionFromSPD } from './StatDefinitionsServer.js';
import { CharacterTypes } from './CharacterTypesServer.js';

// Build stats for a player using Supabase profile
export function buildPlayerStats(playerData) {
  const stats = playerData.stats || {};

  return {
    ...stats,
    hp: getHealthFromVIT(stats.vit),
    def: getDefenseFromVIT(stats.vit),
    atk: getPhysicalAttackFromSTR(stats.str),
    magicBonus: getMagicBonusFromINT(stats.int),
    magicDefense: getMagicDefenseFromINT(stats.int),
    mana: getManaFromMND(stats.mnd),
    critSpellBonus: getCritSpellBonusFromMND(stats.mnd),
    fleeChance: getFleeChanceFromSPD(stats.spd),
    evasion: getEvasionFromSPD(stats.spd)
  };
}

// Build stats for NPCs using CharacterTypes
export function buildNPCStats(type) {
  const base = CharacterTypes[type]?.stats;
  if (!base) return null;

  return {
    ...base,
    hp: getHealthFromVIT(base.vit),
    def: getDefenseFromVIT(base.vit),
    atk: getPhysicalAttackFromSTR(base.str),
    magicBonus: getMagicBonusFromINT(base.int),
    magicDefense: getMagicDefenseFromINT(base.int),
    mana: getManaFromMND(base.mnd),
    critSpellBonus: getCritSpellBonusFromMND(base.mnd),
    fleeChance: getFleeChanceFromSPD(base.spd),
    evasion: getEvasionFromSPD(base.spd)
  };
}

// TEMP: Stub for getPlayerStatsById to resolve import error
export function getPlayerStatsById(id) {
  // TODO: Implement this to fetch player stats by ID from your server state
  return null;
}
