// BagManager for server authority
// Migrated from src/BagManager.js
// All logic/state is server-side; visuals/Phaser code is client-side only

// Placeholder item data structure (will be expanded)
const itemData = {
    'Key1': { name: 'Key', asset: 'Key1', width: 2, height: 1, stackable: false },
    'sword1': { name: 'Sword', asset: 'Sword1', width: 3, height: 1, stackable: false, usable: false },
    'helm1': { name: 'Helm', asset: 'Helm1', width: 2, height: 2, stackable: false, usable: false },
    'Potion1(red)': { name: 'Red Potion', asset: 'Potion1(red)', width: 1, height: 1, stackable: true, usable: true },
    'Emerald': { name: 'Emerald', asset: 'Emerald', width: 1, height: 1, stackable: true, usable: false },
    'BlueApatite': { name: 'Blue Apatite', asset: 'BlueApatite', width: 1, height: 1, stackable: true, usable: false },
    'Amethyst': { name: 'Amethyst', asset: 'Amethyst', width: 1, height: 1, stackable: true, usable: false },
    'RawRuby': { name: 'Raw Ruby', asset: 'RawRuby', width: 1, height: 1, stackable: true, usable: false }
};

class BagManager {
    constructor() {
        this.gridCols = 10;
        this.gridRows = 7;
        this.cellSize = 64;
        this.gridPadding = 10;
        this.inventory = [];
        this.gridOccupancy = [];
        this.PLAYER_BAG_ID = 'player_dropped_bag';
        this.initializeGridOccupancy();
    }
    initializeGridOccupancy() {
        this.gridOccupancy = Array(this.gridRows).fill(null).map(() => Array(this.gridCols).fill(null));
    }
    addItem(itemKey) {
        const baseItem = itemData[itemKey];
        if (!baseItem) return false;
        const instanceId = `${itemKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newItemInstance = { instanceId, itemKey, gridX: -1, gridY: -1, ...baseItem };
        const placement = this.findFirstAvailableSlot(newItemInstance.width, newItemInstance.height);
        if (placement) {
            newItemInstance.gridX = placement.x;
            newItemInstance.gridY = placement.y;
            this.markGridOccupancy(placement.x, placement.y, newItemInstance.width, newItemInstance.height, instanceId);
            this.inventory.push(newItemInstance);
            return true;
        } else {
            return false;
        }
    }
    removeItem(instanceId) {
        const index = this.inventory.findIndex(item => item.instanceId === instanceId);
        if (index !== -1) {
            const removedItem = this.inventory.splice(index, 1)[0];
            this.unmarkGridOccupancy(removedItem.gridX, removedItem.gridY, removedItem.width, removedItem.height);
            return removedItem;
        } else {
            return null;
        }
    }
    findFirstAvailableSlot(itemWidth, itemHeight) {
        for (let y = 0; y <= this.gridRows - itemHeight; y++) {
            for (let x = 0; x <= this.gridCols - itemWidth; x++) {
                if (this.canPlaceItemAt(x, y, itemWidth, itemHeight)) {
                    return { x, y };
                }
            }
        }
        return null;
    }
    canPlaceItemAt(gridX, gridY, itemWidth, itemHeight) {
        for (let y = gridY; y < gridY + itemHeight; y++) {
            for (let x = gridX; x < gridX + itemWidth; x++) {
                if (y < 0 || y >= this.gridRows || x < 0 || x >= this.gridCols) return false;
                if (this.gridOccupancy[y][x] !== null) return false;
            }
        }
        return true;
    }
    markGridOccupancy(gridX, gridY, itemWidth, itemHeight, instanceId) {
        for (let y = gridY; y < gridY + itemHeight; y++) {
            for (let x = gridX; x < gridX + itemWidth; x++) {
                if (y >= 0 && y < this.gridRows && x >= 0 && x < this.gridCols) {
                    this.gridOccupancy[y][x] = instanceId;
                }
            }
        }
    }
    unmarkGridOccupancy(gridX, gridY, itemWidth, itemHeight) {
        for (let y = gridY; y < gridY + itemHeight; y++) {
            for (let x = gridX; x < gridX + itemWidth; x++) {
                if (y >= 0 && y < this.gridRows && x >= 0 && x < this.gridCols) {
                    this.gridOccupancy[y][x] = null;
                }
            }
        }
    }
    hasItem(itemName) {
        return this.inventory.some(item => item.name === itemName);
    }
    clearInventory() {
        const clearedItems = [...this.inventory];
        this.inventory = [];
        this.initializeGridOccupancy();
        return clearedItems;
    }
    getRandomItemInstance() {
        if (this.inventory.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * this.inventory.length);
        return { ...this.inventory[randomIndex] };
    }
}

export { itemData, BagManager }; 