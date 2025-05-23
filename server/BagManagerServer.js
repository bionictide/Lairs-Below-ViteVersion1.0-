// BagManagerServer.js
// Handles creation, sync, and lifecycle of loot bags

import { EVENTS } from "../src/shared/events.js";

const lootBags = {};

export function createLootBag({ ownerId, roomId, facingDirection, items }) {
  // Use timestamp-based ID for both player and entity loot bags
  const bagId = `bag-${ownerId}-${Date.now()}`;
  lootBags[bagId] = {
    bagId,
    ownerId, // playerId or entityId
    roomId,
    facingDirection,
    contents: [...items],
    checked: false
  };
  return lootBags[bagId];
}

export function getVisibleLootBagsForRoom(roomId) {
  return Object.values(lootBags).filter((bag) => bag.roomId === roomId);
}

export function lootItem({ bagId, itemId }) {
  const bag = lootBags[bagId];
  if (!bag) return null;

  const index = bag.contents.findIndex((item) => item.id === itemId);
  if (index === -1) return null;

  const [removedItem] = bag.contents.splice(index, 1);
  return removedItem;
}

export function markLootBagChecked(bagId) {
  const bag = lootBags[bagId];
  if (bag) bag.checked = true;
}

export function removeEmptyBags(playerRoomId) {
  for (const bagId in lootBags) {
    const bag = lootBags[bagId];
    if (bag.roomId === playerRoomId && bag.checked && bag.contents.length === 0) {
      delete lootBags[bagId];
    }
  }
}

export function destroyRoomBags(roomId) {
  for (const bagId in lootBags) {
    if (lootBags[bagId].roomId === roomId) {
      delete lootBags[bagId];
    }
  }
}

export function getBagById(bagId) {
  return lootBags[bagId] || null;
}
