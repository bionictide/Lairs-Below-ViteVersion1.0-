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
    const verticalOffset = 32;
    this.menuContainer.x = this.scene.scale.width / 2;
    this.menuContainer.y = this.scene.scale.height / 2 + verticalOffset;
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
    menu.forEach((item, i) => {
      if (item.slider) {
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
    if (menuKey === 'devMenu') {
      // Use the same rendering logic as other menus, but with custom row types
      let totalHeight = 0;
      let itemHeights = [];
      const menu = this.getMenus()[menuKey];
      menu.forEach(item => {
        itemHeights.push(54);
        totalHeight += 54;
      });
      let currentY = -totalHeight / 2 + itemHeights[0] / 2;
      menu.forEach((item, i) => {
        if (item.toggle) {
          // Render label and switch to the right
          const label = this.scene.add.text(0, currentY, item.text, {
            fontFamily: 'Arial', fontSize: '32px', color: '#000', align: 'left', fixedWidth: 220
          }).setOrigin(0.5, 0.5).setDepth(2000);
          const isOn = this.debugState[item.toggle];
          const color = isOn ? 0x00cc44 : 0xcc2222;
          const box = this.scene.add.rectangle(120, currentY, 32, 32, color)
            .setStrokeStyle(2, 0x222222)
            .setInteractive({ useHandCursor: true })
            .setDepth(2000);
          box.on('pointerdown', () => {
            this.debugState[item.toggle] = !this.debugState[item.toggle];
            this.scene.socket.emit('DEV_DEBUG_ACTION', { action: 'toggle', key: item.toggle, value: this.debugState[item.toggle] });
            this.createMenu('devMenu', true);
          });
          this.menuContainer.add([label, box]);
          this.menuTexts.push(label, box);
          // Minimap checkboxes (inline, under minimap row)
          if (item.toggle === 'minimap' && this.debugState.minimap) {
            const checks = ['players', 'gems', 'treasure', 'puzzles'];
            checks.forEach((ck, j) => {
              const checked = this.debugState.minimapChecks[ck];
              const cbox = this.scene.add.rectangle(40 + j * 60, currentY + 32, 20, 20, checked ? 0x00cc44 : 0xcc2222)
                .setStrokeStyle(1, 0x222222)
                .setInteractive({ useHandCursor: true })
                .setDepth(2000);
              cbox.on('pointerdown', () => {
                this.debugState.minimapChecks[ck] = !this.debugState.minimapChecks[ck];
                this.scene.socket.emit('DEV_DEBUG_ACTION', { action: 'minimapCheck', key: ck, value: this.debugState.minimapChecks[ck] });
                this.createMenu('devMenu', true);
              });
              const cLabel = this.scene.add.text(60 + j * 60, currentY + 32, ck.charAt(0).toUpperCase() + ck.slice(1), {
                fontFamily: 'Arial', fontSize: '16px', color: '#000', align: 'left',
              }).setOrigin(0, 0.5).setDepth(2000);
              this.menuContainer.add([cbox, cLabel]);
              this.menuTexts.push(cbox, cLabel);
            });
          }
          currentY += itemHeights[i + 1] ? (itemHeights[i] + itemHeights[i + 1]) / 2 : itemHeights[i];
        } else if (item.selector === 'item') {
          // Spawn Item selector row
          const itemKeys = Object.keys((window.itemData || this.scene.bagManager?.constructor?.itemData) || {});
          const itemData = window.itemData || this.scene.bagManager?.constructor?.itemData || {};
          const items = itemKeys.length ? itemKeys : ['Potion1(red)', 'sword1', 'helm1', 'Emerald', 'BlueApatite', 'Amethyst', 'RawRuby', 'Key1'];
          const itemIdx = this.debugState.itemIndex;
          const itemKey = items[itemIdx] || items[0];
          const itemObj = itemData[itemKey] || { name: itemKey, asset: itemKey };
          const leftArrow = this.scene.add.text(-90, currentY, '<-', { fontSize: '32px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          leftArrow.on('pointerdown', () => {
            this.debugState.itemIndex = (itemIdx - 1 + items.length) % items.length;
            this.createMenu('devMenu', true);
          });
          const rightArrow = this.scene.add.text(90, currentY, '->', { fontSize: '32px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          rightArrow.on('pointerdown', () => {
            this.debugState.itemIndex = (itemIdx + 1) % items.length;
            this.createMenu('devMenu', true);
          });
          const itemSprite = this.scene.add.text(0, currentY, itemObj.name, { fontSize: '28px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          itemSprite.on('pointerdown', () => {
            this.scene.socket.emit('DEV_DEBUG_ACTION', { action: 'spawn_item', itemKey });
          });
          this.menuContainer.add([leftArrow, itemSprite, rightArrow]);
          this.menuTexts.push(leftArrow, itemSprite, rightArrow);
          currentY += itemHeights[i + 1] ? (itemHeights[i] + itemHeights[i + 1]) / 2 : itemHeights[i];
        } else if (item.selector === 'player') {
          // Kick Player selector row
          const players = (this.scene.currentTargetList && this.scene.currentTargetList.length) ? this.scene.currentTargetList : [{ id: 'p1', name: 'Player1' }, { id: 'p2', name: 'Player2' }];
          const playerIdx = this.debugState.playerIndex;
          const player = players[playerIdx % players.length];
          const leftP = this.scene.add.text(-90, currentY, '<-', { fontSize: '32px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          leftP.on('pointerdown', () => {
            this.debugState.playerIndex = (playerIdx - 1 + players.length) % players.length;
            this.createMenu('devMenu', true);
          });
          const rightP = this.scene.add.text(90, currentY, '->', { fontSize: '32px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          rightP.on('pointerdown', () => {
            this.debugState.playerIndex = (playerIdx + 1) % players.length;
            this.createMenu('devMenu', true);
          });
          const playerBox = this.scene.add.text(0, currentY, player.name, { fontSize: '28px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          playerBox.on('pointerdown', () => {
            this.scene.socket.emit('DEV_DEBUG_ACTION', { action: 'kick_player', playerId: player.id });
          });
          this.menuContainer.add([leftP, playerBox, rightP]);
          this.menuTexts.push(leftP, playerBox, rightP);
          currentY += itemHeights[i + 1] ? (itemHeights[i] + itemHeights[i + 1]) / 2 : itemHeights[i];
        } else if (item.selector === 'encounter') {
          // Force Encounter selector row (3 slots)
          const charTypes = (window.getAllCharacterTypeKeys && window.getAllCharacterTypeKeys()) || ['Dwarf', 'Gnome', 'Elvaan', 'Bat', 'Baba', 'Minotaur', 'Troll', 'None'];
          const slotLabels = ['Leader', 'Member 1', 'Member 2'];
          for (let s = 0; s < 3; s++) {
            const slotIdx = this.debugState.encounterSlots[s] || 0;
            const leftE = this.scene.add.text(-90, currentY, '<-', { fontSize: '32px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            leftE.on('pointerdown', () => {
              this.debugState.encounterSlots[s] = (slotIdx - 1 + charTypes.length) % charTypes.length;
              this.createMenu('devMenu', true);
            });
            const rightE = this.scene.add.text(90, currentY, '->', { fontSize: '32px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            rightE.on('pointerdown', () => {
              this.debugState.encounterSlots[s] = (slotIdx + 1) % charTypes.length;
              this.createMenu('devMenu', true);
            });
            const type = charTypes[slotIdx] || 'None';
            const slotBox = this.scene.add.text(0, currentY, `${slotLabels[s]}: ${type}`, { fontSize: '24px', color: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            slotBox.on('pointerdown', () => {
              if (type !== 'None') {
                const slots = this.debugState.encounterSlots.map(idx => charTypes[idx]);
                this.scene.socket.emit('DEV_DEBUG_ACTION', { action: 'force_encounter', slots });
              }
            });
            this.menuContainer.add([leftE, slotBox, rightE]);
            this.menuTexts.push(leftE, slotBox, rightE);
            currentY += 40;
          }
          currentY += 10;
        } else if (item.action) {
          // Back button or any other action
          const btn = this.scene.add.text(0, currentY, item.text, {
            fontFamily: 'Arial', fontSize: '32px', color: '#000', align: 'center', backgroundColor: '#eee', padding: { x: 16, y: 8 }
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          btn.on('pointerdown', () => item.action());
          this.menuContainer.add(btn);
          this.menuTexts.push(btn);
          currentY += itemHeights[i + 1] ? (itemHeights[i] + itemHeights[i + 1]) / 2 : itemHeights[i];
        }
      });
      this.updateMenuPosition();
      return;
    }
    if (instant || !prevMenuContainer) {
      this.updateMenuPosition();
      return;
    }
    this.orbitCrossfadeTransition(prevMenuContainer, this.menuContainer, menu, totalHeight, itemHeights);
  }

  updateMenuPosition() {
    // Add vertical offset for better centering
    const verticalOffset = 32;
    if (this.menuContainer) {
      this.menuContainer.x = this.scene.scale.width / 2;
      this.menuContainer.y = this.scene.scale.height / 2 + verticalOffset;
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