export default class HintManager {
  constructor(scene) {
    this.scene = scene;
    this.socket = scene.socket;

    this.socket.on("SHOW_HINT", ({ text }) => {
      this.showHint(text);
    });
  }

  showHint(text) {
    const hint = this.scene.add.text(
      this.scene.game.config.width / 2,
      this.scene.game.config.height * 0.8,
      text,
      {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setDepth(10);
    setTimeout(() => hint.destroy(), 3000);
  }
}
