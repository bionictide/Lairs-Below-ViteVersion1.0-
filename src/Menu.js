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
    this.pendingClose = false;
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
        { text: 'Music Volume', action: () => this.musicVolume() },
        { text: 'Sound Effects', action: () => this.soundEffects() },
        { text: 'Back', action: () => this.transitionBack() },
      ],
      dev: [
        { text: 'Enter Password:', input: true },
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
    const centerX = this.scene.game.config.width / 2;
    const centerY = this.scene.game.config.height / 2;
    const spacing = 54;
    let startY = centerY - (menu.length * spacing) / 2 + spacing / 2;
    // Create new menu texts, but set alpha to 0 for transition
    menu.forEach((item, i) => {
      if (item.input) {
        const input = this.scene.add.dom(centerX, startY + i * spacing).createFromHTML('<input type="password" style="font-size:28px;text-align:center;width:260px;">');
        input.setDepth(2000);
        input.addListener('keyup');
        input.on('keyup', (event) => {
          if (event.key === 'Enter') {
            this.handleDevPassword(input.node.value);
          }
        });
        input.setAlpha(instant ? 1 : 0);
        this.menuTexts.push(input);
      } else {
        const style = {
          fontFamily: 'Arial',
          fontSize: item.small ? '22px' : '36px',
          color: '#000',
          align: 'center',
        };
        const txt = this.scene.add.text(centerX, startY + i * spacing, item.text, style)
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
      }
    });
    if (instant) {
      if (prevMenuTexts) prevMenuTexts.forEach(obj => obj.destroy());
      this.menuTexts.forEach(obj => obj.setAlpha(1));
      return;
    }
    this.orbitCrossfadeTransition(prevMenuTexts, this.menuTexts, () => {
      // After transition, ensure only new menu is visible
      this.menuTexts.forEach(obj => obj.setAlpha(1));
      if (this.pendingClose) {
        this.pendingClose = false;
        if (this.scene.closeMenuAnimation) this.scene.closeMenuAnimation();
      }
    });
  }

  clearMenu() {
    this.menuTexts.forEach(obj => obj.destroy());
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
    this.pendingClose = true;
    this.clearMenu();
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

  musicVolume() {
    alert('Music Volume option clicked!');
  }

  soundEffects() {
    alert('Sound Effects option clicked!');
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

  // Orbit crossfade: animate from current position into orbit, then from orbit to new resting position
  orbitCrossfadeTransition(oldObjs, newObjs, onComplete) {
    this.transitioning = true;
    const duration = 1000;
    const centerX = this.scene.game.config.width / 2;
    const centerY = this.scene.game.config.height / 2;
    const spacing = 54;
    const orbitRadius = 60;
    const orbitSpeed = Math.PI * 2; // One full circle
    // Assign each line a unique phase offset
    const oldPhases = oldObjs ? oldObjs.map((_, i) => (i / (oldObjs.length || 1)) * Math.PI * 2) : [];
    const newPhases = newObjs.map((_, i) => (i / (newObjs.length || 1)) * Math.PI * 2);
    let completedOld = 0;
    let completedNew = 0;
    const totalOld = oldObjs ? oldObjs.length : 0;
    const totalNew = newObjs.length;
    // Animate old menu out: from current position to orbit, then orbit and fade out
    if (oldObjs && oldObjs.length > 0) {
      oldObjs.forEach((obj, i) => {
        const phase = oldPhases[i];
        const startX = obj.x;
        const startY = obj.y;
        this.scene.tweens.addCounter({
          from: 0, to: 1, duration: duration / 2, ease: 'Cubic.easeIn',
          onUpdate: tween => {
            const t = tween.getValue();
            obj.x = Phaser.Math.Interpolation.Linear([startX, centerX + Math.cos(phase) * orbitRadius], t);
            obj.y = Phaser.Math.Interpolation.Linear([startY, centerY + Math.sin(phase) * orbitRadius], t);
          },
          onComplete: () => {
            this.scene.tweens.add({
              targets: obj,
              alpha: 0,
              duration: duration / 2,
              onUpdate: (tween, target) => {
                const progress = tween.progress;
                const angle = phase + orbitSpeed * progress;
                target.x = centerX + Math.cos(angle) * orbitRadius;
                target.y = centerY + Math.sin(angle) * orbitRadius;
              },
              onComplete: () => {
                obj.destroy();
                completedOld++;
                if (completedOld === totalOld && completedNew === totalNew) {
                  this.transitioning = false;
                  if (onComplete) onComplete();
                }
              }
            });
          }
        });
      });
    } else {
      completedOld = totalOld;
    }
    // Animate new menu in: from orbit to resting position, fading in
    newObjs.forEach((obj, i) => {
      const phase = newPhases[i];
      const targetX = centerX;
      const targetY = centerY + (i - (newObjs.length - 1) / 2) * spacing;
      obj.x = centerX + Math.cos(phase) * orbitRadius;
      obj.y = centerY + Math.sin(phase) * orbitRadius;
      obj.setAlpha(0);
      this.scene.tweens.add({
        targets: obj,
        alpha: 1,
        duration: duration / 2,
        delay: duration / 2,
        onUpdate: (tween, target) => {
          // No-op, handled by position tween
        }
      });
      this.scene.tweens.addCounter({
        from: 0, to: 1, duration: duration / 2, delay: duration / 2, ease: 'Cubic.easeOut',
        onUpdate: tween => {
          const t = tween.getValue();
          obj.x = Phaser.Math.Interpolation.Linear([centerX + Math.cos(phase) * orbitRadius, targetX], t);
          obj.y = Phaser.Math.Interpolation.Linear([centerY + Math.sin(phase) * orbitRadius, targetY], t);
        },
        onComplete: () => {
          obj.x = targetX;
          obj.y = targetY;
          obj.setAlpha(1);
          completedNew++;
          if (completedOld === totalOld && completedNew === totalNew) {
            this.transitioning = false;
            if (onComplete) onComplete();
          }
        }
      });
    });
  }
} 