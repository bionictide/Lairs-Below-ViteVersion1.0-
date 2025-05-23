// ItemManager.js — Client-side (intent-emitter only)
// All item use/effects are server-authoritative. Client only emits intent.

export class ItemManager {
  constructor(scene, socket) {
    this.scene = scene;
    this.socket = socket;
    // Optionally, keep a local map of item effects for UI display only
    this.itemEffects = {
      'Potion1(red)': {
        type: 'healing',
        amount: 150
      }
    };
  }

  /**
   * Emits intent to use an item to the server.
   * @param {object} itemInstance - The specific instance of the item being used.
   * @param {string} playerId - The playerId using the item.
   */
  useItem(itemInstance, playerId) {
    this.socket.emit('INVENTORY_USE_ITEM', { playerId, instanceId: itemInstance.instanceId });
  }
}
