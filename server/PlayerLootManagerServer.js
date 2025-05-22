// Handles loot bag creation on player death
export class PlayerLootManagerServer {
  constructor(io, players, bags) {
    this.io = io;
    this.players = players;
    this.bags = bags;
  }

  handlePlayerDeath(player) {
    const bagId = "playerbag-" + Date.now();
    const roomId = player.roomId;

    const loot = player.inventory || [];
    const bag = { id: bagId, items: loot, roomId };
    this.bags.set(bagId, bag);

    this.io.to(roomId).emit("PLAYER_LOOT_BAG_SPAWNED", {
      bagId,
      items: loot,
      roomId
    });

    player.inventory = []; // clear inventory after drop
  }
}
