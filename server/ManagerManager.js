// ManagerManager.js
// The central hub for all cross-manager queries and coordination.
// ESM, stateless, pure delegation, and beautiful.

import * as PlayerManager from './PlayerManager.js';
import * as RoomManager from './RoomManager.js';
import * as GroupManager from './GroupManager.js';
import DungeonCore from './DungeonCore.js';

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

  // Add more methods as needed, always delegating and logging.
} 