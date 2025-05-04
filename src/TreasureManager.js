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
export var TreasureManager = /*#__PURE__*/ function() {
    "use strict";
    function TreasureManager(scene) {
        _class_call_check(this, TreasureManager);
        this.scene = scene;
        this.treasures = new Map();
        this.treasureWallDirections = new Map(); // roomId: facing direction
    }
    _create_class(TreasureManager, [
        {
            key: "initializeTreasures",
            value: function initializeTreasures(room) {
                var _this = this;
                // Removed the hasMiddleDoor check to allow treasure in 3-door rooms
                if (!room.treasureLevel) return;
                // Skip initialization if we already have a treasure for this room
                if (this.treasures.has(room.id)) {
                    // Just update visibility for the existing sprite
                    this.updateSpriteVisibility(this.treasures.get(room.id), room);
                    return;
                }
                var key, scale;
                // Check against standardized item keys 'sword1' and 'helm1'
                if (room.treasureLevel === 'sword1') {
                    key = 'Sword1'; // Asset name
                    scale = 0.2125; // Reduced scale by 15% (0.25 * 0.85)
                } else if (room.treasureLevel === 'helm1') {
                    key = 'Helm1'; // Asset name
                    scale = 0.180625; // Further reduced scale by 15% (0.2125 * 0.85)
                } else if (room.treasureLevel === 'Potion1(red)') {
                    key = 'Potion1(red)'; // Asset name
                    scale = 0.15;
                } else {
                    console.warn("[TreasureManager] Unknown treasureLevel: ".concat(room.treasureLevel));
                    return; // Don't create treasure if type is unknown
                }
                // Only determine the wall direction if we haven't already for this room
                if (!this.treasureWallDirections.has(room.id)) {
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
                    // Randomly select one direction without a door (or default to north if all have doors)
                    // Use the room's id as a seed to ensure consistency for the same room
                    var roomIdSum = room.id.split('').reduce(function(sum, char) {
                        return sum + char.charCodeAt(0);
                    }, 0);
                    var treasureFacing = directionsWithoutDoor.length > 0 ? directionsWithoutDoor[roomIdSum * 2 % directionsWithoutDoor.length] // Use different factor than keys/hints
                     : 'north';
                    // Store the chosen direction for this room
                    this.treasureWallDirections.set(room.id, treasureFacing);
                }
                var width = this.scene.game.config.width;
                var height = this.scene.game.config.height;
                // Position calculation depends on the item
                var positionY = height * 0.7; // Default Y position
                if (key === 'Helm1' || key === 'Sword1') {
                    positionY = height * 0.8; // Move down by 10% screen height (0.7 + 0.1)
                }
                var sprite = this.scene.add.sprite(width / 2, positionY, key).setInteractive({
                    useHandCursor: true
                }).setDepth(40) // Treasure/Puzzle Item layer (Depth 40)
                .setScale(scale); // Apply specific scale
                sprite.on('pointerdown', function() {
                    // Prevent pickup during encounter
                    if (_this.scene.isInEncounter) {
                        _this.scene.events.emit('showActionPrompt', 'Cannot loot items during combat!'); // Updated message
                        return;
                    }
                    // Get the room data from DungeonService
                    var roomData = _this.scene.dungeonService.getRoomById(room.id);
                    if (roomData) {
                        // Determine item key BEFORE modifying roomData
                        var itemKey;
                        var originalTreasureLevel = roomData ? roomData.treasureLevel : null; // Store original level
                        // Use standardized keys for adding to inventory
                        if (originalTreasureLevel === 'sword1') itemKey = 'sword1';
                        else if (originalTreasureLevel === 'helm1') itemKey = 'helm1';
                        else if (originalTreasureLevel === 'Potion1(red)') itemKey = 'Potion1(red)';
                        // Emit event only if an itemKey was determined
                        if (itemKey) {
                            // Emit BEFORE destroying sprite or modifying room data
                            _this.scene.events.emit('addToInventory', itemKey);
                        } else {
                            // Log if no valid item key could be determined from the original level
                            console.warn("[TreasureManager] Clicked treasure in room ".concat(room.id, ", but original treasureLevel (").concat(originalTreasureLevel, ") didn't map to a known itemKey."));
                        }
                        // Now, mark the treasure as collected in the room data
                        if (roomData) {
                            roomData.treasureLevel = null;
                            console.log("[DEBUG] Permanently marked treasure as collected in room ".concat(room.id, "."));
                        } else {
                            console.error("[ERROR] Could not find room data for ".concat(room.id, " to mark treasure collected."));
                        }
                        // Finally, destroy the sprite and remove from tracking
                        sprite.destroy();
                        _this.treasures.delete(room.id) // Removed semicolon
                        ;
                    } // <-- ADDED MISSING BRACE for the 'if (roomData)' block starting on line 35
                });
                this.treasures.set(room.id, sprite);
                this.updateSpriteVisibility(sprite, room); // Renamed and removed facing
            }
        },
        {
            // Updated function to show treasure only in a specific direction
            key: "updateSpriteVisibility",
            value: function updateSpriteVisibility(sprite, room) {
                // Get player's current facing direction
                var currentFacing = this.scene.playerPosition.facing;
                // Get the pre-determined wall direction for this room
                var treasureFacing = this.treasureWallDirections.get(room.id);
                // Two cases where treasure should be visible:
                // 1. Dead end room with player facing the wall without a door
                // 2. Regular room with player facing the designated wall without a door
                var isDeadEnd = room.doors.length === 1;
                var isFacingWall = !this.scene.roomManager.getVisibleDoors(room, currentFacing, this.scene.dungeonService).includes('forward');
                // Only show treasure when player is facing the designated wall without a door
                // OR in a dead end when facing the wall
                sprite.setVisible(isDeadEnd && isFacingWall || currentFacing === treasureFacing && isFacingWall);
            }
        },
        {
            key: "clearTreasures",
            value: function clearTreasures() {
                this.treasures.forEach(function(sprite) {
                    return sprite.destroy();
                });
                this.treasures.clear();
            // Don't clear treasureWallDirections here to maintain persistence between room visits
            }
        }
    ]);
    return TreasureManager;
}();
