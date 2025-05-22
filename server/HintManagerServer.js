export default class HintManagerServer {
  constructor(io) {
    this.io = io;
  }

  sendHintToPlayer(socket, text) {
    socket.emit("SHOW_HINT", { text });
  }

  broadcastHintToRoom(roomId, text) {
    this.io.to(roomId).emit("SHOW_HINT", { text });
  }
}
