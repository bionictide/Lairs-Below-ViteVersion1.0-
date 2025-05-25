// BagManagerServer.js
// Handles creation, sync, and lifecycle of loot bags

import { EVENTS } from "../src/shared/events.js";

const lootBags = {};
const playerInventories = {}; // playerId -> [{...item}]

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

export function getInventory(playerId) {
  return playerInventories[playerId] || [];
}

export function setInventory(playerId, inventory) {
  playerInventories[playerId] = inventory;
}

export function addItem(playerId, item) {
  if (!playerInventories[playerId]) playerInventories[playerId] = [];
  playerInventories[playerId].push(item);
  return [...playerInventories[playerId]];
}

export function removeItem(playerId, instanceId) {
  if (!playerInventories[playerId]) return null;
  const idx = playerInventories[playerId].findIndex(i => i.instanceId === instanceId);
  if (idx === -1) return null;
  const [removed] = playerInventories[playerId].splice(idx, 1);
  return removed;
}

export function useItem(playerId, instanceId) {
  // For now, just remove the item
  return removeItem(playerId, instanceId);
}

export function moveItem(playerId, instanceId, gridX, gridY, itemWidth = 1, itemHeight = 1) {
  const inv = playerInventories[playerId];
  if (!inv) return false;
  const item = inv.find(i => i.instanceId === instanceId);
  if (!item) return false;
  // Validate bounds
  const gridCols = 10, gridRows = 7;
  if (gridX < 0 || gridY < 0 || gridX + itemWidth > gridCols || gridY + itemHeight > gridRows) return false;
  // Check for overlap
  for (const other of inv) {
    if (other.instanceId === instanceId) continue;
    const otherWidth = other.width || 1, otherHeight = other.height || 1;
    if (
      gridX < (other.gridX + otherWidth) &&
      (gridX + itemWidth) > other.gridX &&
      gridY < (other.gridY + otherHeight) &&
      (gridY + itemHeight) > other.gridY
    ) return false;
  }
  item.gridX = gridX;
  item.gridY = gridY;
  return true;
}

export function lootBagPickup(playerId, bagId, instanceId) {
  const bag = lootBags[bagId];
  if (!bag) return null;
  const idx = bag.contents.findIndex(i => i.instanceId === instanceId);
  if (idx === -1) return null;
  const [item] = bag.contents.splice(idx, 1);
  addItem(playerId, { ...item, gridX: -1, gridY: -1 });
  if (bag.contents.length === 0) delete lootBags[bagId];
  return item;
}

// Shelf, treasure, puzzle pickups (room state must be managed by caller)
export function pickupShelfItem(playerId, item) {
  addItem(playerId, { ...item, gridX: -1, gridY: -1 });
}
export function pickupTreasureItem(playerId, item) {
  addItem(playerId, { ...item, gridX: -1, gridY: -1 });
}
export function pickupPuzzleItem(playerId, item) {
  addItem(playerId, { ...item, gridX: -1, gridY: -1 });
}

const BagManagerServer = {
  createLootBag,
  getVisibleLootBagsForRoom,
  lootItem,
  markLootBagChecked,
  removeEmptyBags,
  destroyRoomBags,
  getBagById,
  getInventory,
  setInventory,
  addItem,
  removeItem,
  useItem,
  moveItem,
  lootBagPickup,
  pickupShelfItem,
  pickupTreasureItem,
  pickupPuzzleItem
};

export default BagManagerServer;
