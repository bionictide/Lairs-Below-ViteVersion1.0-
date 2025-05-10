// Multiplayer Server Skeleton for Dungeon Crawler
// Uses: Node.js, Socket.io, ES modules
// Run with: node server.js

console.log('=== Lairs Below server.js STARTED ===');

import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
import { EVENTS } from '../src/shared/events.js';
import fetch from 'node-fetch';
import { generateDungeon } from '../src/shared/DungeonCore.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const PORT = process.env.PORT || 3001;
const server = http.createServer();
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

// Middleware: Require Supabase JWT on connect
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

// In-memory state (replace with DB as needed)
const players = new Map(); // playerId -> { socket, character, roomId, inventory, ... }
const rooms = new Map();   // roomId -> { players: Set, entities: [], ... }
const bags = new Map();    // bagId -> { roomId, items }
const visitedRooms = new Map(); // playerId -> Set of visited roomIds

// --- Dungeon World (Persistent, Server-Authoritative) ---
// All dungeon generation and mutation logic is imported from DungeonCore.js and must be performed here.
// No client should ever mutate dungeon state. All mutations must be requested via events and validated/applied here.
const DUNGEON_SEED = process.env.DUNGEON_SEED || 'default-seed-2024';
const dungeon = generateDungeon(DUNGEON_SEED, { playerCount: 1 });
console.log('[DUNGEON] Dungeon generated at startup:', {
  rooms: dungeon.rooms.length,
  grid: dungeon.grid.length
});
// TODO: Add server-side mutation endpoints/events here (move, loot, puzzle, etc.)

const itemData = {
  Key1: { name: 'Key', asset: 'Key1', width: 2, height: 1, stackable: false },
  sword1: { name: 'Sword', asset: 'Sword1', width: 3, height: 1, stackable: false, usable: false },
  helm1: { name: 'Helm', asset: 'Helm1', width: 2, height: 2, stackable: false, usable: false },
  'Potion1(red)': { name: 'Red Potion', asset: 'Potion1(red)', width: 1, height: 1, stackable: true, usable: true },
  Emerald: { name: 'Emerald', asset: 'Emerald', width: 1, height: 1, stackable: true, usable: false },
  BlueApatite: { name: 'Blue Apatite', asset: 'BlueApatite', width: 1, height: 1, stackable: true, usable: false },
  Amethyst: { name: 'Amethyst', asset: 'Amethyst', width: 1, height: 1, stackable: true, usable: false },
  RawRuby: { name: 'Raw Ruby', asset: 'RawRuby', width: 1, height: 1, stackable: true, usable: false },
};

// --- Socket.io Event Handlers ---
io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id, 'User:', socket.user?.id || '[no user]');

  // PLAYER JOIN
  socket.on(EVENTS.PLAYER_JOIN, async ({ playerId, user_id }) => {
    // Fetch and validate player data from Supabase
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/characters?user_id=eq.${user_id}&id=eq.${playerId}`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          Accept: 'application/json',
        },
      });
      if (res.status !== 200) {
        socket.emit(EVENTS.ERROR, { message: 'Failed to fetch player data', code: 'SUPABASE_FETCH_FAILED' });
        return;
      }
      const data = await res.json();
      if (!data || !data[0]) {
        socket.emit(EVENTS.ERROR, { message: 'Player not found or invalid', code: 'PLAYER_NOT_FOUND' });
        return;
      }
      const character = data[0];
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
      console.log('Sending dungeon to client:', dungeon.rooms.map(r => r.id).slice(0, 5));
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
    } catch (err) {
      socket.emit(EVENTS.ERROR, { message: 'Supabase validation error', code: 'SUPABASE_ERROR' });
      return;
    }
  });

  // PLAYER LEAVE
  socket.on(EVENTS.PLAYER_LEAVE, ({ playerId }) => {
    const player = players.get(playerId);
    if (player && player.character && player.character.name) {
      socket.broadcast.emit(EVENTS.PLAYER_LEAVE_NOTIFICATION, { name: player.character.name });
    }
    // Drop loot bag in current room if player is alive
    if (player && player.alive && player.roomId) {
      const bagId = `bag-${playerId}-${Date.now()}`;
      bags.set(bagId, { roomId: player.roomId, items: player.inventory });
      // Notify clients of loot bag drop
      io.to(player.roomId).emit(EVENTS.LOOT_BAG_DROP, { roomId: player.roomId, bagId, items: player.inventory });
    }
    players.delete(playerId);
    socket.broadcast.emit(EVENTS.PLAYER_LEAVE, { playerId });
    // 0-player dungeon reset logic
    if (players.size === 0) {
      // Regenerate dungeon and clear rooms/bags
      Object.assign(dungeon, generateDungeon(DUNGEON_SEED, { playerCount: 1 }));
      rooms.clear();
      bags.clear();
      console.log('[DUNGEON] All players left. Dungeon reset for next match.');
    }
  });

  // ROOM ENTER (late join/reconnect support)
  socket.on(EVENTS.ROOM_ENTER, ({ playerId, roomId }) => {
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
    // Track visited rooms per player
    if (!visitedRooms.has(playerId)) visitedRooms.set(playerId, new Set());
    visitedRooms.get(playerId).add(roomId);
    // Broadcast room update (only to this player for visited)
    socket.emit(EVENTS.ROOM_UPDATE, {
      roomId,
      players: Array.from(rooms.get(roomId).players),
      entities: rooms.get(roomId).entities,
      visited: Array.from(visitedRooms.get(playerId)),
    });
    socket.join(roomId);
  });

  // INVENTORY UPDATE
  socket.on(EVENTS.INVENTORY_UPDATE, ({ playerId, inventory }) => {
    const player = players.get(playerId);
    if (player) {
      player.inventory = inventory;
      // TODO: Sync with Supabase
      socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.INVENTORY_UPDATE, success: true, message: 'Inventory updated' });
    }
  });

  // LOOT BAG PICKUP
  socket.on(EVENTS.LOOT_BAG_PICKUP, ({ playerId, bagId }) => {
    const bag = bags.get(bagId);
    const player = players.get(playerId);
    if (bag && player) {
      // Transfer items to player
      player.inventory.push(...bag.items);
      bags.delete(bagId);
      // TODO: Sync with Supabase
      socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.LOOT_BAG_PICKUP, success: true, message: 'Looted bag', data: { items: bag.items } });
    } else {
      socket.emit(EVENTS.ERROR, { message: 'Bag not found', code: 'BAG_NOT_FOUND' });
    }
  });

  // SPELL CAST
  socket.on(EVENTS.SPELL_CAST, ({ playerId, spellName, targetId }) => {
    // TODO: Implement spell logic, mana check, etc.
    // Broadcast result
    socket.emit(EVENTS.SPELL_RESULT, { result: 'success', damage: 0, effects: [] });
  });

  // TRADE REQUEST (placeholder)
  socket.on(EVENTS.TRADE_REQUEST, (payload) => {
    // TODO: Implement trading logic
    socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.TRADE_REQUEST, success: false, message: 'Trading not implemented yet' });
  });

  // PARTY INVITE (placeholder)
  socket.on(EVENTS.PARTY_INVITE, (payload) => {
    // TODO: Implement party logic
    socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.PARTY_INVITE, success: false, message: 'Party system not implemented yet' });
  });

  // STAT ALLOCATION (placeholder)
  socket.on(EVENTS.STAT_ALLOCATION, (payload) => {
    // TODO: Implement stat allocation logic
    socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.STAT_ALLOCATION, success: false, message: 'Stat allocation not implemented yet' });
  });

  // --- MIGRATION: Server-authoritative handlers for new intent events ---

  // PUZZLE ITEM PICKUP
  socket.on('PUZZLE_ITEM_PICKUP_REQUEST', ({ playerId, itemKey, roomId }) => {
    const player = players.get(playerId);
    if (!player || !player.alive) return;
    const def = itemData[itemKey];
    if (!def) return;
    const item = { ...def, itemKey, instanceId: uuidv4(), source: 'puzzle', roomId };
    player.inventory.push(item);
    socket.emit(EVENTS.INVENTORY_UPDATE, { inventory: player.inventory });
  });

  // SHELF ITEM PICKUP
  socket.on('SHELF_ITEM_PICKUP_REQUEST', ({ playerId, itemKey, roomId }) => {
    const player = players.get(playerId);
    if (!player || !player.alive) return;
    const def = itemData[itemKey];
    if (!def) return;
    const item = { ...def, itemKey, instanceId: uuidv4(), source: 'shelf', roomId };
    player.inventory.push(item);
    socket.emit(EVENTS.INVENTORY_UPDATE, { inventory: player.inventory });
  });

  // LOOT ITEM PICKUP
  socket.on('LOOT_ITEM_PICKUP_REQUEST', ({ playerId, itemKey, sourceEntityId }) => {
    const player = players.get(playerId);
    if (!player || !player.alive) return;
    // Find the bag/loot source
    const bag = bags.get(sourceEntityId);
    if (bag && bag.items) {
      const itemIndex = bag.items.findIndex(i => i.itemKey === itemKey);
      if (itemIndex > -1) {
        const [item] = bag.items.splice(itemIndex, 1);
        player.inventory.push(item);
        // If bag is empty, remove it
        if (bag.items.length === 0) bags.delete(sourceEntityId);
        socket.emit(EVENTS.INVENTORY_UPDATE, { inventory: player.inventory });
        socket.emit('LOOT_UPDATE', { bagId: sourceEntityId, items: bag.items });
        // TODO: Sync with Supabase
      }
    }
  });

  // ITEM ADD (e.g., from BagManager intent)
  socket.on('ITEM_ADD_REQUEST', ({ playerId, itemKey, gridX, gridY }) => {
    const player = players.get(playerId);
    if (!player || !player.alive) return;
    const def = itemData[itemKey];
    if (!def) return;
    const item = { ...def, itemKey, instanceId: uuidv4(), gridX, gridY, source: 'add' };
    player.inventory.push(item);
    socket.emit(EVENTS.INVENTORY_UPDATE, { inventory: player.inventory });
  });

  // ITEM REMOVE (e.g., from BagManager intent)
  socket.on('ITEM_REMOVE_REQUEST', ({ playerId, instanceId }) => {
    const player = players.get(playerId);
    if (!player || !player.alive) return;
    // Remove item by instanceId
    player.inventory = player.inventory.filter(i => i.instanceId !== instanceId);
    socket.emit(EVENTS.INVENTORY_UPDATE, { inventory: player.inventory });
    // TODO: Sync with Supabase
  });

  // INVENTORY CLEAR (e.g., on player death)
  socket.on('INVENTORY_CLEAR_REQUEST', ({ playerId }) => {
    const player = players.get(playerId);
    if (!player || !player.alive) return;
    player.inventory = [];
    socket.emit(EVENTS.INVENTORY_UPDATE, { inventory: player.inventory });
    // TODO: Sync with Supabase
  });

  // DISCONNECT (remove player entity, drop loot if alive)
  socket.on('disconnect', () => {
    for (const [playerId, player] of players.entries()) {
      if (player.socket === socket) {
        if (player.alive && player.roomId) {
          const bagId = `bag-${playerId}-${Date.now()}`;
          bags.set(bagId, { roomId: player.roomId, items: player.inventory });
          io.to(player.roomId).emit(EVENTS.LOOT_BAG_DROP, { roomId: player.roomId, bagId, items: player.inventory });
        }
        players.delete(playerId);
        // 0-player dungeon reset logic
        if (players.size === 0) {
          Object.assign(dungeon, generateDungeon(DUNGEON_SEED, { playerCount: 1 }));
          rooms.clear();
          bags.clear();
          console.log('[DUNGEON] All players disconnected. Dungeon reset for next match.');
        }
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });

  // --- Add more event handlers as needed ---
});

// Respond to HTTP GET / requests for Render.com health check and browser visits
server.on('request', (req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Lairs Below Socket.IO server is running!');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.io server running on port ${PORT}`);
}); 