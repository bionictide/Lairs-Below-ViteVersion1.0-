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
export var CombatVisuals = /*#__PURE__*/ function() {
    "use strict";
    function CombatVisuals(scene) {
        _class_call_check(this, CombatVisuals);
        this.scene = scene;
        console.log("CombatVisuals initialized.");
        // --- Store previous state for variation ---
        this.prevGlassKey = null; // Key of the last used glass texture
        this.prevGlassFlip = null; // {x: boolean, y: boolean} of the last flip
        this.glassTextureKeys = [
            'GlassBroke1',
            'GlassBroke2',
            'GlassBroke3',
            'GlassBroke4',
            'GlassBroke5'
        ];
    }
    _create_class(CombatVisuals, [
        {
            // --- Player Takes Damage Effects ---
            /**
     * Triggers visual effects when the player takes damage.
     * Combines a screen shake and a red vignette flash.
     */ key: "playPlayerDamageEffect",
            value: function playPlayerDamageEffect() {
                console.log("[CombatVisuals] Playing player damage effect...");
                this.triggerScreenShake();
                this.triggerVignetteFlash();
            }
        },
        {
            /**
     * Initiates a brief, intense screen shake.
     */ key: "triggerScreenShake",
            value: function triggerScreenShake() {
                var intensity = 0.008; // Controls the magnitude of the shake
                var duration = 150; // How long the shake lasts in ms
                console.log("[CombatVisuals] Triggering screen shake (Intensity: ".concat(intensity, ", Duration: ").concat(duration, "ms)"));
                this.scene.cameras.main.shake(duration, intensity);
            }
        },
        {
            /**
     * Creates a brief red vignette effect around the screen edges.
     */ key: "triggerVignetteFlash",
            value: function triggerVignetteFlash() {
                var _this = this;
                var redColor = 0x8B0000; // Dark Red
                var redAlpha = 0.3; // Target opacity for red overlay
                // REMOVED: const glassKey = 'GlassBroke1';
                // REMOVED: const glassShortId = 'Xq92';
                var duration = 350; // Total duration of the effect
                var fadeInDuration = 75; // Quick smash/fade in
                var fadeOutDuration = duration - fadeInDuration; // Fade out duration
                var glassFadeOutDuration = fadeOutDuration * 4; // Slower fade for glass
                var screenWidth = this.scene.game.config.width;
                var screenHeight = this.scene.game.config.height;
                console.log("[CombatVisuals] Triggering red flash + broken glass effect (Duration: ".concat(duration, "ms)"));
                // 1. Create Solid Red Overlay
                var redOverlay = this.scene.add.rectangle(screenWidth / 2, screenHeight / 2, screenWidth, screenHeight, redColor) // <-- Added missing closing parenthesis here
                .setAlpha(0) // Start transparent
                .setDepth(151); // Make red overlay the TOP layer
                // --- Select Texture and Flip, Ensuring No Immediate Repeat ---
                var selectedGlassKey, selectedFlip;
                do {
                    // Randomly select a texture key
                    selectedGlassKey = Phaser.Utils.Array.GetRandom(this.glassTextureKeys);
                    // Randomly determine flip
                    selectedFlip = {
                        x: Phaser.Math.Between(0, 1) === 1,
                        y: Phaser.Math.Between(0, 1) === 1
                    };
                // Loop if the selected key OR the selected flip configuration matches the previous one.
                }while (this.prevGlassKey && selectedGlassKey === this.prevGlassKey || // Key must be different
                this.prevGlassFlip && selectedFlip.x === this.prevGlassFlip.x && selectedFlip.y === this.prevGlassFlip.y // Flip combo must be different
                );
                // Store the current selection for the next check
                this.prevGlassKey = selectedGlassKey;
                this.prevGlassFlip = selectedFlip;
                // --- Create SINGLE Broken Glass Image ---
                var glassImage = this.scene.add.image(screenWidth / 2, screenHeight / 2, selectedGlassKey // Use the selected key
                );
                glassImage.setFlip(selectedFlip.x, selectedFlip.y) // Apply selected flip
                .setAlpha(0.8) // Set target opacity
                .setScale(1.0) // Start at normal scale
                .setDepth(150); // Place glass BELOW the red overlay
                // 3. Fade In Animation (Red Overlay + Single Glass Image Smash)
                this.scene.tweens.add({
                    targets: [
                        redOverlay,
                        glassImage
                    ],
                    alpha: function(target) {
                        return target === redOverlay ? redAlpha : 1.0;
                    },
                    scale: function(target) {
                        return target === glassImage ? 1.1 : target.scale;
                    },
                    duration: fadeInDuration,
                    ease: 'Quad.easeOut',
                    onComplete: function() {
                        // 4. Fade Out Animations (Separate timing)
                        // Red overlay fades out normally
                        _this.scene.tweens.add({
                            targets: redOverlay,
                            alpha: 0,
                            duration: fadeOutDuration,
                            ease: 'Linear'
                        });
                        // Fade out the SINGLE glass image (using the slower duration)
                        _this.scene.tweens.add({
                            targets: glassImage,
                            alpha: 0,
                            duration: glassFadeOutDuration,
                            ease: 'Linear'
                        });
                        // 5. Cleanup after the LONGEST tween finishes (glass fade out)
                        _this.scene.time.delayedCall(glassFadeOutDuration, function() {
                            // Check if objects still exist before destroying
                            if (redOverlay && redOverlay.scene) redOverlay.destroy();
                            if (glassImage && glassImage.scene) glassImage.destroy(); // Cleanup single glass image
                            console.log("[CombatVisuals] Red flash + single broken glass (".concat(_this.prevGlassKey, ") effect complete."));
                        });
                    }
                });
            }
        },
        {
            // --- Enemy Takes Damage Effects ---
            /**
     * Triggers a quick flash effect on the sprite associated with an entity ID.
     * @param {string} entityId - The ID of the entity whose sprite should flash.
     */ key: "playEnemyDamageEffect",
            value: function playEnemyDamageEffect(entityId) {
                // --- Retrieve the sprite using the ID ---
                var targetSprite = this.scene.getSpriteForEntity(entityId); // Use the new helper method
                // --- Check if the sprite was found and is still valid ---
                if (!targetSprite || !targetSprite.scene) {
                    console.warn("[CombatVisuals] Cannot play enemy damage effect: Invalid target sprite for entityId: ".concat(entityId, "."));
                    return;
                }
                console.log("[CombatVisuals] Playing enemy damage effect for entityId: ".concat(entityId));
                var tintColor = 0xffffff; // White tint for a bright flash
                var duration = 100; // How long the flash lasts in ms (very short)
                // Check if already tinting to prevent conflicting tweens
                // Note: We'll re-add the isTinted check manually if needed after confirming base functionality
                // if (targetSprite.isTinted) {
                //    console.log(`[CombatVisuals] Target sprite for ${entityId} already tinted, skipping new flash.`);
                //    return;
                // }
                // targetSprite.isTinted = true; // Add tracking if needed
                // Use setTintFill instead of setTint
                targetSprite.setTintFill(tintColor);
                // Use a delayed call to remove the tint
                this.scene.time.delayedCall(duration, function() {
                    // --- Check again if the sprite still exists before clearing tint ---
                    if (targetSprite && targetSprite.scene) {
                        targetSprite.clearTint();
                        // targetSprite.isTinted = false; // Reset tracking if needed
                        console.log("[CombatVisuals] Enemy damage flash complete for entityId: ".concat(entityId, "."));
                    }
                });
            }
        }
    ]);
    return CombatVisuals;
}();
