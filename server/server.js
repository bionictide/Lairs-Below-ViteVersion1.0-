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

// Helper: Generate full item object from itemKey
function createItemInstance(itemKey) {
  // Minimal fallback if itemData is not available server-side
  // In production, import itemData from shared or DB
  return {
    instanceId: `${itemKey}-${Date.now()}-${Math.floor(Math.random()*10000)}`,
    itemKey,
    name: itemKey,
    asset: itemKey,
    width: 1,
    height: 1,
    stackable: false,
    usable: false
  };
}

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

  // INVENTORY UPDATE (server-authoritative, broadcast to all)
  socket.on(EVENTS.INVENTORY_UPDATE, ({ playerId, action, itemKey, instanceId }) => {
    const player = players.get(playerId);
    if (!player) return;
    let success = false;
    let message = '';
    let updatedInventory = player.inventory;
    switch (action) {
      case 'add':
        if (itemKey) {
          const item = createItemInstance(itemKey);
          updatedInventory = [...player.inventory, item];
          player.inventory = updatedInventory;
          success = true;
          message = `Added ${itemKey}`;
        }
        break;
      case 'remove':
        if (instanceId) {
          updatedInventory = player.inventory.filter(item => item.instanceId !== instanceId);
          player.inventory = updatedInventory;
          success = true;
          message = `Removed item ${instanceId}`;
        }
        break;
      case 'clear':
        player.inventory = [];
        updatedInventory = [];
        success = true;
        message = 'Inventory cleared';
        break;
      default:
        message = 'Invalid inventory action';
    }
    io.emit(EVENTS.ACTION_RESULT, { action: EVENTS.INVENTORY_UPDATE, success, message, data: { playerId, inventory: updatedInventory } });
  });

  // LOOT BAG DROP (broadcast to all)
  function dropLootBag(player) {
    if (player && player.alive && player.roomId) {
      const bagId = `bag-${player.character.id}-${Date.now()}`;
      bags.set(bagId, { roomId: player.roomId, items: player.inventory });
      io.emit(EVENTS.LOOT_BAG_DROP, { roomId: player.roomId, bagId, items: player.inventory });
    }
  }

  // LOOT BAG PICKUP (server-authoritative, broadcast to all)
  socket.on(EVENTS.LOOT_BAG_PICKUP, ({ playerId, bagId }) => {
    console.log('[SERVER] LOOT_BAG_PICKUP received:', { playerId, bagId });
    const bag = bags.get(bagId);
    const player = players.get(playerId);
    console.log('[SERVER] Found bag:', bag);
    console.log('[SERVER] Found player:', player ? player.character?.name : null);
    if (bag && player) {
      // Enrich all items with instanceId if missing
      const enrichedItems = bag.items.map(item => item.instanceId ? item : createItemInstance(item.itemKey || item.name || 'unknown'));
      console.log('[SERVER] Enriched items:', enrichedItems);
      player.inventory = [...player.inventory, ...enrichedItems];
      bags.delete(bagId);
      const actionResultPayload = { action: EVENTS.LOOT_BAG_PICKUP, success: true, message: 'Looted bag', data: { playerId, inventory: player.inventory } };
      console.log('[SERVER] Emitting ACTION_RESULT:', actionResultPayload);
      io.emit(EVENTS.ACTION_RESULT, actionResultPayload);
      io.emit(EVENTS.LOOT_BAG_DROP, { roomId: bag.roomId, bagId, items: [] }); // Remove bag for all
    } else {
      console.log('[SERVER] Bag not found or player not found.');
      socket.emit(EVENTS.ERROR, { message: 'Bag not found', code: 'BAG_NOT_FOUND' });
    }
  });

  // LOOT ITEM PICKUP
  socket.on(EVENTS.LOOT_ITEM_PICKUP, ({ playerId, bagId, itemKey }) => {
    console.log('[SERVER] LOOT_ITEM_PICKUP received:', { playerId, bagId, itemKey });
    const bag = bags.get(bagId);
    const player = players.get(playerId);
    if (bag && player) {
      // Find and remove the item from the bag
      const itemIndex = bag.items.findIndex(item => (item.itemKey || item.name) === itemKey);
      if (itemIndex !== -1) {
        const [removedItem] = bag.items.splice(itemIndex, 1);
        // Add to player inventory (enrich if needed)
        const itemToAdd = removedItem.instanceId ? removedItem : createItemInstance(itemKey);
        player.inventory = [...player.inventory, itemToAdd];
        // Broadcast updated inventory
        io.emit(EVENTS.ACTION_RESULT, { action: EVENTS.INVENTORY_UPDATE, success: true, message: `Picked up ${itemKey}`, data: { playerId, inventory: player.inventory } });
        // If bag is now empty, remove it and broadcast
        if (bag.items.length === 0) {
          bags.delete(bagId);
          io.emit(EVENTS.LOOT_BAG_DROP, { roomId: bag.roomId, bagId, items: [] });
        } else {
          // Otherwise, broadcast updated bag contents
          io.emit(EVENTS.LOOT_BAG_DROP, { roomId: bag.roomId, bagId, items: bag.items });
        }
      } else {
        socket.emit(EVENTS.ERROR, { message: 'Item not found in bag', code: 'ITEM_NOT_FOUND' });
      }
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