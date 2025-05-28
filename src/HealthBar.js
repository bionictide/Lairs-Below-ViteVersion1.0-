import Phaser from 'phaser';
export default class HealthBar {
  constructor(scene, x, y, initialHealth, maxHealth, entityId = 'player') {
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
    // Border
    this.bg.lineStyle(1, 0x000000, 1);
    this.bg.strokeRect(this.x, this.y, this.barWidth, this.barHeight);
    this.bg.setDepth(150); // Ensure visible
    // Foreground (Health)
    this.fg = scene.add.graphics();
    this.fg.setDepth(151); // Above background
    // Markers (vertical lines)
    this.markers = scene.add.graphics();
    this.markers.setDepth(152); // Above health fill
    this.updateDisplay(); // Set initial display
  }
  updateHealth(newHealth, attackerId = null) {
    this.currentHealth = Math.max(0, Math.min(newHealth, this.maxHealth));
    this.updateDisplay();
    // Check for death
    if (this.currentHealth <= 0) {
      this.handleDeath(attackerId);
    }
  }
  updateDisplay() {
    if (!this.fg || !this.bg || !this.markers) return; // Ensure graphics exist
    const healthPercentage = this.currentHealth / this.maxHealth;
    const currentBarWidth = this.barWidth * healthPercentage;
    // Clear the foreground bar and redraw it
    this.fg.clear();
    // Determine color based on health percentage
    let color = 0x00ff00; // Green
    if (healthPercentage < 0.6) color = 0xffff00; // Yellow
    if (healthPercentage < 0.3) color = 0xff0000; // Red
    this.fg.fillStyle(color, 1);
    this.fg.fillRect(this.x, this.y, currentBarWidth, this.barHeight);
    // Draw vertical black lines every 100 health, spaced so each chunk is exactly 100 health
    this.markers.clear();
    const step = 100;
    for (let h = step; h < this.maxHealth; h += step) {
      const px = this.x + (h / this.maxHealth) * this.barWidth;
      this.markers.lineStyle(2, 0x000000, 1); // 2px for visibility
      this.markers.lineBetween(px, this.y, px, this.y + this.barHeight);
    }
    this.markers.setDepth(9999);
  }
  handleDeath(attackerId = null) {
    // --- Player-Specific Death Visuals/Input Lock ---
    if (this.entityId === (this.scene.playerStats?.playerId)) {
      this.scene.input.enabled = false;
      this.scene.add.text(this.scene.game.config.width / 2, this.scene.game.config.height / 2 - 20, "YOU HAVE DIED", {
        fontSize: '48px',
        fill: '#ff0000',
        align: 'center'
      }).setOrigin(0.5).setDepth(1000);
      this.scene.add.text(this.scene.game.config.width / 2, this.scene.game.config.height / 2 + 30, "Refresh to restart.", {
        fontSize: '28px',
        fill: '#ffffff',
        align: 'center'
      }).setOrigin(0.5).setDepth(1000);
      const fadeRect = this.scene.add.rectangle(this.scene.game.config.width / 2, this.scene.game.config.height / 2, this.scene.game.config.width, this.scene.game.config.height, 0x000000)
        .setDepth(999)
        .setAlpha(0);
      this.scene.tweens.add({
        targets: fadeRect,
        alpha: 1,
        duration: 1000,
        ease: 'Linear'
      });
      if (attackerId && String(attackerId).startsWith('entity-')) {
        this.scene.events.emit('playerKilledByNPC', { npcId: attackerId });
      }
    }
    this.scene.events.emit('entityDied', { entityId: this.entityId, attackerId });
    this.destroy();
  }
  destroy() {
    if (this.bg) this.bg.destroy();
    if (this.fg) this.fg.destroy();
    if (this.markers) this.markers.destroy();
    this.bg = null;
    this.fg = null;
    this.markers = null;
  }
}
