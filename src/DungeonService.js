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
function _iterable_to_array(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _non_iterable_spread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
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
export var DungeonService = /*#__PURE__*/ function() {
    "use strict";
    function DungeonService() {
        _class_call_check(this, DungeonService);
        this.baseGridSize = 15;
        this.dungeonGrid = [];
        this.roomList = [];
        this.hubCount = 6;
        this.maxDeadEnds = 15;
        this.minRearrangeInterval = 5 * 60 * 1000;
        this.lastRearrangeTime = 0;
        this.playerCount = 0;
        this.roomCounts = {
            small: 100,
            medium: 150,
            large: 200
        };
    }
    _create_class(DungeonService, [
        {
            key: "generateDungeon",
            value: function generateDungeon(playerCount) {
                this.playerCount = playerCount;
                this.dungeonGrid = [];
                this.roomList = [];
                var targetRooms = this.getTargetRoomCount();
                this.initializeRooms(targetRooms);
                this.generateComplexDungeon();
                this.assignPlaceholders();
                this.finalConsistencyCheck();
                return {
                    grid: this.dungeonGrid,
                    rooms: this.roomList
                };
            }
        },
        {
            key: "rearrangeDungeon",
            value: function rearrangeDungeon(playerCount) {
                if (Date.now() - this.lastRearrangeTime < this.minRearrangeInterval) return false;
                this.playerCount = playerCount;
                this.dungeonGrid = [];
                this.roomList.forEach(function(room) {
                    room.doors = [];
                    room.visited = false;
                    room.isHub = false;
                    room.isDeadEnd = false;
                });
                var targetRooms = Math.min(this.getTargetRoomCount(), this.roomList.length);
                this.roomList = this.roomList.slice(0, targetRooms);
                this.repositionRooms();
                this.generateComplexDungeon();
                this.assignPlaceholders();
                this.finalConsistencyCheck();
                this.lastRearrangeTime = Date.now();
                return true;
            }
        },
        {
            key: "getTargetRoomCount",
            value: function getTargetRoomCount() {
                if (this.playerCount <= 5) return this.roomCounts.small;
                if (this.playerCount <= 10) return this.roomCounts.medium;
                return this.roomCounts.large;
            }
        },
        {
            key: "initializeRooms",
            value: function initializeRooms(targetRooms) {
                var maxGridSize = Math.ceil(Math.sqrt(targetRooms)) + 2;
                for(var i = 0; i < targetRooms; i++){
                    // Removed random offset for integer coordinates
                    var x = Math.floor(i % maxGridSize);
                    var y = Math.floor(i / maxGridSize);
                    var room = {
                        id: "room-".concat(Phaser.Math.RND.uuid()),
                        x: x,
                        y: y,
                        doors: [],
                        visited: false,
                        isHub: false,
                        isDeadEnd: false,
                        encounterChance: 0,
                        encounterType: null,
                        puzzleType: null,
                        treasureLevel: null,
                        hintContent: null
                    };
                    this.roomList.push(room);
                    var gridX = Math.floor(x);
                    var gridY = Math.floor(y);
                    if (!this.dungeonGrid[gridY]) this.dungeonGrid[gridY] = [];
                    if (!this.dungeonGrid[gridY][gridX]) this.dungeonGrid[gridY][gridX] = [];
                    this.dungeonGrid[gridY][gridX].push(room);
                }
            }
        },
        {
            key: "repositionRooms",
            value: function repositionRooms() {
                var _this = this;
                var maxGridSize = Math.ceil(Math.sqrt(this.roomList.length)) + 2;
                this.dungeonGrid = [];
                this.roomList.forEach(function(room, i) {
                    // Removed random offset for integer coordinates
                    room.x = Math.floor(i % maxGridSize);
                    room.y = Math.floor(i / maxGridSize);
                    var gridX = Math.floor(room.x);
                    var gridY = Math.floor(room.y);
                    if (!_this.dungeonGrid[gridY]) _this.dungeonGrid[gridY] = [];
                    if (!_this.dungeonGrid[gridY][gridX]) _this.dungeonGrid[gridY][gridX] = [];
                    _this.dungeonGrid[gridY][gridX].push(room);
                });
            }
        },
        {
            key: "generateComplexDungeon",
            value: function generateComplexDungeon() {
                var _this = this;
                var stack = [];
                var visited = new Set();
                var deadEndCount = 0;
                var hubs = this.selectHubs();
                hubs.forEach(function(room) {
                    room.isHub = true;
                    visited.add(room.id);
                });
                var startRoom = this.roomList.find(function(r) {
                    return r.isHub;
                }) || this.roomList[0];
                stack.push(startRoom);
                startRoom.visited = true;
                while(stack.length > 0){
                    var current = stack[stack.length - 1];
                    var neighbors = this.getUnvisitedNeighbors(current, visited);
                    if (neighbors.length === 0) {
                        if (visited.size > this.roomList.length * 0.8 && deadEndCount < this.maxDeadEnds && !current.isHub && current.doors.length === 1) {
                            current.isDeadEnd = true;
                            deadEndCount++;
                        }
                        stack.pop();
                        continue;
                    }
                    var hubNeighbors = neighbors.filter(function(r) {
                        return r.isHub;
                    });
                    var next = hubNeighbors.length > 0 && Math.random() < 0.5 ? hubNeighbors[Math.floor(Math.random() * hubNeighbors.length)] : neighbors[Math.floor(Math.random() * neighbors.length)];
                    this.connectRooms(current, next);
                    visited.add(next.id);
                    next.visited = true;
                    stack.push(next);
                }
                // --- Ensure all rooms are connected after the main DFS ---
                var unvisitedRooms = this.roomList.filter(function(r) {
                    return !visited.has(r.id);
                });
                if (unvisitedRooms.length > 0 && visited.size > 0) {
                    console.log("[DEBUG] Main DFS finished, ".concat(unvisitedRooms.length, " rooms remain unvisited. Forcing connections."));
                    var visitedRooms = this.roomList.filter(function(r) {
                        return visited.has(r.id);
                    });
                    unvisitedRooms.forEach(function(unvisitedRoom) {
                        var closestVisitedRoom = null;
                        var minDist = Infinity;
                        visitedRooms.forEach(function(visitedRoom) {
                            var dist = Math.hypot(visitedRoom.x - unvisitedRoom.x, visitedRoom.y - unvisitedRoom.y);
                            if (dist < minDist) {
                                minDist = dist;
                                closestVisitedRoom = visitedRoom;
                            }
                        });
                        if (closestVisitedRoom) {
                            console.log("[DEBUG] Connecting unvisited room ".concat(unvisitedRoom.id, " to nearest visited room ").concat(closestVisitedRoom.id, " (dist: ").concat(minDist.toFixed(2), ")"));
                            _this.connectRooms(unvisitedRoom, closestVisitedRoom);
                            visited.add(unvisitedRoom.id); // Mark as visited now
                            // Add to visitedRooms array to allow subsequent unvisited rooms to connect to it
                            visitedRooms.push(unvisitedRoom);
                        } else {
                            // This should only happen if the initial visited set was empty (e.g., 0 rooms total?)
                            console.error("[ERROR] Could not find any visited room to connect unvisited room ".concat(unvisitedRoom.id, " to!"));
                        }
                    });
                } else if (unvisitedRooms.length > 0) {
                    console.warn("[WARN] Dungeon generation resulted in ".concat(unvisitedRooms.length, " unvisited rooms, but no visited rooms to connect to. Check room count."));
                }
                // --- End Connectivity Check ---
                this.addLoops(0.3);
                this.enhanceHubs();
                this.ensureExits(); // ensureExits still useful for rooms potentially disconnected by addLoops/enhanceHubs logic edge cases
            }
        },
        {
            key: "selectHubs",
            value: function selectHubs() {
                var _this, _loop = function() {
                    var room = _this.roomList[Math.floor(Math.random() * _this.roomList.length)];
                    var isFarEnough = hubs.every(function(h) {
                        return Math.hypot(h.x - room.x, h.y - room.y) > minDistance;
                    });
                    if (isFarEnough) hubs.push(room);
                };
                var hubs = [];
                var minDistance = 3;
                while(hubs.length < this.hubCount)_this = this, _loop();
                return hubs;
            }
        },
        {
            key: "getUnvisitedNeighbors",
            value: function getUnvisitedNeighbors(room, visited) {
                // Calculate Manhattan distance (sum of absolute differences in x and y)
                // A distance of 1 means it's a direct cardinal neighbor (N, E, S, W)
                return this.roomList.filter(function(r) {
                    return !visited.has(r.id) && Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room;
                });
            }
        },
        {
            key: "connectRooms",
            value: function connectRooms(room1, room2) {
                if (!room1.doors.includes(room2.id)) room1.doors.push(room2.id);
                if (!room2.doors.includes(room1.id)) room2.doors.push(room1.id);
            }
        },
        {
            key: "addLoops",
            value: function addLoops(probability) {
                var _this = this;
                var cyclesAdded = 0;
                this.roomList.forEach(function(room) {
                    if (room.doors.length >= 3 || room.isDeadEnd) return;
                    // Use Manhattan distance check for cardinal neighbors
                    var nearby = _this.roomList.filter(function(r) {
                        return Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room && !room.doors.includes(r.id) && r.doors.length < 3 && !r.isDeadEnd;
                    });
                    nearby.forEach(function(target) {
                        if (Math.random() < probability) {
                            _this.connectRooms(room, target);
                            cyclesAdded++;
                        }
                    });
                });
                console.log("Added ".concat(cyclesAdded, " cycles"));
            }
        },
        {
            key: "enhanceHubs",
            value: function enhanceHubs() {
                var _this = this;
                this.roomList.filter(function(r) {
                    return r.isHub;
                }).forEach(function(room) {
                    if (room.doors.length < 3) {
                        // Use Manhattan distance check for cardinal neighbors
                        var nearby = _this.roomList.filter(function(r) {
                            return Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room && !room.doors.includes(r.id) && r.doors.length < 4;
                        }).slice(0, 3 - room.doors.length);
                        nearby.forEach(function(target) {
                            return _this.connectRooms(room, target);
                        });
                    }
                });
            }
        },
        {
            key: "ensureExits",
            value: function ensureExits() {
                var _this = this;
                this.roomList.forEach(function(room) {
                    if (room.doors.length === 0) {
                        // Attempt to find a *cardinal* neighbor room with < 4 doors first
                        var nearby = _this.roomList.find(function(r) {
                            return Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room && r.doors.length < 4;
                        });
                        // If no suitable cardinal neighbor found, find the absolute closest neighbor as fallback
                        if (!nearby) {
                            var closestRoom = null;
                            var minDist = Infinity;
                            _this.roomList.forEach(function(r) {
                                if (r === room) return;
                                var dist = Math.hypot(r.x - room.x, r.y - room.y);
                                if (dist < minDist) {
                                    minDist = dist;
                                    closestRoom = r;
                                }
                            });
                            nearby = closestRoom; // Connect to the closest one as a last resort
                        }
                        if (nearby) {
                            console.log("[DEBUG] Forcing connection for isolated room ".concat(room.id, " to ").concat(nearby.id));
                            _this.connectRooms(room, nearby);
                        } else {
                            // This should ideally never happen if there's more than one room
                            console.error("[ERROR] Could not find any neighbor for isolated room ".concat(room.id, "!"));
                        }
                    }
                });
            }
        },
        {
            key: "assignPlaceholders",
            value: function assignPlaceholders() {
                var _this = this;
                var puzzleCount = 0, treasureCount = 0, hintCount = 0;
                // Changed filter: Allow items in rooms with 1, 2, or 3 doors.
                var eligibleItemRooms = this.roomList.filter(function(r) {
                    return r.doors.length > 0 && r.doors.length < 4;
                });
                // Shuffled room lists for shelf assignments
                var shelfEmptyRooms = Phaser.Utils.Array.Shuffle(_to_consumable_array(eligibleItemRooms)).slice(0, 20);
                var shelf2EmptyRooms = Phaser.Utils.Array.Shuffle(_to_consumable_array(eligibleItemRooms)).slice(0, 20);
                // Make sure no room has both ShelfEmpty and Shelf2Empty
                var uniqueShelf2Rooms = shelf2EmptyRooms.filter(function(r2) {
                    return !shelfEmptyRooms.some(function(r1) {
                        return r1.id === r2.id;
                    });
                });
                // If we don't have enough unique rooms, get more
                if (uniqueShelf2Rooms.length < 20) {
                    var _uniqueShelf2Rooms;
                    var additionalRooms = Phaser.Utils.Array.Shuffle(_to_consumable_array(eligibleItemRooms)).filter(function(r) {
                        return !shelfEmptyRooms.some(function(r1) {
                            return r1.id === r.id;
                        }) && !uniqueShelf2Rooms.some(function(r2) {
                            return r2.id === r.id;
                        });
                    }).slice(0, 20 - uniqueShelf2Rooms.length);
                    (_uniqueShelf2Rooms = uniqueShelf2Rooms).push.apply(_uniqueShelf2Rooms, _to_consumable_array(additionalRooms));
                }
                this.roomList.forEach(function(room) {
                    room.encounterChance = room.isHub ? 0.5 : 0.2;
                    if (Math.random() < room.encounterChance) {
                        var types = [
                            'elvaan',
                            'dwarf',
                            'gnome',
                            'bat'
                        ];
                        room.encounterType = types[Math.floor(Math.random() * types.length)];
                    }
                    // Initialize shelf properties
                    room.hasShelfEmpty = false;
                    room.hasShelf2Empty = false;
                    room.gemType = null;
                    room.hasPotion = false;
                });
                // Assign ShelfEmpty to rooms
                shelfEmptyRooms.forEach(function(room) {
                    room.hasShelfEmpty = true;
                });
                // Assign Shelf2Empty to unique rooms
                uniqueShelf2Rooms.forEach(function(room) {
                    room.hasShelf2Empty = true;
                });
                // Select 2 random ShelfEmpty rooms to have gems
                var gemTypes = [
                    'ShelfBlueApatite',
                    'ShelfEmerald',
                    'ShelfAmethyst',
                    'ShelfRawRuby'
                ];
                var gemRooms = Phaser.Utils.Array.Shuffle(_to_consumable_array(shelfEmptyRooms)).slice(0, 2);
                gemRooms.forEach(function(room) {
                    var randomGemType = gemTypes[Math.floor(Math.random() * gemTypes.length)];
                    room.gemType = randomGemType;
                });
                // Select 12 random Shelf2Empty rooms to have potions
                var potionRooms = Phaser.Utils.Array.Shuffle(_to_consumable_array(uniqueShelf2Rooms)).slice(0, 12);
                potionRooms.forEach(function(room) {
                    room.hasPotion = true;
                });
                // Use the new broader list of eligible rooms
                Phaser.Utils.Array.Shuffle(eligibleItemRooms).slice(0, 10).forEach(function(room) {
                    // Increased puzzle key probability to 70%
                    if (puzzleCount < 10 && Math.random() < 0.7) {
                        room.puzzleType = 'key';
                        puzzleCount++;
                    }
                });
                // Use the new broader list of eligible rooms
                Phaser.Utils.Array.Shuffle(eligibleItemRooms).slice(0, 15).forEach(function(room) {
                    // Increased treasure probability to 90%
                    if (treasureCount < 15 && Math.random() < 0.9) {
                        // Standardize on 'sword1' and 'helm1' to match BagManager itemData keys
                        room.treasureLevel = Math.random() < 0.5 ? 'sword1' : 'helm1';
                        treasureCount++;
                    }
                });
                // Keep hints limited to dead ends (1 door) using the original logic, but iterate over eligible rooms
                Phaser.Utils.Array.Shuffle(eligibleItemRooms).slice(0, 10).forEach(function(room) {
                    // Ensure hint placement only occurs in actual dead ends within the considered slice.
                    if (hintCount < 10 && room.doors.length === 1 && Math.random() < 0.5) {
                        var treasureRoom = _this.roomList.find(function(r) {
                            return r.treasureLevel;
                        });
                        if (treasureRoom) {
                            var dx = Math.round(treasureRoom.x - room.x);
                            var dy = Math.round(treasureRoom.y - room.y);
                            room.hintContent = "".concat(Math.abs(dx), " ").concat(dx >= 0 ? 'east' : 'west', ", ").concat(Math.abs(dy), " ").concat(dy >= 0 ? 'south' : 'north', ": ").concat(treasureRoom.treasureLevel);
                            hintCount++;
                        }
                    }
                });
            }
        },
        {
            key: "hasMiddleDoor",
            value: function hasMiddleDoor(room) {
                return room.doors.length > 2;
            }
        },
        {
            key: "finalConsistencyCheck",
            value: function finalConsistencyCheck() {
                var _this = this;
                this.roomList.forEach(function(room) {
                    room.doors = room.doors.filter(function(id) {
                        var target = _this.roomList.find(function(r) {
                            return r.id === id;
                        });
                        return target && target.doors.includes(room.id);
                    });
                });
            }
        },
        {
            key: "getRoomById",
            value: function getRoomById(id) {
                return this.roomList.find(function(r) {
                    return r.id === id;
                });
            }
        },
        {
            key: "findRoomAt",
            value: function findRoomAt(x, y) {
                var _this_dungeonGrid_gridY_gridX, _this_dungeonGrid_gridY;
                var gridX = Math.floor(x);
                var gridY = Math.floor(y);
                return (_this_dungeonGrid_gridY = this.dungeonGrid[gridY]) === null || _this_dungeonGrid_gridY === void 0 ? void 0 : (_this_dungeonGrid_gridY_gridX = _this_dungeonGrid_gridY[gridX]) === null || _this_dungeonGrid_gridY_gridX === void 0 ? void 0 : _this_dungeonGrid_gridY_gridX[0];
            }
        }
    ]);
    return DungeonService;
}();
