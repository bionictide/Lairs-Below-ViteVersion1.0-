// Handles the logic for using items

function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
export var ItemManager = /*#__PURE__*/ function() {
    "use strict";
    function ItemManager(scene, socket) {
        _class_call_check(this, ItemManager);
        this.scene = scene;
        this.socket = socket;
        console.log("[ItemManager] Initialized.");
        // Define item effects here or load from config
        this.itemEffects = {
            'Potion1(red)': {
                type: 'healing',
                amount: 150
            }
        };
    }
    _create_class(ItemManager, [
        {
            /**
     * Emits intent to use an item to the server.
     * @param {object} itemInstance - The specific instance of the item being used.
     * @param {object} targetStats - The stats object of the target (e.g., PlayerStats instance).
     */
            key: "useItem",
            value: function useItem(itemInstance, targetStats) {
                // Only emit intent to server, do not apply effect locally
                this.socket.emit('INVENTORY_USE_ITEM', { playerId: targetStats.playerId, instanceId: itemInstance.instanceId });
            }
        }
    ]);
    return ItemManager;
}();
