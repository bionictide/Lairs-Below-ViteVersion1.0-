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
import { characterDefinitions, getCharacterDefinition } from './CharacterTypes.js';

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

  // --- Update spell_cast handler for group targeting and evasion ---
  socket.on(EVENTS.SPELL_CAST, ({ playerId, spellName, targetId, roomId }) => {
    const encounter = encounters.get(roomId);
    if (!encounter) return;
    // Only allow if it's the current turn
    if (encounter.currentTurn !== playerId) return;
    const caster = getCombatant(playerId);
    const target = getCombatant(targetId);
    if (!caster) {
      console.warn(`[SERVER] spell_cast: Caster not found: ${playerId}`);
      encounter.participants = encounter.participants.filter(p => p.id !== playerId);
      encounter.turnQueue = encounter.turnQueue.filter(id => id !== playerId);
      endTurn(roomId);
      return;
    }
    if (!target) {
      console.warn(`[SERVER] spell_cast: Target not found: ${targetId}`);
      encounter.participants = encounter.participants.filter(p => p.id !== targetId);
      encounter.turnQueue = encounter.turnQueue.filter(id => id !== targetId);
      endTurn(roomId);
      return;
    }
    if (!caster.character || !target.character) {
      console.warn(`[SERVER] spell_cast: Missing character stats for caster (${playerId}) or target (${targetId})`);
      endTurn(roomId);
      return;
    }
    // Evasion: Each 1 SPD = 1% evasion
    const evasionChance = Math.min(100, target.character.spd || 0);
    if (Math.random() * 100 < evasionChance) {
      const prompt = `${target.character.name || targetId} dodges the spell!`;
      io.to(roomId).emit('spell_result', { result: 'evaded', damage: 0, effects: [], targetId, evaded: true, prompt: prompt });
      endTurn(roomId);
      return;
    }
    // Calculate spell damage (simple placeholder, replace with real logic)
    let baseMagic = 0.10 * (caster.character.int || 0) * 100;
    let magicDefense = 0.5 * (target.character.int || 0);
    let mitigation = Math.min(0.9, magicDefense * 0.01);
    let finalDamage = Math.max(0, Math.floor(baseMagic * (1 - mitigation)));
    target.character.health = Math.max(0, (target.character.health || target.character.maxHealth || 100) - finalDamage);
    const prompt = `${caster.character.name || playerId} casts ${spellName} on ${target.character.name || targetId} for ${finalDamage} damage!`;
    io.to(roomId).emit('spell_result', { result: 'success', damage: finalDamage, effects: [], targetId, evaded: false, prompt: prompt });
    io.to(roomId).emit('health_update', { playerId: targetId, health: target.character.health, maxHealth: target.character.maxHealth || 100 });
    if (target.character.health <= 0) {
      io.to(roomId).emit('entity_died', { entityId: targetId, attackerId: playerId });
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

  // TRADE REQUEST (placeholder)
  socket.on(EVENTS.TRADE_REQUEST, (payload) => {
    // TODO: Implement trading logic
    socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.TRADE_REQUEST, success: false, message: 'Trading not implemented yet' });
  });

  // --- Party invite, update, and leave flows ---
  socket.on(EVENTS.PARTY_INVITE, ({ fromPlayerId, toPlayerId }) => {
    // Only allow if both are in a PvP encounter and not already in a party
    const fromPlayer = players.get(fromPlayerId);
    const toPlayer = players.get(toPlayerId);
    if (!fromPlayer || !toPlayer) return;
    if (fromPlayer.partyId || toPlayer.partyId) {
      socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.PARTY_INVITE, success: false, message: 'Already in a party' });
      return;
    }
    // Mark invite as pending (simple in-memory, could be extended)
    fromPlayer.pendingPartyInvite = toPlayerId;
    toPlayer.pendingPartyInvite = fromPlayerId;
    // Notify both players (client will show accept button for toPlayer)
    io.to(toPlayer.socket.id).emit(EVENTS.PARTY_UPDATE, { partyId: null, leaderId: fromPlayerId, members: [fromPlayerId, toPlayerId], roomId: fromPlayer.roomId });
  });

  socket.on(EVENTS.PARTY_UPDATE, ({ partyId, leaderId, members, roomId }) => {
    // Accept party invite: both players must have pending invites for each other
    if (!partyId && members.length === 2) {
      const [p1, p2] = members;
      const player1 = players.get(p1);
      const player2 = players.get(p2);
      if (!player1 || !player2) return;
      if (player1.pendingPartyInvite !== p2 || player2.pendingPartyInvite !== p1) return;
      // Form party
      const newPartyId = `party-${p1}-${p2}-${Date.now()}`;
      player1.partyId = newPartyId;
      player2.partyId = newPartyId;
      player1.isPartyLeader = true;
      player2.isPartyLeader = false;
      delete player1.pendingPartyInvite;
      delete player2.pendingPartyInvite;
      // Sync both to leader's room
      player2.roomId = player1.roomId;
      io.to(player1.socket.id).emit(EVENTS.PARTY_UPDATE, { partyId: newPartyId, leaderId: p1, members: [p1, p2], roomId: player1.roomId });
      io.to(player2.socket.id).emit(EVENTS.PARTY_UPDATE, { partyId: newPartyId, leaderId: p1, members: [p1, p2], roomId: player1.roomId });
    }
  });

  socket.on(EVENTS.PARTY_LEAVE, ({ playerId, partyId }) => {
    const player = players.get(playerId);
    if (!player || player.partyId !== partyId) return;
    // Move player to previous room and break alliance
    player.partyId = null;
    player.isPartyLeader = false;
    // TODO: Move to previous room (if tracked)
    io.to(player.socket.id).emit(EVENTS.PARTY_UPDATE, { partyId: null, leaderId: null, members: [playerId], roomId: player.roomId });
    // If only one member remains, dissolve party
    const partyMembers = Array.from(players.values()).filter(p => p.partyId === partyId);
    if (partyMembers.length === 1) {
      const lastMember = partyMembers[0];
      lastMember.partyId = null;
      lastMember.isPartyLeader = false;
      io.to(lastMember.socket.id).emit(EVENTS.PARTY_UPDATE, { partyId: null, leaderId: null, members: [lastMember.id], roomId: lastMember.roomId });
    }
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
    // Enrich each participant with full character display/stat data
    const enrichedParticipants = encounter.participants.map(p => {
      let charData = null;
      if (p.type === 'player') {
        const player = players.get(p.id);
        if (player && player.character) {
          charData = player.character;
        }
      } else if (p.type === 'entity') {
        const entity = entities.get(p.id);
        if (entity && entity.character) {
          charData = entity.character;
        }
      }
      if (!charData) {
        console.warn(`[SERVER] ENCOUNTER_START: Missing character data for participant ${p.id} (${p.type})`);
        charData = { name: p.id, type: p.type };
      }
      return {
        ...p,
        name: charData.name,
        assetPrefix: charData.assetPrefix,
        stats: charData.stats,
        health: charData.health,
        maxHealth: charData.maxHealth,
        lootTier: charData.lootTier,
        abilities: charData.abilities,
        mood: charData.mood,
      };
    });
    // Notify clients of encounter start, including all participants
    io.to(roomId).emit(EVENTS.ENCOUNTER_START, {
      roomId,
      participants: enrichedParticipants,
      turnQueue: encounter.turnQueue,
      currentTurn: encounter.currentTurn,
      parties: encounter.parties,
      aiGroups: encounter.aiGroups
    });
    // Start first turn
    endTurn(roomId);
  });

  // --- Update attack_intent handler for group targeting and evasion ---
  socket.on('attack_intent', ({ initiatorId, targetId, attackType, spellName, roomId }) => {
    const encounter = encounters.get(roomId);
    if (!encounter) return;
    // Only allow if it's the current turn
    if (encounter.currentTurn !== initiatorId) return;
    const attacker = getCombatant(initiatorId);
    const defender = getCombatant(targetId);
    if (!attacker) {
      console.warn(`[SERVER] attack_intent: Attacker not found: ${initiatorId}`);
      encounter.participants = encounter.participants.filter(p => p.id !== initiatorId);
      encounter.turnQueue = encounter.turnQueue.filter(id => id !== initiatorId);
      endTurn(roomId);
      return;
    }
    if (!defender) {
      console.warn(`[SERVER] attack_intent: Defender not found: ${targetId}`);
      encounter.participants = encounter.participants.filter(p => p.id !== targetId);
      encounter.turnQueue = encounter.turnQueue.filter(id => id !== targetId);
      endTurn(roomId);
      return;
    }
    const attackerStats = attacker.character;
    const defenderStats = defender.character;
    if (!attackerStats || !defenderStats) {
      console.warn(`[SERVER] attack_intent: Missing character stats for attacker (${initiatorId}) or defender (${targetId})`);
      endTurn(roomId);
      return;
    }
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

  // --- Update steal_intent handler for group targeting and evasion ---
  socket.on('steal_intent', ({ initiatorId, targetId, roomId }) => {
    const encounter = encounters.get(roomId);
    if (!encounter) return;
    // Only allow if it's the current turn
    if (encounter.currentTurn !== initiatorId) return;
    const initiator = getCombatant(initiatorId);
    const target = getCombatant(targetId);
    if (!initiator) {
      console.warn(`[SERVER] steal_intent: Initiator not found: ${initiatorId}`);
      encounter.participants = encounter.participants.filter(p => p.id !== initiatorId);
      encounter.turnQueue = encounter.turnQueue.filter(id => id !== initiatorId);
      endTurn(roomId);
      return;
    }
    if (!target) {
      console.warn(`[SERVER] steal_intent: Target not found: ${targetId}`);
      encounter.participants = encounter.participants.filter(p => p.id !== targetId);
      encounter.turnQueue = encounter.turnQueue.filter(id => id !== targetId);
      endTurn(roomId);
      return;
    }
    if (!initiator.character || !target.character) {
      console.warn(`[SERVER] steal_intent: Missing character stats for initiator (${initiatorId}) or target (${targetId})`);
      endTurn(roomId);
      return;
    }
    // Evasion: Each 1 SPD = 1% evasion
    const evasionChance = Math.min(100, target.character.spd || 0);
    if (Math.random() * 100 < evasionChance) {
      const prompt = `${target.character.name || targetId} dodges the steal attempt!`;
      io.to(roomId).emit('steal_result', { initiatorId, targetId, success: false, item: null, prompt, evaded: true, inventory: initiator.inventory });
      endTurn(roomId);
      return;
    }
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
    io.to(roomId).emit('steal_result', { initiatorId, targetId, success, item: itemTransferred, prompt, evaded: false, inventory: initiator.inventory });
    io.to(roomId).emit('INVENTORY_UPDATE', { playerId: initiatorId, inventory: initiator.inventory });
    io.to(roomId).emit('INVENTORY_UPDATE', { playerId: targetId, inventory: target.inventory });
    endTurn(roomId);
  });

  // --- Navigation and Flee: Only leader can initiate, all members follow ---
  socket.on('NAVIGATE', ({ playerId, direction, roomId }) => {
    const player = players.get(playerId);
    if (!player) return;
    // Only allow if not in a party or is the party leader
    if (player.partyId && !player.isPartyLeader) return;
    // Move leader and all party members
    const partyMembers = player.partyId ? Array.from(players.values()).filter(p => p.partyId === player.partyId) : [player];
    for (const member of partyMembers) {
      member.roomId = roomId;
      io.to(member.socket.id).emit('ROOM_UPDATE', {
        roomId,
        players: Array.from(rooms.get(roomId)?.players || []),
        entities: rooms.get(roomId)?.entities || [],
        visited: Array.from(visitedRooms.get(member.id) || [])
      });
      // Join socket room
      member.socket.join(roomId);
    }
  });

  socket.on('FLEE', ({ playerId, roomId }) => {
    const player = players.get(playerId);
    if (!player) return;
    // Only allow if not in a party or is the party leader
    if (player.partyId && !player.isPartyLeader) return;
    // Flee logic: move leader and all party members to previous room
    const partyMembers = player.partyId ? Array.from(players.values()).filter(p => p.partyId === player.partyId) : [player];
    for (const member of partyMembers) {
      // Move to previous room if tracked
      if (member.lastKnownRoom) {
        member.roomId = member.lastKnownRoom;
        io.to(member.socket.id).emit('ROOM_UPDATE', {
          roomId: member.lastKnownRoom,
          players: Array.from(rooms.get(member.lastKnownRoom)?.players || []),
          entities: rooms.get(member.lastKnownRoom)?.entities || [],
          visited: Array.from(visitedRooms.get(member.id) || [])
        });
        member.socket.join(member.lastKnownRoom);
      }
    }
    // End encounter for all
    encounters.delete(roomId);
    io.to(roomId).emit('encounter_end', { roomId });
  });

  // --- AI/NPC Turn Logic (Server-Authoritative) ---
  socket.on('AI_TURN', ({ playerId, roomId }) => {
    const encounter = encounters.get(roomId);
    if (!encounter) return;
    const npc = getCombatant(playerId);
    if (!npc) return;
    const npcDef = characterDefinitions[npc.type];
    if (!npcDef || !npcDef.aiBehavior) return;
    const ai = npcDef.aiBehavior;
    // Find valid targets (opposing team)
    const npcPartyId = npc.partyId || npc.id;
    const targets = encounter.participants.filter(p => (p.partyId || p.id) !== npcPartyId);
    if (targets.length === 0) return;
    const target = targets[Math.floor(Math.random() * targets.length)];
    // --- AI Decision Tree ---
    // 1. Low Health Action
    const lowHealth = npc.health < (npc.maxHealth * ((ai.lowHealthAction && ai.lowHealthAction.fleeThreshold) || 0.2));
    if (lowHealth && ai.lowHealthAction) {
      if (ai.lowHealthAction.type === 'AttemptFlee' && Math.random() < (ai.lowHealthAction.chance || 0)) {
        console.log(`[SERVER] AI (${npc.id}) attempts to flee due to low health.`);
        // Flee logic: remove NPC, emit prompt, end encounter
        io.to(roomId).emit('showActionPrompt', `${npcDef.name} attempts to flee... succeeds!`);
        // Remove from encounter
        encounter.participants = encounter.participants.filter(p => p.id !== npc.id);
        encounter.turnQueue = encounter.turnQueue.filter(id => id !== npc.id);
        if (encounter.participants.length <= 1) {
          encounters.delete(roomId);
          io.to(roomId).emit('encounter_end', { roomId });
          return;
        }
        endTurn(roomId);
        return;
      }
      // Other low health actions (e.g., heal/stand firm) can be added here
    }
    // 2. Mood/Angry Action (not tracked server-side yet, fallback to standard)
    // 3. Standard Action
    let action = ai.standardAction;
    if (ai.angryAction && npc.mood === 'angry') action = ai.angryAction;
    // WeightedChoice for angryAction
    if (action && action.type === 'WeightedChoice' && Array.isArray(action.choices)) {
      // Weighted random selection
      const totalWeight = action.choices.reduce((sum, c) => sum + (c.weight || 1), 0);
      let r = Math.random() * totalWeight;
      let chosen = action.choices[0];
      for (const c of action.choices) {
        if (r < (c.weight || 1)) { chosen = c; break; }
        r -= (c.weight || 1);
      }
      action = chosen;
    }
    console.log(`[SERVER] AI (${npc.id}) selected action: ${action && action.type} on target: ${target.id}`);
    // Execute action
    switch (action && action.type) {
      case 'Attack':
        console.log(`[SERVER] AI (${npc.id}) performing Attack on ${target.id}`);
        performAttack(npc.id, target.id, 'physical', null, roomId);
        break;
      case 'AttemptSteal':
        if (!action.chance || Math.random() < action.chance) {
          console.log(`[SERVER] AI (${npc.id}) attempting Steal on ${target.id}`);
          performSteal(npc.id, target.id, roomId);
        } else {
          io.to(roomId).emit('showActionPrompt', `${npcDef.name} eyes your belongings but does nothing.`);
          endTurn(roomId);
        }
        break;
      case 'ShowPrompt':
        console.log(`[SERVER] AI (${npc.id}) showing prompt: ${action.prompt}`);
        io.to(roomId).emit('showActionPrompt', action.prompt.replace('{NAME}', npcDef.name));
        endTurn(roomId);
        break;
      default:
        console.log(`[SERVER] AI (${npc.id}) defaulting to Attack on ${target.id}`);
        performAttack(npc.id, target.id, 'physical', null, roomId);
        break;
    }
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

// Ensure the server listens on all interfaces
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

// Helper: End turn, rotate, and run next action (unified, robust)
function endTurn(roomId) {
  const encounter = encounters.get(roomId);
  if (!encounter) return;
  // Remove any dead/invalid participants from turnQueue and participants
  encounter.turnQueue = encounter.turnQueue.filter(id => encounter.participants.some(p => p.id === id));
  encounter.participants = encounter.participants.filter(p => encounter.turnQueue.includes(p.id));
  // If only one team remains, end encounter
  const remainingTeams = new Set(encounter.participants.map(p => p.partyId || p.id));
  if (remainingTeams.size <= 1) {
    encounters.delete(roomId);
    io.to(roomId).emit('encounter_end', { roomId });
    return;
  }
  // Rotate turnQueue
  encounter.turnQueue.push(encounter.turnQueue.shift());
  encounter.currentTurn = encounter.turnQueue[0];
  const current = encounter.participants.find(p => p.id === encounter.currentTurn);
  console.log(`[SERVER] endTurn: new currentTurn is ${encounter.currentTurn}, type: ${current && current.type}`);
  if (!current) {
    // Defensive: If current is missing, skip turn
    endTurn(roomId);
    return;
  }
  // Player turn: emit showActionMenu
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
    // AI turn: run AI logic (expand as needed)
    setTimeout(() => runNpcTurn(roomId, current.id), 500);
  }
}

// --- Update AI turn logic for group targeting and evasion ---
function runNpcTurn(roomId, npcId) {
  const encounter = encounters.get(roomId);
  if (!encounter) return;
  const npc = getCombatant(npcId);
  if (!npc) return;
  const npcDef = characterDefinitions[npc.type];
  if (!npcDef || !npcDef.aiBehavior) return;
  const ai = npcDef.aiBehavior;
  // Find valid targets (opposing team)
  const npcPartyId = npc.partyId || npc.id;
  const targets = encounter.participants.filter(p => (p.partyId || p.id) !== npcPartyId);
  if (targets.length === 0) return;
  const target = targets[Math.floor(Math.random() * targets.length)];
  // --- AI Decision Tree ---
  // 1. Low Health Action
  const lowHealth = npc.health < (npc.maxHealth * ((ai.lowHealthAction && ai.lowHealthAction.fleeThreshold) || 0.2));
  if (lowHealth && ai.lowHealthAction) {
    if (ai.lowHealthAction.type === 'AttemptFlee' && Math.random() < (ai.lowHealthAction.chance || 0)) {
      console.log(`[SERVER] AI (${npc.id}) attempts to flee due to low health.`);
      // Flee logic: remove NPC, emit prompt, end encounter
      io.to(roomId).emit('showActionPrompt', `${npcDef.name} attempts to flee... succeeds!`);
      // Remove from encounter
      encounter.participants = encounter.participants.filter(p => p.id !== npc.id);
      encounter.turnQueue = encounter.turnQueue.filter(id => id !== npc.id);
      if (encounter.participants.length <= 1) {
        encounters.delete(roomId);
        io.to(roomId).emit('encounter_end', { roomId });
        return;
      }
      endTurn(roomId);
      return;
    }
    // Other low health actions (e.g., heal/stand firm) can be added here
  }
  // 2. Mood/Angry Action (not tracked server-side yet, fallback to standard)
  // 3. Standard Action
  let action = ai.standardAction;
  if (ai.angryAction && npc.mood === 'angry') action = ai.angryAction;
  // WeightedChoice for angryAction
  if (action && action.type === 'WeightedChoice' && Array.isArray(action.choices)) {
    // Weighted random selection
    const totalWeight = action.choices.reduce((sum, c) => sum + (c.weight || 1), 0);
    let r = Math.random() * totalWeight;
    let chosen = action.choices[0];
    for (const c of action.choices) {
      if (r < (c.weight || 1)) { chosen = c; break; }
      r -= (c.weight || 1);
    }
    action = chosen;
  }
  console.log(`[SERVER] AI (${npc.id}) selected action: ${action && action.type} on target: ${target.id}`);
  // Execute action
  switch (action && action.type) {
    case 'Attack':
      console.log(`[SERVER] AI (${npc.id}) performing Attack on ${target.id}`);
      performAttack(npc.id, target.id, 'physical', null, roomId);
      break;
    case 'AttemptSteal':
      if (!action.chance || Math.random() < action.chance) {
        console.log(`[SERVER] AI (${npc.id}) attempting Steal on ${target.id}`);
        performSteal(npc.id, target.id, roomId);
      } else {
        io.to(roomId).emit('showActionPrompt', `${npcDef.name} eyes your belongings but does nothing.`);
        endTurn(roomId);
      }
      break;
    case 'ShowPrompt':
      console.log(`[SERVER] AI (${npc.id}) showing prompt: ${action.prompt}`);
      io.to(roomId).emit('showActionPrompt', action.prompt.replace('{NAME}', npcDef.name));
      endTurn(roomId);
      break;
    default:
      console.log(`[SERVER] AI (${npc.id}) defaulting to Attack on ${target.id}`);
      performAttack(npc.id, target.id, 'physical', null, roomId);
      break;
  }
}

function performAttack(initiatorId, targetId, attackType, spellName, roomId) {
  const encounter = encounters.get(roomId);
  if (!encounter) return;
  // Only allow if it's the current turn
  if (encounter.currentTurn !== initiatorId) return;
  const attacker = getCombatant(initiatorId);
  const defender = getCombatant(targetId);
  if (!attacker) {
    console.warn(`[SERVER] attack_intent: Attacker not found: ${initiatorId}`);
    encounter.participants = encounter.participants.filter(p => p.id !== initiatorId);
    encounter.turnQueue = encounter.turnQueue.filter(id => id !== initiatorId);
    endTurn(roomId);
    return;
  }
  if (!defender) {
    console.warn(`[SERVER] attack_intent: Defender not found: ${targetId}`);
    encounter.participants = encounter.participants.filter(p => p.id !== targetId);
    encounter.turnQueue = encounter.turnQueue.filter(id => id !== targetId);
    endTurn(roomId);
    return;
  }
  const attackerStats = attacker.character;
  const defenderStats = defender.character;
  if (!attackerStats || !defenderStats) {
    console.warn(`[SERVER] attack_intent: Missing character stats for attacker (${initiatorId}) or defender (${targetId})`);
    endTurn(roomId);
    return;
  }
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
}

function performSteal(initiatorId, targetId, roomId) {
  const encounter = encounters.get(roomId);
  if (!encounter) return;
  // Only allow if it's the current turn
  if (encounter.currentTurn !== initiatorId) return;
  const initiator = getCombatant(initiatorId);
  const target = getCombatant(targetId);
  if (!initiator) {
    console.warn(`[SERVER] steal_intent: Initiator not found: ${initiatorId}`);
    encounter.participants = encounter.participants.filter(p => p.id !== initiatorId);
    encounter.turnQueue = encounter.turnQueue.filter(id => id !== initiatorId);
    endTurn(roomId);
    return;
  }
  if (!target) {
    console.warn(`[SERVER] steal_intent: Target not found: ${targetId}`);
    encounter.participants = encounter.participants.filter(p => p.id !== targetId);
    encounter.turnQueue = encounter.turnQueue.filter(id => id !== targetId);
    endTurn(roomId);
    return;
  }
  if (!initiator.character || !target.character) {
    console.warn(`[SERVER] steal_intent: Missing character stats for initiator (${initiatorId}) or target (${targetId})`);
    endTurn(roomId);
    return;
  }
  // Evasion: Each 1 SPD = 1% evasion
  const evasionChance = Math.min(100, target.character.spd || 0);
  if (Math.random() * 100 < evasionChance) {
    const prompt = `${target.character.name || targetId} dodges the steal attempt!`;
    io.to(roomId).emit('steal_result', { initiatorId, targetId, success: false, item: null, prompt, evaded: true, inventory: initiator.inventory });
    endTurn(roomId);
    return;
  }
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
  io.to(roomId).emit('steal_result', { initiatorId, targetId, success, item: itemTransferred, prompt, evaded: false, inventory: initiator.inventory });
  io.to(roomId).emit('INVENTORY_UPDATE', { playerId: initiatorId, inventory: initiator.inventory });
  io.to(roomId).emit('INVENTORY_UPDATE', { playerId: targetId, inventory: target.inventory });
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