const { createRNG, shuffle, uuidv4 } = require('./RNG.js');

// Minimal deterministic dungeon generator for testing
export function generateDungeon(seed, options = {}) {
  const rng = createRNG(seed);
  const playerCount = options.playerCount || 1;
  const baseGridSize = 15;
  const hubCount = 6;
  const maxDeadEnds = 15;
  const roomCounts = { small: 100, medium: 150, large: 200 };
  let dungeonGrid = [];
  let roomList = [];

  function getTargetRoomCount() {
    if (playerCount <= 5) return roomCounts.small;
    if (playerCount <= 10) return roomCounts.medium;
    return roomCounts.large;
  }

  function initializeRooms(targetRooms) {
    const maxGridSize = Math.ceil(Math.sqrt(targetRooms)) + 2;
    for (let i = 0; i < targetRooms; i++) {
      const x = Math.floor(i % maxGridSize);
      const y = Math.floor(i / maxGridSize);
      const room = {
        id: uuidv4(rng),
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
        hintContent: null
      };
      roomList.push(room);
      const gridX = Math.floor(x);
      const gridY = Math.floor(y);
      if (!dungeonGrid[gridY]) dungeonGrid[gridY] = [];
      if (!dungeonGrid[gridY][gridX]) dungeonGrid[gridY][gridX] = [];
      dungeonGrid[gridY][gridX].push(room);
    }
  }

  function repositionRooms() {
    const maxGridSize = Math.ceil(Math.sqrt(roomList.length)) + 2;
    dungeonGrid = [];
    roomList.forEach((room, i) => {
      room.x = Math.floor(i % maxGridSize);
      room.y = Math.floor(i / maxGridSize);
      const gridX = Math.floor(room.x);
      const gridY = Math.floor(room.y);
      if (!dungeonGrid[gridY]) dungeonGrid[gridY] = [];
      if (!dungeonGrid[gridY][gridX]) dungeonGrid[gridY][gridX] = [];
      dungeonGrid[gridY][gridX].push(room);
    });
  }

  function getUnvisitedNeighbors(room, visited) {
    return roomList.filter(r => !visited.has(r.id) && Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room);
  }

  function connectRooms(room1, room2) {
    if (!room1.doors.includes(room2.id)) room1.doors.push(room2.id);
    if (!room2.doors.includes(room1.id)) room2.doors.push(room1.id);
  }

  function selectHubs() {
    const hubs = [];
    const minDistance = 3;
    while (hubs.length < hubCount) {
      const room = roomList[Math.floor(rng() * roomList.length)];
      const isFarEnough = hubs.every(h => Math.hypot(h.x - room.x, h.y - room.y) > minDistance);
      if (isFarEnough) hubs.push(room);
    }
    return hubs;
  }

  function generateComplexDungeon() {
    const stack = [];
    const visited = new Set();
    let deadEndCount = 0;
    const hubs = selectHubs();
    hubs.forEach(room => {
      room.isHub = true;
      visited.add(room.id);
    });
    const startRoom = roomList.find(r => r.isHub) || roomList[0];
    stack.push(startRoom);
    startRoom.visited = true;
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = getUnvisitedNeighbors(current, visited);
      if (neighbors.length === 0) {
        if (visited.size > roomList.length * 0.8 && deadEndCount < maxDeadEnds && !current.isHub && current.doors.length === 1) {
          current.isDeadEnd = true;
          deadEndCount++;
        }
        stack.pop();
        continue;
      }
      const hubNeighbors = neighbors.filter(r => r.isHub);
      const next = hubNeighbors.length > 0 && rng() < 0.5 ? hubNeighbors[Math.floor(rng() * hubNeighbors.length)] : neighbors[Math.floor(rng() * neighbors.length)];
      connectRooms(current, next);
      visited.add(next.id);
      next.visited = true;
      stack.push(next);
    }
    // Ensure all rooms are connected after the main DFS
    const unvisitedRooms = roomList.filter(r => !visited.has(r.id));
    if (unvisitedRooms.length > 0 && visited.size > 0) {
      const visitedRooms = roomList.filter(r => visited.has(r.id));
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
          connectRooms(unvisitedRoom, closestVisitedRoom);
          visited.add(unvisitedRoom.id);
          visitedRooms.push(unvisitedRoom);
        }
      });
    }
    addLoops(0.3);
    enhanceHubs();
    ensureExits();
  }

  function addLoops(probability) {
    let cyclesAdded = 0;
    roomList.forEach(room => {
      if (room.doors.length >= 3 || room.isDeadEnd) return;
      const nearby = roomList.filter(r => Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room && !room.doors.includes(r.id) && r.doors.length < 3 && !r.isDeadEnd);
      nearby.forEach(target => {
        if (rng() < probability) {
          connectRooms(room, target);
          cyclesAdded++;
        }
      });
    });
  }

  function enhanceHubs() {
    roomList.filter(r => r.isHub).forEach(room => {
      if (room.doors.length < 3) {
        const nearby = roomList.filter(r => Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room && !room.doors.includes(r.id) && r.doors.length < 4).slice(0, 3 - room.doors.length);
        nearby.forEach(target => connectRooms(room, target));
      }
    });
  }

  function ensureExits() {
    roomList.forEach(room => {
      if (room.doors.length === 0) {
        let nearby = roomList.find(r => Math.abs(r.x - room.x) + Math.abs(r.y - room.y) === 1 && r !== room && r.doors.length < 4);
        if (!nearby) {
          let closestRoom = null;
          let minDist = Infinity;
          roomList.forEach(r => {
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
          connectRooms(room, nearby);
        }
      }
    });
  }

  function assignPlaceholders() {
    let puzzleCount = 0, treasureCount = 0, hintCount = 0;
    const eligibleItemRooms = roomList.filter(r => r.doors.length > 0 && r.doors.length < 4);
    const shelfEmptyRooms = shuffle([...eligibleItemRooms], rng).slice(0, 20);
    const shelf2EmptyRooms = shuffle([...eligibleItemRooms], rng).slice(0, 20);
    const uniqueShelf2Rooms = shelf2EmptyRooms.filter(r2 => !shelfEmptyRooms.some(r1 => r1.id === r2.id));
    if (uniqueShelf2Rooms.length < 20) {
      const additionalRooms = shuffle([...eligibleItemRooms], rng).filter(r => !shelfEmptyRooms.some(r1 => r1.id === r.id) && !uniqueShelf2Rooms.some(r2 => r2.id === r.id)).slice(0, 20 - uniqueShelf2Rooms.length);
      uniqueShelf2Rooms.push(...additionalRooms);
    }
    roomList.forEach(room => {
      room.encounterChance = room.isHub ? 0.5 : 0.2;
      if (rng() < room.encounterChance) {
        const types = ['elvaan', 'dwarf', 'gnome', 'bat'];
        room.encounterType = types[Math.floor(rng() * types.length)];
      }
      room.hasShelfEmpty = false;
      room.hasShelf2Empty = false;
      room.gemType = null;
      room.hasPotion = false;
    });
    shelfEmptyRooms.forEach(room => { room.hasShelfEmpty = true; });
    uniqueShelf2Rooms.forEach(room => { room.hasShelf2Empty = true; });
    const gemTypes = ['ShelfBlueApatite', 'ShelfEmerald', 'ShelfAmethyst', 'ShelfRawRuby'];
    const gemRooms = shuffle([...shelfEmptyRooms], rng).slice(0, 2);
    gemRooms.forEach(room => {
      const randomGemType = gemTypes[Math.floor(rng() * gemTypes.length)];
      room.gemType = randomGemType;
    });
    const potionRooms = shuffle([...uniqueShelf2Rooms], rng).slice(0, 12);
    potionRooms.forEach(room => { room.hasPotion = true; });
    shuffle([...eligibleItemRooms], rng).slice(0, 10).forEach(room => {
      if (puzzleCount < 10 && rng() < 0.7) {
        room.puzzleType = 'key';
        puzzleCount++;
      }
    });
    shuffle([...eligibleItemRooms], rng).slice(0, 15).forEach(room => {
      if (treasureCount < 15 && rng() < 0.9) {
        room.treasureLevel = rng() < 0.5 ? 'sword1' : 'helm1';
        treasureCount++;
      }
    });
    shuffle([...eligibleItemRooms], rng).slice(0, 10).forEach(room => {
      if (hintCount < 10 && room.doors.length === 1 && rng() < 0.5) {
        const treasureRoom = roomList.find(r => r.treasureLevel);
        if (treasureRoom) {
          const dx = Math.round(treasureRoom.x - room.x);
          const dy = Math.round(treasureRoom.y - room.y);
          room.hintContent = `${Math.abs(dx)} ${dx >= 0 ? 'east' : 'west'}, ${Math.abs(dy)} ${dy >= 0 ? 'south' : 'north'}: ${treasureRoom.treasureLevel}`;
          hintCount++;
        }
      }
    });
  }

  function finalConsistencyCheck() {
    roomList.forEach(room => {
      room.doors = room.doors.filter(id => {
        const target = roomList.find(r => r.id === id);
        return target && target.doors.includes(room.id);
      });
    });
  }

  // --- MAIN GENERATION FLOW ---
  const targetRooms = getTargetRoomCount();
  initializeRooms(targetRooms);
  generateComplexDungeon();
  assignPlaceholders();
  finalConsistencyCheck();

  return {
    grid: dungeonGrid,
    rooms: roomList
  };
} 