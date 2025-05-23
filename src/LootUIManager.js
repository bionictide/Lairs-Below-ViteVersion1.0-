// LootUIManager.js — Client-side (render-only, intent-emitting)
// Restored and adapted from original, but all loot transfer and inventory mutation is server-authoritative.

import { itemData } from './BagManager.js';

export class LootUIManager {
  constructor(scene, bagManager, playerId, socket) {
    this.scene = scene;
    this.bagManager = bagManager;
    this.playerId = playerId;
    this.socket = socket;
    this.isOpen = false;
    this.lootContainer = null;
    this.currentLootItems = [];
    this.currentSourceEntityId = null;
    this.sourceBagSprite = null;
    this.gridCols = 10;
    this.gridRows = 7;
    this.cellSize = 64;
    this.gridPadding = 10;
    this.gridStartX = 0;
    this.gridStartY = 0;

    // Listen for server events
    this.socket.on('LOOT_BAG_UPDATE', (data) => {
      if (this.isOpen && data.bagId === this.currentSourceEntityId) {
        this.currentLootItems = data.items;
        this._renderLootItems(this.gridStartX, this.gridStartY);
        if (data.items.length === 0) {
          this.closeLootUI();
        }
      }
    });
    this.socket.on('INVENTORY_UPDATE', (data) => {
      if (data.playerId === this.playerId) {
        if (this.bagManager && typeof this.bagManager.inventory !== 'undefined') {
          this.bagManager.inventory = data.inventory;
          if (this.bagManager.isOpen) {
            this.bagManager.renderItems(this.bagManager.gridStartX, this.bagManager.gridStartY);
          }
        }
      }
    });
  }

  openLootUI(bagId, bagSprite) {
    if (this.isOpen) this.closeLootUI();
    this.isOpen = true;
    this.currentSourceEntityId = bagId;
    this.sourceBagSprite = bagSprite;
    this.currentLootItems = [];
    const centerX = this.scene.game.config.width / 2;
    const centerY = this.scene.game.config.height / 2;
    this.lootContainer = this.scene.add.container(0, 0).setDepth(92);
    const lootBg = this.scene.add.image(centerX, centerY, 'Bag2');
    const title = this.scene.add.text(centerX, centerY - lootBg.displayHeight / 2 + 40, 'Loot', {
      fontSize: '32px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);
    const closeButtonX = this.scene.game.config.width - 100;
    const closeButtonY = 50;
    const closeButtonBg = this.scene.add.rectangle(closeButtonX, closeButtonY, 150, 50, 0x333333).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true }).setDepth(90);
    const closeButtonText = this.scene.add.text(closeButtonX, closeButtonY, 'Close Bag', { fontSize: '20px', color: '#fff' }).setOrigin(0.5).setDepth(91);
    closeButtonBg.on('pointerdown', () => this.closeLootUI());
    closeButtonBg.on('pointerover', () => closeButtonBg.setFillStyle(0x555555));
    closeButtonBg.on('pointerout', () => closeButtonBg.setFillStyle(0x333333));
    this.closeButtonBg = closeButtonBg;
    this.closeButtonText = closeButtonText;
    this.lootContainer.add([lootBg, title]);
    const totalGridWidth = this.gridCols * this.cellSize;
    const totalGridHeight = this.gridRows * this.cellSize;
    this.gridStartX = centerX - totalGridWidth / 2;
    this.gridStartY = centerY - totalGridHeight / 2 + 30;
    this._renderLootItems(this.gridStartX, this.gridStartY);
    this.setInteractionBlocking(true);
  }

  closeLootUI() {
    if (!this.isOpen) return;
    if (this.lootContainer) this.lootContainer.destroy();
    this.lootContainer = null;
    if (this.closeButtonBg) { this.closeButtonBg.destroy(); this.closeButtonBg = null; }
    if (this.closeButtonText) { this.closeButtonText.destroy(); this.closeButtonText = null; }
    if (this.sourceBagSprite && this.sourceBagSprite.scene && this.currentLootItems.length === 0) {
      this.bagManager.removeBagSprite(this.currentSourceEntityId);
    }
    this.isOpen = false;
    this.currentLootItems = [];
    this.currentSourceEntityId = null;
    this.sourceBagSprite = null;
    this.setInteractionBlocking(false);
    this.scene.events.emit('lootUIClosed');
  }

  setInteractionBlocking(isBlocked) {
    if (this.scene.setupNavigationButtons) this.scene.setupNavigationButtons();
    if (this.scene.updateDoorZoneVisibility) this.scene.updateDoorZoneVisibility(!isBlocked);
    if (this.scene.setDoorInteractivity) this.scene.setDoorInteractivity(!isBlocked);
  }

  _renderLootItems(gridStartX, gridStartY) {
    if (!this.lootContainer) return;
    this.lootContainer.list.forEach(child => {
      if (child.getData && child.getData('isLootItem')) child.destroy();
    });
    let currentGridX = 0, currentGridY = 0;
    this.currentLootItems.forEach(itemObj => {
      const itemKey = itemObj.itemKey;
      const baseItem = itemData[itemKey];
      if (!baseItem || !baseItem.asset) return;
      const itemGridX = currentGridX;
      const itemGridY = currentGridY;
      currentGridX++;
      if (currentGridX >= this.gridCols) { currentGridX = 0; currentGridY++; }
      if (currentGridY >= this.gridRows) return;
      const itemWidth = baseItem.width || 1;
      const itemHeight = baseItem.height || 1;
      const itemCenterX = gridStartX + itemGridX * this.cellSize + itemWidth * this.cellSize / 2;
      const itemCenterY = gridStartY + itemGridY * this.cellSize + itemHeight * this.cellSize / 2;
      const maxItemWidth = itemWidth * this.cellSize - this.gridPadding * 2;
      const maxItemHeight = itemHeight * this.cellSize - this.gridPadding * 2;
      const itemSprite = this.scene.add.image(itemCenterX, itemCenterY, baseItem.asset).setInteractive({ useHandCursor: true }).setDepth(93);
      const baseScale = Math.min(maxItemWidth / itemSprite.width, maxItemHeight / itemSprite.height);
      itemSprite.scale = baseScale * 1.375;
      itemSprite.setData('itemKey', itemKey);
      itemSprite.setData('isLootItem', true);
      itemSprite.setData('instanceId', itemObj.instanceId);
      itemSprite.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
        this._handleLootItemClick(itemSprite);
      });
      this.lootContainer.add(itemSprite);
    });
  }

  _handleLootItemClick(itemSprite) {
    const itemKey = itemSprite.getData('itemKey');
    const instanceId = itemSprite.getData('instanceId');
    const bagId = this.currentSourceEntityId;
    this.pickupItem(bagId, instanceId);
  }

  pickupItem(bagId, instanceId) {
    this.socket.emit('LOOT_BAG_PICKUP', { playerId: this.playerId, bagId, instanceId });
  }
}
