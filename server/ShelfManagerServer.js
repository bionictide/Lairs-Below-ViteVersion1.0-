// ShelfManagerServer.js
// Server-authoritative shelf system (roomId + facingDirection)

import { EVENTS } from "../src/shared/events.js";

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
