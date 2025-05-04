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
export var HintManager = /*#__PURE__*/ function() {
    "use strict";
    function HintManager(scene) {
        _class_call_check(this, HintManager);
        this.scene = scene;
        this.hints = new Map(); // roomId: text
        this.hintWallDirections = new Map(); // roomId: facing direction
    }
    _create_class(HintManager, [
        {
            key: "initializeHints",
            value: function initializeHints(room) {
                var _this = this;
                if (!room.hintContent) return;
                // Skip initialization if we already have a hint for this room
                if (this.hints.has(room.id)) {
                    // Just update visibility for the existing text
                    this.updateHintVisibility(this.hints.get(room.id), room);
                    return;
                }
                var text = this.scene.add.text(this.scene.game.config.width / 2, this.scene.game.config.height * 0.8, room.hintContent, {
                    fontSize: '16px',
                    color: '#ffffff',
                    backgroundColor: '#333333',
                    padding: {
                        x: 10,
                        y: 5
                    }
                }).setOrigin(0.5).setDepth(10); // Hint layer (Depth 10)
                // Only determine the wall direction if we haven't already for this room
                if (!this.hintWallDirections.has(room.id)) {
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
                    var hintFacing = directionsWithoutDoor.length > 0 ? directionsWithoutDoor[roomIdSum * 3 % directionsWithoutDoor.length] : 'north';
                    // Store the chosen direction for this room
                    this.hintWallDirections.set(room.id, hintFacing);
                }
                this.hints.set(room.id, text);
                this.updateHintVisibility(text, room);
            }
        },
        {
            key: "updateHintVisibility",
            value: function updateHintVisibility(text, room) {
                // Get player's current facing direction
                var currentFacing = this.scene.playerPosition.facing;
                // Get the pre-determined wall direction for this room
                var hintFacing = this.hintWallDirections.get(room.id);
                // Only show hint when player is facing the designated wall without a door
                var isFacingWall = !this.scene.roomManager.getVisibleDoors(room, currentFacing, this.scene.dungeonService).includes('forward');
                text.setVisible(currentFacing === hintFacing && isFacingWall);
            }
        },
        {
            key: "clearHints",
            value: function clearHints() {
                this.hints.forEach(function(text) {
                    return text.destroy();
                });
                this.hints.clear();
            // Don't clear hintWallDirections here to maintain persistence between room visits
            }
        }
    ]);
    return HintManager;
}();
