// PlayerManagerServer.js
// Authoritative player state and group/encounter management

import { PlayerStats, createStatsFromDefinition } from './PlayerStatsServer.js';

class PlayerManagerServer {
  constructor() {
    this.players = new Map(); // playerId -> player object
  }

  /**
   * Add a new player to the system.
   * @param {string} playerId
   * @param {object} statBlock - { vit, str, int, dex, mnd, spd }
   * @param {object} options - { location, groupId, encounterId, buffs, debuffs, resistances }
   */
  addPlayer(playerId, statBlock, options = {}) {
    if (this.players.has(playerId)) throw new Error(`Player ${playerId} already exists`);
    const playerStats = new PlayerStats(null, playerId, statBlock, null); // scene/socket are not needed server-side
    const player = {
      playerId,
      location: options.location || null, // { roomId, facing }
      groupId: options.groupId || null,
      encounterId: options.encounterId || null,
      playerStats,
      buffs: options.buffs || [],
      debuffs: options.debuffs || [],
      resistances: options.resistances || {},
      alive: true,
      state: 'idle', // idle, in_encounter, in_group, dead, etc.
      lastActive: Date.now(),
    };
    this.players.set(playerId, player);
    return player;
  }

  /**
   * Remove a player from the system.
   * @param {string} playerId
   */
  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  /**
   * Get player object by ID.
   * @param {string} playerId
   * @returns {object|null}
   */
  getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  /**
   * Update player state (location, group, encounter, etc).
   * @param {string} playerId
   * @param {object} updates
   */
  updatePlayer(playerId, updates) {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);
    Object.assign(player, updates);
    player.lastActive = Date.now();
    return player;
  }

  /**
   * Assign player to a group.
   * @param {string} playerId
   * @param {string|null} groupId
   */
  setPlayerGroup(playerId, groupId) {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);
    player.groupId = groupId;
    player.state = groupId ? 'in_group' : 'idle';
    player.lastActive = Date.now();
  }

  /**
   * Assign player to an encounter.
   * @param {string} playerId
   * @param {string|null} encounterId
   */
  setPlayerEncounter(playerId, encounterId) {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);
    player.encounterId = encounterId;
    player.state = encounterId ? 'in_encounter' : 'idle';
    player.lastActive = Date.now();
  }

  /**
   * Mark player as dead or alive.
   * @param {string} playerId
   * @param {boolean} alive
   */
  setPlayerAlive(playerId, alive) {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);
    player.alive = alive;
    player.state = alive ? 'idle' : 'dead';
    player.lastActive = Date.now();
  }

  /**
   * Get all players in a group.
   * @param {string} groupId
   * @returns {Array}
   */
  getPlayersInGroup(groupId) {
    return Array.from(this.players.values()).filter(p => p.groupId === groupId);
  }

  /**
   * Get all players in an encounter.
   * @param {string} encounterId
   * @returns {Array}
   */
  getPlayersInEncounter(encounterId) {
    return Array.from(this.players.values()).filter(p => p.encounterId === encounterId);
  }

  /**
   * Get all players in a room.
   * @param {string} roomId
   * @returns {Array}
   */
  getPlayersInRoom(roomId) {
    return Array.from(this.players.values()).filter(p => p.location && p.location.roomId === roomId);
  }

  /**
   * Get player status (for ManagerManager).
   * @param {string} playerId
   * @returns {object|null}
   */
  getStatus(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return null;
    return {
      playerId: player.playerId,
      location: player.location,
      groupId: player.groupId,
      encounterId: player.encounterId,
      alive: player.alive,
      state: player.state,
      buffs: player.buffs,
      debuffs: player.debuffs,
      resistances: player.resistances,
      lastActive: player.lastActive,
    };
  }

  /**
   * Resolve a physical attack from attacker to defender.
   * @param {string} attackerId
   * @param {string} defenderId
   * @returns {object} result
   */
  resolvePhysicalAttack(attackerId, defenderId) {
    const attacker = this.getPlayer(attackerId);
    const defender = this.getPlayer(defenderId);
    if (!attacker || !defender) return { error: 'Invalid participants' };
    // Evasion check (after all modifiers)
    if (defender.playerStats.tryDodge()) {
      return {
        attackerId,
        defenderId,
        attackValue: attacker.playerStats.getPhysicalDamage(),
        damageDealt: 0,
        dodged: true,
        defenderDead: false,
        defenderHealth: defender.playerStats._currentHealth
      };
    }
    const attackValue = attacker.playerStats.getPhysicalDamage();
    const damageDealt = defender.playerStats.applyDamage(attackValue);
    const defenderDead = defender.playerStats._currentHealth <= 0;
    if (defenderDead) this.setPlayerAlive(defenderId, false);
    return {
      attackerId,
      defenderId,
      attackValue,
      damageDealt,
      dodged: false,
      defenderDead,
      defenderHealth: defender.playerStats._currentHealth
    };
  }

  /**
   * Attempt to steal an item from the target.
   * @param {string} thiefId
   * @param {string} targetId
   * @returns {object} result
   */
  resolveSteal(thiefId, targetId) {
    const thief = this.getPlayer(thiefId);
    const target = this.getPlayer(targetId);
    if (!thief || !target) return { error: 'Invalid participants' };
    const dex = thief.playerStats.dex;
    const stealChance = 0.1 + (dex * 0.02); // 10% base + 2% per DEX
    const hasItems = target.playerStats.inventory && target.playerStats.inventory.length > 0;
    const success = hasItems && Math.random() < stealChance;
    let item = null;
    if (success) {
      item = target.playerStats.inventory.pop();
      thief.playerStats.inventory = thief.playerStats.inventory || [];
      thief.playerStats.inventory.push(item);
    }
    return { thiefId, targetId, success, item };
  }

  /**
   * Attempt to flee from an encounter.
   * @param {string} playerId
   * @param {string} encounterId
   * @returns {object} result
   */
  resolveFlee(playerId, encounterId) {
    const player = this.getPlayer(playerId);
    if (!player) return { error: 'Invalid player' };
    const spd = player.playerStats.spd;
    const fleeChance = 0.2 + (spd * 0.02); // 20% base + 2% per SPD
    const success = Math.random() < fleeChance;
    return { playerId, encounterId, success, fleeChance };
  }

  /**
   * Get a summary of the target's stats, buffs, debuffs, etc.
   * @param {string} targetId
   * @returns {object} info
   */
  getExamineInfo(targetId) {
    const target = this.getPlayer(targetId);
    if (!target) return { error: 'Invalid target' };
    return {
      playerId: target.playerId,
      stats: {
        vit: target.playerStats.vit,
        str: target.playerStats.str,
        int: target.playerStats.int,
        dex: target.playerStats.dex,
        mnd: target.playerStats.mnd,
        spd: target.playerStats.spd,
        health: target.playerStats._currentHealth,
        maxHealth: target.playerStats._maxHealth
      },
      buffs: target.buffs,
      debuffs: target.debuffs,
      resistances: target.resistances
    };
  }
}

const instance = new PlayerManagerServer();
export default instance; 