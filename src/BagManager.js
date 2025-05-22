// BagManager.js — Client-side (render-only, safe)

export class BagManager {
  constructor(scene) {
    this.scene = scene;
    this.bags = new Map();
  }

  addBagSprite(data) {
    const { bagId, roomId } = data;

    if (!this.scene.player || this.scene.player.roomId !== roomId) return;

    const sprite = this.scene.add.sprite(728, 571, "bag").setVisible(false);
    sprite.setInteractive();
    sprite.on("pointerdown", () => {
      this.scene.socket.emit("LOOT_BAG_INTERACT", { bagId });
    });

    this.bags.set(bagId, sprite);
    console.log(`[BagManager] Created (initially hidden) bag sprite for ${bagId} conceptually at (728, 571)`);
  }

  updateBagVisibility(bagsInRoom) {
    if (!Array.isArray(bagsInRoom)) {
      console.warn("[BagManager] updateBagVisibility expected an array but got:", typeof bagsInRoom);
      return;
    }

    for (const [bagId, sprite] of this.bags.entries()) {
      const shouldBeVisible = bagsInRoom.includes(bagId);
      sprite.setVisible(shouldBeVisible);
    }
  }

  createToggleButton(x = 20, y = 20) {
    const btn = this.scene.add.text(x, y, "Open Bag", {
      fontSize: "16px",
      fill: "#ffffff",
      backgroundColor: "#000000"
    }).setInteractive();

    let isOpen = false;

    btn.on("pointerdown", () => {
      isOpen = !isOpen;
      btn.setText(isOpen ? "Close Bag" : "Open Bag");
      this.scene.socket.emit("TOGGLE_BAG_UI", { open: isOpen });
    });
  }
}
