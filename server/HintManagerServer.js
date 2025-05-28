export default class HintManagerServer {
  constructor(io) {
    this.io = io;
    this.hints = new Map(); // roomId: { text, facing }
  }

  /**
   * Initialize a hint for a room, with a specific wall/facing direction.
   * @param {string} roomId
   * @param {string} text
   * @param {string} facing - 'north', 'east', 'south', 'west'
   */
  initializeHint(roomId, text, facing) {
    this.hints.set(roomId, { text, facing });
  }

  /**
   * Handle player intent to face a direction in a room.
   * @param {object} socket - Player's socket
   * @param {string} roomId
   * @param {string} facing - Player's current facing direction
   */
  handlePlayerFacing(socket, roomId, facing) {
    const hint = this.hints.get(roomId);
    if (hint && hint.facing === facing) {
      this.sendHintToPlayer(socket, hint.text);
    }
  }

  sendHintToPlayer(socket, text) {
    socket.emit("SHOW_HINT", { text });
  }

  broadcastHintToRoom(roomId, text) {
    this.io.to(roomId).emit("SHOW_HINT", { text });
  }

  clearHints() {
    this.hints.clear();
  }

  sendClearHintToPlayer(socket) {
    socket.emit("CLEAR_HINT");
  }
}
