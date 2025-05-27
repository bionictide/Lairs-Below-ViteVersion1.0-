import Phaser from 'phaser';

export default class Menu {
  constructor(scene, options) {
    this.scene = scene;
    this.options = options;
    this.menuContainer = null;
    this.currentMenu = 'main';
    this.menuStack = [];
    this.devUnlocked = false;
    this.inGroup = false; // Set externally as needed
    this.transitioning = false;
    this.musicVolume = 1;
    this.sfxVolume = 1;
    this.passwordInput = '';
    this.passwordCursorTimer = null;
    this.verticalOffset = 96;
    this.createMenu('main', true);
    // Responsive: re-center on resize
    this.scene.scale.on('resize', this.updateMenuPosition, this);
    // Add debug menu state
    this.debugState = {
      godMode: false,
      minimap: false,
      compass: false,
      hitboxes: false,
      minimapChecks: { players: true, gems: true, treasure: true, puzzles: true },
      itemIndex: 0,
      playerIndex: 0,
      encounterSlots: [0, 3, 3], // 0 = first type, 3 = None
    };
  }

  // Menu definitions
  getMenus() {
    return {
      main: [
        { text: 'Help', action: () => this.transitionTo('help') },
        { text: 'Leave Group', action: () => this.leaveGroup(), disabled: !this.inGroup },
        { text: 'Log Out', action: () => this.transitionTo('logout') },
        { text: 'Sound Options', action: () => this.transitionTo('sound') },
        { text: 'Account', action: () => window.open('https://www.BionicTide.com', '_blank') },
        { text: 'Close Menu', action: () => this.closeMenu() },
        { text: '?', action: () => this.transitionTo('dev') },
      ],
      help: [
        { text: 'Find loot, Collect Gems, Escape!', small: true },
        { text: 'Back', action: () => this.transitionBack() },
      ],
      logout: [
        { text: 'Are you sure?', small: true },
        { text: 'Yes', action: () => this.logout() },
        { text: 'No', action: () => this.transitionBack() },
      ],
      sound: [
        { text: 'Music Volume', slider: true, value: () => this.musicVolume, onChange: v => this.setMusicVolume(v) },
        { text: 'Sound Effects', slider: true, value: () => this.sfxVolume, onChange: v => this.setSfxVolume(v) },
        { text: 'Back', action: () => this.transitionBack() },
      ],
      dev: [
        { text: 'Enter Password:', password: true },
        { text: 'Back', action: () => this.transitionBack() },
      ],
      devMenu: [
        // Main debug menu layout
        { text: 'God Mode', toggle: 'godMode' },
        { text: 'MiniMap', toggle: 'minimap' },
        { text: 'Compass', toggle: 'compass' },
        { text: 'Hitboxes', toggle: 'hitboxes' },
        { text: 'Spawn Item', selector: 'item' },
        { text: 'Kick Player', selector: 'player' },
        { text: 'Force Encounter', selector: 'encounter' },
        { text: 'Back', action: () => this.transitionBack() },
      ],
    };
  }

  createMenu(menuKey, instant = false) {
    if (this.transitioning) return;
    const prevMenuContainer = this.menuContainer;
    this.menuContainer = this.scene.add.container(0, 0).setDepth(2000);
    // Set container position to center (with offset) before adding children
    const rowWidth = 280;
    this.menuContainer.x = this.scene.scale.width / 2;
    // Only offset the debug menu
    if (menuKey === 'devMenu') {
      this.menuContainer.y = this.scene.scale.height / 2 + 64;
    } else {
      this.menuContainer.y = this.scene.scale.height / 2;
    }
    this.menuTexts = [];
    this.currentMenu = menuKey;
    const menu = this.getMenus()[menuKey];
    if (!menu) return;
    // Calculate total menu height for perfect centering
    let totalHeight = 0;
    let itemHeights = [];
    menu.forEach(item => {
      itemHeights.push(54);
      totalHeight += 54;
    });
    let currentY = -totalHeight / 2 + itemHeights[0] / 2;
    // Track row containers for clean redraw
    if (!this.debugRowContainers) this.debugRowContainers = [];
    this.debugRowContainers.forEach(c => c.destroy());
    this.debugRowContainers = [];
    menu.forEach((item, i) => {
      if (menuKey === 'devMenu') {
        const mainFont = {
          fontFamily: 'Arial', fontSize: '18px', color: '#000', align: 'left', fixedWidth: rowWidth
        };
        // Force Encounter header and entity selectors are centered
        if (item.selector === 'encounter') {
          // Header row
          const headerRow = this.scene.add.container(0, currentY);
          const header = this.scene.add.text(0, 0, 'Force Encounter', { ...mainFont, align: 'center' }).setOrigin(0.5).setDepth(2000);
          headerRow.add(header);
          this.menuContainer.add(headerRow);
          this.menuTexts.push(headerRow);
          this.debugRowContainers.push(headerRow);
          // Three centered selector rows
          const charTypes = (window.getAllCharacterTypeKeys && window.getAllCharacterTypeKeys()) || ['Dwarf', 'Gnome', 'Elvaan', 'Bat', 'Baba', 'Minotaur', 'Troll', 'None'];
          for (let s = 0; s < 3; s++) {
            const slotRow = this.scene.add.container(0, currentY + (s + 1) * 32);
            this.debugRowContainers.push(slotRow);
            const slotIdx = this.debugState.encounterSlots[s] || 0;
            const leftE = this.scene.add.text(-64, 0, '<', { fontSize: '18px', color: '#222' })
              .setOrigin(0.5).setInteractive({ useHandCursor: true });
            leftE.on('pointerdown', () => {
              this.debugState.encounterSlots[s] = (slotIdx - 1 + charTypes.length) % charTypes.length;
              this.createMenu('devMenu', true);
            });
            const rightE = this.scene.add.text(64, 0, '>', { fontSize: '18px', color: '#222' })
              .setOrigin(0.5).setInteractive({ useHandCursor: true });
            rightE.on('pointerdown', () => {
              this.debugState.encounterSlots[s] = (slotIdx + 1) % charTypes.length;
              this.createMenu('devMenu', true);
            });
            const type = charTypes[slotIdx] || 'None';
            const slotBox = this.scene.add.text(0, 0, type, { fontSize: '16px', color: type !== 'None' ? '#0c0' : '#888', backgroundColor: '#222', padding: { x: 8, y: 2 } })
              .setOrigin(0.5).setInteractive({ useHandCursor: true });
            slotBox.on('pointerdown', () => {
              if (type !== 'None') {
                const slots = this.debugState.encounterSlots.map(idx => charTypes[idx]);
                this.scene.socket.emit('DEV_DEBUG_ACTION', { action: 'force_encounter', slots });
              }
            });
            slotRow.add([leftE, slotBox, rightE]);
            this.menuContainer.add(slotRow);
            this.menuTexts.push(slotRow);
          }
          currentY += 32 * 4;
          return;
        }
        // Back button is centered
        if (item.action && item.text === 'Back') {
          const row = this.scene.add.container(0, currentY);
          const btn = this.scene.add.text(0, 0, item.text, { ...mainFont, align: 'center' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
          btn.on('pointerdown', () => item.action());
          row.add(btn);
          this.menuContainer.add(row);
          this.menuTexts.push(row);
          this.debugRowContainers.push(row);
          currentY += 32;
          return;
        }
        // All other rows: left-aligned label, right-aligned control group
        const row = this.scene.add.container(0, currentY);
        this.debugRowContainers.push(row);
        // Left label
        const label = this.scene.add.text(-rowWidth / 2, 0, item.text, mainFont).setOrigin(0, 0.5).setDepth(2000);
        row.add(label);
        // Right control group
        let controlGroupX = rowWidth / 4; // Center of right half
        if (item.toggle) controlGroupX = rowWidth / 2 - 24; // toggles stay right
        const controlGroup = this.scene.add.container(controlGroupX, 0);
        if (item.toggle) {
          const isOn = this.debugState[item.toggle];
          const color = isOn ? 0x00cc44 : 0xcc2222;
          const box = this.scene.add.rectangle(0, 0, 18, 18, color)
            .setStrokeStyle(2, 0x222222)
            .setInteractive({ useHandCursor: true })
            .setDepth(2000);
          box.on('pointerdown', () => {
            this.debugState[item.toggle] = !this.debugState[item.toggle];
            this.scene.socket.emit('DEV_DEBUG_ACTION', { action: 'toggle', key: item.toggle, value: this.debugState[item.toggle] });
            this.createMenu('devMenu', true);
          });
          controlGroup.add(box);
        } else if (item.selector === 'item') {
          const itemKeys = Object.keys((window.itemData || this.scene.bagManager?.constructor?.itemData) || {});
          const itemData = window.itemData || this.scene.bagManager?.constructor?.itemData || {};
          const items = itemKeys.length ? itemKeys : ['Potion1(red)', 'sword1', 'helm1', 'Emerald', 'BlueApatite', 'Amethyst', 'RawRuby', 'Key1'];
          const itemIdx = this.debugState.itemIndex;
          const itemKey = items[itemIdx] || items[0];
          const itemObj = itemData[itemKey] || { name: itemKey, asset: itemKey };
          const leftArrow = this.scene.add.text(-48, 0, '<', { fontSize: '18px', color: '#222' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
          leftArrow.on('pointerdown', () => {
            this.debugState.itemIndex = (itemIdx - 1 + items.length) % items.length;
            this.createMenu('devMenu', true);
          });
          const rightArrow = this.scene.add.text(48, 0, '>', { fontSize: '18px', color: '#222' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
          rightArrow.on('pointerdown', () => {
            this.debugState.itemIndex = (itemIdx + 1) % items.length;
            this.createMenu('devMenu', true);
          });
          let itemSprite;
          if (itemObj.asset && this.scene.textures.exists(itemObj.asset)) {
            itemSprite = this.scene.add.sprite(0, 0, itemObj.asset).setOrigin(0.5).setDisplaySize(20, 20).setInteractive({ useHandCursor: true });
          } else {
            itemSprite = this.scene.add.text(0, 0, itemObj.name, { fontSize: '14px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          }
          itemSprite.on('pointerdown', () => {
            this.scene.socket.emit('DEV_DEBUG_ACTION', { action: 'spawn_item', itemKey });
          });
          controlGroup.add([leftArrow, itemSprite, rightArrow]);
        } else if (item.selector === 'player') {
          const players = (this.scene.currentTargetList && this.scene.currentTargetList.length) ? this.scene.currentTargetList : [{ id: 'p1', name: 'Player1' }, { id: 'p2', name: 'Player2' }];
          const playerIdx = this.debugState.playerIndex;
          const player = players[playerIdx % players.length];
          const leftP = this.scene.add.text(-48, 0, '<', { fontSize: '18px', color: '#222' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
          leftP.on('pointerdown', () => {
            this.debugState.playerIndex = (playerIdx - 1 + players.length) % players.length;
            this.createMenu('devMenu', true);
          });
          const rightP = this.scene.add.text(48, 0, '>', { fontSize: '18px', color: '#222' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
          rightP.on('pointerdown', () => {
            this.debugState.playerIndex = (playerIdx + 1) % players.length;
            this.createMenu('devMenu', true);
          });
          const playerBox = this.scene.add.text(0, 0, player.name, { fontSize: '14px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          playerBox.on('pointerdown', () => {
            this.scene.socket.emit('DEV_DEBUG_ACTION', { action: 'kick_player', playerId: player.id });
          });
          controlGroup.add([leftP, playerBox, rightP]);
        }
        row.add(controlGroup);
        this.menuContainer.add(row);
        this.menuTexts.push(row);
        currentY += 32;
      } else if (item.slider) {
        // Group label, bar, and ball into a sub-container for perfect alignment
        const sliderRow = this.scene.add.container(0, currentY);
        const barWidth = 220;
        const valueClamped = Phaser.Math.Clamp(item.value(), 0, 1);
        // Label above bar/ball
        const label = this.scene.add.text(0, -20, item.text, {
          fontFamily: 'Arial', fontSize: '28px', color: '#000', align: 'center',
          wordWrap: { width: 200, useAdvancedWrap: true },
          fixedWidth: 220,
        }).setOrigin(0.5).setDepth(2000);
        const bar = this.scene.add.rectangle(0, 0, barWidth, 8, 0x888888).setOrigin(0.5).setDepth(2000);
        const ballRadius = 8;
        const ball = this.scene.add.circle(-barWidth / 2 + barWidth * valueClamped, 0, ballRadius, 0x222222).setOrigin(0.5).setDepth(2001).setInteractive({ draggable: true });
        ball.input.draggable = true;
        ball.on('drag', (pointer, dragX) => {
          let localX = Phaser.Math.Clamp(dragX, -barWidth / 2, barWidth / 2);
          ball.x = localX;
          let value = (localX + barWidth / 2) / barWidth;
          item.onChange(value);
        });
        sliderRow.add([label, bar, ball]);
        this.menuContainer.add(sliderRow);
        this.menuTexts.push(label, bar, ball, sliderRow);
        currentY += itemHeights[i + 1] ? (itemHeights[i] + itemHeights[i + 1]) / 2 : itemHeights[i];
      } else if (item.password) {
        this.passwordInput = '';
        const monoFont = 'Courier New, Courier, monospace';
        const pwText = this.scene.add.text(0, currentY, '', {
          fontFamily: monoFont, fontSize: '32px', color: '#000', align: 'center', backgroundColor: 'rgba(255,255,255,0)'
        }).setOrigin(0.5).setDepth(2000);
        this.menuContainer.add(pwText);
        this.menuTexts.push(pwText);
        this.scene.input.keyboard.off('keydown');
        let cursorVisible = true;
        let cursorTimer = this.scene.time.addEvent({
          delay: 400,
          loop: true,
          callback: () => {
            cursorVisible = !cursorVisible;
            updatePwText();
          }
        });
        const updatePwText = () => {
          if (!pwText.scene) return;
          const asterisks = '*'.repeat(this.passwordInput.length);
          pwText.setText(asterisks + (cursorVisible ? '|' : ''));
        };
        this.scene.input.keyboard.on('keydown', (event) => {
          if (event.key === 'Backspace') {
            this.passwordInput = this.passwordInput.slice(0, -1);
          } else if (event.key === 'Enter') {
            this.handleDevPassword(this.passwordInput);
          } else if (event.key.length === 1) {
            this.passwordInput += event.key;
          }
          updatePwText();
        });
        updatePwText();
        if (this.passwordCursorTimer) this.passwordCursorTimer.remove();
        this.passwordCursorTimer = cursorTimer;
        currentY += itemHeights[i + 1] ? (itemHeights[i] + itemHeights[i + 1]) / 2 : itemHeights[i];
      } else {
        const style = {
          fontFamily: 'Arial',
          fontSize: item.small ? '22px' : '36px',
          color: '#000',
          align: 'center',
          wordWrap: { width: 320, useAdvancedWrap: true },
          fixedWidth: 340,
        };
        const txt = this.scene.add.text(0, currentY, item.text, style)
          .setOrigin(0.5)
          .setDepth(2000)
          .setInteractive({ useHandCursor: !item.disabled && !!item.action });
        if (item.disabled) {
          txt.setAlpha(1);
        } else {
          txt.setAlpha(1);
          if (item.action) {
            txt.on('pointerdown', () => item.action());
          }
        }
        this.menuContainer.add(txt);
        this.menuTexts.push(txt);
        currentY += itemHeights[i + 1] ? (itemHeights[i] + itemHeights[i + 1]) / 2 : itemHeights[i];
      }
    });
    // After all rows are created, move the menu container down
    if (menuKey === 'devMenu') {
      this.menuContainer.y = this.scene.scale.height / 2 + 64;
    } else {
      this.menuContainer.y = this.scene.scale.height / 2;
    }
    if (instant || !prevMenuContainer) {
      this.updateMenuPosition();
      return;
    }
    this.orbitCrossfadeTransition(prevMenuContainer, this.menuContainer, menu, totalHeight, itemHeights);
  }

  updateMenuPosition() {
    if (this.menuContainer) {
      this.menuContainer.x = this.scene.scale.width / 2;
      if (this.currentMenu === 'devMenu') {
        this.menuContainer.y = this.scene.scale.height / 2 + 64;
      } else {
        this.menuContainer.y = this.scene.scale.height / 2;
      }
    }
  }

  clearMenu() {
    if (this.passwordCursorTimer) {
      this.passwordCursorTimer.remove();
      this.passwordCursorTimer = null;
    }
    this.scene.input.keyboard.off('keydown');
    if (this.menuContainer) {
      this.menuContainer.destroy();
      this.menuContainer = null;
    }
    this.menuTexts = [];
  }

  transitionTo(menuKey) {
    if (this.transitioning) return;
    this.menuStack.push(this.currentMenu);
    this.createMenu(menuKey);
  }

  transitionBack() {
    if (this.transitioning) return;
    if (this.menuStack.length > 0) {
      const prev = this.menuStack.pop();
      this.createMenu(prev);
    }
  }

  closeMenu() {
    if (this.transitioning) return;
    this.clearMenu();
    if (this.scene.closeMenuAnimation) this.scene.closeMenuAnimation();
  }

  leaveGroup() {
    if (!this.inGroup) return;
    if (this.scene && this.scene.socket) {
      this.scene.socket.emit('LEAVE_GROUP');
    }
    this.transitionBack();
  }

  logout() {
    window.location.reload();
  }

  setMusicVolume(v) {
    this.musicVolume = Phaser.Math.Clamp(v, 0, 1);
    // TODO: Integrate with actual music system
  }

  setSfxVolume(v) {
    this.sfxVolume = Phaser.Math.Clamp(v, 0, 1);
    // TODO: Integrate with actual sfx system
  }

  handleDevPassword(password) {
    if (this.scene && this.scene.socket) {
      this.scene.socket.emit('DEV_DEBUG_AUTH', password);
      this.scene.socket.once('DEV_DEBUG_AUTH_RESULT', (result) => {
        if (result.success) {
          this.devUnlocked = true;
          this.createMenu('devMenu');
        } else {
          if (this.scene && this.scene.player && this.scene.combatVisuals) {
            this.scene.combatVisuals.playPlayerDamageEffect();
          }
          this.transitionBack();
        }
      });
    }
  }

  orbitCrossfadeTransition(oldContainer, newContainer, newMenu, totalHeight, itemHeights) {
    this.transitioning = true;
    const duration = 350;
    const orbitRadius = 60;
    const orbitSpeed = Math.PI * 2;
    // Animate old menu out
    if (oldContainer) {
      let completed = 0;
      const total = oldContainer.list.length;
      oldContainer.list.forEach((obj, i) => {
        const phase = (i / total) * Math.PI * 2;
        this.scene.tweens.add({
          targets: obj,
          alpha: 0,
          duration,
          onUpdate: (tween, target) => {
            const progress = tween.progress;
            const angle = phase + orbitSpeed * progress;
            target.x = Math.cos(angle) * orbitRadius;
            target.y = Math.sin(angle) * orbitRadius;
          },
          onComplete: () => {
            obj.destroy();
            completed++;
            if (completed === total) {
              oldContainer.destroy();
            }
          }
        });
      });
    }
    // Animate new menu in
    let newCompleted = 0;
    const newTotal = newContainer.list.length;
    newContainer.list.forEach((obj, i) => {
      const phase = (i / newTotal) * Math.PI * 2;
      obj.x = Math.cos(phase + orbitSpeed * 0.5) * orbitRadius;
      obj.y = Math.sin(phase + orbitSpeed * 0.5) * orbitRadius;
      obj.setAlpha(0);
      this.scene.tweens.add({
        targets: obj,
        alpha: 1,
        duration,
        onUpdate: (tween, target) => {
          const progress = 1 - tween.progress;
          const angle = phase + orbitSpeed * progress;
          target.x = Math.cos(angle) * orbitRadius;
          target.y = Math.sin(angle) * orbitRadius;
        },
        onComplete: () => {
          obj.x = 0;
          obj.y = -totalHeight / 2 + itemHeights[0] / 2 + i * 54;
          obj.setAlpha(1);
          newCompleted++;
          if (newCompleted === newTotal) {
            this.transitioning = false;
            this.updateMenuPosition();
          }
        }
      });
    });
  }
} 