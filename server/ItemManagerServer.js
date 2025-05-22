// Handles item effects and inventory assignment (server-side only)
export class ItemManagerServer {
  static useItem(player, item) {
    if (!player || !item) return;

    if (item.type === "heal") {
      player.stats.health += item.amount || 10;
    }

    // Future: handle buffs, debuffs, etc.
  }

  static canPlaceItemInGrid(inventoryGrid, item) {
    // Stub: check size and available space (replace with real grid logic)
    return inventoryGrid.length < 20; // placeholder
  }
}
