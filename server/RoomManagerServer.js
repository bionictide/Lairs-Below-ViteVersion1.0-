// RoomManagerServer.js
// Server-authoritative room and room state management.

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> room object
  }

  addRoom(room) {
    if (!room.id) throw new Error('Room must have an id');
    this.rooms.set(room.id, room);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  removeRoom(roomId) {
    this.rooms.delete(roomId);
  }

  addPlayerToRoom(roomId, playerId) {
    const room = this.getRoom(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);
    if (!room.players) room.players = new Set();
    room.players.add(playerId);
  }

  removePlayerFromRoom(roomId, playerId) {
    const room = this.getRoom(roomId);
    if (room && room.players) {
      room.players.delete(playerId);
    }
  }

  getPlayersInRoom(roomId) {
    const room = this.getRoom(roomId);
    return room && room.players ? Array.from(room.players) : [];
  }

  setRoomState(roomId, state) {
    const room = this.getRoom(roomId);
    if (room) {
      room.state = state;
    }
  }

  getRoomState(roomId) {
    const room = this.getRoom(roomId);
    return room ? room.state : null;
  }

  // Utility: Find room by property
  findRoomBy(prop, value) {
    for (const room of this.rooms.values()) {
      if (room[prop] === value) return room;
    }
    return null;
  }
}

export default new RoomManager();

