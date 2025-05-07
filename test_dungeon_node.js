import { generateDungeon } from './src/shared/DungeonCore.js';

const seed = 'test-seed-123';
const options = { roomCount: 10 };

const dungeon = generateDungeon(seed, options);
console.log(JSON.stringify(dungeon, null, 2)); 