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
        { text: 'DEV Debug Options Unlocked!', small: true },
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