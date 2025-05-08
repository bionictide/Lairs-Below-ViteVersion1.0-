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
export var ShelfManager = /*#__PURE__*/ function() {
    "use strict";
    function ShelfManager(scene) {
        _class_call_check(this, ShelfManager);
        this.scene = scene;
        this.shelves = new Map(); // roomId: {empty: sprite, gem/potion: sprite}
        this.shelfWallDirections = new Map(); // roomId: facing direction
    }
    _create_class(ShelfManager, [
        {
            key: "initializeShelves",
            value: function initializeShelves(room) {
                var _this = this;
                // Skip if room has neither shelf type
                if (!room.hasShelfEmpty && !room.hasShelf2Empty) return;
                // Skip initialization if we already have shelves for this room
                if (this.shelves.has(room.id)) {
                    // Just update visibility for the existing sprites
                    var shelfData = this.shelves.get(room.id);
                    Object.values(shelfData).forEach(function(sprite) {
                        if (sprite) _this.updateShelfVisibility(sprite, room);
                    });
                    return;
                }
                // Determine wall direction if not already set
                if (!this.shelfWallDirections.has(room.id)) {
                    // Find walls without doors
                    var directions = [
                        'north',
                        'east',
                        'south',
                        'west'
                    ];
                    var directionHasDoor = {};
                    // Check each direction for a forward door
                    directions.forEach(function(dir) {
                        var doors = _this.scene.roomManager.getVisibleDoors(room, dir, _this.scene.dungeonService);
                        directionHasDoor[dir] = doors.includes('forward');
                    });
                    // Find all directions without a door
                    var directionsWithoutDoor = directions.filter(function(dir) {
                        return !directionHasDoor[dir];
                    });
                    // Use the room's id as a seed to ensure consistency for the same room
                    var roomIdSum = room.id.split('').reduce(function(sum, char) {
                        return sum + char.charCodeAt(0);
                    }, 0);
                    var shelfFacing = directionsWithoutDoor.length > 0 ? directionsWithoutDoor[roomIdSum * 5 % directionsWithoutDoor.length] // Use different factor than other items
                     : 'north';
                    // Store the chosen direction for this room
                    this.shelfWallDirections.set(room.id, shelfFacing);
                }
                var width = this.scene.game.config.width;
                var height = this.scene.game.config.height;
                var positionY = height * 0.7; // Default Y position for shelves
                var shelfData1 = {};
                // Create ShelfEmpty if room has it
                if (room.hasShelfEmpty) {
                    // Store the baseTexture in a custom property so we can reference it later
                    var emptyShelf = this.scene.add.sprite(width / 2, height * 0.5, 'ShelfEmpty').setDepth(5) // Base shelf layer
                    .setScale(0.35).setData('baseTexture', 'ShelfEmpty');
                    shelfData1.emptyShelf = emptyShelf;
                    // Add gem shelf if room has a gem type
                    if (room.gemType) {
                        var gemShelf = this.scene.add.sprite(width / 2, height * 0.5, room.gemType).setInteractive({
                            useHandCursor: true
                        }).setDepth(6) // Item on shelf layer
                        .setScale(0.35).setData('baseTexture', room.gemType);
                        // Set up click handler for gem shelf
                        gemShelf.on('pointerdown', function() {
                            // Prevent pickup during encounter
                            if (_this.scene.isInEncounter) {
                                _this.scene.events.emit('showActionPrompt', 'Cannot loot items during combat!');
                                return;
                            }
                            // Get the gem name based on the shelf type
                            var gemName, gemKey;
                            if (room.gemType === 'ShelfEmerald') {
                                gemName = 'Emerald';
                                gemKey = 'Emerald';
                            } else if (room.gemType === 'ShelfBlueApatite') {
                                gemName = 'Blue Apatite';
                                gemKey = 'BlueApatite';
                            } else if (room.gemType === 'ShelfAmethyst') {
                                gemName = 'Amethyst';
                                gemKey = 'Amethyst';
                            } else if (room.gemType === 'ShelfRawRuby') {
                                gemName = 'a Raw Ruby';
                                gemKey = 'RawRuby';
                            }
                            // Add gem to inventory
                            if (gemKey) {
                                _this.scene.events.emit('addToInventory', gemKey);
                                _this.scene.events.emit('showActionPrompt', "Picked up ".concat(gemName));
                                // Update room data to remove the gem
                                var roomData = _this.scene.dungeonService.getRoomById(room.id);
                                if (roomData) {
                                    // roomData.gemType = null;
                                }
                                // Remove the gem shelf sprite
                                gemShelf.destroy();
                                delete shelfData1.gemShelf;
                            }
                        });
                        shelfData1.gemShelf = gemShelf;
                    }
                }
                // Create Shelf2Empty if room has it
                if (room.hasShelf2Empty) {
                    var emptyShelf2 = this.scene.add.sprite(width / 2, height * 0.5, 'Shelf2Empty').setDepth(5) // Base shelf layer
                    .setScale(0.35).setData('baseTexture', 'Shelf2Empty');
                    shelfData1.emptyShelf2 = emptyShelf2;
                    // Add potion shelf if room has potions
                    if (room.hasPotion) {
                        var potionShelf = this.scene.add.sprite(width / 2, height * 0.5, 'Shelf2Potion').setInteractive({
                            useHandCursor: true
                        }).setDepth(6) // Item on shelf layer
                        .setScale(0.35).setData('baseTexture', 'Shelf2Potion');
                        // Set up click handler for potion shelf
                        potionShelf.on('pointerdown', function() {
                            // Prevent pickup during encounter
                            if (_this.scene.isInEncounter) {
                                _this.scene.events.emit('showActionPrompt', 'Cannot loot items during combat!');
                                return;
                            }
                            // Add potion to inventory
                            _this.scene.events.emit('addToInventory', 'Potion1(red)');
                            _this.scene.events.emit('showActionPrompt', 'Picked up a Red Potion');
                            // Update room data to remove the potion
                            var roomData = _this.scene.dungeonService.getRoomById(room.id);
                            if (roomData) {
                                // roomData.hasPotion = false;
                            }
                            // Remove the potion shelf sprite
                            potionShelf.destroy();
                            delete shelfData1.potionShelf;
                        });
                        shelfData1.potionShelf = potionShelf;
                    }
                }
                // Store all shelf sprites for this room
                this.shelves.set(room.id, shelfData1);
                // Update visibility for all shelves in this room using the new method
                this.updateAllShelvesVisibility(room);
            }
        },
        {
            /**
     * Gets the appropriate shelf asset name based on current perspective
     * @param {string} baseAssetName - The base shelf asset name
     * @param {string} direction - The perspective direction ('left', 'forward', 'right')
     * @returns {string} The appropriate asset name for the current perspective
     */ key: "getShelfAssetForPerspective",
            value: function getShelfAssetForPerspective(baseAssetName, direction) {
                // Return the base asset for forward view
                if (direction === 'forward') return baseAssetName;
                // Handle Empty shelves (basic types)
                if (baseAssetName === 'ShelfEmpty') {
                    return direction === 'left' ? 'ShelfEmptyLeft' : 'ShelfEmptyRight';
                }
                if (baseAssetName === 'Shelf2Empty') {
                    return direction === 'left' ? 'Shelf2EmptyLeft' : 'Shelf2EmptyRight';
                }
                // Handle gem shelves
                if (baseAssetName === 'ShelfEmerald') {
                    return direction === 'left' ? 'ShelfEmeraldLeft' : 'ShelfEmeraldRight';
                }
                if (baseAssetName === 'ShelfBlueApatite') {
                    return direction === 'left' ? 'ShelfBlueApatiteLeft' : 'ShelfBlueApatiteRight';
                }
                if (baseAssetName === 'ShelfAmethyst') {
                    return direction === 'left' ? 'ShelfAmethystLeft' : 'ShelfAmethystRight';
                }
                if (baseAssetName === 'ShelfRawRuby') {
                    return direction === 'left' ? 'ShelfRawRubyLeft' : 'ShelfRawRubyRight';
                }
                // Handle potion shelves
                if (baseAssetName === 'Shelf2Potion') {
                    return direction === 'left' ? 'Shelf2PotionLeft' : 'Shelf2PotionRight';
                }
                // Default to base asset if no mapping exists
                return baseAssetName;
            }
        },
        {
            key: "updateShelfVisibility",
            value: function updateShelfVisibility(sprite, room) {
                // Get player's current facing direction
                var currentFacing = this.scene.playerPosition.facing;
                // Get the pre-determined wall direction for this room
                var shelfFacing = this.shelfWallDirections.get(room.id);
                // Simple case: shelf is not visible at all
                if (currentFacing !== shelfFacing && this.scene.roomManager.rotateFacing(currentFacing, 'left') !== shelfFacing && this.scene.roomManager.rotateFacing(currentFacing, 'right') !== shelfFacing) {
                    sprite.setVisible(false);
                    return;
                }
                // Determine perspective (forward, left, right)
                var perspective = 'forward';
                var scale = 0.35; // Default scale for forward perspective
                if (currentFacing === shelfFacing) {
                    // Forward perspective - check for door
                    var isFacingWall = !this.scene.roomManager.getVisibleDoors(room, currentFacing, this.scene.dungeonService).includes('forward');
                    if (!isFacingWall) {
                        sprite.setVisible(false);
                        return;
                    }
                    perspective = 'forward';
                    scale = 0.35; // Forward scale
                } else if (this.scene.roomManager.rotateFacing(currentFacing, 'left') === shelfFacing) {
                    // Left perspective (shelf is on our right side)
                    perspective = 'left';
                    scale = 1.0; // Full screen for side views
                } else if (this.scene.roomManager.rotateFacing(currentFacing, 'right') === shelfFacing) {
                    // Right perspective (shelf is on our left side)
                    perspective = 'right';
                    scale = 1.0; // Full screen for side views
                }
                // Get the shelf's original texture key (for identifying which asset to use)
                var baseTexture = sprite.texture.key;
                // Get the appropriate asset for this perspective
                var newTexture = this.getShelfAssetForPerspective(baseTexture, perspective);
                // If the texture has changed, update it
                if (baseTexture !== newTexture) {
                    sprite.setTexture(newTexture);
                }
                // Update scale based on perspective
                sprite.setScale(scale);
                // Set position based on perspective
                var width = this.scene.game.config.width;
                var height = this.scene.game.config.height;
                sprite.setPosition(width / 2, perspective === 'forward' ? height * 0.5 : height / 2);
                // Make the sprite visible
                sprite.setVisible(true);
            }
        },
        {
            /**
     * Updates visibility for all shelves in a specific room
     * @param {object} room - The room object containing shelf data
     */ key: "updateAllShelvesVisibility",
            value: function updateAllShelvesVisibility(room) {
                var _this = this;
                if (!room || !this.shelves.has(room.id)) return;
                var shelfData = this.shelves.get(room.id);
                Object.values(shelfData).forEach(function(sprite) {
                    if (sprite && sprite.scene) {
                        _this.updateShelfVisibility(sprite, room);
                    }
                });
            }
        },
        {
            key: "clearShelves",
            value: function clearShelves() {
                this.shelves.forEach(function(shelfData) {
                    Object.values(shelfData).forEach(function(sprite) {
                        if (sprite) sprite.destroy();
                    });
                });
                this.shelves.clear();
            // Don't clear shelfWallDirections here to maintain persistence between room visits
            }
        }
    ]);
    return ShelfManager;
}();
