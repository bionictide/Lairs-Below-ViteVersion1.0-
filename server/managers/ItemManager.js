// ItemManager for server authority
// Migrated from src/ItemManager.js
// All logic/state is server-side; visuals/scene code is client-side only

class ItemManager {
    constructor() {
        // Define item effects here or load from config
        this.itemEffects = {
            'Potion1(red)': {
                type: 'healing',
                amount: 150
            }
        };
    }
    useItem(itemInstance, targetStats) {
        const effect = this.itemEffects[itemInstance.itemKey];
        if (!effect) {
            return { used: false, message: `Cannot use ${itemInstance.name}.`, consumed: false };
        }
        switch (effect.type) {
            case 'healing':
                if (targetStats && typeof targetStats.applyHealing === 'function') {
                    const healedAmount = targetStats.applyHealing(effect.amount);
                    if (healedAmount > 0) {
                        return { used: true, message: `Used ${itemInstance.name}, restored ${healedAmount} health.`, consumed: true, amount: healedAmount };
                    } else {
                        return { used: false, message: `Cannot use ${itemInstance.name}, health already full.`, consumed: false };
                    }
                } else {
                    return { used: false, message: `Error using ${itemInstance.name}.`, consumed: false };
                }
            default:
                return { used: false, message: `Cannot use ${itemInstance.name}.`, consumed: false };
        }
    }
}

export { ItemManager }; 