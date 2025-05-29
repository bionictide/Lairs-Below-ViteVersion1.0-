// server.js
// Clean socket handler, all logic routed to authoritative managers

import { Server } from "socket.io";
import { EVENTS } from "../src/shared/events.js";
import { DungeonCore } from './DungeonCore.js';
import http from 'http';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import RoomManagerServer from './RoomManagerServer.js';
dotenv.config();

import { handlePuzzleAttempt } from "./PuzzleManagerServer.js";
import { handleShelfAccess } from "./ShelfManagerServer.js";
import { handleTreasureAccess } from "./TreasureManagerServer.js";
import EncounterManagerServer from "./EncounterManagerServer.js";
import { ManagerManager } from './ManagerManager.js';
import { handleDevDebugAuth } from './DebugHelperServer.js';
import HintManagerServer from './HintManagerServer.js';
import PlayerManagerServer from './PlayerManagerServer.js';

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = [
  'https://www.bionictide.com',
  /^https:\/\/.*\.github\.io$/,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost',
  'http://127.0.0.1',
];
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rcbqjftzzdtbghrrtxai.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.some(o => (typeof o === 'string' ? o === origin : o.test(origin)))) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }
});

// Supabase JWT authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  console.log('[AUTH] Incoming connection.');
  if (!token) {
    console.log('[AUTH] No token provided. Rejecting connection.');
    return next(new Error('No token provided'));
  }
  try {
    // Validate JWT with Supabase
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_SERVICE_KEY
      }
    });
    if (res.status !== 200) {
      console.log('[AUTH] Invalid token. Rejecting connection.');
      return next(new Error('Invalid token'));
    }
    const user = await res.json();
    socket.user = user;
    console.log('[AUTH] Authenticated user:', user.id || '[no id]');
    return next();
  } catch (err) {
    console.log('[AUTH] Auth failed with error:', err.message);
    return next(new Error('Auth failed'));
  }
});

let previousPlayerCount = 0;
let currentPlayerCount = 0;

// Global state for player sessions and dungeon
const players = new Map(); // playerId -> { socket, character, roomId, inventory, ... }
const rooms = new Map();   // roomId -> { players: Set, entities: [], ... }
const bags = new Map();    // bagId -> { roomId, items }
const DUNGEON_SEED = process.env.DUNGEON_SEED || 'default-seed-2024';
const dungeonCore = new DungeonCore();
const dungeon = dungeonCore.generateDungeon(1, DUNGEON_SEED);

const hintManager = new HintManagerServer(io);

global.RoomManagerServer = RoomManagerServer;
console.log('[DEBUG] global.RoomManagerServer initialized:', typeof global.RoomManagerServer);

console.log('[DEBUG] EVENTS.CHARACTER_CREATE (server):', EVENTS.CHARACTER_CREATE);

io.on("connection", (socket) => {
  console.log("[SOCKET] New connection:", socket.id);
  // Catch-all event logger
  socket.onAny((event, ...args) => {
    console.log('[SOCKET] Received event:', event, 'from socket:', socket.id, args);
  });

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
    console.log('[PLAYER_JOIN] Received:', { playerId, user_id });
    try {
      // Validate that the socket user matches the user_id
      if (!socket.user || socket.user.id !== user_id) {
        console.error('[PLAYER_JOIN] Auth mismatch:', socket.user?.id, user_id);
        socket.emit(EVENTS.ERROR, { message: 'Auth mismatch', code: 'AUTH_MISMATCH' });
        return;
      }
      // Fetch and validate player data from Supabase
      const res = await fetch(`${SUPABASE_URL}/rest/v1/characters?user_id=eq.${user_id}&id=eq.${playerId}`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          Accept: 'application/json',
        },
      });
      if (res.status !== 200) {
        console.error('[PLAYER_JOIN] Failed to fetch player data:', res.status);
        socket.emit(EVENTS.ERROR, { message: 'Failed to fetch player data', code: 'SUPABASE_FETCH_FAILED' });
        return;
      }
      const dataArr = await res.json();
      if (!dataArr || !dataArr[0]) {
        console.error('[PLAYER_JOIN] Player not found or invalid:', dataArr);
        socket.emit(EVENTS.ERROR, { message: 'Player not found or invalid', code: 'PLAYER_NOT_FOUND' });
        return;
      }
      const character = dataArr[0];
      // Validate required fields
      const requiredFields = ['id', 'user_id', 'name', 'type', 'level', 'vit', 'str', 'int', 'dex', 'mnd', 'spd'];
      for (const field of requiredFields) {
        if (!(field in character)) {
          console.error('[PLAYER_JOIN] Missing field:', field, character);
          socket.emit(EVENTS.ERROR, { message: `Missing field: ${field}`, code: 'INVALID_PLAYER_DATA' });
          return;
        }
      }
      console.log('[DEBUG] PLAYER_JOIN Supabase character:', character);
      const healthObj = ManagerManager.getHealth(playerId);
      const roomId = ManagerManager.getRoomId(playerId);
      const type = ManagerManager.getType(playerId);
      // Store only what is needed for session and routing
      players.set(playerId, {
        socket,
        roomId,
        lastKnownRoom: roomId,
        alive: true,
        facing: 'north',
        // Optionally: keep derived health/type for quick access
        health: healthObj.health,
        maxHealth: healthObj.maxHealth,
        type,
      });
      // Assign spawn location (random room for now)
      const spawnRoom = dungeon.rooms[Math.floor(Math.random() * dungeon.rooms.length)];
      players.get(playerId).roomId = spawnRoom.id;
      players.get(playerId).lastKnownRoom = spawnRoom.id;
      // Add player to PlayerManagerServer for authoritative state
      ManagerManager.addPlayer(playerId, character, { location: { roomId: spawnRoom.id, facing: 'north' } });
      // Send only minimal data to client
      const minimalCharacterForClient = {
        playerId,
        health: healthObj.health,
        maxHealth: healthObj.maxHealth,
        roomId: spawnRoom.id,
        type,
        // Add any other minimal fields needed for rendering
      };
      console.log('[DEBUG] PLAYER_JOIN minimalCharacterForClient sent to client:', minimalCharacterForClient);
      socket.emit(EVENTS.ACTION_RESULT, {
        action: EVENTS.PLAYER_JOIN,
        success: true,
        message: 'Joined',
        data: {
          playerId,
          character: minimalCharacterForClient,
          spawnRoomId: spawnRoom.id,
          dungeon,
        },
      });
      console.log('[PLAYER_JOIN] Sent ACTION_RESULT to client for player:', playerId);
      // Notify others
      socket.broadcast.emit(EVENTS.PLAYER_JOIN_NOTIFICATION, { name: character.name });
      previousPlayerCount = currentPlayerCount;
      currentPlayerCount = players.size;
      ManagerManager.handlePlayerCountChange(currentPlayerCount, previousPlayerCount);
    } catch (err) {
      console.error('[PLAYER_JOIN] Exception:', err);
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
      // Use ManagerManager to create and emit loot bag drop
      const bag = ManagerManager.createLootBag({
        ownerId: playerId,
        roomId: player.roomId,
        facingDirection: player.facing || 'north',
        items: player.inventory
      });
      if (bag && io) {
        io.to(player.roomId).emit(EVENTS.LOOT_BAG_DROP, { roomId: player.roomId, bagId: bag.bagId, items: bag.contents });
      }
    }
    // Clear hint on leave
    hintManager.sendClearHintToPlayer(socket);
    players.delete(playerId);
    socket.broadcast.emit(EVENTS.PLAYER_LEAVE, { playerId });
    if (players.size === 0) {
      Object.assign(dungeon, dungeonCore.generateDungeon(1, DUNGEON_SEED));
      rooms.clear();
      bags.clear();
    }
    previousPlayerCount = currentPlayerCount;
    currentPlayerCount = players.size;
    ManagerManager.handlePlayerCountChange(currentPlayerCount, previousPlayerCount);
  });

  socket.on(EVENTS.ROOM_ENTER, ({ playerId, roomId, facing }) => {
    ManagerManager.playerEnteredRoom(playerId, roomId, facing);
    // Broadcast room update (only to this player for visited)
    const assetKey = global.RoomManagerServer.getRoomImageKey(
      dungeonCore.getRoomById(roomId),
      facing,
      dungeonCore
    );
    socket.emit(EVENTS.ROOM_UPDATE, {
      roomId,
      players: Array.from(rooms.get(roomId).players),
      entities: rooms.get(roomId).entities,
      visited: Array.from(global.visitedRooms.get(playerId)),
      assetKey,
    });
    socket.join(roomId);
  });

  socket.on('player_face', ({ playerId, roomId, facing }) => {
    ManagerManager.playerTurned(playerId, facing);
    // Show or clear hint based on facing
    const hint = hintManager.hints.get(roomId);
    if (hint && hint.facing === facing) {
      hintManager.handlePlayerFacing(socket, roomId, facing);
    } else {
      hintManager.sendClearHintToPlayer(socket);
    }
  });

  socket.on('DEV_DEBUG_AUTH', (password) => {
    ManagerManager.handleDevDebugAuth(socket, password);
  });

  socket.on(EVENTS.CHARACTER_CREATE, async ({ name, type, user_id, level }) => {
    try {
      // Validate that the socket user matches the user_id
      if (!socket.user || socket.user.id !== user_id) {
        socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.CHARACTER_CREATE, success: false, message: 'Auth mismatch' });
        return;
      }
      // Validate name and type
      if (!name || typeof name !== 'string' || !type || typeof type !== 'string') {
        socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.CHARACTER_CREATE, success: false, message: 'Invalid name or type' });
        return;
      }
      // Get base stats from CharacterTypesServer
      const def = ManagerManager.getCharacterDefinition(type.toLowerCase());
      if (!def || !def.stats) {
        socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.CHARACTER_CREATE, success: false, message: 'Invalid character type' });
        return;
      }
      // Insert character into Supabase
      const res = await fetch(`${SUPABASE_URL}/rest/v1/characters`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          user_id,
          name,
          type,
          level: level || 1,
          vit: def.stats.vit,
          str: def.stats.str,
          int: def.stats.int,
          dex: def.stats.dex,
          mnd: def.stats.mnd,
          spd: def.stats.spd,
          inventory: []
        })
      });
      if (res.status !== 201) {
        const err = await res.text();
        socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.CHARACTER_CREATE, success: false, message: 'Supabase error: ' + err });
        return;
      }
      socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.CHARACTER_CREATE, success: true });
    } catch (err) {
      socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.CHARACTER_CREATE, success: false, message: 'Server error: ' + err.message });
    }
  });

  // Additional connections (player join/leave, room sync, etc.) would route here too
});

server.listen(PORT, () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
});

export default io;
