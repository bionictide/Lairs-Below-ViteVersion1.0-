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
    function PuzzleManager(scene, socket) {
        _class_call_check(this, PuzzleManager);
        this.scene = scene;
        this.socket = socket;
        this.puzzles = new Map();
        this.keyWallDirections = new Map(); // roomId: facing direction
        this.socket.on('PUZZLE_UPDATE', (data) => {
            // On authoritative update, destroy the puzzle sprite and remove from tracking
            const sprite = this.puzzles.get(data.roomId);
            if (sprite && sprite.scene) {
                sprite.destroy();
                this.puzzles.delete(data.roomId);
            }
        });
    }
    _create_class(PuzzleManager, [
        {
            key: "initializePuzzles",
            value: function initializePuzzles(room) {
                var _this = this;
                if (room.puzzleType !== 'key') {
                    // If puzzleType is not 'key', ensure sprite is destroyed and not recreated
                    if (this.puzzles.has(room.id)) {
                        const sprite = this.puzzles.get(room.id);
                        if (sprite && sprite.scene) sprite.destroy();
                        this.puzzles.delete(room.id);
                    }
                    return;
                }
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
                        _this.scene.events.emit('showActionPrompt', 'Cannot loot items during combat!');
                        return;
                    }
                    // Prevent double-looting: set pending flag and disable interactivity
                    if (sprite.getData('pendingLoot')) return;
                    sprite.setData('pendingLoot', true);
                    sprite.disableInteractive();
                    // Only emit intent to server; do NOT mutate local state or destroy sprite
                    var roomData = _this.scene.dungeonService.getRoomById(room.id);
                    var itemKey;
                    var originalPuzzleType = roomData ? roomData.puzzleType : null;
                    if (originalPuzzleType === 'key') {
                        itemKey = 'Key1';
                    }
                    if (itemKey) {
                        _this.socket.emit('PUZZLE_PICKUP_REQUEST', {
                            playerId: _this.scene.playerId,
                            roomId: room.id,
                            itemKey: itemKey
                        });
                    } else {
                        console.warn(`[PuzzleManager] Clicked puzzle in room ${room.id}, but original puzzleType (${originalPuzzleType}) didn't map to a known itemKey.`);
                    }
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
