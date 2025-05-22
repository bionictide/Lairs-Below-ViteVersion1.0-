// Client-side listener
export class NPCLootManager {
  constructor(scene) {
    this.scene = scene;

    this.scene.socket.on("NPC_LOOT_BAG_SPAWNED", (data) => {
      console.log("[NPCLootManager] Bag spawned", data);
      // Optionally trigger LootUIManager here
    });
  }
}
