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
// --- Server-authoritative managers ---
import BagManager from './managers/BagManager.js';
import EncounterManager from './managers/EncounterManager.js';
import DungeonService from './managers/DungeonService.js';
import RoomManager from './managers/RoomManager.js';
import PlayerStats from './managers/PlayerStats.js';
import SpellManager from './managers/SpellManager.js';
import ItemManager from './managers/ItemManager.js';
import NPCLootManager from './managers/NPCLootManager.js';
import TreasureManager from './managers/TreasureManager.js';
import PuzzleManager from './managers/PuzzleManager.js';
import ShelfManager from './managers/ShelfManager.js';
import HintManager from './managers/HintManager.js';
import StatDefinitions from './managers/StatDefinitions.js';
import CharacterTypes from './managers/CharacterTypes.js';
import DebugHelper from './managers/DebugHelper.js';
import DungeonScene from './managers/DungeonScene.js';
import CombatVisuals from './managers/CombatVisuals.js';

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
      // If inventory is empty, give 1 red potion
      if (!character.inventory || character.inventory.length === 0) {
        character.inventory = [{ itemKey: 'Potion1(red)', name: 'Red Potion', asset: 'Potion1(red)', width: 1, height: 1, stackable: true, usable: true, instanceId: `Potion1(red)-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }];
        // Save to Supabase
        await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${playerId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({ inventory: character.inventory })
        });
      }
      players.get(playerId).inventory = character.inventory;
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

  // REQUEST ADD ITEM (for debug or admin only)
  socket.on('requestAddItem', async (itemKey) => {
    // Find the player by socket
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    // Add the item to inventory
    const newItem = { itemKey, name: itemKey, asset: itemKey, width: 1, height: 1, stackable: true, usable: true, instanceId: `${itemKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    player.inventory.push(newItem);
    // Save to Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${playerId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ inventory: player.inventory })
    });
    // Send updated inventory to client
    socket.emit('playerInventory', player.inventory);
  });

  // REQUEST REMOVE ITEM
  socket.on('requestRemoveItem', async (instanceId) => {
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    player.inventory = player.inventory.filter(item => item.instanceId !== instanceId);
    await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${playerId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ inventory: player.inventory })
    });
    socket.emit('playerInventory', player.inventory);
  });

  // REQUEST DROP ITEM
  socket.on('requestDropItem', async (instanceId) => {
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    const itemIdx = player.inventory.findIndex(item => item.instanceId === instanceId);
    if (itemIdx === -1) return;
    const [droppedItem] = player.inventory.splice(itemIdx, 1);
    // Create loot bag in current room
    const bagId = `bag-${playerId}-${Date.now()}`;
    bags.set(bagId, { roomId: player.roomId, items: [droppedItem] });
    io.to(player.roomId).emit(EVENTS.LOOT_BAG_DROP, { roomId: player.roomId, bagId, items: [droppedItem] });
    await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${playerId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ inventory: player.inventory })
    });
    socket.emit('playerInventory', player.inventory);
  });

  // REQUEST CLEAR INVENTORY
  socket.on('requestClearInventory', async () => {
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    player.inventory = [];
    await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${playerId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ inventory: player.inventory })
    });
    socket.emit('playerInventory', player.inventory);
  });

  // REQUEST ROOM ENTER
  socket.on('requestRoomEnter', ({ currentRoomId, direction, facing }) => {
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    const room = dungeon.rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    // Validate move
    const visibleDoors = RoomManager.getVisibleDoors(room, facing, dungeon);
    if (!visibleDoors.includes(direction)) return;
    const { dx, dy, newFacing, targetId } = RoomManager.getMovementDelta(facing, direction, room, dungeon);
    if (!targetId) return;
    // Update player state
    player.roomId = targetId;
    player.lastKnownRoom = targetId;
    player.facing = newFacing;
    // Emit new room state to client
    socket.emit('roomUpdate', {
      roomId: targetId,
      facing: newFacing,
      room: dungeon.rooms.find(r => r.id === targetId),
      inventory: player.inventory
    });
  });

  // REQUEST TURN
  socket.on('requestTurn', ({ currentRoomId, rotation, facing }) => {
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    const room = dungeon.rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    // Calculate new facing
    const newFacing = RoomManager.rotateFacing(facing, rotation);
    player.facing = newFacing;
    // Emit new room state to client
    socket.emit('roomUpdate', {
      roomId: currentRoomId,
      facing: newFacing,
      room,
      inventory: player.inventory
    });
  });

  // REQUEST LOOT ITEM
  socket.on('requestLootItem', async ({ sourceEntityId, itemKey }) => {
    // Find the player by socket
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    // Find the loot bag for the source entity
    const bagId = `bag-${sourceEntityId}`;
    const bag = bags.get(bagId);
    if (!bag) {
      socket.emit('lootResult', { success: false, message: 'Loot bag not found.' });
      return;
    }
    // Check if the item exists in the bag
    const itemIdx = bag.items.findIndex(item => item.itemKey === itemKey);
    if (itemIdx === -1) {
      socket.emit('lootResult', { success: false, message: 'Item not found in loot bag.' });
      return;
    }
    // Remove the item from the bag
    const [lootedItem] = bag.items.splice(itemIdx, 1);
    // Add to player inventory
    player.inventory.push(lootedItem);
    // Persist inventory to Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${playerId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ inventory: player.inventory })
    });
    // Emit updated inventory and loot state
    socket.emit('playerInventory', player.inventory);
    socket.emit('lootResult', { success: true, item: lootedItem, remaining: bag.items });
    // If bag is empty, remove it and notify all clients in the dungeon
    if (bag.items.length === 0) {
      bags.delete(bagId);
      io.emit(EVENTS.LOOT_BAG_EMPTY, { bagId });
    }
  });

  // REQUEST PUZZLE PICKUP
  socket.on('requestPuzzlePickup', async ({ roomId }) => {
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    const room = dungeon.rooms.find(r => r.id === roomId);
    if (!room || room.puzzleType !== 'key') {
      socket.emit('puzzlePickupResult', { success: false, message: 'No key puzzle in this room.' });
      return;
    }
    // Remove the puzzle from the room
    room.puzzleType = null;
    // Add the key to the player's inventory
    const newItem = { itemKey: 'Key1', name: 'Key', asset: 'Key1', width: 2, height: 1, stackable: false, usable: false, instanceId: `Key1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    player.inventory.push(newItem);
    // Persist inventory to Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${playerId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ inventory: player.inventory })
    });
    // Emit updated inventory and room state to the player
    socket.emit('playerInventory', player.inventory);
    socket.emit('puzzlePickupResult', { success: true, item: newItem, roomId });
    // Broadcast puzzle removal to all clients in the dungeon
    io.emit(EVENTS.PUZZLE_PICKED_UP, { roomId });
  });

  // REQUEST SHELF PICKUP
  socket.on('requestShelfPickup', async ({ roomId, itemType }) => {
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    const room = dungeon.rooms.find(r => r.id === roomId);
    if (!room) {
      socket.emit('shelfPickupResult', { success: false, message: 'Room not found.' });
      return;
    }
    let valid = false;
    if (['Emerald', 'BlueApatite', 'Amethyst', 'RawRuby'].includes(itemType) && room.gemType) {
      // Gem pickup
      const gemMap = {
        'Emerald': 'ShelfEmerald',
        'BlueApatite': 'ShelfBlueApatite',
        'Amethyst': 'ShelfAmethyst',
        'RawRuby': 'ShelfRawRuby'
      };
      if (room.gemType === gemMap[itemType]) {
        room.gemType = null;
        valid = true;
      }
    } else if (itemType === 'Potion1(red)' && room.hasPotion) {
      // Potion pickup
      room.hasPotion = false;
      valid = true;
    }
    if (!valid) {
      socket.emit('shelfPickupResult', { success: false, message: 'Item not available on shelf.' });
      return;
    }
    // Add the item to the player's inventory
    const newItem = { itemKey: itemType, name: itemType, asset: itemType, width: 1, height: 1, stackable: true, usable: true, instanceId: `${itemType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    player.inventory.push(newItem);
    // Persist inventory to Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${playerId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ inventory: player.inventory })
    });
    // Emit updated inventory and shelf state to the player
    socket.emit('playerInventory', player.inventory);
    socket.emit('shelfPickupResult', { success: true, item: newItem, roomId, itemType });
    // Broadcast shelf removal to all clients in the dungeon
    io.emit(EVENTS.SHELF_ITEM_PICKED_UP, { roomId, itemType });
  });

  // REQUEST TREASURE PICKUP
  socket.on('requestTreasurePickup', async ({ roomId }) => {
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    const room = dungeon.rooms.find(r => r.id === roomId);
    if (!room || !room.treasureLevel) {
      socket.emit('treasurePickupResult', { success: false, message: 'No treasure in this room.' });
      return;
    }
    // Use TreasureManager to collect the treasure
    const treasureManager = new TreasureManager();
    const itemKey = treasureManager.collectTreasure(room);
    if (!itemKey) {
      socket.emit('treasurePickupResult', { success: false, message: 'Treasure not available.' });
      return;
    }
    // Add the item to the player's inventory
    const newItem = { itemKey, name: itemKey, asset: itemKey, width: 1, height: 1, stackable: true, usable: true, instanceId: `${itemKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    player.inventory.push(newItem);
    // Persist inventory to Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${playerId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ inventory: player.inventory })
    });
    // Emit updated inventory and treasure state to the player
    socket.emit('playerInventory', player.inventory);
    socket.emit('treasurePickupResult', { success: true, item: newItem, roomId });
    // Broadcast treasure removal to all clients in the dungeon
    io.emit(EVENTS.TREASURE_PICKED_UP, { roomId });
  });

  // REQUEST ATTACK
  socket.on('requestAttack', async ({ initiatorId, targetId }) => {
    // Validate player and entities
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    // Use EncounterManager to process the attack
    const result = EncounterManager.handleAttack(initiatorId, targetId, playerId, dungeon, players);
    // Broadcast the attack result to all clients in the dungeon
    io.to(dungeon.id).emit('attackResult', result);
  });

  // REQUEST STEAL
  socket.on('requestSteal', async ({ initiatorId, targetId }) => {
    // Validate player and entities
    const playerEntry = Array.from(players.entries()).find(([_, p]) => p.socket === socket);
    if (!playerEntry) return;
    const [playerId, player] = playerEntry;
    // Use EncounterManager to process the steal
    const result = EncounterManager.handleSteal(initiatorId, targetId, playerId, dungeon, players);
    // Broadcast the steal result to all clients in the dungeon
    io.to(dungeon.id).emit('stealResult', result);
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