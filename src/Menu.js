import Phaser from 'phaser';

export default class Menu {
  constructor(scene, options) {
    this.scene = scene;
    this.options = options;
    this.menuTexts = [];
    this.menuSliders = [];
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
        { text: 'Music', slider: 'music' },
        { text: 'Sound', slider: 'sound' },
        { text: 'Back', action: () => this.transitionBack() },
      ],
      dev: [
        { text: 'Enter Password:', input: true },
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
    const prevMenuSliders = this.menuSliders;
    this.menuTexts = [];
    this.menuSliders = [];
    this.currentMenu = menuKey;
    const menu = this.getMenus()[menuKey];
    if (!menu) return;
    const centerX = this.scene.game.config.width / 2;
    const centerY = this.scene.game.config.height / 2;
    const spacing = 54;
    let startY = centerY - (menu.length * spacing) / 2 + spacing / 2;
    menu.forEach((item, i) => {
      if (item.input) {
        // Always show the input field for dev menu
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
      } else if (item.slider) {
        // Label
        const label = this.scene.add.text(centerX, startY + i * spacing, item.text, {
          fontFamily: 'Arial', fontSize: '28px', color: '#000', align: 'center',
        }).setOrigin(0.5).setDepth(2000).setAlpha(instant ? 1 : 0);
        this.menuTexts.push(label);
        // Slider
        const sliderY = startY + i * spacing + 28;
        const slider = this.createSlider(centerX, sliderY, item.slider);
        this.menuSliders.push(slider);
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
      if (prevMenuSliders) prevMenuSliders.forEach(obj => obj.destroy());
      this.menuTexts.forEach(obj => obj.setAlpha(1));
      this.menuSliders.forEach(obj => obj.setAlpha(1));
      return;
    }
    // If closing from main menu, instantly destroy and collapse (restore old logic)
    if (this.pendingClose && this.currentMenu === 'main') {
      if (prevMenuTexts) prevMenuTexts.forEach(obj => obj.destroy());
      if (prevMenuSliders) prevMenuSliders.forEach(obj => obj.destroy());
      this.menuTexts.forEach(obj => obj.destroy());
      this.menuSliders.forEach(obj => obj.destroy());
      this.menuTexts = [];
      this.menuSliders = [];
      this.pendingClose = false;
      if (this.scene.closeMenuAnimation) this.scene.closeMenuAnimation();
      return;
    }
    this.orbitMorphTransition(prevMenuTexts, this.menuTexts, prevMenuSliders, this.menuSliders, () => {
      this.menuTexts.forEach(obj => obj.setAlpha(1));
      this.menuSliders.forEach(obj => obj.setAlpha(1));
      if (this.pendingClose) {
        this.pendingClose = false;
        if (this.scene.closeMenuAnimation) this.scene.closeMenuAnimation();
      }
    });
  }

  createSlider(x, y, key) {
    const value = this.getVolume(key);
    const slider = this.scene.add.dom(x, y).createFromHTML(`<input type="range" min="0" max="1" step="0.01" value="${value}" style="width: 220px;">`);
    slider.setDepth(2000);
    slider.addListener('input');
    slider.on('input', (event) => {
      this.setVolume(key, parseFloat(slider.node.value));
    });
    return slider;
  }

  getVolume(key) {
    const stored = localStorage.getItem(`menu_volume_${key}`);
    if (stored !== null) return parseFloat(stored);
    return 1;
  }

  setVolume(key, value) {
    localStorage.setItem(`menu_volume_${key}`, value);
    if (this.scene && this.scene.setVolume) this.scene.setVolume(key, value);
  }

  clearMenu() {
    this.menuTexts.forEach(obj => obj.destroy());
    this.menuTexts = [];
    this.menuSliders.forEach(obj => obj.destroy());
    this.menuSliders = [];
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
    this.createMenu('main');
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

  musicVolume() {}
  soundEffects() {}

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
        }
      });
    }
  }

  // Orbit morph: old menu lines spiral IN to center and fade out, new menu lines spiral OUT from center to rest and fade in
  orbitMorphTransition(oldObjs, newObjs, oldSliders, newSliders, onComplete) {
    this.transitioning = true;
    const duration = 750;
    const centerX = this.scene.game.config.width / 2;
    const centerY = this.scene.game.config.height / 2;
    const spacing = 54;
    const spiralRadius = 120; // Spiral out/in distance
    const spiralTurns = 1.5; // Number of spiral turns
    const oldPhases = oldObjs ? oldObjs.map((_, i) => (i / (oldObjs.length || 1)) * Math.PI * 2) : [];
    const newPhases = newObjs.map((_, i) => (i / (newObjs.length || 1)) * Math.PI * 2);
    let completedOld = 0;
    let completedNew = 0;
    const totalOld = oldObjs ? oldObjs.length : 0;
    const totalNew = newObjs.length;
    // Animate old menu out: spiral in to center, fade out
    if (oldObjs && oldObjs.length > 0) {
      oldObjs.forEach((obj, i) => {
        const phase = oldPhases[i];
        const startX = obj.x;
        const startY = obj.y;
        // Compute polar coordinates of start
        const dx = startX - centerX;
        const dy = startY - centerY;
        const startR = Math.sqrt(dx * dx + dy * dy);
        const startTheta = Math.atan2(dy, dx);
        this.scene.tweens.add({
          targets: obj,
          alpha: 0,
          duration,
          ease: 'Linear',
          onUpdate: (tween, target) => {
            const t = tween.progress;
            // True spiral in: radius decreases, angle increases
            const r = startR + (0 - startR) * t + spiralRadius * (1 - t);
            const theta = startTheta + spiralTurns * Math.PI * 2 * t;
            target.x = centerX + Math.cos(theta) * r;
            target.y = centerY + Math.sin(theta) * r;
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
      });
    } else {
      completedOld = totalOld;
    }
    // Animate old sliders out (just fade out and destroy)
    if (oldSliders && oldSliders.length > 0) {
      oldSliders.forEach((slider, i) => {
        this.scene.tweens.add({
          targets: slider,
          alpha: 0,
          duration: duration,
          ease: 'Linear',
          onComplete: () => slider.destroy()
        });
      });
    }
    // Animate new menu in: spiral out from center to rest, fade in
    newObjs.forEach((obj, i) => {
      const phase = newPhases[i];
      const targetX = centerX;
      const targetY = centerY + (i - (newObjs.length - 1) / 2) * spacing;
      // Compute polar coordinates of target
      const dx = targetX - centerX;
      const dy = targetY - centerY;
      const targetR = Math.sqrt(dx * dx + dy * dy);
      const targetTheta = Math.atan2(dy, dx);
      // Start at center, at spiral angle
      obj.x = centerX;
      obj.y = centerY;
      obj.setAlpha(0);
      this.scene.tweens.add({
        targets: obj,
        alpha: 1,
        duration,
        ease: 'Linear',
        onUpdate: (tween, target) => {
          const t = tween.progress;
          // True spiral out: radius increases, angle decreases
          const r = spiralRadius * (1 - t) + targetR * t;
          const theta = targetTheta - spiralTurns * Math.PI * 2 * (1 - t);
          target.x = centerX + Math.cos(theta) * r;
          target.y = centerY + Math.sin(theta) * r;
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
    // Animate new sliders in (just fade in)
    if (newSliders && newSliders.length > 0) {
      newSliders.forEach((slider, i) => {
        slider.setAlpha(0);
        this.scene.tweens.add({
          targets: slider,
          alpha: 1,
          duration: duration,
          ease: 'Linear',
        });
      });
    }
  }
} 