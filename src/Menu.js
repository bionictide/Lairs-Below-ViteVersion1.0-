import Phaser from 'phaser';

export default class Menu {
  constructor(scene, options) {
    this.scene = scene;
    this.options = options;
    this.menuTexts = [];
    this.currentMenu = 'main';
    this.menuStack = [];
    this.devUnlocked = false;
    this.inGroup = false; // Set externally as needed
    this.transitioning = false;
    this.musicVolume = 1;
    this.sfxVolume = 1;
    this.passwordInput = '';
    this.passwordCursor = null;
    this.passwordCursorBlink = true;
    this.passwordCursorTimer = null;
    this.createMenu('main', true);
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
    const prevMenuTexts = this.menuTexts;
    this.menuTexts = [];
    this.currentMenu = menuKey;
    const menu = this.getMenus()[menuKey];
    if (!menu) return;
    // Calculate total menu height for perfect centering
    let totalHeight = 0;
    menu.forEach(item => {
      if (item.slider) {
        totalHeight += 54 + 24; // extra space for slider
      } else if (item.password) {
        totalHeight += 54 + 40; // extra space for password input
      } else {
        totalHeight += 54;
      }
    });
    const centerX = this.scene.game.config.width / 2;
    const centerY = this.scene.game.config.height / 2;
    let startY = centerY - totalHeight / 2 + 27; // 27 = 54/2 for first item
    let currentY = startY;
    menu.forEach((item, i) => {
      if (item.slider) {
        // Phaser slider bar
        const label = this.scene.add.text(centerX, currentY, item.text, {
          fontFamily: 'Arial', fontSize: '36px', color: '#000', align: 'center',
        }).setOrigin(0.5).setDepth(2000);
        const barWidth = 220;
        const barY = currentY + 24;
        const bar = this.scene.add.rectangle(centerX, barY, barWidth, 8, 0x888888).setDepth(2000);
        const ballRadius = 9;
        const ball = this.scene.add.circle(centerX - barWidth / 2 + barWidth * item.value(), barY, ballRadius, 0x222222).setDepth(2001).setInteractive({ draggable: true });
        ball.input.draggable = true;
        ball.on('drag', (pointer, dragX) => {
          let clampedX = Phaser.Math.Clamp(dragX, centerX - barWidth / 2, centerX + barWidth / 2);
          ball.x = clampedX;
          let value = (clampedX - (centerX - barWidth / 2)) / barWidth;
          item.onChange(value);
        });
        this.menuTexts.push(label, bar, ball);
        currentY += 54 + 24;
      } else if (item.password) {
        // Phaser password input
        this.passwordInput = '';
        const prompt = this.scene.add.text(centerX, currentY, item.text, {
          fontFamily: 'Arial', fontSize: '36px', color: '#000', align: 'center',
        }).setOrigin(0.5).setDepth(2000);
        const inputY = currentY + 40;
        this.passwordText = this.scene.add.text(centerX, inputY, '', {
          fontFamily: 'Arial', fontSize: '32px', color: '#000', align: 'center', backgroundColor: 'rgba(255,255,255,0)' })
          .setOrigin(0.5).setDepth(2000);
        this.passwordCursor = this.scene.add.text(centerX, inputY, '|', {
          fontFamily: 'Arial', fontSize: '32px', color: '#000', align: 'center', backgroundColor: 'rgba(255,255,255,0)' })
          .setOrigin(0.5).setDepth(2000);
        this.menuTexts.push(prompt, this.passwordText, this.passwordCursor);
        this.scene.input.keyboard.off('keydown');
        this.scene.input.keyboard.on('keydown', (event) => {
          if (event.key === 'Backspace') {
            this.passwordInput = this.passwordInput.slice(0, -1);
          } else if (event.key === 'Enter') {
            this.handleDevPassword(this.passwordInput);
          } else if (event.key.length === 1) {
            this.passwordInput += event.key;
          }
          this.passwordText.setText('*'.repeat(this.passwordInput.length));
          this.passwordCursor.x = this.passwordText.x + this.passwordText.displayWidth / 2 + 8;
        });
        if (this.passwordCursorTimer) this.passwordCursorTimer.remove();
        this.passwordCursorBlink = true;
        this.passwordCursorTimer = this.scene.time.addEvent({
          delay: 400,
          loop: true,
          callback: () => {
            this.passwordCursorBlink = !this.passwordCursorBlink;
            this.passwordCursor.setAlpha(this.passwordCursorBlink ? 1 : 0);
          }
        });
        currentY += 54 + 40;
      } else {
        const style = {
          fontFamily: 'Arial',
          fontSize: item.small ? '22px' : '36px',
          color: '#000',
          align: 'center',
        };
        const txt = this.scene.add.text(centerX, currentY, item.text, style)
          .setOrigin(0.5)
          .setDepth(2000)
          .setInteractive({ useHandCursor: !item.disabled && !!item.action });
        if (item.disabled) {
          txt.setAlpha(instant ? 0.4 : 0);
        } else {
          txt.setAlpha(instant ? 1 : 0);
          if (item.action) {
            txt.on('pointerdown', () => item.action());
          }
        }
        this.menuTexts.push(txt);
        currentY += 54;
      }
    });
    if (instant) {
      if (prevMenuTexts) prevMenuTexts.forEach(obj => obj.destroy());
      this.menuTexts.forEach(obj => obj.setAlpha(1));
      return;
    }
    this.orbitCrossfadeTransition(prevMenuTexts, this.menuTexts, menu, centerX, centerY, startY, 54);
  }

  clearMenu() {
    if (this.passwordCursorTimer) this.passwordCursorTimer.remove();
    this.scene.input.keyboard.off('keydown');
    this.menuTexts.forEach(obj => obj.destroy());
    this.menuTexts = [];
  }

  transitionTo(menuKey) {
    this.menuStack.push(this.currentMenu);
    this.createMenu(menuKey);
  }

  transitionBack() {
    if (this.menuStack.length > 0) {
      const prev = this.menuStack.pop();
      this.createMenu(prev);
    }
  }

  closeMenu() {
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

  // Orbit crossfade: old menu orbits and fades out, new menu orbits and fades in, sharing the same path
  orbitCrossfadeTransition(oldObjs, newObjs, newMenu, centerX, centerY, startY, spacing) {
    this.transitioning = true;
    const duration = 350; // Shorter fade time
    const orbitRadius = 60;
    const orbitSpeed = Math.PI * 2; // One full circle
    // Assign each line a unique phase offset
    const oldPhases = oldObjs ? oldObjs.map((obj, i) => {
      // Start from actual position
      if (obj && obj.y !== undefined) {
        const dy = obj.y - centerX;
        return Math.atan2(obj.y - (centerX), obj.x - centerX);
      }
      return (i / (oldObjs.length || 1)) * Math.PI * 2;
    }) : [];
    const newPhases = newObjs.map((_, i) => (i / (newObjs.length || 1)) * Math.PI * 2);
    // Animate old menu out
    if (oldObjs && oldObjs.length > 0) {
      oldObjs.forEach((obj, i) => {
        const phase = oldPhases[i];
        this.scene.tweens.add({
          targets: obj,
          alpha: 0,
          duration,
          onUpdate: (tween, target) => {
            const progress = tween.progress;
            const angle = phase + orbitSpeed * progress;
            target.x = centerX + Math.cos(angle) * orbitRadius;
            target.y = centerY + Math.sin(angle) * orbitRadius;
          },
          onComplete: () => {
            obj.destroy();
          }
        });
      });
    }
    // Animate new menu in
    newObjs.forEach((obj, i) => {
      const phase = newPhases[i];
      // Start mid-spiral
      obj.x = centerX + Math.cos(phase + orbitSpeed * 0.5) * orbitRadius;
      obj.y = centerY + Math.sin(phase + orbitSpeed * 0.5) * orbitRadius;
      obj.setAlpha(0);
      this.scene.tweens.add({
        targets: obj,
        alpha: 1,
        duration,
        onUpdate: (tween, target) => {
          const progress = 1 - tween.progress;
          const angle = phase + orbitSpeed * progress;
          target.x = centerX + Math.cos(angle) * orbitRadius;
          target.y = centerY + Math.sin(angle) * orbitRadius;
        },
        onComplete: () => {
          // At the end, snap to center
          if (newMenu && newMenu[i] && (newMenu[i].slider || newMenu[i].password)) {
            // For sliders/password, keep their y offset
            obj.x = centerX;
            obj.y = startY + i * spacing + (newMenu[i].slider ? 18 : (newMenu[i].password ? 40 : 0));
          } else {
            obj.x = centerX;
            obj.y = startY + i * spacing;
          }
          obj.setAlpha(1);
          if (i === newObjs.length - 1) {
            this.transitioning = false;
          }
        }
      });
    });
  }
} 