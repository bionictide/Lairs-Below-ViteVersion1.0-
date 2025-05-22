export default class RoomManagerServer {
  constructor() {
    this.rooms = new Map();
  }

  addRoom(roomId, roomData) {
    this.rooms.set(roomId, roomData);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  hasRoom(roomId) {
    return this.rooms.has(roomId);
  }

  updateRooms(roomList) {
    for (const room of roomList) {
      this.rooms.set(room.id, room);
    }
  }

  getAllRooms() {
    return Array.from(this.rooms.values());
  }
}
