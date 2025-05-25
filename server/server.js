// server.js
// Clean socket handler, all logic routed to authoritative managers

import { Server } from "socket.io";
import { EVENTS } from "../src/shared/events.js";
import { generateDungeon } from './DungeonCore.js';

import { handlePuzzleAttempt } from "./PuzzleManagerServer.js";
import { handleShelfAccess } from "./ShelfManagerServer.js";
import { handleTreasureAccess } from "./TreasureManagerServer.js";
import EncounterManagerServer from "./EncounterManagerServer.js";
import { ManagerManager } from './ManagerManager.js';

const io = new Server();

let previousPlayerCount = 0;
let currentPlayerCount = 0;

// Global state for player sessions and dungeon
const players = new Map(); // playerId -> { socket, character, roomId, inventory, ... }
const rooms = new Map();   // roomId -> { players: Set, entities: [], ... }
const bags = new Map();    // bagId -> { roomId, items }
const DUNGEON_SEED = process.env.DUNGEON_SEED || 'default-seed-2024';
const dungeon = generateDungeon(DUNGEON_SEED, { playerCount: 1 });

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on(EVENTS.PUZZLE_ATTEMPT, (data) => handlePuzzleAttempt(socket, data));
  socket.on(EVENTS.SHELF_INTERACT, (data) => handleShelfAccess(socket, data));
  socket.on(EVENTS.TREASURE_INTERACT, (data) => handleTreasureAccess(socket, data));
  socket.on(EVENTS.LOOT_ITEM, (data) => ManagerManager.lootItem(data));
  socket.on(EVENTS.MARK_BAG_CHECKED, (data) => ManagerManager.markLootBagChecked(data.bagId));
  socket.on(EVENTS.TAKE_TURN, (data) => {
    // Route to EncounterManagerServer.handleAction, preserving all features
    EncounterManagerServer.handleAction(
      data.encounterId,
      data.entityId,
      data.action,
      data.targetId,
      data.extra
    );
  });
  socket.on(EVENTS.PLAYER_JOIN, async ({ playerId, user_id }) => {
    try {
      // Fetch and validate player data from Supabase
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user_id)
        .eq('id', playerId)
        .single();
      if (error || !data) {
        socket.emit(EVENTS.ERROR, { message: 'Player not found or invalid', code: 'PLAYER_NOT_FOUND' });
        return;
      }
      const character = data;
      // Validate required fields
      const requiredFields = ['id', 'user_id', 'name', 'type', 'level', 'vit', 'str', 'int', 'dex', 'mnd', 'spd'];
      for (const field of requiredFields) {
        if (!(field in character)) {
          socket.emit(EVENTS.ERROR, { message: `Missing field: ${field}`, code: 'INVALID_PLAYER_DATA' });
          return;
        }
      }
      // Inject player as new entity into dungeon
      players.set(playerId, {
        socket,
        character,
        roomId: null,
        inventory: character.inventory || [],
        lastKnownRoom: null,
        alive: true,
      });
      // Assign spawn location (random room for now)
      const spawnRoom = dungeon.rooms[Math.floor(Math.random() * dungeon.rooms.length)];
      players.get(playerId).roomId = spawnRoom.id;
      players.get(playerId).lastKnownRoom = spawnRoom.id;
      // Add player to room
      if (!rooms.has(spawnRoom.id)) rooms.set(spawnRoom.id, { players: new Set(), entities: [] });
      rooms.get(spawnRoom.id).players.add(playerId);
      socket.join(spawnRoom.id);
      // Send current world state and spawn info to client
      socket.emit(EVENTS.ACTION_RESULT, {
        action: EVENTS.PLAYER_JOIN,
        success: true,
        message: 'Joined',
        data: {
          playerId,
          character,
          spawnRoomId: spawnRoom.id,
          dungeon,
        },
      });
      // Notify others
      socket.broadcast.emit(EVENTS.PLAYER_JOIN_NOTIFICATION, { name: character.name });
      previousPlayerCount = currentPlayerCount;
      currentPlayerCount = players.size;
      ManagerManager.handlePlayerCountChange(currentPlayerCount, previousPlayerCount);
    } catch (err) {
      socket.emit(EVENTS.ERROR, { message: 'Supabase validation error', code: 'SUPABASE_ERROR' });
      return;
    }
  });

  socket.on(EVENTS.PLAYER_LEAVE, ({ playerId }) => {
    const player = players.get(playerId);
    if (player && player.character && player.character.name) {
      socket.broadcast.emit(EVENTS.PLAYER_LEAVE_NOTIFICATION, { name: player.character.name });
    }
    // Drop loot bag in current room if player is alive
    if (player && player.alive && player.roomId) {
      const bagId = `bag-${playerId}-${Date.now()}`;
      bags.set(bagId, { roomId: player.roomId, items: player.inventory });
      io.to(player.roomId).emit(EVENTS.LOOT_BAG_DROP, { roomId: player.roomId, bagId, items: player.inventory });
    }
    players.delete(playerId);
    socket.broadcast.emit(EVENTS.PLAYER_LEAVE, { playerId });
    if (players.size === 0) {
      Object.assign(dungeon, generateDungeon(DUNGEON_SEED, { playerCount: 1 }));
      rooms.clear();
      bags.clear();
    }
    previousPlayerCount = currentPlayerCount;
    currentPlayerCount = players.size;
    ManagerManager.handlePlayerCountChange(currentPlayerCount, previousPlayerCount);
  });

  // Additional connections (player join/leave, room sync, etc.) would route here too
});

export default io;
