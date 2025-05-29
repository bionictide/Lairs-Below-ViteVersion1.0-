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
    this.activeEffects = {}; // { effectType: { stacks, expiresAt, intervalMs } }
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
  applyDamage(rawDamage, socket, playerId) {
    const mitigation = 1.0 - this.getDefenseRating();
    const finalPhysicalDamage = Math.max(0, Math.floor(rawDamage * mitigation));
    this._currentHealth = Math.max(0, this._currentHealth - finalPhysicalDamage);
    if (socket && playerId) {
      socket.emit('HEALTH_UPDATE', { playerId, health: this._currentHealth, maxHealth: this._maxHealth });
    }
    return finalPhysicalDamage;
  }
  applyHealing(amount, socket, playerId) {
    const previousHealth = this._currentHealth;
    this._currentHealth = Math.min(this.getMaxHealth(), this._currentHealth + amount);
    if (socket && playerId) {
      socket.emit('HEALTH_UPDATE', { playerId, health: this._currentHealth, maxHealth: this._maxHealth });
    }
    return this._currentHealth - previousHealth;
  }
  setHealth(newHealth, socket, playerId) {
    this._currentHealth = Math.max(0, Math.min(newHealth, this.getMaxHealth()));
    if (socket && playerId) {
      socket.emit('HEALTH_UPDATE', { playerId, health: this._currentHealth, maxHealth: this._maxHealth });
    }
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
  /**
   * Get evasion chance as a percentage (1 SPD = 0.5 evasion, 1 evasion = 1% dodge chance)
   */
  getEvasion() {
    return this.spd * 0.5;
  }

  /**
   * Roll for dodge. Returns true if attack is dodged.
   */
  tryDodge() {
    return Math.random() < (this.getEvasion() / 100);
  }

  /**
   * Apply a status effect (e.g., poison, freeze, etc.)
   * @param {object} effectObj - { type, params }
   * @param {PlayerStats} [sourceStats]
   * @returns {object|null} timer info for PlayerManagerServer
   */
  applyStatusEffect(effectObj, sourceStats) {
    const effectType = effectObj.type;
    const params = effectObj.params || {};
    if (effectType === 'poison') {
      // Poison: use params from spell definition
      const now = Date.now();
      const durationMs = params.durationMs || 30000;
      const tickIntervalMs = params.tickIntervalMs || 3000;
      const maxStacks = params.maxStacks || 3;
      const damagePerTick = params.damagePerTick || 5;
      if (!this.activeEffects.poison) {
        this.activeEffects.poison = { stacks: 1, expiresAt: now + durationMs, intervalMs: tickIntervalMs, damagePerTick, maxStacks };
      } else {
        // Stack up to maxStacks
        this.activeEffects.poison.stacks = Math.min(maxStacks, this.activeEffects.poison.stacks + 1);
        // Refresh duration on new stack
        this.activeEffects.poison.expiresAt = now + durationMs;
        this.activeEffects.poison.damagePerTick = damagePerTick;
        this.activeEffects.poison.intervalMs = tickIntervalMs;
        this.activeEffects.poison.maxStacks = maxStacks;
      }
      // Return timer info for PlayerManagerServer
      return { effectType: 'poison', durationMs, tickIntervalMs };
    }
    // ... handle other effects ...
    return null;
  }
}

// Utility to create a PlayerStats from a character definition
export function createStatsFromDefinition(def, inventory = []) {
  return new PlayerStats(def.stats, inventory);
}

/**
 * Resolves a spell or attack action between two players/entities.
 * @param {object} params - { attacker, defender, actionType, spellData, context }
 * @returns {object} result - { damageDealt, crit, dodged, effectsApplied, newHealth, effectTimers, ... }
 */
export function resolveCombatAction({ attacker, defender, actionType, spellData, context }) {
  // 1. Base damage
  let baseDamage = 0;
  let isSpell = actionType === 'spell';
  let isAttack = actionType === 'attack';
  let effectsApplied = [];
  let crit = false;
  let dodged = false;
  let result = {};

  // 2. Stat scaling
  if (isSpell && spellData) {
    // Use PlayerStats to scale spell
    const modifiedSpell = attacker.playerStats.modifyMagicalDamage(spellData);
    baseDamage = attacker.playerStats.getMagicalDamage(modifiedSpell);
    // Apply element multipliers, buffs, debuffs, etc. (already in getMagicalDamage)
    if (spellData.effects) effectsApplied = [...spellData.effects];
  } else if (isAttack) {
    baseDamage = attacker.playerStats.getPhysicalDamage();
  }

  // 3. Crit roll (if not healing)
  if (spellData && spellData.type === 'heal') {
    baseDamage = Math.abs(baseDamage); // healing
  } else {
    const critChance = attacker.playerStats.getCritChance ? attacker.playerStats.getCritChance() : 0.05;
    if (Math.random() < critChance) {
      crit = true;
      baseDamage = Math.round(baseDamage * 1.5); // 50% bonus for crit
    }
  }

  // 4. Dodge roll (if not healing)
  if (!spellData || spellData.type !== 'heal') {
    if (defender.playerStats.tryDodge()) {
      dodged = true;
      baseDamage = 0;
    }
  }

  // 5. Apply damage or healing
  let damageDealt = 0;
  let healed = 0;
  if (spellData && spellData.type === 'heal') {
    healed = defender.playerStats.applyHealing(baseDamage);
  } else {
    damageDealt = defender.playerStats.applyDamage(baseDamage);
  }

  // 6. Apply effects (buffs/debuffs/status)
  let effectTimers = [];
  if (effectsApplied.length > 0 && !dodged) {
    for (const effect of effectsApplied) {
      // Example: poison, freeze, etc. (add to defender's effect list)
      if (defender.playerStats.applyStatusEffect) {
        const timer = defender.playerStats.applyStatusEffect(effect, attacker.playerStats);
        if (timer) effectTimers.push(timer);
      }
    }
  }

  // 7. Return result object
  result = {
    attackerId: attacker.playerId,
    defenderId: defender.playerId,
    actionType,
    spellName: spellData ? spellData.name : null,
    damageDealt,
    healed,
    crit,
    dodged,
    effectsApplied,
    effectTimers,
    newHealth: defender.playerStats.getCurrentHealth(),
    targetDead: defender.playerStats.getCurrentHealth() <= 0
  };
  return result;
}

/**
 * Called by PlayerManagerServer to process periodic effect ticks (e.g., poison, regen).
 * @param {object} player - player object
 * @param {string} effectType - e.g., 'poison', 'regen', etc.
 * @returns {object} tickResult - { effectType, amount, newHealth, expired }
 */
export function processEffectTick(player, effectType) {
  let amount = 0;
  let expired = false;
  if (effectType === 'poison') {
    const effect = player.playerStats.activeEffects.poison;
    if (effect) {
      amount = (effect.damagePerTick || 5) * effect.stacks;
      player.playerStats.applyDamage(amount);
      // Check expiration
      if (Date.now() >= effect.expiresAt) {
        expired = true;
        delete player.playerStats.activeEffects.poison;
      }
    }
  } else if (effectType === 'regen') {
    amount = 10;
    player.playerStats.applyHealing(amount);
  }
  // ... handle other effects ...
  return {
    effectType,
    amount,
    newHealth: player.playerStats.getCurrentHealth(),
    expired
  };
}

// Accepts a full Supabase row, coerces, derives, and returns minimal player object
export function resolvePlayerStatsFromSupabase(character) {
  console.log('[DEBUG] Supabase character row:', character);
  const statblock = {
    vit: Number(character.vit),
    str: Number(character.str),
    int: Number(character.int),
    dex: Number(character.dex),
    mnd: Number(character.mnd),
    spd: Number(character.spd),
    level: Number(character.level)
  };
  console.log('[DEBUG] Coerced statblock:', statblock);
  const playerStats = new PlayerStats(statblock, character.inventory || []);
  console.log('[DEBUG] Derived stats:', {
    health: playerStats.getCurrentHealth(),
    maxHealth: playerStats.getMaxHealth(),
    physicalDamage: playerStats.getPhysicalDamage(),
    defense: playerStats.getDefenseRating(),
    evasion: playerStats.getEvasion(),
    inventory: character.inventory || []
  });
  return {
    id: character.id,
    user_id: character.user_id,
    name: character.name,
    type: character.type,
    level: statblock.level,
    health: playerStats.getCurrentHealth(),
    maxHealth: playerStats.getMaxHealth(),
    physicalDamage: playerStats.getPhysicalDamage(),
    defense: playerStats.getDefenseRating(),
    evasion: playerStats.getEvasion(),
    inventory: character.inventory || [],
    roomId: character.roomId || null,
    // Add any other non-stat fields needed for the client
  };
}
