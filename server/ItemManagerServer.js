// Handles item effects and inventory assignment (server-side only)
export class ItemManagerServer {
  static itemEffects = {
    'Potion1(red)': {
      type: 'healing',
      amount: 150
    }
    // Add more items/effects as needed
  };

  static useItem(playerStats, itemInstance) {
    if (!playerStats || !itemInstance) return;
    const effect = ItemManagerServer.itemEffects[itemInstance.itemKey];
    if (!effect) return;
    if (effect.type === 'healing') {
      return playerStats.applyHealing(effect.amount);
    }
    // Add more effect types as needed
  }

  static canPlaceItemInGrid(inventoryGrid, item) {
    // Stub: check size and available space (replace with real grid logic)
    return inventoryGrid.length < 20; // placeholder
  }
}
