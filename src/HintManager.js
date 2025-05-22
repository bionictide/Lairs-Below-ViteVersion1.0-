export default class HintManager {
  constructor(scene) {
    this.scene = scene;
    this.socket = scene.socket;

    this.socket.on("SHOW_HINT", ({ text }) => {
      this.showHint(text);
    });
  }

  showHint(text) {
    const hint = this.scene.add.text(10, 10, text, {
      font: "16px Arial",
      fill: "#ffffff",
      backgroundColor: "#000000"
    });
    setTimeout(() => hint.destroy(), 3000);
  }
}
