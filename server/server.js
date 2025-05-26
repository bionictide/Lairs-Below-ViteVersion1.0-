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

global.RoomManagerServer = RoomManagerServer;
console.log('[DEBUG] global.RoomManagerServer initialized:', typeof global.RoomManagerServer);

io.on("connection", (socket) => {
  console.log("[SOCKET] Client connected:", socket.id, "User:", socket.user?.id || '[no user]');

  // Catch-all event logger
  socket.onAny((event, ...args) => {
    console.log('[SOCKET] Received event:', event, args);
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
      // Inject player as new entity into dungeon
      players.set(playerId, {
        socket,
        character,
        roomId: null,
        inventory: character.inventory || [],
        lastKnownRoom: null,
        alive: true,
        facing: 'north', // Default facing
      });
      console.log('[PLAYER_JOIN] Player inserted into players map:', playerId);
      // Assign spawn location (random room for now)
      const spawnRoom = dungeon.rooms[Math.floor(Math.random() * dungeon.rooms.length)];
      players.get(playerId).roomId = spawnRoom.id;
      players.get(playerId).lastKnownRoom = spawnRoom.id;
      console.log('[PLAYER_JOIN] Assigned spawn room:', spawnRoom.id);
      // Add player to room
      if (!rooms.has(spawnRoom.id)) rooms.set(spawnRoom.id, { players: new Set(), entities: [] });
      rooms.get(spawnRoom.id).players.add(playerId);
      socket.join(spawnRoom.id);
      // Attach roomId to character object for client
      const characterWithRoom = { ...character, roomId: spawnRoom.id };
      // Send current world state and spawn info to client
      socket.emit(EVENTS.ACTION_RESULT, {
        action: EVENTS.PLAYER_JOIN,
        success: true,
        message: 'Joined',
        data: {
          playerId,
          character: characterWithRoom,
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
      const bagId = `bag-${playerId}-${Date.now()}`;
      bags.set(bagId, { roomId: player.roomId, items: player.inventory });
      io.to(player.roomId).emit(EVENTS.LOOT_BAG_DROP, { roomId: player.roomId, bagId, items: player.inventory });
    }
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
    const player = players.get(playerId);
    if (!player) return;
    // Remove from old room
    if (player.roomId && rooms.has(player.roomId)) {
      rooms.get(player.roomId).players.delete(playerId);
    }
    // Add to new room
    if (!rooms.has(roomId)) rooms.set(roomId, { players: new Set(), entities: [] });
    rooms.get(roomId).players.add(playerId);
    player.roomId = roomId;
    player.lastKnownRoom = roomId;
    // Update facing if provided
    if (facing) player.facing = facing;
    // Track visited rooms per player
    if (!global.visitedRooms) global.visitedRooms = new Map();
    if (!global.visitedRooms.has(playerId)) global.visitedRooms.set(playerId, new Set());
    global.visitedRooms.get(playerId).add(roomId);
    // Calculate assetKey using RoomManagerServer
    const room = dungeonCore.getRoomById(roomId);
    const assetKey = global.RoomManagerServer.getRoomImageKey(room, player.facing, dungeonCore);
    // Broadcast room update (only to this player for visited)
    socket.emit(EVENTS.ROOM_UPDATE, {
      roomId,
      players: Array.from(rooms.get(roomId).players),
      entities: rooms.get(roomId).entities,
      visited: Array.from(global.visitedRooms.get(playerId)),
      assetKey,
    });
    socket.join(roomId);
  });

  socket.on('DEV_DEBUG_AUTH', (password) => {
    handleDevDebugAuth(socket, password);
  });

  // Additional connections (player join/leave, room sync, etc.) would route here too
});

server.listen(PORT, () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
});

export default io;
