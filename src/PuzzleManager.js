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
export var PuzzleManager = /*#__PURE__*/ function() {
    "use strict";
    function PuzzleManager(scene) {
        _class_call_check(this, PuzzleManager);
        this.scene = scene;
        this.puzzles = new Map();
        this.keyWallDirections = new Map(); // roomId: facing direction
    }
    _create_class(PuzzleManager, [
        {
            key: "initializePuzzles",
            value: function initializePuzzles(room) {
                var _this = this;
                // Removed the hasMiddleDoor check to allow keys in 3-door rooms
                if (room.puzzleType !== 'key') return;
                // Skip initialization if we already have a puzzle for this room
                if (this.puzzles.has(room.id)) {
                    // Just update visibility for the existing sprite
                    this.updateSpriteVisibility(this.puzzles.get(room.id), room);
                    return;
                }
                var width = this.scene.game.config.width;
                var height = this.scene.game.config.height;
                // Always position center-bottom
                var sprite = this.scene.add.sprite(width / 2, height * 0.85, 'Key1') // Moved down 15% (0.7 + 0.15)
                .setInteractive({
                    useHandCursor: true
                }).setDepth(40) // Updated depth for items
                .setScale(0.125); // Scale down the key sprite by 50% (0.25 * 0.5)
                // Only determine the wall direction if we haven't already for this room
                if (!this.keyWallDirections.has(room.id)) {
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
                    var keyFacing = directionsWithoutDoor.length > 0 ? directionsWithoutDoor[roomIdSum % directionsWithoutDoor.length] : 'north';
                    // Store the chosen direction for this room
                    this.keyWallDirections.set(room.id, keyFacing);
                }
                sprite.on('pointerdown', function() {
                    // Prevent pickup during encounter
                    if (_this.scene.isInEncounter) {
                        _this.scene.events.emit('showActionPrompt', 'Cannot loot items during combat!'); // Updated message
                        return;
                    }
                    // Get the room data from DungeonService
                    var roomData = _this.scene.dungeonService.getRoomById(room.id);
                    // Determine item key BEFORE modifying roomData
                    var itemKey;
                    var originalPuzzleType = roomData ? roomData.puzzleType : null; // Store original type
                    if (originalPuzzleType === 'key') {
                        itemKey = 'Key1'; // Use capitalized 'Key1' for consistency
                    }
                    // Emit event only if an itemKey was determined
                    if (itemKey) {
                        // Emit BEFORE destroying sprite or modifying room data
                        _this.scene.events.emit('addToInventory', itemKey);
                    } else {
                        // Log if no valid item key could be determined
                        console.warn("[PuzzleManager] Clicked puzzle in room ".concat(room.id, ", but original puzzleType (").concat(originalPuzzleType, ") didn't map to a known itemKey."));
                    }
                    // Now, mark the puzzle (key) as collected in the room data
                    if (roomData) {
                        roomData.puzzleType = null; // Mark as permanently collected
                        console.log("[DEBUG] Permanently marked key as collected in room ".concat(room.id, "."));
                    } else {
                        console.error("[ERROR] Could not find room data for ".concat(room.id, " to mark key collected."));
                    }
                    // Finally, destroy the sprite and remove from tracking
                    sprite.destroy();
                    _this.puzzles.delete(room.id);
                });
                this.puzzles.set(room.id, sprite);
                this.updateSpriteVisibility(sprite, room); // Renamed and removed facing
            }
        },
        {
            // Renamed function, removed facing parameter and positioning logic
            key: "updateSpriteVisibility",
            value: function updateSpriteVisibility(sprite, room) {
                // Get player's current facing direction
                var currentFacing = this.scene.playerPosition.facing;
                // Get the pre-determined wall direction for this room
                var keyFacing = this.keyWallDirections.get(room.id);
                // Only show key when player is facing the designated wall without a door
                // OR in a dead end when facing any wall without a door
                var isDeadEnd = room.doors.length === 1;
                var isFacingWall = !this.scene.roomManager.getVisibleDoors(room, currentFacing, this.scene.dungeonService).includes('forward');
                sprite.setVisible(isDeadEnd && isFacingWall || currentFacing === keyFacing && isFacingWall);
            }
        },
        {
            key: "clearPuzzles",
            value: function clearPuzzles() {
                this.puzzles.forEach(function(sprite) {
                    return sprite.destroy();
                });
                this.puzzles.clear();
            // Don't clear keyWallDirections here to maintain persistence between room visits
            }
        }
    ]);
    return PuzzleManager;
}();
