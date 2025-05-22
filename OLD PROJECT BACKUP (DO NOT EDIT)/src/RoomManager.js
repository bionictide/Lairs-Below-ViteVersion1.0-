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
export var RoomManager = /*#__PURE__*/ function() {
    "use strict";
    function RoomManager() {
        _class_call_check(this, RoomManager);
        this.roomAssets = {
            'none': './Assets/None.png',
            'left': './Assets/Left.png',
            'right': './Assets/Right.png',
            'forward': './Assets/Forward.png',
            'left-forward': './Assets/LeftForward.png',
            'forward-right': './Assets/ForwardRight.png',
            'left-right': './Assets/LeftRight.png',
            'left-forward-right': './Assets/LeftForwardRight.png',
            'right-barrel': './Assets/Right2(barrel).png',
            'forward-right2': './Assets/ForwardRight2.png' // Added new entry for alternate
        };
        this.availableAssetKeys = Object.keys(this.roomAssets);
        this.directionMappings = {
            north: {
                left: 'west',
                forward: 'north',
                right: 'east'
            },
            east: {
                left: 'north',
                forward: 'east',
                right: 'south'
            },
            south: {
                left: 'east',
                forward: 'south',
                right: 'west'
            },
            west: {
                left: 'south',
                forward: 'west',
                right: 'north'
            }
        };
        this.inverseDirectionMappings = {
            north: {
                west: 'left',
                north: 'forward',
                east: 'right'
            },
            east: {
                north: 'left',
                east: 'forward',
                south: 'right'
            },
            south: {
                east: 'left',
                south: 'forward',
                west: 'right'
            },
            west: {
                south: 'left',
                west: 'forward',
                north: 'right'
            }
        };
    }
    _create_class(RoomManager, [
        {
            key: "getRoomImageKey",
            value: function getRoomImageKey(room, facing, dungeonService) {
                var visibleDoors = this.getVisibleDoors(room, facing, dungeonService);
                var key = visibleDoors.length > 0 ? visibleDoors.sort().join('-') : 'none';
                return this.findBestMatchingRoomAsset(key);
            }
        },
        {
            key: "getVisibleDoors",
            value: function getVisibleDoors(room, facing, dungeonService) {
                var _this = this;
                var cardinalDirections = new Set();
                var connectedRooms = room.doors.map(function(id) {
                    return dungeonService.getRoomById(id);
                });
                connectedRooms.forEach(function(target) {
                    if (!target) return;
                    var cardinalDir = _this.getCardinalDirection(room, target);
                    if (cardinalDir) {
                        cardinalDirections.add(cardinalDir);
                    }
                });
                // Now, convert cardinal directions to visual directions based on facing
                var visualDoors = [];
                cardinalDirections.forEach(function(cardinalDir) {
                    var _this_inverseDirectionMappings_facing;
                    var visualDir = (_this_inverseDirectionMappings_facing = _this.inverseDirectionMappings[facing]) === null || _this_inverseDirectionMappings_facing === void 0 ? void 0 : _this_inverseDirectionMappings_facing[cardinalDir];
                    if (visualDir) {
                        visualDoors.push(visualDir);
                    }
                });
                // Sort for consistent key generation (e.g., 'left-forward' not 'forward-left')
                var doorOrder = [
                    'left',
                    'forward',
                    'right'
                ];
                visualDoors.sort(function(a, b) {
                    return doorOrder.indexOf(a) - doorOrder.indexOf(b);
                });
                return visualDoors; // Removed the fallback logic entirely
            }
        },
        {
            key: "getCardinalDirection",
            value: function getCardinalDirection(room, target) {
                var dx = target.x - room.x;
                var dy = target.y - room.y;
                // Simplified logic for integer coordinates, no threshold needed
                if (Math.abs(dx) > Math.abs(dy)) {
                    return dx > 0 ? 'east' : 'west';
                } else if (Math.abs(dy) > Math.abs(dx)) {
                    return dy > 0 ? 'south' : 'north';
                }
                // If dx and dy are equal (including both 0), it's not a cardinal direction.
                return null;
            }
        },
        {
            key: "findBestMatchingRoomAsset",
            value: function findBestMatchingRoomAsset(key) {
                var doorOrder = [
                    'left',
                    'forward',
                    'right'
                ];
                var normalizedKey = key.split('-').sort(function(a, b) {
                    return doorOrder.indexOf(a) - doorOrder.indexOf(b);
                }).join('-');
                // Updated alternates map to use normalized keys and new asset keys
                var alternates = {
                    'forward-right': [
                        'forward-right2'
                    ],
                    'right': [
                        'right-barrel'
                    ] // Map 'right' to the new barrel key
                };
                if (this.availableAssetKeys.includes(normalizedKey)) return normalizedKey;
                // Check alternates using the *normalized* key
                if (alternates[normalizedKey]) {
                    var altKey = alternates[normalizedKey][0];
                    if (this.availableAssetKeys.includes(altKey)) {
                        return altKey;
                    }
                }
                return 'none';
            }
        },
        {
            key: "getDoorsFromAssetKey",
            value: function getDoorsFromAssetKey(assetKey) {
                if (assetKey === 'none') return [];
                var doors = [];
                if (assetKey.includes('left')) doors.push('left');
                if (assetKey.includes('forward') || assetKey.includes('Forward')) doors.push('forward');
                if (assetKey.includes('right') || assetKey.includes('Right')) doors.push('right');
                return doors;
            }
        },
        {
            key: "ensureConsistentDoors",
            value: function ensureConsistentDoors(dungeon) {
                dungeon.rooms.forEach(function(room) {
                    room.doors = room.doors.filter(function(id) {
                        var target = dungeon.rooms.find(function(r) {
                            return r.id === id;
                        });
                        return target && target.doors.includes(room.id);
                    });
                });
                return dungeon;
            }
        },
        {
            key: "getMovementDelta",
            value: function getMovementDelta(facing, direction, room, dungeonService) {
                var _this = this;
                var cardinalDir = this.directionMappings[facing][direction];
                var connectedRooms = room.doors.map(function(id) {
                    return dungeonService.getRoomById(id);
                });
                var target = connectedRooms.find(function(r) {
                    return r && _this.getCardinalDirection(room, r) === cardinalDir;
                });
                if (!target) return {
                    dx: 0,
                    dy: 0,
                    newFacing: facing,
                    targetId: null
                };
                var dx = target.x - room.x;
                var dy = target.y - room.y;
                return {
                    dx: dx,
                    dy: dy,
                    newFacing: cardinalDir,
                    targetId: target.id
                };
            }
        },
        {
            key: "isValidMove",
            value: function isValidMove(room, facing, direction, dungeonService) {
                var _this = this;
                var cardinalDir = this.directionMappings[facing][direction];
                return room.doors.some(function(id) {
                    var target = dungeonService.getRoomById(id);
                    return target && _this.getCardinalDirection(room, target) === cardinalDir;
                });
            }
        },
        {
            key: "rotateFacing",
            value: function rotateFacing(facing, rotation) {
                var directions = [
                    'north',
                    'east',
                    'south',
                    'west'
                ];
                var index = directions.indexOf(facing);
                if (rotation === 'left') index = (index - 1 + 4) % 4;
                else if (rotation === 'right') index = (index + 1) % 4;
                else if (rotation === 'around') index = (index + 2) % 4;
                return directions[index];
            }
        },
        {
            key: "hasMiddleDoor",
            value: function hasMiddleDoor(room) {
                return room.doors.length > 2;
            }
        }
    ]);
    return RoomManager;
}();
