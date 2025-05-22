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
export var DebugHelper = /*#__PURE__*/ function() {
    "use strict";
    function DebugHelper(scene) {
        _class_call_check(this, DebugHelper);
        this.scene = scene;
        this.debugText = null;
        this.minimap = null;
        // Removed this.doorZonesDebug property
        this.visible = false;
    }
    _create_class(DebugHelper, [
        {
            key: "setVisibility",
            value: function setVisibility(visible) {
                this.visible = visible;
                if (this.debugText) this.debugText.setVisible(visible);
                if (this.minimap) this.minimap.setVisible(visible);
                // Call scene method to update door zone visuals
                this.scene.updateDoorZoneVisibility(visible);
                // Add one of each gem type when debug mode is entered
                if (visible && !this.prevVisible) {
                    this.addGemsToInventory();
                }
                this.prevVisible = visible;
            }
        },
        {
            key: "toggleVisibility",
            value: function toggleVisibility() {
                this.setVisibility(!this.visible);
            }
        },
        {
            key: "updateDebugText",
            value: function updateDebugText(position, room, facing, imageKey, assetKey) {
                if (!this.debugText) {
                    this.debugText = this.scene.add.text(10, 10, '', {
                        fontSize: '16px',
                        fill: '#ffffff',
                        backgroundColor: '#000000'
                    }).setDepth(1000);
                }
                if (this.visible) {
                    this.debugText.setText([
                        "Position: (".concat(position.x.toFixed(2), ", ").concat(position.y.toFixed(2), ")"),
                        "Room ID: ".concat(room.id),
                        "Doors: ".concat(room.doors.length),
                        "Facing: ".concat(facing),
                        "Image Key: ".concat(imageKey),
                        "Asset Key: ".concat(assetKey)
                    ]);
                }
            }
        },
        {
            key: "updateMinimap",
            value: function updateMinimap(grid, player) {
                var _this = this;
                if (!this.minimap) {
                    this.minimap = this.scene.add.graphics({
                        x: this.scene.cameras.main.width - 150,
                        y: 10
                    });
                    this.minimap.setDepth(1000);
                }
                if (!this.visible) return;
                this.minimap.clear();
                this.minimap.fillStyle(0x000000, 0.5);
                this.minimap.fillRect(0, 0, 140, 140);
                // Removed unused 'scale', 'offsetX', 'offsetY' declarations here
                // Determine bounds for scaling and centering
                var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                this.scene.dungeonService.roomList.forEach(function(room) {
                    minX = Math.min(minX, room.x);
                    minY = Math.min(minY, room.y);
                    maxX = Math.max(maxX, room.x);
                    maxY = Math.max(maxY, room.y);
                });
                var rangeX = maxX - minX;
                var rangeY = maxY - minY;
                var maxRange = Math.max(rangeX, rangeY, 1); // Avoid division by zero
                var mapSize = 130; // Slightly smaller to fit within the 140 background
                var scale = mapSize / maxRange;
                var offsetX = (140 - rangeX * scale) / 2 - minX * scale; // Center horizontally
                var offsetY = (140 - rangeY * scale) / 2 - minY * scale; // Center vertically
                // Draw connections first (so rooms are drawn on top)
                this.minimap.lineStyle(1, 0x444444, 0.8); // Darker grey for connections
                this.scene.dungeonService.roomList.forEach(function(room) {
                    var x1 = room.x * scale + offsetX;
                    var y1 = room.y * scale + offsetY;
                    room.doors.forEach(function(doorId) {
                        var target = _this.scene.dungeonService.getRoomById(doorId);
                        // Only draw line once (e.g., from lower ID to higher ID) to avoid double lines
                        if (target && room.id < target.id) {
                            var x2 = target.x * scale + offsetX;
                            var y2 = target.y * scale + offsetY;
                            _this.minimap.lineBetween(x1, y1, x2, y2);
                        }
                    });
                });
                // Draw rooms
                this.scene.dungeonService.roomList.forEach(function(room) {
                    var x = room.x * scale + offsetX;
                    var y = room.y * scale + offsetY;
                    var color = 0x666666; // Default grey
                    if (room.isHub) color = 0x00ff00; // Green for hubs
                    if (room.isDeadEnd) color = 0xffff00; // Yellow for dead ends
                    _this.minimap.fillStyle(color, 1.0);
                    _this.minimap.fillRect(x - scale / 3, y - scale / 3, scale / 1.5, scale / 1.5); // Scale rect size
                });
                if (player) {
                    // Use grid coordinates for player lookup as player object might not have room x/y directly
                    var playerRoom = this.scene.dungeonService.getRoomById(this.scene.playerPosition.roomId);
                    if (!playerRoom) return; // Abort if player room isn't found
                    var px = playerRoom.x * scale + offsetX;
                    var py = playerRoom.y * scale + offsetY;
                    this.minimap.fillStyle(0xff0000, 1.0); // Red for player
                    this.minimap.fillCircle(px, py, scale / 2); // Scale circle size
                    var dirScale = scale * 1.5; // Make direction indicator larger
                    var dirVectors = {
                        north: {
                            dx: 0,
                            dy: -dirScale
                        },
                        east: {
                            dx: dirScale,
                            dy: 0
                        },
                        south: {
                            dx: 0,
                            dy: dirScale
                        },
                        west: {
                            dx: -dirScale,
                            dy: 0
                        }
                    };
                    var dir = dirVectors[player.facing] || {
                        dx: 0,
                        dy: 0
                    };
                    this.minimap.lineStyle(1, 0xff0000, 1.0);
                    this.minimap.lineBetween(px, py, px + dir.dx, py + dir.dy);
                }
            }
        },
        {
            key: "addGemsToInventory",
            value: function addGemsToInventory() {
                var bagManager = this.scene.bagManager;
                if (!bagManager) {
                    console.warn('[DebugHelper] BagManager not found. Cannot add gems.');
                    return;
                }
                var gemTypes = [
                    'Emerald',
                    'BlueApatite',
                    'Amethyst',
                    'RawRuby'
                ];
                gemTypes.forEach(function(gemType) {
                    bagManager.addItem(gemType);
                });
                console.log('[DebugHelper] Added one of each gem type to player inventory.');
                this.scene.events.emit('showActionPrompt', 'Debug: Added gems to inventory');
            }
        }
    ]);
    return DebugHelper;
}();
