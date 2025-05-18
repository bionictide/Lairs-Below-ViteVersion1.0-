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
    function TreasureManager(scene, socket) {
        _class_call_check(this, TreasureManager);
        this.scene = scene;
        this.socket = socket;
        this.treasures = new Map();
        this.treasureWallDirections = new Map(); // roomId: facing direction
        this.activeTreasures = new Map(); // roomId: { key, sprite }
        this.socket.on('TREASURE_UPDATE', (data) => {
            // Destroy the treasure sprite if the itemKey matches the sprite's key for this room
            const entry = this.activeTreasures.get(data.roomId);
            if (entry && entry.key === data.itemKey && entry.sprite && entry.sprite.scene) {
                entry.sprite.destroy();
                this.activeTreasures.delete(data.roomId);
                // Update local room state to match server
                const room = this.scene.dungeonService.getRoomById(data.roomId);
                if (room) room.treasureLevel = null;
                console.log('[TreasureManager] Destroying treasure sprite for room:', data.roomId);
            }
            console.log('[TreasureManager] Received TREASURE_UPDATE for room:', data.roomId, 'itemKey:', data.itemKey);
        });
        this.socket.on('INVENTORY_UPDATE', ({ playerId, inventory }) => {
            if (playerId === this.scene.playerId) {
                // Optionally trigger a UI update if needed
            }
        });
    }
    TreasureManager.prototype.createTreasureSprite = function(roomId, itemKey) {
        var _this = this;
        var room = this.scene.dungeonService.getRoomById(roomId);
        if (!room) return;
        var key, scale;
        if (itemKey === 'sword1') {
            key = 'Sword1';
            scale = 0.2125;
        } else if (itemKey === 'helm1') {
            key = 'Helm1';
            scale = 0.180625;
        } else if (itemKey === 'Potion1(red)') {
            key = 'Potion1(red)';
            scale = 0.15;
        } else {
            console.warn('[TreasureManager] Unknown itemKey:', itemKey);
            return;
        }
        if (!this.treasureWallDirections.has(roomId)) {
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
            var treasureFacing = directionsWithoutDoor.length > 0 ? directionsWithoutDoor[roomIdSum * 2 % directionsWithoutDoor.length] : 'north';
            this.treasureWallDirections.set(roomId, treasureFacing);
        }
        var width = this.scene.game.config.width;
        var height = this.scene.game.config.height;
        var positionY = (key === 'Helm1' || key === 'Sword1') ? height * 0.8 : height * 0.7;
        var sprite = this.scene.add.sprite(width / 2, positionY, key).setInteractive({ useHandCursor: true }).setDepth(40).setScale(scale);
        sprite.on('pointerdown', function() {
            if (_this.scene.isInEncounter) {
                _this.scene.events.emit('showActionPrompt', 'Cannot loot items during combat!');
                return;
            }
            if (sprite.getData('pendingLoot')) return;
            sprite.setData('pendingLoot', true);
            sprite.disableInteractive();
            _this.socket.emit('TREASURE_PICKUP_REQUEST', {
                playerId: _this.scene.playerId,
                roomId: roomId,
                itemKey: itemKey
            });
            console.log('[TreasureManager] Treasure looted in room:', roomId, 'itemKey:', itemKey);
        });
        this.activeTreasures.set(roomId, { key: itemKey, sprite });
        this.updateSpriteVisibility(sprite, room);
        console.log('[TreasureManager] Created treasure sprite for room:', roomId, 'itemKey:', itemKey);
    };
    TreasureManager.prototype.initializeTreasures = function(room) {
        // Only create the treasure sprite if the room has a valid treasureLevel (not null/undefined/empty)
        if (room.treasureLevel && typeof room.treasureLevel === 'string' && room.treasureLevel.trim() !== '') {
            if (!this.activeTreasures.has(room.id)) {
                this.createTreasureSprite(room.id, room.treasureLevel);
            }
        } else {
            // If no treasure, destroy any lingering sprite for this room
            const entry = this.activeTreasures.get(room.id);
            if (entry && entry.sprite && entry.sprite.scene) {
                entry.sprite.destroy();
            }
            this.activeTreasures.delete(room.id);
        }
        // Only update visibility for already-present treasures
        var entry = this.activeTreasures.get(room.id);
        if (entry && entry.sprite) {
            this.updateSpriteVisibility(entry.sprite, room);
        }
    };
    TreasureManager.prototype.updateSpriteVisibility = function(sprite, room) {
        if (!sprite) return; // Guard: do nothing if sprite is undefined
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
    };
    TreasureManager.prototype.clearTreasures = function() {
        this.activeTreasures.forEach(function(entry) {
            if (entry && entry.sprite && entry.sprite.scene) {
                entry.sprite.destroy();
            }
        });
        this.activeTreasures.clear();
    };
    _create_class(TreasureManager, [
        {
            key: "updateSpriteVisibility",
            value: function updateSpriteVisibility(sprite, room) {
                if (!sprite) return; // Guard: do nothing if sprite is undefined
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
