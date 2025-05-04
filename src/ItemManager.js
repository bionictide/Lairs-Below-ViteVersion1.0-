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
    function ItemManager(scene) {
        _class_call_check(this, ItemManager);
        this.scene = scene;
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
     * Attempts to use an item on a target (e.g., player).
     * @param {object} itemInstance - The specific instance of the item being used.
     * @param {object} targetStats - The stats object of the target (e.g., PlayerStats instance).
     * @returns {object} An object indicating success and details: { used: boolean, message: string, consumed: boolean, amount?: number }
     */ key: "useItem",
            value: function useItem(itemInstance, targetStats) {
                var effect = this.itemEffects[itemInstance.itemKey];
                if (!effect) {
                    console.warn("[ItemManager] No defined effect for item: ".concat(itemInstance.itemKey));
                    return {
                        used: false,
                        message: "Cannot use ".concat(itemInstance.name, "."),
                        consumed: false
                    };
                }
                console.log("[ItemManager] Attempting to use ".concat(itemInstance.name, " (").concat(itemInstance.itemKey, ") on target."));
                switch(effect.type){
                    case 'healing':
                        if (targetStats && typeof targetStats.applyHealing === 'function') {
                            var healedAmount = targetStats.applyHealing(effect.amount);
                            if (healedAmount > 0) {
                                return {
                                    used: true,
                                    message: "Used ".concat(itemInstance.name, ", restored ").concat(healedAmount, " health."),
                                    consumed: true,
                                    amount: healedAmount
                                };
                            } else {
                                return {
                                    used: false,
                                    message: "Cannot use ".concat(itemInstance.name, ", health already full."),
                                    consumed: false // Don't consume if no effect
                                };
                            }
                        } else {
                            console.error("[ItemManager] Target stats object does not have applyHealing method.");
                            return {
                                used: false,
                                message: "Error using ".concat(itemInstance.name, "."),
                                consumed: false
                            };
                        }
                    // Add cases for other item types (buffs, keys, etc.) later
                    default:
                        console.warn("[ItemManager] Unknown effect type: ".concat(effect.type));
                        return {
                            used: false,
                            message: "Cannot use ".concat(itemInstance.name, "."),
                            consumed: false
                        };
                }
            }
        }
    ]);
    return ItemManager;
}();
