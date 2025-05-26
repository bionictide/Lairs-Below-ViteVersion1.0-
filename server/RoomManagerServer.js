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

  // Asset keys and mappings
  roomAssets = {
    'none': 'Assets/None.png',
    'left': 'Assets/Left.png',
    'right': 'Assets/Right.png',
    'forward': 'Assets/Forward.png',
    'left-forward': 'Assets/LeftForward.png',
    'forward-right': 'Assets/ForwardRight.png',
    'left-right': 'Assets/LeftRight.png',
    'left-forward-right': 'Assets/LeftForwardRight.png',
    'right-barrel': 'Assets/Right2(barrel).png',
    'forward-right2': 'Assets/ForwardRight2.png'
  };
  availableAssetKeys = Object.keys(this.roomAssets);
  directionMappings = {
    north: { left: 'west', forward: 'north', right: 'east' },
    east: { left: 'north', forward: 'east', right: 'south' },
    south: { left: 'east', forward: 'south', right: 'west' },
    west: { left: 'south', forward: 'west', right: 'north' }
  };
  inverseDirectionMappings = {
    north: { west: 'left', north: 'forward', east: 'right' },
    east: { north: 'left', east: 'forward', south: 'right' },
    south: { east: 'left', south: 'forward', west: 'right' },
    west: { south: 'left', west: 'forward', north: 'right' }
  };

  getRoomImageKey(room, facing, dungeonService) {
    const visibleDoors = this.getVisibleDoors(room, facing, dungeonService);
    const key = visibleDoors.length > 0 ? visibleDoors.sort().join('-') : 'none';
    return this.findBestMatchingRoomAsset(key);
  }

  getVisibleDoors(room, facing, dungeonService) {
    const cardinalDirections = new Set();
    const connectedRooms = room.doors.map(id => dungeonService.getRoomById(id));
    connectedRooms.forEach(target => {
      if (!target) return;
      const cardinalDir = this.getCardinalDirection(room, target);
      if (cardinalDir) cardinalDirections.add(cardinalDir);
    });
    // Convert cardinal directions to visual directions based on facing
    const visualDoors = [];
    cardinalDirections.forEach(cardinalDir => {
      const visualDir = this.inverseDirectionMappings[facing]?.[cardinalDir];
      if (visualDir) visualDoors.push(visualDir);
    });
    // Sort for consistent key generation
    const doorOrder = ['left', 'forward', 'right'];
    visualDoors.sort((a, b) => doorOrder.indexOf(a) - doorOrder.indexOf(b));
    return visualDoors;
  }

  getCardinalDirection(room, target) {
    const dx = target.x - room.x;
    const dy = target.y - room.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'east' : 'west';
    } else if (Math.abs(dy) > Math.abs(dx)) {
      return dy > 0 ? 'south' : 'north';
    }
    return null;
  }

  findBestMatchingRoomAsset(key) {
    const doorOrder = ['left', 'forward', 'right'];
    const normalizedKey = key.split('-').sort((a, b) => doorOrder.indexOf(a) - doorOrder.indexOf(b)).join('-');
    const alternates = {
      'forward-right': ['forward-right2'],
      'right': ['right-barrel']
    };
    if (this.availableAssetKeys.includes(normalizedKey)) return normalizedKey;
    if (alternates[normalizedKey]) {
      const altKey = alternates[normalizedKey][0];
      if (this.availableAssetKeys.includes(altKey)) return altKey;
    }
    return 'none';
  }
}

export default new RoomManager();

