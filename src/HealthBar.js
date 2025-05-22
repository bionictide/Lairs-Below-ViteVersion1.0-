export default class HealthBar {
  constructor(scene, x, y, width = 100, height = 10) {
    this.scene = scene;
    this.bar = this.scene.add.graphics();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.maxHealth = 100;
    this.currentHealth = 100;
  }

  update(health, maxHealth) {
    this.currentHealth = health;
    this.maxHealth = maxHealth;

    this.bar.clear();
    this.bar.fillStyle(0x000000);
    this.bar.fillRect(this.x, this.y, this.width, this.height);

    const healthWidth = (health / maxHealth) * this.width;
    this.bar.fillStyle(0xff0000);
    this.bar.fillRect(this.x, this.y, healthWidth, this.height);
  }
}
