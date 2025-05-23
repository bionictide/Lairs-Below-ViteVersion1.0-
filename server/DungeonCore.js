import Phaser from 'phaser';

export class DungeonCore {
  constructor() {
    this.baseGridSize = 15;
    this.dungeonGrid = [];
    this.roomList = [];
    this.hubCount = 6;
    this.maxDeadEnds = 15;
    this.minRearrangeInterval = 5 * 60 * 1000;
    this.lastRearrangeTime = 0;
    this.playerCount = 0;
    this.roomCounts = {
      small: 100,
      medium: 150,
      large: 200
    };
  }

  generateDungeon(playerCount) {
    this.playerCount = playerCount;
    this.dungeonGrid = [];
    this.roomList = [];
    const targetRooms = this.getTargetRoomCount();
    this.initializeRooms(targetRooms);
    this.generateComplexDungeon();
    this.assignPlaceholders();
    this.finalConsistencyCheck();
    return {
      grid: this.dungeonGrid,
      rooms: this.roomList
    };
  }

  rearrangeDungeon(playerCount) {
    if (Date.now() - this.lastRearrangeTime < this.minRearrangeInterval) return false;
    this.playerCount = playerCount;
    this.dungeonGrid = [];
    this.roomList.forEach(room => {
      room.doors = [];
      room.visited = false;
      room.isHub = false;
      room.isDeadEnd = false;
    });
    const targetRooms = Math.min(this.getTargetRoomCount(), this.roomList.length);
    this.roomList = this.roomList.slice(0, targetRooms);
    this.repositionRooms();
    this.generateComplexDungeon();
    this.assignPlaceholders();
    this.finalConsistencyCheck();
    this.lastRearrangeTime = Date.now();
    return true;
  }

  getTargetRoomCount() {
    if (this.playerCount <= 5) return this.roomCounts.small;
    if (this.playerCount <= 10) return this.roomCounts.medium;
    return this.roomCounts.large;
  }

  initializeRooms(targetRooms) {
    const maxGridSize = Math.ceil(Math.sqrt(targetRooms)) + 2;
    for (let i = 0; i < targetRooms; i++) {
      const x = Math.floor(i % maxGridSize);
      const y = Math.floor(i / maxGridSize);
      const room = {
        id: `room-${Phaser.Math.RND.uuid()}`,
        x,
        y,
        doors: [],
        visited: false,
        isHub: false,
        isDeadEnd: false,
        encounterChance: 0,
        encounterType: null,
        puzzleType: null,
        treasureLevel: null,
        hintContent: null,
        hasShelfEmpty: false,
        hasShelf2Empty: false,
        gemType: null,
        hasPotion: false
      };
      this.roomList.push(room);
      const gridX = Math.floor(x);
      const gridY = Math.floor(y);
      if (!this.dungeonGrid[gridY]) this.dungeonGrid[gridY] = [];
      if (!this.dungeonGrid[gridY][gridX]) this.dungeonGrid[gridY][gridX] = [];
      this.dungeonGrid[gridY][gridX].push(room);
    }
  }

  repositionRooms() {
    const maxGridSize = Math.ceil(Math.sqrt(this.roomList.length)) + 2;
    this.dungeonGrid = [];
    this.roomList.forEach((room, i) => {
      room.x = Math.floor(i % maxGridSize);
      room.y = Math.floor(i / maxGridSize);
      const gridX = Math.floor(room.x);
      const gridY = Math.floor(room.y);
      if (!this.dungeonGrid[gridY]) this.dungeonGrid[gridY] = [];
      if (!this.dungeonGrid[gridY][gridX]) this.dungeonGrid[gridY][gridX] = [];
      this.dungeonGrid[gridY][gridX].push(room);
    });
  }

  generateComplexDungeon() {
    const stack = [];
    const visited = new Set();
    let deadEndCount = 0;
    const hubs = this.selectHubs();
    hubs.forEach(room => {
      room.isHub = true;
      visited.add(room.id);
    });
    const startRoom = this.roomList.find(r => r.isHub) || this.roomList[0];
    stack.push(startRoom);
    startRoom.visited = true;
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current, visited);
      if (neighbors.length === 0) {
        if (visited.size > this.roomList.length * 0.8 && deadEndCount < this.maxDeadEnds && !current.isHub && current.doors.length === 1) {
          current.isDeadEnd = true;
          deadEndCount++;
        }
        stack.pop();
        continue;
      }
      const hubNeighbors = neighbors.filter(r => r.isHub);
      const next = hubNeighbors.length > 0 && Math.random() < 0.5
        ? hubNeighbors[Math.floor(Math.random() * hubNeighbors.length)]
        : neighbors[Math.floor(Math.random() * neighbors.length)];
      this.connectRooms(current, next);
      visited.add(next.id);
      next.visited = true;
      stack.push(next);
    }
    // Ensure all rooms are connected after the main DFS
    const unvisitedRooms = this.roomList.filter(r => !visited.has(r.id));
    if (unvisitedRooms.length > 0 && visited.size > 0) {
      const visitedRooms = this.roomList.filter(r => visited.has(r.id));
      unvisitedRooms.forEach(unvisitedRoom => {
        let closestVisitedRoom = null;
        let minDist = Infinity;
        visitedRooms.forEach(visitedRoom => {
          const dist = Math.hypot(visitedRoom.x - unvisitedRoom.x, visitedRoom.y - unvisitedRoom.y);
          if (dist < minDist) {
            minDist = dist;
            closestVisitedRoom = visitedRoom;
          }
        });
        if (closestVisitedRoom) {
          this.connectRooms(unvisitedRoom, closestVisitedRoom);
          visited.add(unvisitedRoom.id);
          visitedRooms.push(unvisitedRoom);
        }
      });
    }
    this.addLoops(0.3);
    this.enhanceHubs();
    this.ensureExits();
  }

  selectHubs() {
    const hubs = [];
    const minDistance = 3;
    while (hubs.length < this.hubCount) {
      const room = this.roomList[Math.floor(Math.random() * this.roomList.length)];
      const isFarEnough = hubs.every(h => Math.hypot(h.x - room.x, h.y - room.y) > minDistance);
      if (isFarEnough) hubs.push(room);
    }
    return hubs;
  }

  getUnvisitedNeighbors(room, visited) {
    return this.roomList.filter(r => !visited.has(r.id) && Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room);
  }

  connectRooms(room1, room2) {
    if (!room1.doors.includes(room2.id)) room1.doors.push(room2.id);
    if (!room2.doors.includes(room1.id)) room2.doors.push(room1.id);
  }

  addLoops(probability) {
    let cyclesAdded = 0;
    this.roomList.forEach(room => {
      if (room.doors.length >= 3 || room.isDeadEnd) return;
      const nearby = this.roomList.filter(r => Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room && !room.doors.includes(r.id) && r.doors.length < 3 && !r.isDeadEnd);
      nearby.forEach(target => {
        if (Math.random() < probability) {
          this.connectRooms(room, target);
          cyclesAdded++;
        }
      });
    });
  }

  enhanceHubs() {
    this.roomList.filter(r => r.isHub).forEach(room => {
      if (room.doors.length < 3) {
        const nearby = this.roomList.filter(r => Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room && !room.doors.includes(r.id) && r.doors.length < 4).slice(0, 3 - room.doors.length);
        nearby.forEach(target => this.connectRooms(room, target));
      }
    });
  }

  ensureExits() {
    this.roomList.forEach(room => {
      if (room.doors.length === 0) {
        let nearby = this.roomList.find(r => Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room && r.doors.length < 4);
        if (!nearby) {
          let closestRoom = null;
          let minDist = Infinity;
          this.roomList.forEach(r => {
            if (r === room) return;
            const dist = Math.hypot(r.x - room.x, r.y - room.y);
            if (dist < minDist) {
              minDist = dist;
              closestRoom = r;
            }
          });
          nearby = closestRoom;
        }
        if (nearby) {
          this.connectRooms(room, nearby);
        }
      }
    });
  }

  assignPlaceholders() {
    const puzzleCount = 0, treasureCount = 0, hintCount = 0;
    const eligibleItemRooms = this.roomList.filter(r => r.doors.length > 0 && r.doors.length < 4);
    const shelfEmptyRooms = Phaser.Utils.Array.Shuffle([...eligibleItemRooms]).slice(0, 20);
    const shelf2EmptyRooms = Phaser.Utils.Array.Shuffle([...eligibleItemRooms]).slice(0, 20);
    const uniqueShelf2Rooms = shelf2EmptyRooms.filter(r2 => !shelfEmptyRooms.some(r1 => r1.id === r2.id));
    if (uniqueShelf2Rooms.length < 20) {
      const additionalRooms = Phaser.Utils.Array.Shuffle([...eligibleItemRooms]).filter(r => !shelfEmptyRooms.some(r1 => r1.id === r.id) && !uniqueShelf2Rooms.some(r2 => r2.id === r.id)).slice(0, 20 - uniqueShelf2Rooms.length);
      uniqueShelf2Rooms.push(...additionalRooms);
    }
    this.roomList.forEach(room => {
      room.encounterChance = room.isHub ? 0.5 : 0.2;
      if (Math.random() < room.encounterChance) {
        const types = ['elvaan', 'dwarf', 'gnome', 'bat'];
        room.encounterType = types[Math.floor(Math.random() * types.length)];
      }
      room.hasShelfEmpty = false;
      room.hasShelf2Empty = false;
      room.gemType = null;
      room.hasPotion = false;
    });
    shelfEmptyRooms.forEach(room => { room.hasShelfEmpty = true; });
    uniqueShelf2Rooms.forEach(room => { room.hasShelf2Empty = true; });
    const gemTypes = ['ShelfBlueApatite', 'ShelfEmerald', 'ShelfAmethyst', 'ShelfRawRuby'];
    const gemRooms = Phaser.Utils.Array.Shuffle([...shelfEmptyRooms]).slice(0, 2);
    gemRooms.forEach(room => { room.gemType = gemTypes[Math.floor(Math.random() * gemTypes.length)]; });
    const potionRooms = Phaser.Utils.Array.Shuffle([...uniqueShelf2Rooms]).slice(0, 12);
    potionRooms.forEach(room => { room.hasPotion = true; });
    Phaser.Utils.Array.Shuffle(eligibleItemRooms).slice(0, 10).forEach(room => {
      if (Math.random() < 0.7) {
        room.puzzleType = 'key';
      }
    });
    Phaser.Utils.Array.Shuffle(eligibleItemRooms).slice(0, 15).forEach(room => {
      if (Math.random() < 0.9) {
        room.treasureLevel = Math.random() < 0.5 ? 'sword1' : 'helm1';
      }
    });
    Phaser.Utils.Array.Shuffle(eligibleItemRooms).slice(0, 10).forEach(room => {
      if (room.doors.length === 1 && Math.random() < 0.5) {
        const treasureRoom = this.roomList.find(r => r.treasureLevel);
        if (treasureRoom) {
          const dx = Math.round(treasureRoom.x - room.x);
          const dy = Math.round(treasureRoom.y - room.y);
          room.hintContent = `${Math.abs(dx)} ${dx >= 0 ? 'east' : 'west'}, ${Math.abs(dy)} ${dy >= 0 ? 'south' : 'north'}: ${treasureRoom.treasureLevel}`;
        }
      }
    });
  }

  hasMiddleDoor(room) {
    return room.doors.length > 2;
  }

  finalConsistencyCheck() {
    this.roomList.forEach(room => {
      room.doors = room.doors.filter(id => {
        const target = this.roomList.find(r => r.id === id);
        return target && target.doors.includes(room.id);
      });
    });
  }

  getRoomById(id) {
    return this.roomList.find(r => r.id === id);
  }

  findRoomAt(x, y) {
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    return this.dungeonGrid[gridY]?.[gridX]?.[0];
  }
}

export function addPlayerToWorld(playerId, playerStats) {
  // TODO: Implement logic to add player to world state
  // Example: worldState.players.set(playerId, playerStats);
}
