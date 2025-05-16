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

// Add global entities map for NPCs/monsters
const entities = new Map(); // entityId -> { character, roomId, inventory, health, ... }

// New encounter state: supports multiple players and entities per encounter
// Each encounter: { roomId, participants: [ { id, type: 'player'|'entity', partyId, isLeader } ], turnQueue: [id], currentTurn: id, parties: { [partyId]: { leaderId, members: [id] } }, aiGroups: { [groupId]: [entityId] } }
const encounters = new Map(); // roomId -> encounter object

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

// Helper: Get combatant (player or entity) by ID
function getCombatant(id) {
  return players.get(id) || entities.get(id);
}

// Helper: Is this a player?
function isPlayer(id) {
  return players.has(id);
}

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

  // --- Encounter Start: Create and register NPCs and start multi-entity encounter ---
  socket.on(EVENTS.ENCOUNTER_START, ({ participantIds, roomId }) => {
    // participantIds: array of all player and entity IDs in the encounter (party, AI group, etc.)
    // Create encounter with all participants
    const encounter = createEncounter(roomId, participantIds);
    // Notify clients of encounter start, including all participants
    io.to(roomId).emit(EVENTS.ENCOUNTER_START, {
      roomId,
      participants: encounter.participants,
      turnQueue: encounter.turnQueue,
      currentTurn: encounter.currentTurn,
      parties: encounter.parties,
      aiGroups: encounter.aiGroups
    });
    // Start first turn
    runNextTurn(roomId);
  });

  // Helper: Run the next turn in the encounter
  function runNextTurn(roomId) {
    const encounter = encounters.get(roomId);
    if (!encounter) return;
    encounter.currentTurn = encounter.turnQueue[0];
    const current = encounter.participants.find(p => p.id === encounter.currentTurn);
    if (!current) return;
    // If player, show action menu (with leader/member context)
    if (current.type === 'player') {
      const isLeader = current.isLeader;
      io.to(roomId).emit('showActionMenu', {
        initiatorId: current.id,
        roomId,
        isLeader,
        participants: encounter.participants,
        turnQueue: encounter.turnQueue
      });
    } else {
      // AI turn: run AI logic (to be expanded)
      runNpcTurn(roomId, current.id);
    }
  }

  // Helper: End turn and rotate to next participant
  function endTurn(roomId) {
    const encounter = encounters.get(roomId);
    if (!encounter) return;
    encounter.turnQueue.push(encounter.turnQueue.shift());
    runNextTurn(roomId);
  }

  // --- Update attack_intent handler for group targeting and evasion ---
  socket.on('attack_intent', ({ initiatorId, targetId, attackType, spellName, roomId }) => {
    const encounter = encounters.get(roomId);
    if (!encounter) return;
    // Only allow if it's the current turn
    if (encounter.currentTurn !== initiatorId) return;
    const attacker = getCombatant(initiatorId);
    const defender = getCombatant(targetId);
    if (!attacker || !defender) return;
    const attackerStats = attacker.character;
    const defenderStats = defender.character;
    // Evasion: Each 1 SPD = 1% evasion
    const evasionChance = Math.min(100, defenderStats.spd || 0);
    if (Math.random() * 100 < evasionChance) {
      const prompt = `${defenderStats.name || targetId} dodges the attack!`;
      io.to(roomId).emit('attack_result', { initiatorId, targetId, damage: 0, prompt, attackType, spellName, evaded: true });
      endTurn(roomId);
      return;
    }
    // Calculate damage (physical or spell)
    let rawDamage = 0;
    let prompt = '';
    if (attackType === 'physical') {
      let baseDamage = 10 * (attackerStats.str || 0);
      let defense = 0.5 * (defenderStats.vit || 0);
      let mitigation = Math.min(0.9, defense * 0.01);
      let finalDamage = Math.max(0, Math.floor(baseDamage * (1 - mitigation)));
      rawDamage = finalDamage;
      prompt = `${attackerStats.name || initiatorId} attacks ${defenderStats.name || targetId} for ${finalDamage} damage!`;
    } else if (attackType === 'spell') {
      let baseMagic = 0.10 * (attackerStats.int || 0) * 100;
      let magicDefense = 0.5 * (defenderStats.int || 0);
      let mitigation = Math.min(0.9, magicDefense * 0.01);
      let finalDamage = Math.max(0, Math.floor(baseMagic * (1 - mitigation)));
      rawDamage = finalDamage;
      prompt = `${attackerStats.name || initiatorId} casts ${spellName} on ${defenderStats.name || targetId} for ${finalDamage} damage!`;
    }
    defenderStats.health = Math.max(0, (defenderStats.health || defenderStats.maxHealth || 100) - rawDamage);
    io.to(roomId).emit('attack_result', { initiatorId, targetId, damage: rawDamage, prompt, attackType, spellName, evaded: false });
    io.to(roomId).emit('health_update', { playerId: targetId, health: defenderStats.health, maxHealth: defenderStats.maxHealth || 100 });
    if (defenderStats.health <= 0) {
      io.to(roomId).emit('entity_died', { entityId: targetId, attackerId: initiatorId });
      // Remove from encounter participants and turnQueue
      encounter.participants = encounter.participants.filter(p => p.id !== targetId);
      encounter.turnQueue = encounter.turnQueue.filter(id => id !== targetId);
      // Remove from entities/players
      if (players.has(targetId)) players.delete(targetId);
      if (entities.has(targetId)) entities.delete(targetId);
      // If only one team remains, end encounter
      const remainingTeams = new Set(encounter.participants.map(p => p.partyId || p.id));
      if (remainingTeams.size <= 1) {
        encounters.delete(roomId);
        io.to(roomId).emit('encounter_end', { roomId });
        return;
      }
    }
    endTurn(roomId);
  });

  // --- Update steal_intent handler ---
  socket.on('steal_intent', ({ initiatorId, targetId }) => {
    const initiator = getCombatant(initiatorId);
    const target = getCombatant(targetId);
    if (!initiator || !target) return;
    // Must be in the same room
    if (initiator.roomId !== target.roomId) return;
    let baseSuccessRate = 0.5;
    let initiatorDex = initiator.character.dex || 0;
    let targetDex = target.character.dex || 0;
    let initiatorStealBonus = 0.02 * initiatorDex;
    let targetProtectionPenalty = 0.02 * targetDex;
    let finalSuccessRate = Math.max(0.05, Math.min(0.95, baseSuccessRate + initiatorStealBonus - targetProtectionPenalty));
    let success = Math.random() < finalSuccessRate;
    let prompt = '';
    let itemTransferred = null;
    if (success && target.inventory && target.inventory.length > 0) {
      const idx = Math.floor(Math.random() * target.inventory.length);
      itemTransferred = target.inventory.splice(idx, 1)[0];
      initiator.inventory.push(itemTransferred);
      prompt = `${initiator.character.name || initiatorId} steals an item from ${target.character.name || targetId}!`;
    } else if (success) {
      prompt = `${initiator.character.name || initiatorId} tries to steal, but ${target.character.name || targetId} has nothing to steal!`;
    } else {
      prompt = `${initiator.character.name || initiatorId} fails to steal from ${target.character.name || targetId}.`;
    }
    // Emit results
    if (isPlayer(initiatorId)) io.to(initiator.socket.id).emit('steal_result', { initiatorId, targetId, success, item: itemTransferred, prompt, inventory: initiator.inventory });
    if (isPlayer(targetId)) io.to(target.socket.id).emit('steal_result', { initiatorId, targetId, success, item: itemTransferred, prompt, inventory: target.inventory });
    if (!isPlayer(initiatorId)) io.to(initiator.roomId).emit('steal_result', { initiatorId, targetId, success, item: itemTransferred, prompt, inventory: initiator.inventory });
    if (!isPlayer(targetId)) io.to(target.roomId).emit('steal_result', { initiatorId, targetId, success, item: itemTransferred, prompt, inventory: target.inventory });
    // Optionally, emit inventory updates
    if (isPlayer(initiatorId)) io.to(initiator.socket.id).emit('INVENTORY_UPDATE', { playerId: initiatorId, inventory: initiator.inventory });
    if (isPlayer(targetId)) io.to(target.socket.id).emit('INVENTORY_UPDATE', { playerId: targetId, inventory: target.inventory });
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

// Add a function to handle AI/NPC turns server-side
function handleNpcTurn(npcId, targetId) {
  const npc = players.get(npcId);
  const target = players.get(targetId);
  if (!npc || !target) return;
  // For now, always do a physical attack (expand for spells/AI later)
  let baseDamage = 10 * (npc.character.str || 0);
  let defense = 0.5 * (target.character.vit || 0);
  let mitigation = Math.min(0.9, defense * 0.01);
  let finalDamage = Math.max(0, Math.floor(baseDamage * (1 - mitigation)));
  let prompt = `${npc.character.name || npcId} attacks ${target.character.name || targetId} for ${finalDamage} damage!`;
  // Update target health
  target.character.health = Math.max(0, (target.character.health || target.character.maxHealth || 100) - finalDamage);
  io.to(target.socket.id).emit('attack_result', { initiatorId: npcId, targetId, damage: finalDamage, prompt, attackType: 'physical' });
  io.to(target.socket.id).emit('health_update', { playerId: targetId, health: target.character.health, maxHealth: target.character.maxHealth || 100 });
  io.to(npc.socket.id).emit('attack_result', { initiatorId: npcId, targetId, damage: finalDamage, prompt, attackType: 'physical' });
  io.to(npc.socket.id).emit('health_update', { playerId: targetId, health: target.character.health, maxHealth: target.character.maxHealth || 100 });
  if (target.character.health <= 0) {
    io.emit('entity_died', { entityId: targetId, attackerId: npcId });
    // TODO: Handle loot, end encounter, etc.
  }
  // TODO: Advance turn/order for next action
}

// Helper: Start a new encounter (server-authoritative)
function startEncounter(roomId, entityId, playerId, enemyStartsFirst) {
  const turnQueue = enemyStartsFirst ? [entityId, playerId] : [playerId, entityId];
  const currentTurn = turnQueue[0];
  encounters.set(roomId, { turnQueue, currentTurn, entityId, playerId });
  // Notify clients of encounter start (optional, for UI)
  io.to(roomId).emit(EVENTS.ENCOUNTER_START, { entityId, roomId });
  // Start first turn
  if (currentTurn === entityId) {
    runNpcTurn(roomId);
  } else {
    // Player's turn: tell client to show menu
    io.to(roomId).emit('showActionMenu', { initiatorId: playerId, targetId: entityId, roomId });
  }
}

// Helper: Rotate turn and run next action
function endTurn(roomId) {
  const encounter = encounters.get(roomId);
  if (!encounter) return;
  encounter.turnQueue.push(encounter.turnQueue.shift());
  encounter.currentTurn = encounter.turnQueue[0];
  // Next turn
  if (encounter.currentTurn === encounter.playerId) {
    io.to(roomId).emit('showActionMenu', { initiatorId: encounter.playerId, targetId: encounter.entityId, roomId });
  } else {
    setTimeout(() => runNpcTurn(roomId), 500); // Small delay for AI
  }
}

// Helper: Run NPC AI action (basic: always attack for now)
function runNpcTurn(roomId) {
  const encounter = encounters.get(roomId);
  if (!encounter) return;
  const entity = entities.get(encounter.entityId);
  if (!entity) return;
  // TODO: Port full AI logic from client (use CharacterTypes.js aiBehavior)
  // For now, always attempt to steal if gnome, else attack
  const entityType = entity.character.type;
  if (entityType === 'gnome') {
    // 70% chance to steal, else attack
    if (Math.random() < 0.7) {
      io.to(roomId).emit('npcAction', { type: 'steal', initiatorId: encounter.entityId, targetId: encounter.playerId });
      // Actually perform steal
      // (reuse steal_intent logic, but call directly)
      performSteal(encounter.entityId, encounter.playerId, roomId);
      return;
    }
  }
  // Default: attack
  io.to(roomId).emit('npcAction', { type: 'attack', initiatorId: encounter.entityId, targetId: encounter.playerId });
  performAttack(encounter.entityId, encounter.playerId, 'physical', null, roomId);
}

// Helper: Perform attack (same as attack_intent, but for AI)
function performAttack(initiatorId, targetId, attackType, spellName, roomId) {
  const attacker = getCombatant(initiatorId);
  const defender = getCombatant(targetId);
  if (!attacker || !defender) return;
  const attackerStats = attacker.character;
  const defenderStats = defender.character;
  let rawDamage = 0;
  let prompt = '';
  if (attackType === 'physical') {
    let baseDamage = 10 * (attackerStats.str || 0);
    let defense = 0.5 * (defenderStats.vit || 0);
    let mitigation = Math.min(0.9, defense * 0.01);
    let finalDamage = Math.max(0, Math.floor(baseDamage * (1 - mitigation)));
    rawDamage = finalDamage;
    prompt = `${attackerStats.name || initiatorId} attacks ${defenderStats.name || targetId} for ${finalDamage} damage!`;
  } else if (attackType === 'spell') {
    let baseMagic = 0.10 * (attackerStats.int || 0) * 100;
    let magicDefense = 0.5 * (defenderStats.int || 0);
    let mitigation = Math.min(0.9, magicDefense * 0.01);
    let finalDamage = Math.max(0, Math.floor(baseMagic * (1 - mitigation)));
    rawDamage = finalDamage;
    prompt = `${attackerStats.name || initiatorId} casts ${spellName} on ${defenderStats.name || targetId} for ${finalDamage} damage!`;
  }
  defenderStats.health = Math.max(0, (defenderStats.health || defenderStats.maxHealth || 100) - rawDamage);
  io.to(roomId).emit('attack_result', { initiatorId, targetId, damage: rawDamage, prompt, attackType, spellName });
  io.to(roomId).emit('health_update', { playerId: targetId, health: defenderStats.health, maxHealth: defenderStats.maxHealth || 100 });
  if (defenderStats.health <= 0) {
    io.to(roomId).emit('entity_died', { entityId: targetId, attackerId: initiatorId });
    // End encounter
    encounters.delete(roomId);
    return;
  }
  // Rotate turn
  endTurn(roomId);
}

// Helper: Perform steal (same as steal_intent, but for AI)
function performSteal(initiatorId, targetId, roomId) {
  const initiator = getCombatant(initiatorId);
  const target = getCombatant(targetId);
  if (!initiator || !target) return;
  if (initiator.roomId !== target.roomId) return;
  let baseSuccessRate = 0.5;
  let initiatorDex = initiator.character.dex || 0;
  let targetDex = target.character.dex || 0;
  let initiatorStealBonus = 0.02 * initiatorDex;
  let targetProtectionPenalty = 0.02 * targetDex;
  let finalSuccessRate = Math.max(0.05, Math.min(0.95, baseSuccessRate + initiatorStealBonus - targetProtectionPenalty));
  let success = Math.random() < finalSuccessRate;
  let prompt = '';
  let itemTransferred = null;
  if (success && target.inventory && target.inventory.length > 0) {
    const idx = Math.floor(Math.random() * target.inventory.length);
    itemTransferred = target.inventory.splice(idx, 1)[0];
    initiator.inventory.push(itemTransferred);
    prompt = `${initiator.character.name || initiatorId} steals an item from ${target.character.name || targetId}!`;
  } else if (success) {
    prompt = `${initiator.character.name || initiatorId} tries to steal, but ${target.character.name || targetId} has nothing to steal!`;
  } else {
    prompt = `${initiator.character.name || initiatorId} fails to steal from ${target.character.name || targetId}.`;
  }
  io.to(roomId).emit('steal_result', { initiatorId, targetId, success, item: itemTransferred, prompt, inventory: initiator.inventory });
  io.to(roomId).emit('INVENTORY_UPDATE', { playerId: initiatorId, inventory: initiator.inventory });
  io.to(roomId).emit('INVENTORY_UPDATE', { playerId: targetId, inventory: target.inventory });
  // Rotate turn
  endTurn(roomId);
}

// Helper: Create a new encounter (enforce max party/group size 3)
function createEncounter(roomId, participantIds) {
  // participantIds: array of player/entity IDs (players, party members, AI group members)
  // Enforce max size for each party/group
  const participants = [];
  const partyMap = new Map(); // partyId -> [ids]
  const aiGroupMap = new Map(); // groupId -> [ids]
  for (const id of participantIds) {
    const isPlayer = players.has(id);
    let partyId = null;
    let groupId = null;
    if (isPlayer && players.get(id).partyId) partyId = players.get(id).partyId;
    if (!isPlayer && entities.get(id)?.groupId) groupId = entities.get(id).groupId;
    if (partyId) {
      if (!partyMap.has(partyId)) partyMap.set(partyId, []);
      if (partyMap.get(partyId).length < 3) partyMap.get(partyId).push(id);
    } else if (groupId) {
      if (!aiGroupMap.has(groupId)) aiGroupMap.set(groupId, []);
      if (aiGroupMap.get(groupId).length < 3) aiGroupMap.get(groupId).push(id);
    } else {
      participants.push({ id, type: isPlayer ? 'player' : 'entity', partyId: partyId || null, isLeader: false });
    }
  }
  // Add parties and AI groups, enforcing structure Leader > Member 1 > Member 2
  const parties = {};
  for (const [partyId, ids] of partyMap.entries()) {
    parties[partyId] = { leaderId: ids[0], members: ids };
    ids.forEach((id, idx) => {
      participants.push({ id, type: 'player', partyId, isLeader: idx === 0 });
    });
  }
  const aiGroups = {};
  for (const [groupId, ids] of aiGroupMap.entries()) {
    aiGroups[groupId] = ids;
    ids.forEach((id, idx) => {
      participants.push({ id, type: 'entity', partyId: null, isLeader: idx === 0 });
    });
  }
  // Initial turn queue: all participants, order can be customized
  const turnQueue = [...participants.map(p => p.id)];
  const currentTurn = turnQueue[0];
  const encounter = { roomId, participants, turnQueue, currentTurn, parties, aiGroups };
  encounters.set(roomId, encounter);
  return encounter;
}

// --- Movement and Encounter Trigger Logic: Only leaders can trigger encounters ---
function canTriggerEncounter(playerId) {
  // Only allow if player is not in a party, or is the party leader
  const player = players.get(playerId);
  if (!player) return false;
  if (!player.partyId) return true;
  // Check if leader
  const encounterRoom = Array.from(encounters.values()).find(e => e.parties && e.parties[player.partyId]);
  if (encounterRoom && encounterRoom.parties[player.partyId].leaderId === playerId) return true;
  // If not in an encounter, check party leader
  return player.partyId && player.partyId in player && player.partyId.leaderId === playerId;
} 