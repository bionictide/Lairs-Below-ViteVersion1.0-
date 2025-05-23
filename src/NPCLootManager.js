// NPCLootManager.js — Client-side (listener only)
// All loot generation and assignment is server-authoritative.
// The client only listens for loot events and triggers UI updates.

export class NPCLootManager {
  constructor(scene, lootUIManager) {
    this.scene = scene;
    this.lootUIManager = lootUIManager;

    this.scene.socket.on('NPC_LOOT_BAG_SPAWNED', (data) => {
      // Example: { bagId, items, roomId }
      console.log('[NPCLootManager] Bag spawned', data);
      // Optionally trigger LootUIManager to open the loot UI for this bag
      // this.lootUIManager.openLootUI(data.bagId, ...); // Pass bag sprite if available
    });
  }
}
