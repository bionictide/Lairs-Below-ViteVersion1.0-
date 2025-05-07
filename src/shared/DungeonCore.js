import { createRNG, shuffle, uuidv4 } from './RNG.js';

// Minimal deterministic dungeon generator for testing
export function generateDungeon(seed, options = {}) {
  const rng = createRNG(seed);
  const roomCount = options.roomCount || 10;
  const rooms = [];

  // Generate rooms with deterministic IDs and positions
  for (let i = 0; i < roomCount; i++) {
    rooms.push({
      id: uuidv4(rng),
      x: i % 5,
      y: Math.floor(i / 5),
      doors: [],
    });
  }

  // Deterministically connect rooms in a simple chain
  for (let i = 0; i < rooms.length - 1; i++) {
    rooms[i].doors.push(rooms[i + 1].id);
    rooms[i + 1].doors.push(rooms[i].id);
  }

  // Shuffle rooms for extra randomness (but deterministic)
  const shuffledRooms = shuffle(rooms, rng);

  return {
    seed,
    rooms: shuffledRooms,
  };
} 