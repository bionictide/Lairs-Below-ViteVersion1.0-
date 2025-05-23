import Phaser from 'phaser';

export class ShelfManager {
  constructor(scene, socket) {
    this.scene = scene;
    this.socket = socket;
    this.shelves = new Map(); // roomId: {empty: sprite, gem/potion: sprite}
    this.shelfWallDirections = new Map(); // roomId: facing direction
    this.socket.on('SHELF_UPDATE', (data) => {
      // On authoritative update, destroy only the looted item shelf, not the base shelf
      const room = this.scene.dungeonService.getRoomById(data.roomId);
      if (!room || !this.shelves.has(room.id)) return;
      const shelfData = this.shelves.get(room.id);
      // Remove only the looted item shelf
      if (data.itemKey && shelfData) {
        if (shelfData.gemShelf && data.itemKey !== 'Potion1(red)' && shelfData.gemShelf.scene) {
          shelfData.gemShelf.destroy();
          delete shelfData.gemShelf;
          room.gemType = null; // Update local state
        }
        if (shelfData.potionShelf && data.itemKey === 'Potion1(red)' && shelfData.potionShelf.scene) {
          shelfData.potionShelf.destroy();
          delete shelfData.potionShelf;
          room.hasPotion = false; // Update local state
        }
      }
      // Do NOT destroy the base shelf (emptyShelf/emptyShelf2) or delete the shelfData entry
    });
    this.socket.on('INVENTORY_UPDATE', ({ playerId, inventory }) => {
      if (playerId === this.scene.playerId) {
        // Optionally trigger a UI update if needed
      }
    });
  }

  initializeShelves(room) {
    // Skip if room has neither shelf type
    if (!room.hasShelfEmpty && !room.hasShelf2Empty) return;
    // Skip initialization if we already have shelves for this room
    if (this.shelves.has(room.id)) {
      // Just update visibility for the existing sprites
      const shelfData = this.shelves.get(room.id);
      Object.values(shelfData).forEach(sprite => {
        if (sprite) this.updateShelfVisibility(sprite, room);
      });
      return;
    }
    // Determine wall direction if not already set
    if (!this.shelfWallDirections.has(room.id)) {
      const directions = ['north', 'east', 'south', 'west'];
      const directionHasDoor = {};
      directions.forEach(dir => {
        const doors = this.scene.roomManager.getVisibleDoors(room, dir, this.scene.dungeonService);
        directionHasDoor[dir] = doors.includes('forward');
      });
      const directionsWithoutDoor = directions.filter(dir => !directionHasDoor[dir]);
      const roomIdSum = room.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const shelfFacing = directionsWithoutDoor.length > 0 ? directionsWithoutDoor[roomIdSum * 5 % directionsWithoutDoor.length] : 'north';
      this.shelfWallDirections.set(room.id, shelfFacing);
    }
    const width = this.scene.game.config.width;
    const height = this.scene.game.config.height;
    const shelfData1 = {};
    // Create ShelfEmpty if room has it
    if (room.hasShelfEmpty) {
      const emptyShelf = this.scene.add.sprite(width / 2, height * 0.5, 'ShelfEmpty').setDepth(5).setScale(0.35).setData('baseTexture', 'ShelfEmpty');
      shelfData1.emptyShelf = emptyShelf;
      // Add gem shelf if room has a gem type
      if (room.gemType) {
        const gemShelf = this.scene.add.sprite(width / 2, height * 0.5, room.gemType).setInteractive({ useHandCursor: true }).setDepth(6).setScale(0.35).setData('baseTexture', room.gemType);
        gemShelf.on('pointerdown', () => {
          if (this.scene.isInEncounter) {
            this.scene.events.emit('showActionPrompt', 'Cannot loot items during combat!');
            return;
          }
          if (gemShelf.getData('pendingLoot')) return;
          gemShelf.setData('pendingLoot', true);
          gemShelf.disableInteractive();
          this.socket.emit('SHELF_PICKUP_REQUEST', {
            playerId: this.scene.playerId,
            roomId: room.id,
            itemKey: room.gemType
          });
        });
        shelfData1.gemShelf = gemShelf;
      }
    }
    // Create Shelf2Empty if room has it
    if (room.hasShelf2Empty) {
      const emptyShelf2 = this.scene.add.sprite(width / 2, height * 0.5, 'Shelf2Empty').setDepth(5).setScale(0.35).setData('baseTexture', 'Shelf2Empty');
      shelfData1.emptyShelf2 = emptyShelf2;
      // Add potion shelf if room has potions
      if (room.hasPotion) {
        const potionShelf = this.scene.add.sprite(width / 2, height * 0.5, 'Shelf2Potion').setInteractive({ useHandCursor: true }).setDepth(6).setScale(0.35).setData('baseTexture', 'Shelf2Potion');
        potionShelf.on('pointerdown', () => {
          if (this.scene.isInEncounter) {
            this.scene.events.emit('showActionPrompt', 'Cannot loot items during combat!');
            return;
          }
          if (potionShelf.getData('pendingLoot')) return;
          potionShelf.setData('pendingLoot', true);
          potionShelf.disableInteractive();
          this.socket.emit('SHELF_PICKUP_REQUEST', {
            playerId: this.scene.playerId,
            roomId: room.id,
            itemKey: 'Potion1(red)'
          });
        });
        shelfData1.potionShelf = potionShelf;
      }
    }
    this.shelves.set(room.id, shelfData1);
    this.updateAllShelvesVisibility(room);
  }

  getShelfAssetForPerspective(baseAssetName, direction) {
    if (direction === 'forward') return baseAssetName;
    if (baseAssetName === 'ShelfEmpty') return direction === 'left' ? 'ShelfEmptyLeft' : 'ShelfEmptyRight';
    if (baseAssetName === 'Shelf2Empty') return direction === 'left' ? 'Shelf2EmptyLeft' : 'Shelf2EmptyRight';
    if (baseAssetName === 'ShelfEmerald') return direction === 'left' ? 'ShelfEmeraldLeft' : 'ShelfEmeraldRight';
    if (baseAssetName === 'ShelfBlueApatite') return direction === 'left' ? 'ShelfBlueApatiteLeft' : 'ShelfBlueApatiteRight';
    if (baseAssetName === 'ShelfAmethyst') return direction === 'left' ? 'ShelfAmethystLeft' : 'ShelfAmethystRight';
    if (baseAssetName === 'ShelfRawRuby') return direction === 'left' ? 'ShelfRawRubyLeft' : 'ShelfRawRubyRight';
    if (baseAssetName === 'Shelf2Potion') return direction === 'left' ? 'Shelf2PotionLeft' : 'Shelf2PotionRight';
    return baseAssetName;
  }

  updateShelfVisibility(sprite, room) {
    const currentFacing = this.scene.playerPosition.facing;
    const shelfFacing = this.shelfWallDirections.get(room.id);
    if (currentFacing !== shelfFacing && this.scene.roomManager.rotateFacing(currentFacing, 'left') !== shelfFacing && this.scene.roomManager.rotateFacing(currentFacing, 'right') !== shelfFacing) {
      sprite.setVisible(false);
      return;
    }
    let perspective = 'forward';
    let scale = 0.35;
    if (currentFacing === shelfFacing) {
      const isFacingWall = !this.scene.roomManager.getVisibleDoors(room, currentFacing, this.scene.dungeonService).includes('forward');
      if (!isFacingWall) {
        sprite.setVisible(false);
        return;
      }
      perspective = 'forward';
      scale = 0.35;
    } else if (this.scene.roomManager.rotateFacing(currentFacing, 'left') === shelfFacing) {
      perspective = 'left';
      scale = 1.0;
    } else if (this.scene.roomManager.rotateFacing(currentFacing, 'right') === shelfFacing) {
      perspective = 'right';
      scale = 1.0;
    }
    const baseTexture = sprite.texture.key;
    const newTexture = this.getShelfAssetForPerspective(baseTexture, perspective);
    if (baseTexture !== newTexture) {
      sprite.setTexture(newTexture);
    }
    sprite.setScale(scale);
    const width = this.scene.game.config.width;
    const height = this.scene.game.config.height;
    sprite.setPosition(width / 2, perspective === 'forward' ? height * 0.5 : height / 2);
    sprite.setVisible(true);
  }

  updateAllShelvesVisibility(room) {
    if (!room || !this.shelves.has(room.id)) return;
    const shelfData = this.shelves.get(room.id);
    Object.values(shelfData).forEach(sprite => {
      if (sprite && sprite.scene) {
        this.updateShelfVisibility(sprite, room);
      }
    });
  }

  clearShelves() {
    this.shelves.forEach(shelfData => {
      Object.values(shelfData).forEach(sprite => {
        if (sprite) sprite.destroy();
      });
    });
    this.shelves.clear();
    // Don't clear shelfWallDirections here to maintain persistence between room visits
  }
}
