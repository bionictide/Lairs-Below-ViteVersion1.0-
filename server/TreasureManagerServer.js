// TreasureManagerServer.js
// Server-authoritative treasure chest logic (single-open, room-bound)

import { EVENTS } from "../src/shared/events.js";
import DungeonCore from "./DungeonCore.js";

const treasures = {};

export function createTreasure(roomId, facingDirection, items = []) {
  const key = `${roomId}_${facingDirection}`;
  treasures[key] = {
    opened: false,
    items: [...items]
  };
}

export function handleTreasureAccess(socket, data) {
  const { roomId, facingDirection } = data;
  const key = `${roomId}_${facingDirection}`;
  const treasure = treasures[key];

  if (!treasure || treasure.opened) return;

  treasure.opened = true;
  socket.emit(EVENTS.TREASURE_OPENED, {
    roomId,
    facingDirection,
    items: treasure.items
  });
}

export function removeItemFromTreasure(roomId, facingDirection, itemId) {
  const key = `${roomId}_${facingDirection}`;
  const treasure = treasures[key];
  if (!treasure) return;

  const index = treasure.items.findIndex(i => i.id === itemId);
  if (index !== -1) treasure.items.splice(index, 1);
}

export function handleTreasurePickup(io, socket, { playerId, roomId, itemKey }) {
  // Validate player and room
  const player = global.players?.get(playerId);
  const room = DungeonCore.getRoomById ? DungeonCore.getRoomById(roomId) : (DungeonCore.rooms?.find?.(r => r.id === roomId));
  if (!player || !room) {
    socket.emit('ERROR', { message: 'Player or room not found', code: 'NOT_FOUND' });
    return { success: false, error: 'NOT_FOUND' };
  }
  // Prevent double-looting: only allow if treasureLevel is present and matches
  if (!room.treasureLevel || room.treasureLevel !== itemKey) {
    socket.emit('ERROR', { message: 'Treasure not found', code: 'TREASURE_NOT_FOUND' });
    return { success: false, error: 'TREASURE_NOT_FOUND' };
  }
  // Add item to inventory
  const newItem = { itemKey, instanceId: `${itemKey}-${Date.now()}` };
  newItem.gridX = -1;
  newItem.gridY = -1;
  player.inventory.push(newItem);
  io.to(player.socket.id).emit('INVENTORY_UPDATE', { playerId, inventory: player.inventory });
  // Remove the treasure from the room and emit update to all clients
  room.treasureLevel = null;
  io.emit('TREASURE_UPDATE', { roomId, itemKey });
  return { success: true };
}
