// EncounterManagerServer.js
// Server-authoritative encounter and combat management with PvP and group support

import PlayerManagerServer from './PlayerManagerServer.js';
import GroupManagerServer from './GroupManagerServer.js';
import { ManagerManager } from './ManagerManager.js';
import { getCharacterDefinition } from './CharacterTypesServer.js';
import * as SpellManagerServer from './SpellManagerServer.js';
import * as StatDefinitionsServer from './StatDefinitionsServer.js';

class EncounterManagerServer {
  constructor() {
    this.encounters = new Map(); // encounterId -> encounter object
  }

  /**
   * Create a new encounter (PvE, PvP, or group).
   * @param {object} options - { roomId, participantIds, groupIds, type: 'pve'|'pvp'|'group', starterId }
   * @returns {object} encounter
   */
  createEncounter(options) {
    const encounterId = options.encounterId || `encounter-${options.starterId || 'unknown'}-${Date.now()}`;
    if (this.encounters.has(encounterId)) throw new Error(`Encounter ${encounterId} already exists`);
    // Participants: playerIds and/or entityIds
    const participantIds = options.participantIds || [];
    const groupIds = options.groupIds || [];
    const type = options.type || 'pve';
    const roomId = options.roomId;
    const starterId = options.starterId;
    // Build turn order: flatten group members, preserve order
    let turnOrder = [];
    if (groupIds.length > 0) {
      for (const groupId of groupIds) {
        const group = GroupManagerServer.getGroup(groupId);
        if (group) turnOrder.push(...group.memberIds);
      }
    }
    turnOrder.push(...participantIds.filter(id => !turnOrder.includes(id)));
    // Remove duplicates, preserve order
    turnOrder = [...new Set(turnOrder)];
    // Encounter object
    const encounter = {
      encounterId,
      roomId,
      type,
      turnOrder,
      currentTurnIndex: 0,
      state: 'active',
      participants: turnOrder,
      groupIds,
      starterId,
      targetSelection: null, // { initiatorId, validTargets }
      created: Date.now(),
      lastAction: Date.now(),
      npcs: {},
    };
    this.encounters.set(encounterId, encounter);
    // Assign encounter to all participants/groups
    for (const pid of turnOrder) PlayerManagerServer.setPlayerEncounter(pid, encounterId);
    for (const gid of groupIds) GroupManagerServer.setGroupEncounter(gid, encounterId);
    // Add NPCs to encounter.npcs if any entityIds are present
    if (options.entityIds && Array.isArray(options.entityIds)) {
      for (const entityId of options.entityIds) {
        const def = getCharacterDefinition(entityId);
        if (def && def.stats) {
          encounter.npcs[entityId] = {
            statBlock: { ...def.stats },
            health: StatDefinitionsServer.getHealthFromVIT(def.stats.vit),
            // Add other derived stats as needed
          };
        }
      }
    }
    return encounter;
  }

  /**
   * Get encounter by ID.
   */
  getEncounter(encounterId) {
    return this.encounters.get(encounterId) || null;
  }

  /**
   * Remove encounter and clean up all state.
   */
  removeEncounter(encounterId) {
    const encounter = this.getEncounter(encounterId);
    if (!encounter) return;
    for (const pid of encounter.participants) PlayerManagerServer.setPlayerEncounter(pid, null);
    for (const gid of encounter.groupIds) GroupManagerServer.setGroupEncounter(gid, null);
    this.encounters.delete(encounterId);
  }

  /**
   * Advance to the next turn, handle deaths, and emit UI/menu events.
   */
  nextTurn(encounterId) {
    const encounter = this.getEncounter(encounterId);
    if (!encounter || encounter.state !== 'active') return;
    // Remove dead participants
    encounter.participants = encounter.participants.filter(pid => PlayerManagerServer.getPlayer(pid)?.alive);
    if (encounter.participants.length === 0) {
      this.endEncounter(encounterId);
      return;
    }
    // Advance turn
    encounter.currentTurnIndex = (encounter.currentTurnIndex + 1) % encounter.participants.length;
    encounter.lastAction = Date.now();
    // Determine current actor
    const currentId = encounter.participants[encounter.currentTurnIndex];
    // Always show the action menu first, regardless of group size
    this.emitActionMenu(encounterId, currentId);
  }

  /**
   * Handle an action (attack, spell, steal, examine, etc.)
   * If the action requires a target in a group, emit target selection UI.
   * Otherwise, resolve the action immediately.
   */
  handleAction(encounterId, actorId, action, targetId, extra) {
    const encounter = this.getEncounter(encounterId);
    if (!encounter || encounter.state !== 'active') return;
    const currentId = encounter.participants[encounter.currentTurnIndex];
    if (actorId !== currentId) return;
    ManagerManager.lockActions(encounterId, encounter.participants);
    let result = null;
    if (action === 'attack') {
      const attacker = PlayerManagerServer.getPlayer(actorId);
      let defender = PlayerManagerServer.getPlayer(targetId);
      let isNpc = false;
      if (!defender) {
        // Check if target is an NPC in this encounter
        if (encounter && encounter.npcs && encounter.npcs[targetId]) {
          defender = encounter.npcs[targetId];
          isNpc = true;
        }
      }
      if (!attacker || !defender) return;
      let attackValue = attacker.playerStats.getPhysicalDamage();
      let defenseValue = isNpc ? StatDefinitionsServer.getDefenseFromVIT(defender.statBlock.vit) : defender.playerStats.getDefenseRating();
      let mitigation = 1.0 - defenseValue;
      let finalDamage = Math.max(0, Math.floor(attackValue * mitigation));
      if (isNpc) {
        const prevHealth = defender.health;
        defender.health = Math.max(0, defender.health - finalDamage);
        const defenderDead = defender.health <= 0;
        result = { attackerId: actorId, defenderId: targetId, attackValue, finalDamage, defenderDead, defenderHealth: defender.health };
        ManagerManager.emitAttackResult(encounterId, actorId, targetId, result);
        if (defenderDead) ManagerManager.emitKO(encounterId, targetId);
      } else {
        const attackResult = PlayerManagerServer.resolvePhysicalAttack(actorId, targetId);
        result = attackResult;
        ManagerManager.emitAttackResult(encounterId, actorId, targetId, attackResult);
        if (attackResult.defenderDead) {
          PlayerManagerServer.setPlayerAlive(targetId, false);
          ManagerManager.emitKO(encounterId, targetId);
        }
      }
    } else if (action && action.startsWith('cast_')) {
      const spellName = action.slice(5);
      const spellData = SpellManagerServer.getSpellData(spellName);
      if (!spellData) return;
      const caster = PlayerManagerServer.getPlayer(actorId);
      let isMultiTarget = spellData.multi;
      let isHeal = spellData.type === 'heal';
      let isAllyTarget = spellData.target === 'ally';
      if (isHeal && isAllyTarget) {
        // Healing spell targeting allies
        if (isMultiTarget) {
          // Heal all allies (group members except enemies)
          let casterGroupId = caster ? caster.groupId : null;
          let targets = [];
          for (const pid of encounter.participants) {
            if (pid === actorId) continue; // skip self unless spell allows
            const player = PlayerManagerServer.getPlayer(pid);
            if (player && player.groupId === casterGroupId) {
              targets.push(pid);
            }
          }
          // Optionally include self if spell allows (here Healing Wind does not heal self)
          for (const tid of targets) {
            const targetPlayer = PlayerManagerServer.getPlayer(tid);
            if (!targetPlayer) continue;
            const healAmount = spellData.magicalBaseDamage; // or use PlayerStats.getMagicalDamage if scaling
            const healed = targetPlayer.playerStats.applyHealing(healAmount);
            const result = { casterId: actorId, targetId: tid, spellName, healAmount, healed, type: 'heal', multi: true };
            ManagerManager.emitSpellResult(encounterId, actorId, tid, spellName, result);
          }
        } else {
          // Single-target heal: require target selection from valid allies (handled by UI/menu)
          const targetPlayer = PlayerManagerServer.getPlayer(targetId);
          if (!caster || !targetPlayer) return;
          const healAmount = spellData.magicalBaseDamage;
          const healed = targetPlayer.playerStats.applyHealing(healAmount);
          const result = { casterId: actorId, targetId, spellName, healAmount, healed, type: 'heal', multi: false };
          ManagerManager.emitSpellResult(encounterId, actorId, targetId, spellName, result);
        }
      } else {
        // Single-target spell (existing logic)
        let target = PlayerManagerServer.getPlayer(targetId);
        let isNpc = false;
        if (!target) {
          if (encounter && encounter.npcs && encounter.npcs[targetId]) {
            target = encounter.npcs[targetId];
            isNpc = true;
          }
        }
        if (!caster || !target) return;
        if (isNpc) {
          const spellResult = SpellManagerServer.resolveSpellCast(actorId, targetId, spellName);
          let defenseValue = StatDefinitionsServer.getDefenseFromVIT(target.statBlock.vit);
          let mitigation = 1.0 - defenseValue;
          let finalDamage = Math.max(0, Math.floor(spellResult.damage * mitigation));
          const prevHealth = target.health;
          target.health = Math.max(0, target.health - finalDamage);
          const targetDead = target.health <= 0;
          result = { ...spellResult, finalDamage, targetDead, targetHealth: target.health };
          ManagerManager.emitSpellResult(encounterId, actorId, targetId, spellName, result);
          if (targetDead) ManagerManager.emitKO(encounterId, targetId);
        } else {
          const spellResult = SpellManagerServer.resolveSpellCast(actorId, targetId, spellName);
          result = spellResult;
          ManagerManager.emitSpellResult(encounterId, actorId, targetId, spellName, spellResult);
          if (spellResult.targetDead) {
            PlayerManagerServer.setPlayerAlive(targetId, false);
            ManagerManager.emitKO(encounterId, targetId);
          }
        }
      }
    } else if (action === 'steal') {
      // Steal attempt
      const thief = PlayerManagerServer.getPlayer(actorId);
      const victim = PlayerManagerServer.getPlayer(targetId) || getCharacterDefinition(targetId);
      if (!thief || !victim) return;
      const stealResult = PlayerManagerServer.resolveSteal(actorId, targetId);
      result = stealResult;
      ManagerManager.emitStealResult(encounterId, actorId, targetId, stealResult);
    } else if (action === 'examine') {
      // Examine target
      const examiner = PlayerManagerServer.getPlayer(actorId);
      const target = PlayerManagerServer.getPlayer(targetId) || getCharacterDefinition(targetId);
      if (!examiner || !target) return;
      const info = PlayerManagerServer.getExamineInfo(targetId);
      result = info;
      ManagerManager.emitExamineInfo(encounterId, actorId, targetId, info);
    } else if (action === 'trade') {
      // Offer trade (stub, implement as needed)
      ManagerManager.emitTradeOffer(encounterId, actorId, targetId);
    } else if (action === 'invite') {
      // Invite to team (stub, implement as needed)
      ManagerManager.emitInvite(encounterId, actorId, targetId);
    } else if (action === 'flee') {
      // Attempt to flee
      const fleeResult = PlayerManagerServer.resolveFlee(actorId, encounterId);
      result = fleeResult;
      ManagerManager.emitFleeResult(encounterId, actorId, fleeResult);
      if (fleeResult.success) {
        // Remove player from encounter
        encounter.participants = encounter.participants.filter(pid => pid !== actorId);
        PlayerManagerServer.setPlayerEncounter(actorId, null);
        if (encounter.participants.length === 0) {
          this.endEncounter(encounterId);
          return;
        }
      }
    } else if (action === 'talk') {
      // Talk (stub, implement as needed)
      ManagerManager.emitTalk(encounterId, actorId, targetId);
    } else {
      // Unknown or invalid action
      ManagerManager.emitInvalidAction(encounterId, actorId, action);
      return;
    }
    // Unlock actions for all participants
    ManagerManager.unlockActions(encounterId, encounter.participants);
    // After action resolves:
    this.nextTurn(encounterId);
  }

  /**
   * Handle target selection in group encounters, then resolve the action.
   */
  handleTargetSelection(encounterId, actorId, targetId, action, extra) {
    // After target is selected, resolve the action
    this.handleAction(encounterId, actorId, action, targetId, extra);
  }

  /**
   * Emit the action menu for the current turn, optionally for a specific target.
   */
  emitActionMenu(encounterId, actorId, menuContext = { type: 'main', page: 1, targetId: null }) {
    const actions = [];
    const paginationInfo = {};
    const player = PlayerManagerServer.getPlayer(actorId);
    if (!player) return;
    const targetId = menuContext.targetId || null;
    // Main menu
    if (menuContext.type === 'main') {
      actions.push(
        { text: 'Talk', action: 'talk', enabled: true },
        { text: 'Attack', action: 'attack_menu', enabled: true },
        { text: 'Offer Trade', action: 'trade', enabled: true },
        { text: 'Examine', action: 'examine', enabled: true },
        { text: 'Attempt to Flee', action: 'flee', enabled: true },
        { text: 'Invite to Team', action: 'invite', enabled: true }
      );
    } else if (menuContext.type === 'attack_menu') {
      actions.push(
        { text: 'Physical Attack', action: 'attack', enabled: true },
        { text: 'Spells/Abilities', action: 'spells_menu', enabled: true },
        { text: 'Steal', action: 'steal', enabled: true },
        { text: 'Back', action: 'main_menu', enabled: true }
      );
    } else if (menuContext.type === 'spells_menu') {
      const allSpells = ManagerManager.getAllSpellsForPlayer(actorId) || [];
      const validSpells = ManagerManager.getValidSpellsForPlayer(actorId) || [];
      const spellsPerPage = 5;
      const page = menuContext.page || 1;
      const totalPages = Math.ceil(allSpells.length / spellsPerPage);
      const startIndex = (page - 1) * spellsPerPage;
      const endIndex = Math.min(startIndex + spellsPerPage, allSpells.length);
      const spellsOnPage = allSpells.slice(startIndex, endIndex);
      for (const spellName of spellsOnPage) {
        const isValid = validSpells.includes(spellName);
        const requirements = ManagerManager.getSpellRequirementsForPlayer(actorId, spellName) || [];
        const gemText = requirements.join(', ');
        const gemCount = requirements.length;
        const countText = gemCount > 0 ? `${gemCount} Gem${gemCount > 1 ? 's' : ''} required: ` : '';
        actions.push({
          text: spellName,
          action: isValid ? `cast_${spellName}` : null,
          enabled: isValid,
          info: isValid ? '' : `${countText}${gemText}`
        });
      }
      if (page < totalPages) {
        actions.push({ text: 'Next Page', action: 'spells_menu_next', enabled: true });
      }
      if (page > 1) {
        actions.push({ text: 'Back', action: 'spells_menu_prev', enabled: true });
      } else {
        actions.push({ text: 'Back', action: 'attack_menu', enabled: true });
      }
      paginationInfo.page = page;
      paginationInfo.totalPages = totalPages;
    }
    // Emit to client, include targetId for context if present
    ManagerManager.emitActionMenu(encounterId, actorId, actions, paginationInfo, targetId);
  }

  /**
   * End the encounter, clean up all state, emit end event.
   */
  endEncounter(encounterId) {
    const encounter = this.getEncounter(encounterId);
    if (!encounter) return;
    encounter.state = 'ended';
    for (const pid of encounter.participants) PlayerManagerServer.setPlayerEncounter(pid, null);
    for (const gid of encounter.groupIds) GroupManagerServer.setGroupEncounter(gid, null);
    // Unlock movement, doors, loot, etc. via ManagerManager
    ManagerManager.emitEncounterEnd(encounterId, encounter.roomId, encounter.participants);
    this.encounters.delete(encounterId);
  }

  /**
   * Get all active encounters.
   * @returns {Array}
   */
  getAllEncounters() {
    return Array.from(this.encounters.values());
  }
}

const instance = new EncounterManagerServer();
export default instance;
