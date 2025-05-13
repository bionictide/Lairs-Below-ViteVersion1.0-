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

// --- Socket.io Event Handlers ---
io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id, 'User:', socket.user?.id || '[no user]');

  // --- DEBUG: Catch-all event logger ---
  socket.onAny((event, ...args) => {
    console.log('[SOCKET] Received event:', event, args);
  });

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

  // --- INVENTORY & LOOT BAG SERVER-AUTHORITATIVE HANDLERS ---

  // Add item to inventory (e.g., from loot, pickup)
  socket.on('INVENTORY_ADD_ITEM', ({ playerId, itemKey }) => {
    console.log('[SERVER] INVENTORY_ADD_ITEM received:', { playerId, itemKey });
    const player = players.get(playerId);
    if (!player) return socket.emit(EVENTS.ERROR, { message: 'Player not found', code: 'PLAYER_NOT_FOUND' });
    // Validate itemKey against allowed items (use shared itemData)
    // For now, just add to inventory
    const newItem = { itemKey, instanceId: `${itemKey}-${Date.now()}` };
    player.inventory.push(newItem);
    // Always assign gridX/gridY as -1 (client will assign on receipt)
    newItem.gridX = -1;
    newItem.gridY = -1;
    io.to(player.socket.id).emit('INVENTORY_UPDATE', { playerId, inventory: player.inventory });
    io.to(player.socket.id).emit(EVENTS.ACTION_RESULT, { action: 'INVENTORY_ADD_ITEM', success: true, message: `Added ${itemKey}` });
  });

  // Remove item from inventory (drop or use)
  socket.on('INVENTORY_REMOVE_ITEM', ({ playerId, instanceId }) => {
    const player = players.get(playerId);
    if (!player) return socket.emit(EVENTS.ERROR, { message: 'Player not found', code: 'PLAYER_NOT_FOUND' });
    const idx = player.inventory.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return socket.emit(EVENTS.ERROR, { message: 'Item not found', code: 'ITEM_NOT_FOUND' });
    // Remove the item, but do NOT mutate or reset gridX/gridY for remaining items
    const [removed] = player.inventory.splice(idx, 1);
    // Send inventory as-is, preserving gridX/gridY for all remaining items
    io.to(player.socket.id).emit('INVENTORY_UPDATE', { playerId, inventory: player.inventory });
    io.to(player.socket.id).emit(EVENTS.ACTION_RESULT, { action: 'INVENTORY_REMOVE_ITEM', success: true, message: `Removed ${removed.itemKey}` });
  });

  // Use item from inventory
  socket.on('INVENTORY_USE_ITEM', ({ playerId, instanceId }) => {
    const player = players.get(playerId);
    if (!player) return socket.emit(EVENTS.ERROR, { message: 'Player not found', code: 'PLAYER_NOT_FOUND' });
    const idx = player.inventory.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return socket.emit(EVENTS.ERROR, { message: 'Item not found', code: 'ITEM_NOT_FOUND' });
    const item = player.inventory[idx];
    player.inventory.splice(idx, 1);
    // Send inventory as-is, preserving gridX/gridY for all remaining items
    io.to(player.socket.id).emit('INVENTORY_UPDATE', { playerId, inventory: player.inventory });
    io.to(player.socket.id).emit(EVENTS.ACTION_RESULT, { action: 'INVENTORY_USE_ITEM', success: true, message: `Used ${item.itemKey}` });
  });

  // Drop loot bag (e.g., on death/disconnect)
  socket.on('LOOT_BAG_DROP', ({ playerId, roomId, items }) => {
    const bagId = `bag-${playerId}-${Date.now()}`;
    bags.set(bagId, { roomId, items });
    io.to(roomId).emit('LOOT_BAG_UPDATE', { bagId, items });
    io.to(playerId).emit(EVENTS.ACTION_RESULT, { action: 'LOOT_BAG_DROP', success: true, message: 'Dropped loot bag', data: { bagId } });
    // TODO: Sync to Supabase at key points
  });

  // Pick up a specific item from a loot bag
  socket.on('LOOT_BAG_PICKUP', ({ playerId, bagId, instanceId }) => {
    console.log('[SERVER] LOOT_BAG_PICKUP received:', { playerId, bagId, instanceId });
    const bag = bags.get(bagId);
    const player = players.get(playerId);
    if (!bag || !player) return socket.emit(EVENTS.ERROR, { message: 'Bag or player not found', code: 'BAG_OR_PLAYER_NOT_FOUND' });
    const idx = bag.items.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return socket.emit(EVENTS.ERROR, { message: 'Item not found in bag', code: 'ITEM_NOT_FOUND_IN_BAG' });
    const [item] = bag.items.splice(idx, 1);
    item.gridX = -1;
    item.gridY = -1;
    player.inventory.push(item);
    if (bag.items.length === 0) bags.delete(bagId);
    io.to(player.socket.id).emit('INVENTORY_UPDATE', { playerId, inventory: player.inventory });
    io.emit('LOOT_BAG_UPDATE', { bagId, items: bag.items });
  });

  // Move item in inventory (drag-and-drop, server-authoritative)
  socket.on('INVENTORY_MOVE_ITEM', ({ playerId, instanceId, gridX, gridY }) => {
    const player = players.get(playerId);
    if (!player) return socket.emit(EVENTS.ERROR, { message: 'Player not found', code: 'PLAYER_NOT_FOUND' });
    const item = player.inventory.find(i => i.instanceId === instanceId);
    if (!item) return socket.emit(EVENTS.ERROR, { message: 'Item not found', code: 'ITEM_NOT_FOUND' });
    // Validate bounds
    const gridCols = 10;
    const gridRows = 7;
    const itemWidth = item.width || 1;
    const itemHeight = item.height || 1;
    if (gridX < 0 || gridY < 0 || gridX + itemWidth > gridCols || gridY + itemHeight > gridRows) {
      return socket.emit(EVENTS.ERROR, { message: 'Out of bounds', code: 'OUT_OF_BOUNDS' });
    }
    // Check for overlap
    for (const other of player.inventory) {
      if (other.instanceId === instanceId) continue;
      const otherWidth = other.width || 1;
      const otherHeight = other.height || 1;
      if (
        gridX < (other.gridX + otherWidth) &&
        (gridX + itemWidth) > other.gridX &&
        gridY < (other.gridY + otherHeight) &&
        (gridY + itemHeight) > other.gridY
      ) {
        return socket.emit(EVENTS.ERROR, { message: 'Slot occupied', code: 'OVERLAP' });
      }
    }
    // Valid move
    item.gridX = gridX;
    item.gridY = gridY;
    io.to(player.socket.id).emit('INVENTORY_UPDATE', { playerId, inventory: player.inventory });
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

  // SHELF_PICKUP_REQUEST
  socket.on('SHELF_PICKUP_REQUEST', ({ playerId, roomId, itemKey }) => {
    const player = players.get(playerId);
    const room = dungeon.rooms.find(r => r.id === roomId);
    if (!player || !room) return socket.emit(EVENTS.ERROR, { message: 'Player or room not found', code: 'NOT_FOUND' });
    let found = false;
    if (room.gemType && itemKey && room.gemType.replace('Shelf', '') === itemKey) {
      room.gemType = null;
      found = true;
    } else if (room.hasPotion && itemKey === 'Potion1(red)') {
      room.hasPotion = false;
      found = true;
    }
    if (!found) return socket.emit(EVENTS.ERROR, { message: 'Item not found on shelf', code: 'ITEM_NOT_FOUND' });
    const newItem = { itemKey, instanceId: `${itemKey}-${Date.now()}` };
    newItem.gridX = -1;
    newItem.gridY = -1;
    player.inventory.push(newItem);
    io.to(player.socket.id).emit('INVENTORY_UPDATE', { playerId, inventory: player.inventory });
    io.emit('SHELF_UPDATE', { roomId, itemKey });
  });

  // TREASURE_PICKUP_REQUEST
  socket.on('TREASURE_PICKUP_REQUEST', ({ playerId, roomId, itemKey }) => {
    const player = players.get(playerId);
    const room = dungeon.rooms.find(r => r.id === roomId);
    if (!player || !room) return socket.emit(EVENTS.ERROR, { message: 'Player or room not found', code: 'NOT_FOUND' });
    // Prevent double-looting: only allow if treasureLevel is present and matches
    if (!room.treasureLevel || room.treasureLevel !== itemKey) {
      return socket.emit(EVENTS.ERROR, { message: 'Treasure not found', code: 'TREASURE_NOT_FOUND' });
    }
    // Add item to inventory first
    const newItem = { itemKey, instanceId: `${itemKey}-${Date.now()}` };
    newItem.gridX = -1;
    newItem.gridY = -1;
    player.inventory.push(newItem);
    io.to(player.socket.id).emit('INVENTORY_UPDATE', { playerId, inventory: player.inventory });
    // Now remove the treasure from the room and emit update to all clients
    room.treasureLevel = null;
    io.emit('TREASURE_UPDATE', { roomId, itemKey });
  });

  // PUZZLE_PICKUP_REQUEST
  socket.on('PUZZLE_PICKUP_REQUEST', ({ playerId, roomId, itemKey }) => {
    const player = players.get(playerId);
    const room = dungeon.rooms.find(r => r.id === roomId);
    if (!player || !room) return socket.emit(EVENTS.ERROR, { message: 'Player or room not found', code: 'NOT_FOUND' });
    // Only allow pickup if puzzle is present
    if (room.puzzleType !== 'key' || itemKey !== 'Key1') {
      return socket.emit(EVENTS.ERROR, { message: 'Puzzle not found', code: 'PUZZLE_NOT_FOUND' });
    }
    // Remove the puzzle from the room
    room.puzzleType = null;
    // Add item to inventory
    const newItem = { itemKey, instanceId: `${itemKey}-${Date.now()}` };
    newItem.gridX = -1;
    newItem.gridY = -1;
    player.inventory.push(newItem);
    io.to(player.socket.id).emit('INVENTORY_UPDATE', { playerId, inventory: player.inventory });
    io.emit('PUZZLE_UPDATE', { roomId, itemKey });
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