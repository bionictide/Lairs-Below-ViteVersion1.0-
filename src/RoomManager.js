export default class RoomManager {
  constructor(scene) {
    this.scene = scene;
    this.rooms = new Map(); // purely for reference/render; logic lives on server
  }

  updateRooms(roomList) {
    for (const room of roomList) {
      this.rooms.set(room.id, room);
    }
  }

  getRoom(id) {
    return this.rooms.get(id);
  }
}
