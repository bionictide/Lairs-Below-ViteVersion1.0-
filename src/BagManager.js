// BagManager.js — Client-side (render-only, intent-emitting)
// Restored and adapted from original, but all state/inventory/stat mutation is server-authoritative.

export class BagManager {
  constructor(scene, socket, playerId) {
    this.scene = scene;
    this.socket = socket;
    this.playerId = playerId;
    console.log('[DEBUG] BagManager constructed, socket:', !!this.socket);
    this.isOpen = false;
    this.gridCols = 10;
    this.gridRows = 7;
    this.cellSize = 64;
    this.gridPadding = 10;
    this.inventory = [];
    this.gridOccupancy = [];
    this.bagContainer = null;
    this.bagToggleButton = null;
    this.contextMenu = null;
    this.outsideClickListener = null;
    this.gridStartX = 0;
    this.gridStartY = 0;
    this.clickThreshold = 10;
    this.clickTimeThreshold = 250;
    this.pointerDownTime = 0;
    this.pointerDownPos = { x: 0, y: 0 };
    this.activeBagSprites = new Map();
    this.PLAYER_BAG_ID = 'player_dropped_bag';
  }

  setInventory(inventory) {
    this.inventory = inventory;
    if (this.isOpen) this.renderItems(this.gridStartX, this.gridStartY);
  }

  openBagUI() {
    if (this.bagContainer) this.bagContainer.destroy();
    const centerX = this.scene.game.config.width / 2;
    const centerY = this.scene.game.config.height / 2;
    this.bagContainer = this.scene.add.container(0, 0).setDepth(80);
    const bagBg = this.scene.add.image(centerX, centerY, 'Bag2');
    const totalGridWidth = this.gridCols * this.cellSize;
    const totalGridHeight = this.gridRows * this.cellSize;
    this.gridStartX = centerX - totalGridWidth / 2;
    this.gridStartY = centerY - totalGridHeight / 2 + 30;
    const gridGraphics = this.scene.add.graphics();
    gridGraphics.lineStyle(1, 0xffffff, 0.2);
    for (let x = 0; x <= this.gridCols; x++) {
      gridGraphics.moveTo(this.gridStartX + x * this.cellSize, this.gridStartY);
      gridGraphics.lineTo(this.gridStartX + x * this.cellSize, this.gridStartY + this.gridRows * this.cellSize);
    }
    for (let y = 0; y <= this.gridRows; y++) {
      gridGraphics.moveTo(this.gridStartX, this.gridStartY + y * this.cellSize);
      gridGraphics.lineTo(this.gridStartX + this.gridCols * this.cellSize, this.gridStartY + y * this.cellSize);
    }
    gridGraphics.strokePath();
    this.bagContainer.add([bagBg, gridGraphics]);
    this.renderItems(this.gridStartX, this.gridStartY);
    this.isOpen = true;
  }

  closeBagUI() {
    if (this.bagContainer) this.bagContainer.destroy();
    this.bagContainer = null;
    this.isOpen = false;
  }

  renderItems(gridStartX, gridStartY) {
    if (!this.bagContainer) return;
    this.bagContainer.list.forEach(child => {
      if (child.getData && child.getData('isBagItem')) child.destroy();
    });
    this.inventory.forEach(item => {
      if (item.gridX === -1 || item.gridY === -1 || !item.asset) return;
      const itemCenterX = gridStartX + item.gridX * this.cellSize + item.width * this.cellSize / 2;
      const itemCenterY = gridStartY + item.gridY * this.cellSize + item.height * this.cellSize / 2;
      const maxItemWidth = item.width * this.cellSize - this.gridPadding * 2;
      const maxItemHeight = item.height * this.cellSize - this.gridPadding * 2;
      const itemSprite = this.scene.add.image(itemCenterX, itemCenterY, item.asset).setInteractive({ useHandCursor: true, draggable: true }).setDepth(81);
      const baseScale = Math.min(maxItemWidth / itemSprite.width, maxItemHeight / itemSprite.height);
      itemSprite.scale = baseScale * 1.375;
      itemSprite.setData('itemInstance', item);
      itemSprite.setData('isBagItem', true);
      itemSprite.on('dragstart', (pointer, dragX, dragY) => this.handleItemDragStart(pointer, itemSprite));
      itemSprite.on('drag', (pointer, dragX, dragY) => this.handleItemDrag(pointer, itemSprite, dragX, dragY));
      itemSprite.on('dragend', (pointer, dragX, dragY, dropped) => this.handleItemDragEnd(pointer, itemSprite, dropped));
      itemSprite.on('pointerup', pointer => this.handleItemPointerUp(pointer, itemSprite));
      this.bagContainer.add(itemSprite);
    });
  }

  handleItemDragStart(pointer, gameObject) {
    gameObject.setDepth(85);
    this.bagContainer.bringToTop(gameObject);
    gameObject.setData('originalX', gameObject.x);
    gameObject.setData('originalY', gameObject.y);
    gameObject.setData('pointerDownTime', pointer.downTime);
    gameObject.setData('pointerDownX', pointer.downX);
    gameObject.setData('pointerDownY', pointer.downY);
    gameObject.setData('isClick', false);
  }

  handleItemDrag(pointer, gameObject, dragX, dragY) {
    gameObject.x = dragX;
    gameObject.y = dragY;
  }

  handleItemDragEnd(pointer, gameObject, dropped) {
    const itemInstance = gameObject.getData('itemInstance');
    const itemWidth = itemInstance.width;
    const itemHeight = itemInstance.height;
    const relativeX = gameObject.x - this.gridStartX;
    const relativeY = gameObject.y - this.gridStartY;
    const targetGridX = Math.floor((relativeX - itemWidth * this.cellSize / 2 + this.cellSize / 2) / this.cellSize);
    const targetGridY = Math.floor((relativeY - itemHeight * this.cellSize / 2 + this.cellSize / 2) / this.cellSize);
    // Emit intent to move item
    this.socket.emit('MOVE_ITEM', {
      playerId: this.playerId,
      itemInstanceId: itemInstance.instanceId,
      toGridX: targetGridX,
      toGridY: targetGridY
    });
    // Snap back visually (server will send new state)
    gameObject.x = gameObject.getData('originalX');
    gameObject.y = gameObject.getData('originalY');
  }

  handleItemPointerUp(pointer, gameObject) {
    const downTime = gameObject.getData('pointerDownTime');
    const downX = gameObject.getData('pointerDownX');
    const downY = gameObject.getData('pointerDownY');
    const itemInstance = gameObject.getData('itemInstance');
    const upTime = pointer.upTime;
    const upX = pointer.upX;
    const upY = pointer.upY;
    const timeDiff = upTime - downTime;
    const distance = Phaser.Math.Distance.Between(downX, downY, upX, upY);
    if (timeDiff < this.clickTimeThreshold && distance < this.clickThreshold) {
      gameObject.setData('isClick', true);
      this.handleItemClick(itemInstance, gameObject);
    } else {
      gameObject.setData('isClick', false);
    }
  }

  handleItemClick(itemInstance, gameObject) {
    // Show context menu for item actions
    const pointer = this.scene.input.activePointer;
    this.showContextMenu(itemInstance, pointer.x, pointer.y);
  }

  showContextMenu(itemInstance, x, y) {
    this.closeContextMenu();
    this.contextMenu = this.scene.add.container(x, y).setDepth(100);
    const useBtn = this.scene.add.text(0, 0, 'Use', { fontSize: '16px', fill: '#fff', backgroundColor: '#222' }).setInteractive();
    useBtn.on('pointerdown', () => {
      this.socket.emit('USE_ITEM', { playerId: this.playerId, itemInstanceId: itemInstance.instanceId });
      this.closeContextMenu();
    });
    const dropBtn = this.scene.add.text(0, 30, 'Drop', { fontSize: '16px', fill: '#fff', backgroundColor: '#222' }).setInteractive();
    dropBtn.on('pointerdown', () => {
      this.socket.emit('DROP_ITEM', { playerId: this.playerId, itemInstanceId: itemInstance.instanceId });
      this.closeContextMenu();
    });
    this.contextMenu.add([useBtn, dropBtn]);
    this.scene.input.once('pointerdown', () => this.closeContextMenu());
    if (this.bagContainer) this.bagContainer.add(this.contextMenu);
  }

  closeContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.destroy();
      this.contextMenu = null;
    }
  }

  // Bag sprite logic for loot bags (render only)
  addBagSprite(data) {
    const { bagId, roomId } = data;
    if (!this.scene.player || this.scene.player.roomId !== roomId) return;
    const sprite = this.scene.add.sprite(728, 571, 'bag').setDepth(30).setVisible(false);
    sprite.setInteractive();
    sprite.on('pointerdown', () => {
      this.socket.emit('LOOT_BAG_INTERACT', { bagId });
    });
    this.activeBagSprites.set(bagId, sprite);
  }

  /**
   * Updates bag sprite visibility and appearance based on room and facing direction.
   * @param {string} currentRoomId
   * @param {string} currentFacingDirection
   */
  updateBagVisibility(currentRoomId, currentFacingDirection) {
    const screenWidth = this.scene.game.config.width;
    const screenHeight = this.scene.game.config.height;
    for (const [bagId, bagSprite] of this.activeBagSprites.entries()) {
      const bagData = bagSprite.getData('bagData') || {};
      const bagRoomId = bagData.roomId || bagSprite.roomId;
      const droppedFacing = (bagData.droppedFacingDirection || bagSprite.droppedFacingDirection || 'north').trim().toLowerCase();
      const currentFacing = (currentFacingDirection || 'north').trim().toLowerCase();
      let isVisible = false;
      let targetX = screenWidth / 2;
      let targetY = screenHeight * 0.70;
      let relativeDirection = 'front';
      if (bagRoomId === currentRoomId) {
        relativeDirection = this.getRelativeDirection(droppedFacing, currentFacing);
        switch (relativeDirection) {
          case 'front':
            isVisible = true;
            targetX = screenWidth / 2;
            targetY = screenHeight * 0.70;
            bagSprite.setFlipX(false);
            bagSprite.setScale(0.165);
            break;
          case 'left':
            isVisible = true;
            targetX = screenWidth * 0.85;
            targetY = screenHeight * 0.78;
            bagSprite.setFlipX(false);
            bagSprite.setScale(0.1875);
            break;
          case 'right':
            isVisible = true;
            targetX = screenWidth * 0.15;
            targetY = screenHeight * 0.78;
            bagSprite.setFlipX(true);
            bagSprite.setScale(0.1875);
            break;
          case 'back':
            isVisible = false;
            bagSprite.setFlipX(false);
            break;
          default:
            isVisible = true;
            targetX = screenWidth / 2;
            targetY = screenHeight * 0.70;
            bagSprite.setFlipX(false);
            bagSprite.setScale(0.165);
            break;
        }
      } else {
        isVisible = false;
      }
      bagSprite.setVisible(isVisible);
      if (isVisible) {
        bagSprite.setPosition(targetX, targetY);
      }
    }
  }

  /**
   * Returns the relative direction ('front', 'left', 'right', 'back') given dropped and current facing.
   */
  getRelativeDirection(droppedFacing, currentFacing) {
    const directions = ['north', 'east', 'south', 'west'];
    const relMap = {
      0: 'front',
      1: 'right',
      2: 'back',
      3: 'left',
    };
    const dropIdx = directions.indexOf(droppedFacing);
    const currIdx = directions.indexOf(currentFacing);
    if (dropIdx === -1 || currIdx === -1) return 'front';
    const diff = (currIdx - dropIdx + 4) % 4;
    return relMap[diff] || 'front';
  }

  createToggleButton() {
    const buttonX = this.scene.game.config.width - 100; // Top right
    const buttonY = 50;
    const button = this.scene.add.rectangle(buttonX, buttonY, 150, 50, 0x333333)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .setDepth(70);
    const text = this.scene.add.text(buttonX, buttonY, 'Open Bag', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(71);
    button.on('pointerdown', () => {
      if (!this.scene.isInEncounter) {
        this.toggleBag();
      } else {
        this.scene.events.emit('showActionPrompt', 'Cannot open bag during encounter!');
      }
    });
    button.on('pointerover', () => button.setFillStyle(0x555555));
    button.on('pointerout', () => button.setFillStyle(0x333333));
    this.bagToggleButton = { bg: button, text };
    this.setBagButtonVisibility(true);
  }

  toggleBag() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.openBagUI();
      this.bagToggleButton.text.setText('Close Bag');
      this.setInteractionBlocking(true);
    } else {
      this.closeBagUI();
      this.bagToggleButton.text.setText('Open Bag');
      this.setInteractionBlocking(false);
    }
    if (this.scene.setupNavigationButtons) this.scene.setupNavigationButtons();
    if (this.scene.updateDoorZoneVisibility) this.scene.updateDoorZoneVisibility(!this.isOpen && this.scene.debugHelper?.visible);
    if (this.scene.setDoorInteractivity) this.scene.setDoorInteractivity(!this.isOpen);
    if (this.socket) this.socket.emit('TOGGLE_BAG_UI', { open: this.isOpen });
  }

  setBagButtonVisibility(visible) {
    if (this.bagToggleButton) {
      this.bagToggleButton.bg.setVisible(visible);
      this.bagToggleButton.text.setVisible(visible);
    }
  }

  setInteractionBlocking(blocked) {
    // No-op: interaction blocking is handled by disabling buttons/zones in DungeonScene based on this.isOpen state.
  }
}

// Placeholder item data structure (restored from old code)
export const itemData = {
  'Key1': {
    name: 'Key',
    asset: 'Key1',
    width: 2,
    height: 1,
    stackable: false
  },
  'sword1': {
    name: 'Sword',
    asset: 'Sword1',
    width: 3,
    height: 1,
    stackable: false,
    usable: false
  },
  'helm1': {
    name: 'Helm',
    asset: 'Helm1',
    width: 2,
    height: 2,
    stackable: false,
    usable: false
  },
  'Potion1(red)': {
    name: 'Red Potion',
    asset: 'Potion1(red)',
    width: 1,
    height: 1,
    stackable: true,
    usable: true
  },
  'Emerald': {
    name: 'Emerald',
    asset: 'Emerald',
    width: 1,
    height: 1,
    stackable: true,
    usable: false
  },
  'BlueApatite': {
    name: 'Blue Apatite',
    asset: 'BlueApatite',
    width: 1,
    height: 1,
    stackable: true,
    usable: false
  },
  'Amethyst': {
    name: 'Amethyst',
    asset: 'Amethyst',
    width: 1,
    height: 1,
    stackable: true,
    usable: false
  },
  'RawRuby': {
    name: 'Raw Ruby',
    asset: 'RawRuby',
    width: 1,
    height: 1,
    stackable: true,
    usable: false
  }
};
