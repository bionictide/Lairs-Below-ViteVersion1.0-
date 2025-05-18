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
        this.activePuzzles = new Map(); // roomId: { sprite }
        this.socket.on('PUZZLE_UPDATE', (data) => {
            // Destroy the puzzle sprite if the itemKey matches the sprite's key for this room
            const entry = this.activePuzzles.get(data.roomId);
            if (entry && data.itemKey === 'Key1' && entry.sprite && entry.sprite.scene) {
                entry.sprite.destroy();
                this.activePuzzles.delete(data.roomId);
                // Update local room state to match server
                const room = this.scene.dungeonService.getRoomById(data.roomId);
                if (room) room.puzzleType = null;
                console.log('[PuzzleManager] Destroying puzzle sprite for room:', data.roomId);
            }
            console.log('[PuzzleManager] Received PUZZLE_UPDATE for room:', data.roomId, 'itemKey:', data.itemKey);
        });
        this.socket.on('INVENTORY_UPDATE', ({ playerId, inventory }) => {
            if (playerId === this.scene.playerId) {
                // Optionally trigger a UI update if needed
            }
        });
    }
    PuzzleManager.prototype.createPuzzleSprite = function(roomId, itemKey) {
        var _this = this;
        var room = this.scene.dungeonService.getRoomById(roomId);
        if (!room) return;
        var width = this.scene.game.config.width;
        var height = this.scene.game.config.height;
        var sprite = this.scene.add.sprite(width / 2, height * 0.85, 'Key1').setInteractive({ useHandCursor: true }).setDepth(40).setScale(0.125);
        if (!this.keyWallDirections.has(roomId)) {
            var directions = ['north', 'east', 'south', 'west'];
            var directionHasDoor = {};
            directions.forEach(function(dir) {
                var doors = _this.scene.roomManager.getVisibleDoors(room, dir, _this.scene.dungeonService);
                directionHasDoor[dir] = doors.includes('forward');
            });
            var directionsWithoutDoor = directions.filter(function(dir) {
                return !directionHasDoor[dir];
            });
            var roomIdSum = roomId.split('').reduce(function(sum, char) {
                return sum + char.charCodeAt(0);
            }, 0);
            var keyFacing = directionsWithoutDoor.length > 0 ? directionsWithoutDoor[roomIdSum % directionsWithoutDoor.length] : 'north';
            this.keyWallDirections.set(roomId, keyFacing);
        }
        sprite.on('pointerdown', function() {
            if (_this.scene.isInEncounter) {
                _this.scene.events.emit('showActionPrompt', 'Cannot loot items during combat!');
                return;
            }
            if (sprite.getData('pendingLoot')) return;
            sprite.setData('pendingLoot', true);
            sprite.disableInteractive();
            _this.socket.emit('PUZZLE_PICKUP_REQUEST', {
                playerId: _this.scene.playerId,
                roomId: roomId,
                itemKey: itemKey
            });
            console.log('[PuzzleManager] Puzzle looted in room:', roomId, 'itemKey:', itemKey);
        });
        this.activePuzzles.set(roomId, { sprite });
        this.updateSpriteVisibility(sprite, room);
        console.log('[PuzzleManager] Created puzzle sprite for room:', roomId, 'itemKey:', itemKey);
    };
    PuzzleManager.prototype.initializePuzzles = function(room) {
        // Only create the puzzle sprite if the room has a valid puzzleType (not null/undefined/empty)
        if (room.puzzleType && typeof room.puzzleType === 'string' && room.puzzleType.trim() !== '') {
            if (!this.activePuzzles.has(room.id)) {
                this.createPuzzleSprite(room.id, 'Key1');
            }
        } else {
            // If no puzzle, destroy any lingering sprite for this room
            const entry = this.activePuzzles.get(room.id);
            if (entry && entry.sprite && entry.sprite.scene) {
                entry.sprite.destroy();
            }
            this.activePuzzles.delete(room.id);
        }
        // Only update visibility for already-present puzzles
        var entry = this.activePuzzles.get(room.id);
        if (entry && entry.sprite) {
            this.updateSpriteVisibility(entry.sprite, room);
        }
    };
    PuzzleManager.prototype.updateSpriteVisibility = function(sprite, room) {
        // Get player's current facing direction
        var currentFacing = this.scene.playerPosition.facing;
        // Get the pre-determined wall direction for this room
        var keyFacing = this.keyWallDirections.get(room.id);
        // Only show key when player is facing the designated wall without a door
        // OR in a dead end when facing any wall without a door
        var isDeadEnd = room.doors.length === 1;
        var isFacingWall = !this.scene.roomManager.getVisibleDoors(room, currentFacing, this.scene.dungeonService).includes('forward');
        sprite.setVisible(isDeadEnd && isFacingWall || currentFacing === keyFacing && isFacingWall);
    };
    PuzzleManager.prototype.clearPuzzles = function() {
        this.activePuzzles.forEach(function(entry) {
            if (entry && entry.sprite && entry.sprite.scene) {
                entry.sprite.destroy();
            }
        });
        this.activePuzzles.clear();
    };
    _create_class(PuzzleManager, [
        {
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
