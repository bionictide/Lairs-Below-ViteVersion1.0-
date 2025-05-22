// TreasureManagerServer.js
// Server-authoritative treasure chest logic (single-open, room-bound)

import { EVENTS } from "../src/shared/events.js";

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
