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
import Phaser from 'https://esm.sh/phaser@3.60.0';
// Import itemData to get asset info (consider moving itemData to a shared file later)
import { itemData } from './BagManager.js'; // Assuming itemData is exported from BagManager
import { socket } from './socket.js';
export var LootUIManager = /*#__PURE__*/ function() {
    "use strict";
    function LootUIManager(scene, npcLootManager, bagManager) {
        _class_call_check(this, LootUIManager);
        this.scene = scene;
        this.npcLootManager = npcLootManager;
        this.bagManager = bagManager;
        this.isOpen = false;
        this.lootContainer = null;
        this.currentLootItems = []; // Array of item keys
        this.currentSourceEntityId = null;
        this.sourceBagSprite = null;
        this.registeredLoot = new Map(); // Store pre-generated loot { entityId: [itemKey1, itemKey2] }
        // Grid properties (assuming same as BagManager for Bag2.png)
        this.gridCols = 10;
        this.gridRows = 7;
        this.cellSize = 64;
        this.gridPadding = 10;
        this.gridStartX = 0;
        this.gridStartY = 0;
        console.log("[LootUIManager] Initialized.");
        // In constructor, set up listeners for ACTION_RESULT and LOOT_BAG_DROP
        socket.on('action_result', (payload) => {
            if (payload.action === 'loot_bag_pickup' && payload.data && payload.data.playerId === this.scene.playerId) {
                // Remove the bag from UI, update inventory via BagManager (already handled by BagManager's listener)
                if (this.currentSourceEntityId) {
                    this.bagManager.removeBagSprite(this.currentSourceEntityId);
                    this.closeLootUI();
                }
            }
        });
        socket.on('loot_bag_drop', (payload) => {
            // Optionally handle bag drop UI updates here if needed
        });
    }
    _create_class(LootUIManager, [
        {
            /**
     * Stores the generated loot for a specific NPC before the UI is opened.
     * Called by EncounterManager after an NPC dies.
     * @param {string} entityId - The ID of the deceased NPC.
     * @param {string[]} lootItems - An array of item keys representing the loot.
     */ key: "registerNpcLoot",
            value: function registerNpcLoot(entityId, lootItems) {
                console.log("[LootUIManager] Registering loot for ".concat(entityId, ":"), lootItems);
                this.registeredLoot.set(entityId, lootItems);
            }
        },
        {
            /**
     * Opens the loot UI for a specific deceased entity.
     * @param {string} deceasedEntityId - The ID of the entity whose loot is being opened.
     * @param {Phaser.GameObjects.Sprite} bagSprite - The sprite object representing the dropped bag.
     */ key: "openLootUI",
            value: function openLootUI(deceasedEntityId, bagSprite) {
                var _this = this;
                if (this.isOpen) {
                    console.log("[LootUIManager] Already open. Closing first.");
                    this.closeLootUI(); // Close previous if somehow opened twice
                }
                console.log("[LootUIManager] Opening loot UI for: ".concat(deceasedEntityId));
                this.isOpen = true;
                this.currentSourceEntityId = deceasedEntityId;
                this.sourceBagSprite = bagSprite; // Store reference to the bag sprite
                // Retrieve pre-registered loot
                this.currentLootItems = this.registeredLoot.get(deceasedEntityId) || [];
                if (!this.registeredLoot.has(deceasedEntityId)) {
                    console.warn("[LootUIManager] No pre-registered loot found for ".concat(deceasedEntityId, ". Showing empty loot window."));
                }
                console.log("[LootUIManager] Retrieved registered loot:", this.currentLootItems);
                // --- Create UI Elements ---
                var centerX = this.scene.game.config.width / 2;
                var centerY = this.scene.game.config.height / 2;
                this.lootContainer = this.scene.add.container(0, 0).setDepth(92); // Loot UI Container layer
                // Background (using Bag2 like inventory)
                var lootBg = this.scene.add.image(centerX, centerY, 'Bag2');
                // lootBg.setScale(0.8); // Optional scaling
                // Title
                var title = this.scene.add.text(centerX, centerY - lootBg.displayHeight / 2 + 40, 'Loot', {
                    fontSize: '32px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 4
                }).setOrigin(0.5);
                // --- New "Close Bag" Button ---
                // Position similar to the main BagManager button
                var closeButtonX = this.scene.game.config.width - 100; // Same X as BagManager button
                var closeButtonY = 50; // Same Y as BagManager button
                var closeButtonBg = this.scene.add.rectangle(closeButtonX, closeButtonY, 150, 50, 0x333333).setStrokeStyle(2, 0xffffff).setInteractive({
                    useHandCursor: true
                }).setDepth(90); // Loot UI Close Button BG layer
                var closeButtonText = this.scene.add.text(closeButtonX, closeButtonY, 'Close Bag', {
                    fontSize: '20px',
                    color: '#ffffff'
                }).setOrigin(0.5).setDepth(91); // Loot UI Close Button Text layer (above BG)
                closeButtonBg.on('pointerdown', function() {
                    _this.closeLootUI();
                });
                closeButtonBg.on('pointerover', function() {
                    return closeButtonBg.setFillStyle(0x555555);
                });
                closeButtonBg.on('pointerout', function() {
                    return closeButtonBg.setFillStyle(0x333333);
                });
                // --- Add elements to container ---
                // Note: The close button is added directly to the scene, not the lootContainer,
                // so it stays fixed while the container might move (if we added dragging later).
                // However, we need to manage its lifecycle within open/closeLootUI.
                // Let's store references to destroy them properly.
                this.closeButtonBg = closeButtonBg;
                this.closeButtonText = closeButtonText;
                this.lootContainer.add([
                    lootBg,
                    title
                ]); // Add only bg and title to the container
                // --- Calculate Grid Position ---
                var totalGridWidth = this.gridCols * this.cellSize;
                var totalGridHeight = this.gridRows * this.cellSize;
                this.gridStartX = centerX - totalGridWidth / 2;
                this.gridStartY = centerY - totalGridHeight / 2 + 30; // Match BagManager offset
                // Render items from this.currentLootItems
                this._renderLootItems(this.gridStartX, this.gridStartY);
                // Block background interactions
                this.setInteractionBlocking(true);
            }
        },
        {
            /**
     * Closes the loot UI.
     */ key: "closeLootUI",
            value: function closeLootUI() {
                if (!this.isOpen) {
                    return;
                }
                console.log("[LootUIManager] Closing loot UI.");
                if (this.lootContainer) {
                    this.lootContainer.destroy();
                    this.lootContainer = null;
                }
                // Destroy the separately added close button elements
                if (this.closeButtonBg) {
                    this.closeButtonBg.destroy();
                    this.closeButtonBg = null;
                }
                if (this.closeButtonText) {
                    this.closeButtonText.destroy();
                    this.closeButtonText = null;
                }
                // Destroy the source bag sprite ONLY if the loot is empty
                var sourceId = this.currentSourceEntityId; // Store ID before resetting
                if (this.sourceBagSprite && this.sourceBagSprite.scene) {
                    if (this.currentLootItems.length === 0) {
                        console.log("[LootUIManager] Loot is empty. Destroying source bag sprite for ".concat(sourceId, "."));
                        // Tell BagManager to remove the sprite reference and destroy it
                        this.bagManager.removeBagSprite(sourceId);
                    } else {
                        console.log("[LootUIManager] Loot remaining. Keeping source bag sprite for ".concat(sourceId, "."));
                    }
                }
                // Clear registered loot for this entity if it's empty now
                if (sourceId && this.currentLootItems.length === 0) {
                    this.registeredLoot.delete(sourceId);
                    console.log("[LootUIManager] Cleared registered loot for ".concat(sourceId, "."));
                }
                // Reset state
                this.isOpen = false;
                this.currentLootItems = []; // Clear the working copy
                this.currentSourceEntityId = null;
                this.sourceBagSprite = null; // Clear reference even if sprite isn't destroyed
                // Unblock background interactions
                this.setInteractionBlocking(false);
                // Notify BagManager to update its loot button state if needed
                this.scene.events.emit('lootUIClosed'); // Event for BagManager or others to react
            }
        },
        {
            /**
     * Blocks or unblocks interaction with background scene elements.
     * @param {boolean} isBlocked - True to block interactions, false to unblock.
     */ key: "setInteractionBlocking",
            value: function setInteractionBlocking(isBlocked) {
                var _this_scene_debugHelper;
                console.log("[LootUIManager] Interaction blocking set to: ".concat(isBlocked));
                // Update navigation buttons based on loot UI state AND encounter state
                this.scene.setupNavigationButtons();
                // Update door visibility/interactivity
                // Only show zones if debug AND loot UI closed AND bag closed
                this.scene.updateDoorZoneVisibility(!isBlocked && ((_this_scene_debugHelper = this.scene.debugHelper) === null || _this_scene_debugHelper === void 0 ? void 0 : _this_scene_debugHelper.visible));
                // Disable/Enable door clicks
                this.scene.setDoorInteractivity(!isBlocked);
            }
        },
        {
            /**
     * Renders the current loot items as sprites within the UI container.
     * @param {number} gridStartX - The top-left X coordinate of the grid area.
     * @param {number} gridStartY - The top-left Y coordinate of the grid area.
     * @private
     */ key: "_renderLootItems",
            value: function _renderLootItems(gridStartX, gridStartY) {
                var _this = this;
                // Clear previous item sprites if any
                this.lootContainer.list.forEach(function(child) {
                    if (child.getData && child.getData('isLootItem')) {
                        child.destroy();
                    }
                });
                var currentGridX = 0;
                var currentGridY = 0;
                this.currentLootItems.forEach(function(itemKey) {
                    var baseItem = itemData[itemKey];
                    if (!baseItem || !baseItem.asset) {
                        console.warn("[LootUIManager] No asset found for item key: ".concat(itemKey));
                        return; // Skip if no asset defined
                    }
                    // --- Basic sequential placement ---
                    // For simplicity, place items one after another in the first row.
                    // A more robust solution would handle multi-cell items and grid wrapping.
                    var itemGridX = currentGridX;
                    var itemGridY = currentGridY;
                    // Move to next slot for the next item
                    currentGridX++;
                    if (currentGridX >= _this.gridCols) {
                        currentGridX = 0;
                        currentGridY++;
                    }
                    // If we run out of grid space, stop rendering more items
                    if (currentGridY >= _this.gridRows) {
                        console.warn("[LootUIManager] Ran out of grid space displaying loot items.");
                        return; // Early exit from forEach loop's current iteration
                    }
                    // Use item dimensions from itemData if available, default to 1x1
                    var itemWidth = baseItem.width || 1;
                    var itemHeight = baseItem.height || 1;
                    // Calculate pixel position
                    var itemCenterX = gridStartX + itemGridX * _this.cellSize + itemWidth * _this.cellSize / 2;
                    var itemCenterY = gridStartY + itemGridY * _this.cellSize + itemHeight * _this.cellSize / 2;
                    // Calculate max allowed dimensions within the grid cell(s)
                    var maxItemWidth = itemWidth * _this.cellSize - _this.gridPadding * 2;
                    var maxItemHeight = itemHeight * _this.cellSize - _this.gridPadding * 2;
                    // Create and scale the item sprite
                    var itemSprite = _this.scene.add.image(itemCenterX, itemCenterY, baseItem.asset).setInteractive({
                        useHandCursor: true
                    }).setDepth(93); // Loot UI Items layer (inside container)
                    // Scale the item sprite to fit, maintaining aspect ratio, then increase like in BagManager
                    var baseScale = Math.min(maxItemWidth / itemSprite.width, maxItemHeight / itemSprite.height);
                    itemSprite.scale = baseScale * 1.375; // Match BagManager scale increase
                    // Store item key and mark as a loot item
                    itemSprite.setData('itemKey', itemKey);
                    itemSprite.setData('isLootItem', true);
                    // Add click listener (placeholder for transfer logic)
                    // Correct signature: (pointer, localX, localY, event)
                    itemSprite.on('pointerdown', function(pointer, localX, localY, event) {
                        event.stopPropagation();
                        socket.emit('loot_item_pickup', { playerId: _this.scene.playerId, bagId: _this.currentSourceEntityId, itemKey });
                    });
                    _this.lootContainer.add(itemSprite);
                    console.log("[LootUIManager] Rendered loot item ".concat(itemKey, " at grid [").concat(itemGridX, ", ").concat(itemGridY, "]"));
                });
            }
        },
        {
            /**
     * Handles clicking on an item within the loot window.
     * @param {Phaser.GameObjects.Image} itemSprite - The clicked item sprite.
     * @private
     */ key: "_handleLootItemClick",
            value: function _handleLootItemClick(itemSprite) {
                const itemKey = itemSprite.getData('itemKey');
                // Emit LOOT_BAG_PICKUP intent to server
                socket.emit('loot_bag_pickup', { playerId: this.scene.playerId, bagId: this.currentSourceEntityId });
            }
        }
    ]);
    return LootUIManager;
}();
