// Handles NPC defeat and loot bag creation
const itemData = {
  'sword1': { name: 'Sword', asset: 'Sword1', width: 3, height: 1 },
  'helm1': { name: 'Helm', asset: 'Helm1', width: 2, height: 2 },
  'Potion1(red)': { name: 'Red Potion', asset: 'Potion1(red)', width: 1, height: 1 },
  'Key1': { name: 'Key', asset: 'Key1', width: 2, height: 1 }
};
const lootTiers = {
  'Common': { 'Potion1(red)': 0.30 },
  'Uncommon': { 'Potion1(red)': 0.30, 'helm1': 0.20 },
  'Rare': { 'Potion1(red)': 0.20, 'helm1': 0.30, 'sword1': 0.20 },
  'Epic': { 'Potion1(red)': 0.50, 'helm1': 0.40, 'sword1': 0.30, 'Key1': 0.20 },
  'Legendary': { 'Potion1(red)': 0.70, 'helm1': 0.60, 'sword1': 0.40, 'Key1': 0.35 }
};

export class NPCLootManagerServer {
  constructor(io, players, bags, dungeon) {
    this.io = io;
    this.players = players;
    this.bags = bags;
    this.dungeon = dungeon;
  }

  static getLootForTier(tierName) {
    const tierProbabilities = lootTiers[tierName];
    if (!tierProbabilities) return null;
    const validated = {};
    for (const itemKey in tierProbabilities) {
      if (itemData[itemKey]) validated[itemKey] = tierProbabilities[itemKey];
    }
    return validated;
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
