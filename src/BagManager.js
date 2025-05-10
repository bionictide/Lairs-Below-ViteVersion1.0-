function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_without_holes(arr) {
    if (Array.isArray(arr)) return _array_like_to_array(arr);
}
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
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _iterable_to_array(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _non_iterable_spread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _define_property(target, key, source[key]);
        });
    }
    return target;
}
function _to_consumable_array(arr) {
    return _array_without_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_spread();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
import Phaser from 'https://esm.sh/phaser@3.60.0';
// Placeholder item data structure (will be expanded)
var itemData = {
    'Key1': {
        name: 'Key',
        asset: 'Key1',
        width: 2,
        height: 1,
        stackable: false
    },
    'sword1': {
        name: 'Sword',
        asset: 'Sword1',
        width: 3,
        height: 1,
        stackable: false,
        usable: false
    },
    'helm1': {
        name: 'Helm',
        asset: 'Helm1',
        width: 2,
        height: 2,
        stackable: false,
        usable: false
    },
    'Potion1(red)': {
        name: 'Red Potion',
        asset: 'Potion1(red)',
        width: 1,
        height: 1,
        stackable: true,
        usable: true
    },
    'Emerald': {
        name: 'Emerald',
        asset: 'Emerald',
        width: 1,
        height: 1,
        stackable: true,
        usable: false
    },
    'BlueApatite': {
        name: 'Blue Apatite',
        asset: 'BlueApatite',
        width: 1,
        height: 1,
        stackable: true,
        usable: false
    },
    'Amethyst': {
        name: 'Amethyst',
        asset: 'Amethyst',
        width: 1,
        height: 1,
        stackable: true,
        usable: false
    },
    'RawRuby': {
        name: 'Raw Ruby',
        asset: 'RawRuby',
        width: 1,
        height: 1,
        stackable: true,
        usable: false
    }
};
// Export itemData so other modules like LootUIManager can use it
export { itemData };
export var BagManager = /*#__PURE__*/ function() {
    "use strict";
    function BagManager(scene, playerStats, itemManager) {
        _class_call_check(this, BagManager);
        this.scene = scene;
        this.playerStats = playerStats; // Store playerStats
        this.itemManager = itemManager; // Store itemManager
        this.isOpen = false;
        this.gridCols = 10; // Grid dimensions based on Bag2.png layout
        this.gridRows = 7;
        this.cellSize = 64; // Pixel size of each grid cell
        this.gridPadding = 10; // Padding around the grid
        this.inventory = []; // Stores { instanceId, itemKey, name, gridX, gridY, ...other itemData }
        this.gridOccupancy = []; // 2D array to track occupied cells
        this.bagContainer = null; // Phaser container for UI elements
        this.bagToggleButton = null; // Reference to the toggle button
        this.contextMenu = null; // Phaser container for the context menu
        this.outsideClickListener = null; // Listener for clicking outside the menu
        this.gridStartX = 0; // Will be set when bag opens
        this.gridStartY = 0; // Will be set when bag opens
        this.clickThreshold = 10; // Max distance in pixels for a click
        this.clickTimeThreshold = 250; // Max time in ms for a click
        this.pointerDownTime = 0; // Timestamp of pointer down on an item
        this.pointerDownPos = {
            x: 0,
            y: 0
        }; // Position of pointer down on an item
        this.activeBagSprites = new Map(); // Map to track { entityId: { sprite: Phaser.GameObjects.Sprite, roomId: string, droppedFacingDirection: string } }
        this.PLAYER_BAG_ID = 'player_dropped_bag'; // Unique ID for the player's dropped bag
        // Removed the redundant asset loading loop here. Assets are loaded in DungeonScene.preload.
        this.initializeGridOccupancy();
        // Start player with one potion for healing
        this.addItem('Potion1(red)'); // Keep the potion for gameplay purposes
    }
    _create_class(BagManager, [
        {
            key: "initializeGridOccupancy",
            value: function initializeGridOccupancy() {
                var _this = this;
                this.gridOccupancy = Array(this.gridRows).fill(null).map(function() {
                    return Array(_this.gridCols).fill(null);
                });
            }
        },
        {
            key: "createToggleButton",
            value: function createToggleButton() {
                var _this = this;
                var buttonX = this.scene.game.config.width - 100; // Position top-right
                var buttonY = 50;
                var button = this.scene.add.rectangle(buttonX, buttonY, 150, 50, 0x333333).setStrokeStyle(2, 0xffffff).setInteractive({
                    useHandCursor: true
                }).setDepth(70); // Menu layer
                var text = this.scene.add.text(buttonX, buttonY, 'Open Bag', {
                    fontSize: '20px',
                    color: '#ffffff'
                }).setOrigin(0.5).setDepth(71); // Above button
                button.on('pointerdown', function() {
                    if (!_this.scene.isInEncounter) {
                        _this.toggleBag();
                    } else {
                        _this.scene.events.emit('showActionPrompt', 'Cannot open bag during encounter!');
                    }
                });
                button.on('pointerover', function() {
                    return button.setFillStyle(0x555555);
                });
                button.on('pointerout', function() {
                    return button.setFillStyle(0x333333);
                });
                this.bagToggleButton = {
                    bg: button,
                    text: text
                }; // Store references
                // Initially hide button if needed (e.g., during loading) - make visible after create()
                this.setBagButtonVisibility(true);
            }
        },
        {
            key: "setBagButtonVisibility",
            value: function setBagButtonVisibility(visible) {
                if (this.bagToggleButton) {
                    this.bagToggleButton.bg.setVisible(visible);
                    this.bagToggleButton.text.setVisible(visible);
                }
            }
        },
        {
            key: "toggleBag",
            value: function toggleBag() {
                var _this_scene_debugHelper;
                this.isOpen = !this.isOpen;
                // console.log(`[DEBUG] Bag toggled. Is open: ${this.isOpen}`); // Removed DEBUG log
                if (this.isOpen) {
                    this.openBagUI();
                    this.bagToggleButton.text.setText('Close Bag');
                    this.setInteractionBlocking(true); // Block scene interactions
                } else {
                    this.closeBagUI();
                    this.bagToggleButton.text.setText('Open Bag');
                    this.setInteractionBlocking(false); // Unblock scene interactions
                }
                // Update navigation buttons based on bag state AND encounter state
                this.scene.setupNavigationButtons();
                // Update door visibility/interactivity
                this.scene.updateDoorZoneVisibility(!this.isOpen && ((_this_scene_debugHelper = this.scene.debugHelper) === null || _this_scene_debugHelper === void 0 ? void 0 : _this_scene_debugHelper.visible)); // Only show zones if debug AND bag closed
                this.scene.setDoorInteractivity(!this.isOpen); // Disable/Enable door clicks
            }
        },
        {
            key: "setInteractionBlocking",
            value: function setInteractionBlocking(isBlocked) {
            // This method is primarily for conceptual clarity.
            // The actual blocking happens by disabling buttons/zones in DungeonScene
            // based on this.isOpen state.
            // console.log(`[DEBUG] Interaction blocking set to: ${isBlocked}`); // Removed DEBUG log
            }
        },
        {
            key: "openBagUI",
            value: function openBagUI() {
                if (this.bagContainer) this.bagContainer.destroy(); // Destroy previous if any
                var centerX = this.scene.game.config.width / 2;
                var centerY = this.scene.game.config.height / 2;
                // --- Create Container ---
                this.bagContainer = this.scene.add.container(0, 0).setDepth(80); // Bag2 UI layer
                // --- Bag Background ---
                var bagBg = this.scene.add.image(centerX, centerY, 'Bag2');
                // Optional: Scale the bag if needed, e.g., to fit screen better
                // bagBg.setScale(0.8);
                // --- Grid Calculation ---
                var totalGridWidth = this.gridCols * this.cellSize;
                var totalGridHeight = this.gridRows * this.cellSize;
                // Center the grid visually within the bag background (adjust offsets as needed)
                this.gridStartX = centerX - totalGridWidth / 2; // Store grid start coords
                this.gridStartY = centerY - totalGridHeight / 2 + 30; // Store grid start coords
                // --- Grid Graphics ---
                var gridGraphics = this.scene.add.graphics();
                gridGraphics.lineStyle(1, 0xffffff, 0.2); // Thin white lines, slightly transparent
                // Draw vertical lines
                for(var i = 0; i <= this.gridCols; i++){
                    var x = this.gridStartX + i * this.cellSize;
                    gridGraphics.lineBetween(x, this.gridStartY, x, this.gridStartY + totalGridHeight);
                }
                // Draw horizontal lines
                for(var j = 0; j <= this.gridRows; j++){
                    var y = this.gridStartY + j * this.cellSize;
                    gridGraphics.lineBetween(this.gridStartX, y, this.gridStartX + totalGridWidth, y);
                }
                // --- Title (Repositioned) ---
                var title = this.scene.add.text(centerX, centerY - bagBg.displayHeight / 2 + 40, 'Inventory', {
                    fontSize: '32px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 4
                }).setOrigin(0.5);
                // --- Close Button Removed ---
                // The main toggle button handles closing now.
                // --- Add elements to container ---
                this.bagContainer.add([
                    bagBg,
                    gridGraphics,
                    title
                ]); // Removed closeButton
                // --- Render Items ---
                this.renderItems(this.gridStartX, this.gridStartY); // Use this.gridStartX and this.gridStartY
            }
        },
        {
            key: "closeBagUI",
            value: function closeBagUI() {
                if (this.bagContainer) {
                    this.bagContainer.destroy();
                    this.bagContainer = null;
                }
            }
        },
        {
            // --- Inventory Management Methods ---
            key: "addItem",
            value: function addItem(itemKey) {
                var baseItem = itemData[itemKey];
                if (!baseItem) {
                    console.warn("[BagManager] Attempted to add unknown item key: ".concat(itemKey));
                    return false; // Return false if item key is unknown
                }
                var instanceId = Phaser.Utils.String.UUID();
                var newItemInstance = _object_spread({
                    instanceId: instanceId,
                    itemKey: itemKey,
                    gridX: -1,
                    gridY: -1
                }, baseItem // Spread all properties from itemData definition
                );
                // Find the first available slot (simple top-left placement for now)
                var placement = this.findFirstAvailableSlot(newItemInstance.width, newItemInstance.height);
                if (placement) {
                    newItemInstance.gridX = placement.x;
                    newItemInstance.gridY = placement.y;
                    this.markGridOccupancy(placement.x, placement.y, newItemInstance.width, newItemInstance.height, instanceId);
                    // Instead of mutating inventory directly, emit intent to server
                    this.scene.socket.emit('ITEM_ADD_REQUEST', { playerId: this.scene.playerId || (this.scene.playerStats && this.scene.playerStats.playerId), itemKey, gridX: placement.x, gridY: placement.y });
                    // UI feedback only; actual inventory update will come from server event
                    this.scene.events.emit('showActionPrompt', `Picked up ${newItemInstance.name}`);
                    if (this.isOpen) {
                        this.openBagUI();
                    }
                    return true;
                } else {
                    this.scene.events.emit('showActionPrompt', `Bag is full! Cannot pick up ${newItemInstance.name}`);
                    return false;
                }
            }
        },
        {
            key: "removeItem",
            value: function removeItem(instanceId) {
                // Instead of mutating inventory directly, emit intent to server
                this.scene.socket.emit('ITEM_REMOVE_REQUEST', { playerId: this.scene.playerId || (this.scene.playerStats && this.scene.playerStats.playerId), instanceId });
                // UI feedback only; actual inventory update will come from server event
                if (this.isOpen) {
                    this.openBagUI();
                }
                return null; // Actual removed item will be reflected by server event
            }
        },
        {
            // --- Grid Management Methods ---
            key: "findFirstAvailableSlot",
            value: function findFirstAvailableSlot(itemWidth, itemHeight) {
                for(var y = 0; y <= this.gridRows - itemHeight; y++){
                    for(var x = 0; x <= this.gridCols - itemWidth; x++){
                        if (this.canPlaceItemAt(x, y, itemWidth, itemHeight)) {
                            return {
                                x: x,
                                y: y
                            };
                        }
                    }
                }
                return null; // No suitable slot found
            }
        },
        {
            key: "canPlaceItemAt",
            value: function canPlaceItemAt(gridX, gridY, itemWidth, itemHeight) {
                for(var y = gridY; y < gridY + itemHeight; y++){
                    for(var x = gridX; x < gridX + itemWidth; x++){
                        // Check bounds first
                        if (y < 0 || y >= this.gridRows || x < 0 || x >= this.gridCols) {
                            return false;
                        }
                        // Check if cell is already occupied
                        if (this.gridOccupancy[y][x] !== null) {
                            return false;
                        }
                    }
                }
                return true; // All cells within the area are available
            }
        },
        {
            key: "markGridOccupancy",
            value: function markGridOccupancy(gridX, gridY, itemWidth, itemHeight, instanceId) {
                for(var y = gridY; y < gridY + itemHeight; y++){
                    for(var x = gridX; x < gridX + itemWidth; x++){
                        if (y >= 0 && y < this.gridRows && x >= 0 && x < this.gridCols) {
                            this.gridOccupancy[y][x] = instanceId;
                        }
                    }
                }
            }
        },
        {
            key: "unmarkGridOccupancy",
            value: function unmarkGridOccupancy(gridX, gridY, itemWidth, itemHeight) {
                for(var y = gridY; y < gridY + itemHeight; y++){
                    for(var x = gridX; x < gridX + itemWidth; x++){
                        if (y >= 0 && y < this.gridRows && x >= 0 && x < this.gridCols) {
                            // Optional: Check if it matches the expected ID before nullifying
                            this.gridOccupancy[y][x] = null;
                        }
                    }
                }
            }
        },
        {
            // --- UI Rendering Methods ---
            key: "renderItems",
            value: function renderItems(gridStartX, gridStartY) {
                var _this = this;
                // Clear previously rendered item sprites if any (simple approach)
                // A more robust approach might track sprites individually
                this.bagContainer.list.forEach(function(child) {
                    // Only remove item sprites, identified by having itemData attached
                    if (child.getData && child.getData('isBagItem')) {
                        child.destroy();
                    }
                });
                this.inventory.forEach(function(item) {
                    if (item.gridX === -1 || item.gridY === -1 || !item.asset) return; // Skip if not placed or no asset
                    // Calculate pixel position using stored grid start coords
                    var itemCenterX = _this.gridStartX + item.gridX * _this.cellSize + item.width * _this.cellSize / 2;
                    var itemCenterY = _this.gridStartY + item.gridY * _this.cellSize + item.height * _this.cellSize / 2;
                    // Calculate maximum allowed dimensions with padding
                    var maxItemWidth = item.width * _this.cellSize - _this.gridPadding * 2;
                    var maxItemHeight = item.height * _this.cellSize - _this.gridPadding * 2;
                    var itemSprite = _this.scene.add.image(itemCenterX, itemCenterY, item.asset).setInteractive({
                        useHandCursor: true,
                        draggable: true
                    }) // Make draggable
                    .setDepth(81); // Bag2 Items layer
                    // Scale the item sprite to fit within its designated cells, maintaining aspect ratio, then increase further
                    var baseScale = Math.min(maxItemWidth / itemSprite.width, maxItemHeight / itemSprite.height);
                    itemSprite.scale = baseScale * 1.375; // Increase scale by another 10% (1.25 * 1.10)
                    // Store item instance data directly on the sprite for easy access later
                    itemSprite.setData('itemInstance', item);
                    itemSprite.setData('isBagItem', true); // Mark as an item sprite
                    // Add drag event listeners (implement handlers next)
                    itemSprite.on('dragstart', function(pointer, dragX, dragY) {
                        return _this.handleItemDragStart(pointer, itemSprite);
                    });
                    itemSprite.on('drag', function(pointer, dragX, dragY) {
                        return _this.handleItemDrag(pointer, itemSprite, dragX, dragY);
                    });
                    itemSprite.on('dragend', function(pointer, dragX, dragY, dropped) {
                        return _this.handleItemDragEnd(pointer, itemSprite, dropped);
                    });
                    itemSprite.on('pointerup', function(pointer) {
                        return _this.handleItemPointerUp(pointer, itemSprite);
                    }); // Add pointerup listener
                    _this.bagContainer.add(itemSprite);
                    console.log("[BagManager] Rendered ".concat(item.name, " at screen coords (").concat(itemCenterX, ", ").concat(itemCenterY, "), grid [").concat(item.gridX, ", ").concat(item.gridY, "]"));
                });
            }
        },
        {
            // --- Item Interaction Handlers ---
            key: "handleItemDragStart",
            value: function handleItemDragStart(pointer, gameObject) {
                console.log("Drag Start: ".concat(gameObject.getData('itemInstance').name));
                gameObject.setDepth(85); // Temporarily highest within bag context during drag
                this.bagContainer.bringToTop(gameObject); // Ensure visually on top within container
                gameObject.setData('originalX', gameObject.x);
                gameObject.setData('originalY', gameObject.y);
                // Record initial pointer state for click detection
                gameObject.setData('pointerDownTime', pointer.downTime);
                gameObject.setData('pointerDownX', pointer.downX);
                gameObject.setData('pointerDownY', pointer.downY);
                gameObject.setData('isClick', false); // Reset click flag on new drag start
            // TODO: Maybe show grid highlights or ghost image
            }
        },
        {
            key: "handleItemDrag",
            value: function handleItemDrag(pointer, gameObject, dragX, dragY) {
                gameObject.x = dragX;
                gameObject.y = dragY;
            // TODO: Snap preview to grid
            }
        },
        {
            key: "handleItemDragEnd",
            value: function handleItemDragEnd(pointer, gameObject, dropped) {
                var itemInstance = gameObject.getData('itemInstance');
                var originalGridX = itemInstance.gridX;
                var originalGridY = itemInstance.gridY;
                var itemWidth = itemInstance.width;
                var itemHeight = itemInstance.height;
                console.log("Drag End: ".concat(itemInstance.name, " at screen (").concat(gameObject.x, ", ").concat(gameObject.y, "), Dropped: ").concat(dropped));
                gameObject.setDepth(81); // Reset depth to Bag2 Items layer
                // --- Check if it was a click ---
                if (gameObject.getData('preventDragEndSnap')) {
                    // console.log(`[DEBUG] DragEnd detected 'preventDragEndSnap' flag (likely a click). Skipping placement logic.`); // Removed DEBUG log
                    // Reset the flag so it doesn't interfere with the *next* drag
                    gameObject.setData('preventDragEndSnap', false);
                    // Ensure the item stays at its original position visually IF it was just a click without movement.
                    // We don't need to re-mark grid occupancy as it wasn't unmarked.
                    gameObject.x = gameObject.getData('originalX');
                    gameObject.y = gameObject.getData('originalY');
                    return; // Exit early, no placement logic needed for a click
                }
                // --- Calculate Target Grid Cell (Only if NOT a click) ---
                // Get position relative to grid top-left corner
                var relativeX = gameObject.x - this.gridStartX;
                var relativeY = gameObject.y - this.gridStartY;
                // Calculate target grid cell (top-left corner of the potential placement)
                // We bias towards the center of the dragged item for calculation
                var targetGridX = Math.floor((relativeX - itemWidth * this.cellSize / 2 + this.cellSize / 2) / this.cellSize);
                var targetGridY = Math.floor((relativeY - itemHeight * this.cellSize / 2 + this.cellSize / 2) / this.cellSize);
                console.log("Target Grid: [".concat(targetGridX, ", ").concat(targetGridY, "]"));
                // --- Check Placement Validity ---
                var isValidPlacement = false;
                // 1. Unmark original position temporarily
                this.unmarkGridOccupancy(originalGridX, originalGridY, itemWidth, itemHeight);
                // 2. Check if the new position is valid (within bounds and not overlapping OTHERS)
                if (this.canPlaceItemAt(targetGridX, targetGridY, itemWidth, itemHeight)) {
                    isValidPlacement = true;
                }
                // --- Update Inventory and Sprite ---
                if (isValidPlacement) {
                    console.log("Valid placement at [".concat(targetGridX, ", ").concat(targetGridY, "]. Updating item."));
                    // Update item data in the main inventory array
                    itemInstance.gridX = targetGridX;
                    itemInstance.gridY = targetGridY;
                    // Mark the NEW grid position as occupied
                    this.markGridOccupancy(targetGridX, targetGridY, itemWidth, itemHeight, itemInstance.instanceId);
                    // Calculate new center position for snapping the sprite
                    var newItemCenterX = this.gridStartX + targetGridX * this.cellSize + itemWidth * this.cellSize / 2;
                    var newItemCenterY = this.gridStartY + targetGridY * this.cellSize + itemHeight * this.cellSize / 2;
                    // Snap sprite to the new valid position
                    gameObject.x = newItemCenterX;
                    gameObject.y = newItemCenterY;
                    // Update original position data on sprite for subsequent drags
                    gameObject.setData('originalX', newItemCenterX);
                    gameObject.setData('originalY', newItemCenterY);
                } else {
                    console.log("Invalid placement at [".concat(targetGridX, ", ").concat(targetGridY, "]. Reverting."));
                    // Re-mark the ORIGINAL grid position (since the move failed)
                    this.markGridOccupancy(originalGridX, originalGridY, itemWidth, itemHeight, itemInstance.instanceId);
                    // Snap sprite back to original position
                    gameObject.x = gameObject.getData('originalX');
                    gameObject.y = gameObject.getData('originalY');
                }
            // Optional: Log the grid state for debugging
            // console.log("Grid Occupancy:", JSON.stringify(this.gridOccupancy));
            }
        },
        {
            key: "handleItemPointerUp",
            value: function handleItemPointerUp(pointer, gameObject) {
                var downTime = gameObject.getData('pointerDownTime');
                var downX = gameObject.getData('pointerDownX');
                var downY = gameObject.getData('pointerDownY');
                var itemInstance = gameObject.getData('itemInstance');
                var upTime = pointer.upTime;
                var upX = pointer.upX;
                var upY = pointer.upY;
                var timeDiff = upTime - downTime;
                var distance = Phaser.Math.Distance.Between(downX, downY, upX, upY);
                // console.log(`[DEBUG] Pointer Up on ${itemInstance.name}: TimeDiff=${timeDiff}ms, Distance=${distance.toFixed(2)}px`); // Removed DEBUG log
                // Check if it's a click
                if (timeDiff < this.clickTimeThreshold && distance < this.clickThreshold) {
                    // console.log(`[DEBUG] CLICK detected on ${itemInstance.name}`); // Removed DEBUG log
                    gameObject.setData('isClick', true);
                    this.handleItemClick(itemInstance, gameObject);
                } else {
                    // Ensure isClick is false if it wasn't a click (though dragend usually handles reset)
                    gameObject.setData('isClick', false);
                }
            }
        },
        {
            key: "handleItemClick",
            value: function handleItemClick(itemInstance, gameObject) {
                // Placeholder for future click actions (e.g., show context menu, use item)
                console.log("[BagManager] Item Clicked: ".concat(itemInstance.name, " (ID: ").concat(itemInstance.instanceId, ")"));
                // Example: Show a simple alert or log - REMOVED, replaced by context menu
                // this.scene.events.emit('showActionPrompt', `Clicked on ${itemInstance.name}`);
                // Prevent drag end logic from snapping back if it was a click that didn't move
                // This is needed because pointerup fires *before* dragend
                gameObject.setData('preventDragEndSnap', true);
                // Show the context menu at the click position
                var pointer = this.scene.input.activePointer;
                this.showContextMenu(itemInstance, pointer.x, pointer.y);
            }
        },
        {
            // --- Context Menu ---
            key: "closeContextMenu",
            value: function closeContextMenu() {
                if (this.contextMenu) {
                    console.log("[BagManager] Closing context menu.");
                    this.contextMenu.destroy();
                    this.contextMenu = null;
                }
                // Remove the listener for clicking outside
                if (this.outsideClickListener) {
                    this.scene.input.off('pointerdown', this.outsideClickListener);
                    this.outsideClickListener = null;
                    console.log("[BagManager] Removed outside click listener.");
                }
            }
        },
        {
            key: "showContextMenu",
            value: function showContextMenu(itemInstance, x, y) {
                var _this = this;
                this.closeContextMenu(); // Close any existing menu first
                console.log("[BagManager] showContextMenu called for ".concat(itemInstance.name, " at (").concat(x, ", ").concat(y, ")"));
                var buttonHeight = 30;
                var buttonWidth = 100;
                var buttonSpacing = 35; // Vertical space between buttons
                var padding = 5; // Padding inside the menu background
                // --- Define Actions ---
                var actions = [];
                // Add 'Use' action if the item is marked as usable
                if (itemInstance.usable) {
                    actions.push({
                        text: 'Use',
                        callback: function() {
                            return _this.handleContextMenuAction(itemInstance, 'use');
                        }
                    });
                }
                // Always add 'Drop' action (for now)
                actions.push({
                    text: 'Drop',
                    callback: function() {
                        return _this.handleContextMenuAction(itemInstance, 'drop');
                    }
                });
                // Add more actions later (Inspect, Combine, etc.)
                if (actions.length === 0) {
                    console.log("[BagManager] No context actions available for ".concat(itemInstance.name));
                    return; // Don't show menu if no actions
                }
                // --- Calculate Menu Dimensions ---
                var menuHeight = actions.length * buttonHeight + (actions.length - 1) * (buttonSpacing - buttonHeight) + padding * 2;
                var menuWidth = buttonWidth + padding * 2;
                // --- Create Container & Background ---
                // Adjust position slightly to avoid cursor overlap, keep within bounds
                var menuX = Phaser.Math.Clamp(x + 10, menuWidth / 2, this.scene.game.config.width - menuWidth / 2);
                var menuY = Phaser.Math.Clamp(y + 10, menuHeight / 2, this.scene.game.config.height - menuHeight / 2);
                this.contextMenu = this.scene.add.container(menuX, menuY).setDepth(82); // Context Menu layer
                var menuBg = this.scene.add.rectangle(0, 0, menuWidth, menuHeight, 0x1a1a1a, 0.9) // Dark semi-transparent bg
                .setStrokeStyle(1, 0xaaaaaa); // Light grey border
                this.contextMenu.add(menuBg);
                // --- Create Buttons ---
                var startY = -menuHeight / 2 + padding + buttonHeight / 2; // Start position for first button
                actions.forEach(function(action, i) {
                    var buttonY = startY + i * buttonSpacing;
                    var buttonBg = _this.scene.add.rectangle(0, buttonY, buttonWidth, buttonHeight, 0x333333).setStrokeStyle(1, 0xcccccc).setInteractive({
                        useHandCursor: true
                    });
                    var buttonText = _this.scene.add.text(0, buttonY, action.text, {
                        fontSize: '14px',
                        color: '#ffffff'
                    }).setOrigin(0.5);
                    buttonBg.on('pointerover', function() {
                        return buttonBg.setFillStyle(0x555555);
                    });
                    buttonBg.on('pointerout', function() {
                        return buttonBg.setFillStyle(0x333333);
                    });
                    buttonBg.on('pointerdown', function(pointer, localX, localY, event) {
                        event.stopPropagation(); // Call stopPropagation on the DOM event object
                        action.callback(); // Execute the action
                        _this.closeContextMenu(); // Close menu after action click
                    });
                    _this.contextMenu.add([
                        buttonBg,
                        buttonText
                    ]);
                });
                // --- Add Listener to Close on Click Outside ---
                // Use a slight delay to prevent the click that *opened* the menu from immediately closing it
                this.scene.time.delayedCall(50, function() {
                    // Ensure listener isn't added if menu was closed before delay finished
                    if (!_this.contextMenu) return;
                    _this.outsideClickListener = function(pointer) {
                        // Check if the click is outside the menu bounds
                        if (_this.contextMenu && !_this.contextMenu.getBounds().contains(pointer.x, pointer.y)) {
                            console.log("[BagManager] Click detected outside context menu.");
                            _this.closeContextMenu();
                        }
                    };
                    _this.scene.input.on('pointerdown', _this.outsideClickListener);
                    console.log("[BagManager] Added outside click listener.");
                });
            }
        },
        {
            key: "handleContextMenuAction",
            value: function handleContextMenuAction(itemInstance, action) {
                console.log("[BagManager] Context Action: ".concat(action, " on ").concat(itemInstance.name));
                // Implement actual logic for 'use', 'drop', etc.
                if (action === 'use') {
                    // Use ItemManager to handle the 'use' action
                    var useResult = this.itemManager.useItem(itemInstance, this.playerStats);
                    // Show result message
                    this.scene.events.emit('showActionPrompt', useResult.message);
                    // Consume item if ItemManager indicates it should be
                    if (useResult.consumed) {
                        this.removeItem(itemInstance.instanceId);
                    }
                } else if (action === 'drop') {
                    // Dropping just removes it, stats will update via removeItem
                    this.removeItem(itemInstance.instanceId);
                    this.scene.events.emit('showActionPrompt', "Dropped ".concat(itemInstance.name));
                }
            // Close the menu after action - Now handled by the button's pointerdown directly
            // this.closeContextMenu(); // Removed from here
            }
        },
        {
            // --- NPC Bag Drop ---
            key: "createBagForNPC",
            value: function createBagForNPC(deceasedId, roomId) {
                var _this = this;
                var attackerId = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : null, playerFacingDirection = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 'north';
                var _this_scene_encounterManager_entities, _this_scene_encounterManager;
                console.log("[BagManager] Received request to create bag for NPC: ".concat(deceasedId, " in room ").concat(roomId, ", player facing ").concat(playerFacingDirection));
                // --- Health Check ---
                // Access EncounterManager through the scene to get the entity's state
                var entity = (_this_scene_encounterManager = this.scene.encounterManager) === null || _this_scene_encounterManager === void 0 ? void 0 : (_this_scene_encounterManager_entities = _this_scene_encounterManager.entities) === null || _this_scene_encounterManager_entities === void 0 ? void 0 : _this_scene_encounterManager_entities.get(deceasedId);
                if (entity && entity.health > 0) {
                    console.log("[BagManager] Skipping bag creation for NPC ".concat(deceasedId, ". Entity health (").concat(entity.health, ") > 0."));
                    return; // Don't create a bag if the entity is not dead
                }
                // --- Proceed with bag creation if health is <= 0 ---
                console.log("[BagManager] NPC ".concat(deceasedId, " confirmed as deceased (or entity not found/invalid). Proceeding with bag creation."));
                // Set the intended conceptual drop position (center screen initially).
                var dropX = this.scene.game.config.width / 2;
                var dropY = this.scene.game.config.height * 0.70; // 70% down from top
                if (this.scene.textures.exists('Bag1')) {
                    // Avoid creating duplicate sprites if one already exists for this ID (e.g., debug scenario)
                    if (this.activeBagSprites.has(deceasedId)) {
                        console.log("[BagManager] Bag sprite for ".concat(deceasedId, " already exists. Skipping creation."));
                        return; // Don't create another
                    }
                    // Create sprite at the conceptual drop position, but initially hidden.
                    var droppedBag = this.scene.add.sprite(dropX, dropY, 'Bag1').setScale(0.1875) // Increased size by 25% (0.15 * 1.25)
                    .setDepth(30) // Lootbag layer
                    .setVisible(true) // Start VISIBLE at the center coordinates
                    .setInteractive({
                        useHandCursor: true
                    });
                    // Store the ID of the deceased entity on the bag
                    droppedBag.setData('deceasedEntityId', deceasedId);
                    // Store the sprite, its room ID, and the direction player was facing when it dropped
                    this.activeBagSprites.set(deceasedId, {
                        sprite: droppedBag,
                        roomId: roomId,
                        droppedFacingDirection: playerFacingDirection // Store the direction
                    });
                    console.log("[BagManager] Registered bag sprite for ".concat(deceasedId, " in room ").concat(roomId, " (dropped facing ").concat(playerFacingDirection, "). Total tracked bags: ").concat(this.activeBagSprites.size));
                    // Add the listener to emit the event for the Loot UI
                    // Correct signature: (pointer, localX, localY, event)
                    droppedBag.on('pointerdown', function(pointer, localX, localY, event) {
                        event.stopPropagation(); // Call on the DOM event object (4th argument)
                        var id = droppedBag.getData('deceasedEntityId');
                        if (id) {
                            console.log("[DEBUG Bag Pickup] Emitting lootBagClicked for: ".concat(id));
                            // Emit event with ID and the sprite itself
                            _this.scene.events.emit('lootBagClicked', id, droppedBag);
                        // LootUIManager will handle destroying the sprite after looting
                        } else {
                            console.warn('[WARN Bag Pickup] Clicked bag has no deceasedEntityId data.');
                            _this.scene.events.emit('showActionPrompt', 'Cannot determine loot origin.');
                        // Don't destroy here on invalid ID, maybe something else needs it?
                        // droppedBag.destroy(); // Consider if destroying here is safe
                        }
                    });
                    // The updateBagVisibility method will handle showing/hiding and positioning based on perspective.
                    console.log("[BagManager] Created (initially hidden) bag sprite for ".concat(deceasedId, " conceptually at (").concat(dropX, ", ").concat(dropY, ")"));
                } else {
                    console.warn('[WARN BagManager] Bag1 texture not found for dropping bag.');
                }
            }
        },
        {
            /**
 * Creates and tracks a bag sprite specifically for the player's dropped inventory upon death.
 * @param {string} roomId - The ID of the room where the player died.
 * @param {Array} items - The array of item instances dropped by the player.
 * @param {string} droppedFacingDirection - The direction the bag should conceptually face (opposite of player's death direction).
 */ key: "createPlayerDroppedBag",
            value: function createPlayerDroppedBag(roomId, items, droppedFacingDirection) {
                var _this = this;
                console.log("[BagManager] Creating player dropped bag in room ".concat(roomId, ", facing ").concat(droppedFacingDirection));
                // Remove any existing player bag first
                this.removeBagSprite(this.PLAYER_BAG_ID);
                // IMPORTANT: Update stats based on an EMPTY inventory before creating the bag sprite
                // This ensures the player loses stat bonuses when they die and drop their items.
                this.playerStats.updateStatsFromInventory([]);
                var dropX = this.scene.game.config.width / 2;
                var dropY = this.scene.game.config.height * 0.70; // Consistent Y position
                if (this.scene.textures.exists('Bag1')) {
                    var droppedBag = this.scene.add.sprite(dropX, dropY, 'Bag1').setScale(0.1875) // Increased size by 25% (0.15 * 1.25)
                    .setDepth(30) // Lootbag layer
                    .setVisible(true) // Start visible at center
                    .setInteractive({
                        useHandCursor: true
                    });
                    // Store necessary data on the sprite
                    droppedBag.setData('deceasedEntityId', this.PLAYER_BAG_ID); // Use consistent property name
                    droppedBag.setData('playerInventoryItems', items);
                    droppedBag.setData('lootType', 'player');
                    // Add to tracking map
                    this.activeBagSprites.set(this.PLAYER_BAG_ID, {
                        sprite: droppedBag,
                        roomId: roomId,
                        droppedFacingDirection: droppedFacingDirection
                    });
                    console.log("[BagManager] Registered PLAYER bag sprite in room ".concat(roomId, " (dropped facing ").concat(droppedFacingDirection, "). Total tracked bags: ").concat(this.activeBagSprites.size));
                    // Add click listener
                    droppedBag.on('pointerdown', function(pointer, localX, localY, event) {
                        event.stopPropagation();
                        console.log("[DEBUG Bag Pickup] Emitting lootBagClicked for: ".concat(_this.PLAYER_BAG_ID));
                        // Emit event with the specific player ID and the sprite
                        _this.scene.events.emit('lootBagClicked', _this.PLAYER_BAG_ID, droppedBag);
                    });
                    // updateBagVisibility will handle positioning later
                    console.log("[BagManager] Created player dropped bag sprite conceptually at (".concat(dropX, ", ").concat(dropY, ")"));
                } else {
                    console.warn('[WARN BagManager] Bag1 texture not found for dropping PLAYER bag.');
                }
            }
        },
        {
            /**
 * Updates the visibility of all tracked bag sprites based on the current room.
 * @param {string} currentRoomId - The ID of the room the player is currently in.
 * @param {string} currentFacingDirection - The direction the player is currently facing ('north', 'east', 'south', 'west').
 */ // Helper function to determine relative direction
            key: "getRelativeDirection",
            value: function getRelativeDirection(droppedFacing, currentFacing) {
                var directions = [
                    'north',
                    'east',
                    'south',
                    'west'
                ];
                var droppedIndex = directions.indexOf(droppedFacing);
                var currentIndex = directions.indexOf(currentFacing);
                if (droppedIndex === -1 || currentIndex === -1) {
                    console.warn("[BagManager] Invalid direction provided: dropped=".concat(droppedFacing, ", current=").concat(currentFacing));
                    return 'front'; // Default fallback
                }
                var diff = (currentIndex - droppedIndex + 4) % 4; // Calculate difference (0=same, 1=right, 2=back, 3=left)
                switch(diff){
                    case 0:
                        return 'front';
                    case 1:
                        return 'right'; // Player turned right relative to the drop direction
                    case 2:
                        return 'back';
                    case 3:
                        return 'left'; // Player turned left relative to the drop direction
                    default:
                        return 'front'; // Should not happen
                }
            }
        },
        {
            key: "updateBagVisibility",
            value: function updateBagVisibility(currentRoomId, currentFacingDirection) {
                var _this = this;
                console.log("[BagManager] Updating bag visibility for room: ".concat(currentRoomId, ", facing: ").concat(currentFacingDirection, ". Tracking ").concat(this.activeBagSprites.size, " bags."));
                var screenWidth = this.scene.game.config.width;
                var screenHeight = this.scene.game.config.height;
                // const targetY = screenHeight * 0.70; // No longer constant Y
                this.activeBagSprites.forEach(function(bagData, entityId) {
                    var sprite = bagData.sprite;
                    if (sprite && sprite.scene) {
                        var isInCurrentRoom = bagData.roomId === currentRoomId;
                        var droppedFacing = bagData.droppedFacingDirection; // Get the direction when dropped
                        var currentFacing = currentFacingDirection.trim().toLowerCase();
                        var isVisible = false;
                        var targetX = screenWidth / 2; // Default Center X
                        var targetY = screenHeight * 0.70; // Default Y (Front view)
                        var relativeDirection = 'front'; // Declare and initialize with a default
                        if (isInCurrentRoom) {
                            // Calculate relative direction based on drop direction and current facing
                            relativeDirection = _this.getRelativeDirection(droppedFacing, currentFacing); // Assign calculated value
                            console.log("[BagManager] Bag ".concat(entityId, ": Dropped=").concat(droppedFacing, ", Current=").concat(currentFacing, ", Relative=").concat(relativeDirection));
                            switch(relativeDirection){
                                case 'front':
                                    isVisible = true;
                                    targetX = screenWidth / 2;
                                    targetY = screenHeight * 0.70; // 70% down
                                    sprite.setFlipX(false); // Ensure not flipped
                                    break;
                                case 'left':
                                    isVisible = true;
                                    targetX = screenWidth * 0.85; // 85% from left
                                    targetY = screenHeight * 0.78; // 78% down
                                    sprite.setFlipX(false); // Ensure not flipped
                                    break;
                                case 'right':
                                    isVisible = true;
                                    targetX = screenWidth * 0.15; // 15% from left
                                    targetY = screenHeight * 0.78; // 78% down
                                    sprite.setFlipX(true); // Flip horizontally
                                    break;
                                case 'back':
                                    isVisible = false;
                                    sprite.setFlipX(false); // Ensure not flipped when hidden
                                    break;
                                default:
                                    isVisible = true;
                                    targetX = screenWidth / 2;
                                    targetY = screenHeight * 0.70;
                                    sprite.setFlipX(false); // Ensure not flipped
                                    break;
                            }
                        } else {
                            // Not in the current room
                            isVisible = false;
                        }
                        // Apply scale based on position *before* setting visibility/position
                        var targetScale = 0.1875; // Default to larger size for left/right
                        if (relativeDirection === 'front') {
                            targetScale = 0.165; // Use slightly larger size for center position (0.15 * 1.10)
                        }
                        sprite.setScale(targetScale);
                        // Apply visibility and position
                        sprite.setVisible(isVisible);
                        if (isVisible) {
                            sprite.setPosition(targetX, targetY);
                            console.log("[BagManager] Applied - Bag ".concat(entityId, " visible in room ").concat(bagData.roomId, " at (").concat(targetX.toFixed(0), ", ").concat(targetY.toFixed(0), ") with scale ").concat(targetScale));
                        } else {
                            console.log("[BagManager] Applied - Bag ".concat(entityId, " hidden (in room ").concat(bagData.roomId, " or behind player)."));
                        }
                    } else {
                        // Clean up map entry if sprite was destroyed elsewhere (e.g., by LootUIManager or player bag replacement)
                        console.log("[BagManager] Removing stale bag entry for ".concat(entityId));
                        _this.activeBagSprites.delete(entityId);
                    }
                });
            }
        },
        {
            /**
 * Removes a tracked bag sprite, typically after it's been looted.
 * @param {string} entityId - The ID of the entity (or PLAYER_BAG_ID) whose bag should be removed.
 */ key: "removeBagSprite",
            value: function removeBagSprite(entityId) {
                if (this.activeBagSprites.has(entityId)) {
                    var bagData = this.activeBagSprites.get(entityId);
                    if (bagData.sprite && bagData.sprite.scene) {
                        bagData.sprite.destroy(); // Destroy the Phaser sprite object
                    }
                    this.activeBagSprites.delete(entityId); // Remove from tracking map
                    console.log("[BagManager] Removed and destroyed bag sprite for ".concat(entityId, ". Remaining bags: ").concat(this.activeBagSprites.size));
                } else {
                    // Don't log warning if trying to remove non-existent player bag (it might not exist)
                    if (entityId !== this.PLAYER_BAG_ID) {
                        console.log("[BagManager] Tried to remove bag sprite for ".concat(entityId, ", but it was not found in tracking."));
                    }
                }
            }
        },
        {
            // --- Inventory Clearing ---
            /**
 * Checks if the player has a specific item in their inventory.
 * @param {string} itemName - The name of the item to check for (like "Blue Apatite", "Raw Ruby", etc.)
 * @returns {boolean} True if the item is in the inventory, false otherwise
 */ key: "hasItem",
            value: function hasItem(itemName) {
                // Search inventory by item name (not itemKey)
                var found = this.inventory.some(function(item) {
                    return item.name === itemName;
                });
                console.log("[BagManager] Checking for item: ".concat(itemName, ", found: ").concat(found));
                return found;
            }
        },
        {
            key: "clearInventory",
            value: function clearInventory() {
                this.scene.socket.emit('INVENTORY_CLEAR_REQUEST', { playerId: this.scene.playerId || (this.scene.playerStats && this.scene.playerStats.playerId) });
                if (this.isOpen) {
                    this.openBagUI();
                }
                return []; // Actual cleared inventory will be reflected by server event
            }
        },
        {
            /**
     * Returns a random item instance from the inventory, or null if empty.
     * @returns {object|null} A copy of a random item instance or null.
     */ key: "getRandomItemInstance",
            value: function getRandomItemInstance() {
                if (this.inventory.length === 0) {
                    return null;
                }
                var randomIndex = Math.floor(Math.random() * this.inventory.length);
                // Return a *copy* to prevent direct modification of the original inventory item object
                return _object_spread({}, this.inventory[randomIndex]);
            }
        }
    ]);
    return BagManager;
}();
