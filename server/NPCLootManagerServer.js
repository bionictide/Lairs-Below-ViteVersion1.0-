// Handles NPC defeat and loot bag creation
export class NPCLootManagerServer {
  constructor(io, players, bags, dungeon) {
    this.io = io;
    this.players = players;
    this.bags = bags;
    this.dungeon = dungeon;
  }

  handleNpcDefeat(npc, player) {
    const bagId = "npcbag-" + Date.now();
    const roomId = player.roomId;

    const loot = npc.instanceLoot || [];
    const bag = { id: bagId, items: loot, roomId };
    this.bags.set(bagId, bag);

    this.io.to(roomId).emit("NPC_LOOT_BAG_SPAWNED", {
      bagId,
      items: loot,
      roomId
    });
  }
}
