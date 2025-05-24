// ManagerManager.js
// The central hub for all cross-manager queries and coordination.
// ESM, stateless, pure delegation, and beautiful.

import * as PlayerManager from './PlayerManager.js';
import * as RoomManager from './RoomManager.js';
import * as GroupManager from './GroupManager.js';
import DungeonCore from './DungeonCore.js';
import * as BagManagerServer from './BagManagerServer.js';
import EncounterManagerServer from './EncounterManagerServer.js';
import * as ShelfManagerServer from './ShelfManagerServer.js';
import * as TreasureManagerServer from './TreasureManagerServer.js';
import * as PuzzleManagerServer from './PuzzleManagerServer.js';
import HintManagerServer from './HintManagerServer.js';
import { NPCLootManagerServer } from './NPCLootManagerServer.js';
import { ItemManagerServer } from './ItemManagerServer.js';
import { PlayerStats, createStatsFromDefinition } from './PlayerStatsServer.js';
import * as CharacterTypesServer from './CharacterTypesServer.js';
import * as StatDefinitionsServer from './StatDefinitionsServer.js';
import RoomManagerServer from './RoomManagerServer.js';
import * as SpellManagerServer from './SpellManagerServer.js';
import { CharacterSprites } from './CharacterSpritesServer.js';

const hintManagerServerInstance = new HintManagerServer(global.io || undefined);
const npcLootManagerServerInstance = new NPCLootManagerServer(global.io || undefined, global.players || undefined, global.bags || undefined, global.dungeon || undefined);

/**
 * The ManagerManager is the only entry point for all cross-manager queries and coordination.
 * It holds no state of its own, and delegates all logic to the appropriate manager.
 * All socket/event routing should go through here for maximum traceability and separation.
 */
export class ManagerManager {
  /**
   * Check if a room is currently locked (e.g., due to an encounter).
   * @param {string} roomId
   * @returns {boolean}
   */
  static isRoomLocked(roomId) {
    const locked = RoomManager.isRoomLocked(roomId);
    console.log(`[ManagerManager] isRoomLocked(${roomId}) -> ${locked}`);
    return locked;
  }

  /**
   * Get the current status of a player (location, buffs, group, etc).
   * @param {string} playerId
   * @returns {object}
   */
  static getPlayerStatus(playerId) {
    const status = PlayerManager.getStatus(playerId);
    console.log(`[ManagerManager] getPlayerStatus(${playerId}) ->`, status);
    return status;
  }

  /**
   * Get the group info for a player.
   * @param {string} playerId
   * @returns {object|null}
   */
  static getPlayerGroup(playerId) {
    const group = GroupManager.getGroupForPlayer(playerId);
    console.log(`[ManagerManager] getPlayerGroup(${playerId}) ->`, group);
    return group;
  }

  /**
   * Get the DungeonCore instance (for world/dungeon queries).
   * @returns {DungeonCore}
   */
  static getDungeonCore() {
    // This assumes DungeonCore is a singleton or imported instance
    console.log(`[ManagerManager] getDungeonCore()`);
    return DungeonCore;
  }

  /**
   * Bag/Loot delegation
   */
  static createLootBag(args) {
    console.log('[ManagerManager] createLootBag', args);
    return BagManagerServer.createLootBag(args);
  }
  static getVisibleLootBagsForRoom(roomId) {
    console.log('[ManagerManager] getVisibleLootBagsForRoom', roomId);
    return BagManagerServer.getVisibleLootBagsForRoom(roomId);
  }
  static lootItem(args) {
    console.log('[ManagerManager] lootItem', args);
    return BagManagerServer.lootItem(args);
  }
  static markLootBagChecked(bagId) {
    console.log('[ManagerManager] markLootBagChecked', bagId);
    return BagManagerServer.markLootBagChecked(bagId);
  }
  static removeEmptyBags(playerRoomId) {
    console.log('[ManagerManager] removeEmptyBags', playerRoomId);
    return BagManagerServer.removeEmptyBags(playerRoomId);
  }
  static destroyRoomBags(roomId) {
    console.log('[ManagerManager] destroyRoomBags', roomId);
    return BagManagerServer.destroyRoomBags(roomId);
  }
  static getBagById(bagId) {
    console.log('[ManagerManager] getBagById', bagId);
    return BagManagerServer.getBagById(bagId);
  }

  /**
   * Encounter delegation
   */
  static createEncounter(encounter) {
    console.log('[ManagerManager] createEncounter', encounter);
    return EncounterManagerServer.createEncounter(encounter);
  }
  static getEncounter(encounterId) {
    console.log('[ManagerManager] getEncounter', encounterId);
    return EncounterManagerServer.getEncounter(encounterId);
  }
  static getAllEncounters() {
    console.log('[ManagerManager] getAllEncounters');
    return EncounterManagerServer.getAllEncounters();
  }
  static removeEncounter(encounterId) {
    console.log('[ManagerManager] removeEncounter', encounterId);
    return EncounterManagerServer.removeEncounter(encounterId);
  }
  static addParticipant(encounterId, playerId) {
    console.log('[ManagerManager] addParticipant', encounterId, playerId);
    return EncounterManagerServer.addParticipant(encounterId, playerId);
  }
  static removeParticipant(encounterId, playerId) {
    console.log('[ManagerManager] removeParticipant', encounterId, playerId);
    return EncounterManagerServer.removeParticipant(encounterId, playerId);
  }
  static getParticipants(encounterId) {
    console.log('[ManagerManager] getParticipants', encounterId);
    return EncounterManagerServer.getParticipants(encounterId);
  }
  static setEncounterState(encounterId, state) {
    console.log('[ManagerManager] setEncounterState', encounterId, state);
    return EncounterManagerServer.setEncounterState(encounterId, state);
  }
  static getEncounterState(encounterId) {
    console.log('[ManagerManager] getEncounterState', encounterId);
    return EncounterManagerServer.getEncounterState(encounterId);
  }
  static findEncounterBy(prop, value) {
    console.log('[ManagerManager] findEncounterBy', prop, value);
    return EncounterManagerServer.findEncounterBy(prop, value);
  }

  /**
   * Shelf delegation
   */
  static createShelf(roomId, facingDirection, items = []) {
    console.log('[ManagerManager] createShelf', roomId, facingDirection, items);
    return ShelfManagerServer.createShelf(roomId, facingDirection, items);
  }
  static getShelf(roomId, facingDirection) {
    console.log('[ManagerManager] getShelf', roomId, facingDirection);
    return ShelfManagerServer.getShelf(roomId, facingDirection);
  }
  static handleShelfAccess(socket, data) {
    console.log('[ManagerManager] handleShelfAccess', data);
    return ShelfManagerServer.handleShelfAccess(socket, data);
  }
  static removeItemFromShelf(roomId, facingDirection, itemId) {
    console.log('[ManagerManager] removeItemFromShelf', roomId, facingDirection, itemId);
    return ShelfManagerServer.removeItemFromShelf(roomId, facingDirection, itemId);
  }

  /**
   * Treasure delegation
   */
  static createTreasure(roomId, facingDirection, items = []) {
    console.log('[ManagerManager] createTreasure', roomId, facingDirection, items);
    return TreasureManagerServer.createTreasure(roomId, facingDirection, items);
  }
  static handleTreasureAccess(socket, data) {
    console.log('[ManagerManager] handleTreasureAccess', data);
    return TreasureManagerServer.handleTreasureAccess(socket, data);
  }
  static removeItemFromTreasure(roomId, facingDirection, itemId) {
    console.log('[ManagerManager] removeItemFromTreasure', roomId, facingDirection, itemId);
    return TreasureManagerServer.removeItemFromTreasure(roomId, facingDirection, itemId);
  }

  /**
   * Puzzle delegation
   */
  static createPuzzle(puzzleId, solution) {
    console.log('[ManagerManager] createPuzzle', puzzleId, solution);
    return PuzzleManagerServer.createPuzzle(puzzleId, solution);
  }
  static isPuzzleSolved(puzzleId) {
    console.log('[ManagerManager] isPuzzleSolved', puzzleId);
    return PuzzleManagerServer.isPuzzleSolved(puzzleId);
  }
  static handlePuzzleAttempt(socket, data) {
    console.log('[ManagerManager] handlePuzzleAttempt', data);
    return PuzzleManagerServer.handlePuzzleAttempt(socket, data);
  }

  /**
   * Hint delegation
   */
  static sendHintToPlayer(socket, text) {
    console.log('[ManagerManager] sendHintToPlayer', text);
    return hintManagerServerInstance.sendHintToPlayer(socket, text);
  }
  static broadcastHintToRoom(roomId, text) {
    console.log('[ManagerManager] broadcastHintToRoom', roomId, text);
    return hintManagerServerInstance.broadcastHintToRoom(roomId, text);
  }

  /**
   * NPC Loot delegation
   */
  static handleNpcDefeat(npc, player) {
    console.log('[ManagerManager] handleNpcDefeat', npc, player);
    return npcLootManagerServerInstance.handleNpcDefeat(npc, player);
  }

  /**
   * Item delegation
   */
  static useItem(player, item) {
    console.log('[ManagerManager] useItem', player, item);
    return ItemManagerServer.useItem(player, item);
  }
  static canPlaceItemInGrid(inventoryGrid, item) {
    console.log('[ManagerManager] canPlaceItemInGrid', inventoryGrid, item);
    return ItemManagerServer.canPlaceItemInGrid(inventoryGrid, item);
  }

  /**
   * PlayerStats delegation
   */
  static createStatsFromDefinition(def) {
    console.log('[ManagerManager] createStatsFromDefinition', def);
    return createStatsFromDefinition(def);
  }
  static recalculateDerived(playerStatsInstance) {
    console.log('[ManagerManager] recalculateDerived', playerStatsInstance);
    return playerStatsInstance.recalculateDerived();
  }
  static clonePlayerStats(playerStatsInstance) {
    console.log('[ManagerManager] clonePlayerStats', playerStatsInstance);
    return playerStatsInstance.clone();
  }

  /**
   * CharacterTypes delegation
   */
  static getCharacterDefinition(typeKey) {
    console.log('[ManagerManager] getCharacterDefinition', typeKey);
    return CharacterTypesServer.getCharacterDefinition(typeKey);
  }
  static getPlayableCharacters() {
    console.log('[ManagerManager] getPlayableCharacters');
    return CharacterTypesServer.getPlayableCharacters();
  }
  static getAllCharacterTypeKeys() {
    console.log('[ManagerManager] getAllCharacterTypeKeys');
    return CharacterTypesServer.getAllCharacterTypeKeys();
  }

  /**
   * StatDefinitions delegation
   */
  static getHealthFromVIT(vit) {
    console.log('[ManagerManager] getHealthFromVIT', vit);
    return StatDefinitionsServer.getHealthFromVIT(vit);
  }
  static getDefenseFromVIT(vit) {
    console.log('[ManagerManager] getDefenseFromVIT', vit);
    return StatDefinitionsServer.getDefenseFromVIT(vit);
  }
  static getPhysicalAttackFromSTR(str) {
    console.log('[ManagerManager] getPhysicalAttackFromSTR', str);
    return StatDefinitionsServer.getPhysicalAttackFromSTR(str);
  }
  static getMagicBonusFromINT(intStat) {
    console.log('[ManagerManager] getMagicBonusFromINT', intStat);
    return StatDefinitionsServer.getMagicBonusFromINT(intStat);
  }
  static getMagicDefenseFromINT(intStat) {
    console.log('[ManagerManager] getMagicDefenseFromINT', intStat);
    return StatDefinitionsServer.getMagicDefenseFromINT(intStat);
  }
  static getStealBonusFromDEX(dex) {
    console.log('[ManagerManager] getStealBonusFromDEX', dex);
    return StatDefinitionsServer.getStealBonusFromDEX(dex);
  }
  static getCritDamageFromDEX(dex) {
    console.log('[ManagerManager] getCritDamageFromDEX', dex);
    return StatDefinitionsServer.getCritDamageFromDEX(dex);
  }
  static getManaFromMND(mnd) {
    console.log('[ManagerManager] getManaFromMND', mnd);
    return StatDefinitionsServer.getManaFromMND(mnd);
  }
  static getCritSpellBonusFromMND(mnd) {
    console.log('[ManagerManager] getCritSpellBonusFromMND', mnd);
    return StatDefinitionsServer.getCritSpellBonusFromMND(mnd);
  }
  static getFleeChanceFromSPD(spd) {
    console.log('[ManagerManager] getFleeChanceFromSPD', spd);
    return StatDefinitionsServer.getFleeChanceFromSPD(spd);
  }
  static get BASE_CRIT_CHANCE() {
    return StatDefinitionsServer.BASE_CRIT_CHANCE;
  }
  static get BASE_CRIT_DAMAGE() {
    return StatDefinitionsServer.BASE_CRIT_DAMAGE;
  }
  static get BASE_CRIT_SPELL_CHANCE() {
    return StatDefinitionsServer.BASE_CRIT_SPELL_CHANCE;
  }
  static get BASE_CRIT_SPELL_DAMAGE() {
    return StatDefinitionsServer.BASE_CRIT_SPELL_DAMAGE;
  }

  /**
   * RoomManager delegation
   */
  static addRoom(room) {
    console.log('[ManagerManager] addRoom', room);
    return RoomManagerServer.addRoom(room);
  }
  static getRoom(roomId) {
    console.log('[ManagerManager] getRoom', roomId);
    return RoomManagerServer.getRoom(roomId);
  }
  static getAllRooms() {
    console.log('[ManagerManager] getAllRooms');
    return RoomManagerServer.getAllRooms();
  }
  static removeRoom(roomId) {
    console.log('[ManagerManager] removeRoom', roomId);
    return RoomManagerServer.removeRoom(roomId);
  }
  static addPlayerToRoom(roomId, playerId) {
    console.log('[ManagerManager] addPlayerToRoom', roomId, playerId);
    return RoomManagerServer.addPlayerToRoom(roomId, playerId);
  }
  static removePlayerFromRoom(roomId, playerId) {
    console.log('[ManagerManager] removePlayerFromRoom', roomId, playerId);
    return RoomManagerServer.removePlayerFromRoom(roomId, playerId);
  }
  static getPlayersInRoom(roomId) {
    console.log('[ManagerManager] getPlayersInRoom', roomId);
    return RoomManagerServer.getPlayersInRoom(roomId);
  }
  static setRoomState(roomId, state) {
    console.log('[ManagerManager] setRoomState', roomId, state);
    return RoomManagerServer.setRoomState(roomId, state);
  }
  static getRoomState(roomId) {
    console.log('[ManagerManager] getRoomState', roomId);
    return RoomManagerServer.getRoomState(roomId);
  }
  static findRoomBy(prop, value) {
    console.log('[ManagerManager] findRoomBy', prop, value);
    return RoomManagerServer.findRoomBy(prop, value);
  }

  /**
   * SpellManager delegation
   */
  static castSpell(caster, spellName, target) {
    console.log('[ManagerManager] castSpell', caster, spellName, target);
    return SpellManagerServer.castSpell(caster, spellName, target);
  }

  /**
   * Get the sprite filename for a character type and mood (idle/angry).
   * @param {string} type - Character type key (e.g., 'Dwarf', 'Gnome', 'BatMonster', etc.)
   * @param {string} [mood='idle'] - Mood/state ('idle' or 'angry').
   * @returns {string|null} - Sprite filename or null if not found.
   */
  static getCharacterSprite(type, mood = 'idle') {
    const sprites = CharacterSprites[type];
    const sprite = sprites ? sprites[mood] : null;
    console.log(`[ManagerManager] getCharacterSprite(${type}, ${mood}) -> ${sprite}`);
    return sprite;
  }

  /**
   * Handle player count changes and manage dungeon resizing/regeneration.
   * @param {number} newCount
   * @param {number} prevCount
   */
  static handlePlayerCountChange(newCount, prevCount) {
    console.log(`[ManagerManager] handlePlayerCountChange: prev=${prevCount}, new=${newCount}`);
    if (prevCount > 0 && newCount === 0) {
      console.log('[ManagerManager] All players left. Regenerating dungeon.');
      DungeonCore.generateDungeon(0);
      return;
    }
    if (prevCount < 6 && newCount === 6) {
      console.log('[ManagerManager] Player count increased to 6. Expanding dungeon.');
      DungeonCore.rearrangeDungeon(6);
      return;
    }
    if (prevCount < 11 && newCount === 11) {
      console.log('[ManagerManager] Player count increased to 11. Expanding dungeon.');
      DungeonCore.rearrangeDungeon(11);
      return;
    }
    if (prevCount > 6 && newCount === 6) {
      console.log('[ManagerManager] Player count decreased to 6. Shrinking dungeon.');
      DungeonCore.rearrangeDungeon(6);
      return;
    }
    if (prevCount > 1 && newCount === 1) {
      console.log('[ManagerManager] Player count decreased to 1. Shrinking dungeon.');
      DungeonCore.rearrangeDungeon(1);
      return;
    }
    // No dungeon change needed
  }

  // Add more methods as needed, always delegating and logging.
} 