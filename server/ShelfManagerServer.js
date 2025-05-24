// ShelfManagerServer.js
// Server-authoritative shelf system (roomId + facingDirection)

import { EVENTS } from "../src/shared/events.js";
import DungeonCore from "./DungeonCore.js";

const shelves = {};

export function createShelf(roomId, facingDirection, items = []) {
  const key = `${roomId}_${facingDirection}`;
  shelves[key] = {
    items: [...items],
    opened: false
  };
}

export function getShelf(roomId, facingDirection) {
  const key = `${roomId}_${facingDirection}`;
  return shelves[key] || null;
}

export function handleShelfAccess(socket, data) {
  const { roomId, facingDirection } = data;
  const shelf = getShelf(roomId, facingDirection);
  if (!shelf || shelf.opened) return;

  shelf.opened = true;
  socket.emit(EVENTS.SHELF_OPENED, { roomId, facingDirection, items: shelf.items });
}

export function removeItemFromShelf(roomId, facingDirection, itemId) {
  const shelf = getShelf(roomId, facingDirection);
  if (!shelf) return;

  const index = shelf.items.findIndex(i => i.id === itemId);
  if (index !== -1) shelf.items.splice(index, 1);
}

export function handleShelfPickup(io, socket, { playerId, roomId, itemKey }) {
  // Validate player and room
  const player = global.players?.get(playerId);
  const room = DungeonCore.getRoomById ? DungeonCore.getRoomById(roomId) : (DungeonCore.rooms?.find?.(r => r.id === roomId));
  if (!player || !room) {
    socket.emit('ERROR', { message: 'Player or room not found', code: 'NOT_FOUND' });
    return { success: false, error: 'NOT_FOUND' };
  }
  let found = false;
  if (room.gemType && itemKey && room.gemType.replace('Shelf', '') === itemKey) {
    room.gemType = null;
    found = true;
  } else if (room.hasPotion && itemKey === 'Potion1(red)') {
    room.hasPotion = false;
    found = true;
  }
  if (!found) {
    socket.emit('ERROR', { message: 'Item not found on shelf', code: 'ITEM_NOT_FOUND' });
    return { success: false, error: 'ITEM_NOT_FOUND' };
  }
  const newItem = { itemKey, instanceId: `${itemKey}-${Date.now()}` };
  newItem.gridX = -1;
  newItem.gridY = -1;
  player.inventory.push(newItem);
  io.to(player.socket.id).emit('INVENTORY_UPDATE', { playerId, inventory: player.inventory });
  io.emit('SHELF_UPDATE', { roomId, itemKey });
  return { success: true };
}
