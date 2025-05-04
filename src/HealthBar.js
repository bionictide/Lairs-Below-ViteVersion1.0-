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
export var HealthBar = /*#__PURE__*/ function() {
    "use strict";
    function HealthBar(scene, x, y, initialHealth, maxHealth) {
        var entityId = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : 'player';
        _class_call_check(this, HealthBar);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.maxHealth = maxHealth;
        this.currentHealth = initialHealth;
        this.entityId = entityId; // Track whose health bar this is
        this.barWidth = 200;
        this.barHeight = 20;
        // Background
        this.bg = scene.add.graphics();
        this.bg.fillStyle(0x333333, 1); // Dark grey background
        this.bg.fillRect(this.x, this.y, this.barWidth, this.barHeight);
        this.bg.setDepth(150); // Ensure visible
        // Foreground (Health)
        this.fg = scene.add.graphics();
        this.fg.setDepth(151); // Above background
        this.updateDisplay(); // Set initial display
    }
    _create_class(HealthBar, [
        {
            // Accept attackerId to determine consequence of death
            key: "updateHealth",
            value: function updateHealth(newHealth) {
                var attackerId = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null;
                this.currentHealth = Math.max(0, Math.min(newHealth, this.maxHealth));
                this.updateDisplay();
                console.log("[DEBUG HealthBar ".concat(this.entityId, "] Updated health: ").concat(this.currentHealth, "/").concat(this.maxHealth));
                // Check for death
                if (this.currentHealth <= 0) {
                    // Pass attackerId to handleDeath
                    this.handleDeath(attackerId);
                }
            }
        },
        {
            key: "updateDisplay",
            value: function updateDisplay() {
                if (!this.fg || !this.bg) return; // Ensure graphics exist
                var healthPercentage = this.currentHealth / this.maxHealth;
                var currentBarWidth = this.barWidth * healthPercentage;
                // Clear the foreground bar and redraw it
                this.fg.clear();
                // Determine color based on health percentage
                var color = 0x00ff00; // Green
                if (healthPercentage < 0.6) color = 0xffff00; // Yellow
                if (healthPercentage < 0.3) color = 0xff0000; // Red
                this.fg.fillStyle(color, 1);
                this.fg.fillRect(this.x, this.y, currentBarWidth, this.barHeight);
            }
        },
        {
            // Accept attackerId
            key: "handleDeath",
            value: function handleDeath() {
                var attackerId = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : null;
                var _this_scene_playerStats;
                console.log("[DEBUG HealthBar ".concat(this.entityId, "] Health reached 0! Handling death. Attacker: ").concat(attackerId));
                // --- Player-Specific Death Visuals/Input Lock ---
                // Use the unique playerId from the scene's playerStats for comparison
                if (this.entityId === ((_this_scene_playerStats = this.scene.playerStats) === null || _this_scene_playerStats === void 0 ? void 0 : _this_scene_playerStats.playerId)) {
                    console.error("[FATAL] Player ".concat(this.entityId, " health reached 0! Game Over."));
                    // Disable scene input
                    this.scene.input.enabled = false;
                    // Display "You Died" message prominently
                    this.scene.add.text(this.scene.game.config.width / 2, this.scene.game.config.height / 2 - 20, "YOU HAVE DIED", {
                        fontSize: '48px',
                        fill: '#ff0000',
                        align: 'center'
                    }).setOrigin(0.5).setDepth(1000); // High depth to be on top
                    // Add the second line below it, smaller and white
                    this.scene.add.text(this.scene.game.config.width / 2, this.scene.game.config.height / 2 + 30, "Refresh to restart.", {
                        fontSize: '28px',
                        fill: '#ffffff',
                        align: 'center'
                    }).setOrigin(0.5).setDepth(1000); // Same high depth
                    // --- Create and fade in a black rectangle BEHIND the text ---
                    var fadeRect = this.scene.add.rectangle(this.scene.game.config.width / 2, this.scene.game.config.height / 2, this.scene.game.config.width, this.scene.game.config.height, 0x000000 // Black color
                    ).setDepth(999) // Just below the death text
                    .setAlpha(0); // Start fully transparent
                    this.scene.tweens.add({
                        targets: fadeRect,
                        alpha: 1,
                        duration: 1000,
                        ease: 'Linear'
                    });
                    // this.scene.cameras.main.fade(1000, 0, 0, 0); // Removed camera fade
                    // --- Emit event if killed by NPC (for Scene to handle NPC removal) ---
                    if (attackerId && String(attackerId).startsWith('entity-')) {
                        console.log("[DEBUG HealthBar ".concat(this.entityId, "] Player killed by NPC (").concat(attackerId, "). Emitting event."));
                        this.scene.events.emit('playerKilledByNPC', {
                            npcId: attackerId
                        });
                    }
                } else {
                    console.log("[DEBUG HealthBar ".concat(this.entityId, "] NPC health reached 0."));
                // Specific NPC cleanup logic might happen here or in response to 'entityDied' event
                }
                // REMOVED: Loot bag drop logic is now handled by BagManager via the 'entityDied' event listener in DungeonScene
                // Emit a generic event that includes the entity ID (for general death handling in DungeonScene/EncounterManager)
                this.scene.events.emit('entityDied', {
                    entityId: this.entityId,
                    attackerId: attackerId
                });
                // Destroy the health bar graphics after handling death
                this.destroy();
            }
        },
        {
            key: "destroy",
            value: function destroy() {
                if (this.bg) this.bg.destroy();
                if (this.fg) this.fg.destroy();
                this.bg = null;
                this.fg = null;
                console.log("[DEBUG HealthBar ".concat(this.entityId, "] Destroyed."));
            }
        }
    ]);
    return HealthBar;
}();
