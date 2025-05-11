// Multiplayer Server Skeleton for Dungeon Crawler
// Uses: Node.js, Socket.io, ES modules
// Run with: node server_skeleton.js

import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
import { EVENTS } from '../src/shared/events.js';

dotenv.config();

const PORT = process.env.PORT || 3001;
const server = http.createServer();
const io = new Server(server, {
  cors: { origin: '*' }
});

// In-memory state (replace with DB as needed)
const players = new Map(); // playerId -> { socket, character, roomId, inventory, ... }
const rooms = new Map();   // roomId -> { players: Set, entities: [], ... }
const bags = new Map();    // bagId -> { roomId, items }

// --- Socket.io Event Handlers ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // PLAYER JOIN
  socket.on(EVENTS.PLAYER_JOIN, ({ playerId, character }) => {
    players.set(playerId, { socket, character, roomId: null, inventory: character.inventory || [] });
    // TODO: Sync with Supabase if needed
    socket.emit(EVENTS.ACTION_RESULT, { action: EVENTS.PLAYER_JOIN, success: true, message: 'Joined', data: { playerId } });
  });

  // PLAYER LEAVE
  socket.on(EVENTS.PLAYER_LEAVE, ({ playerId }) => {
    players.delete(playerId);
    // TODO: Sync with Supabase
    socket.broadcast.emit(EVENTS.PLAYER_LEAVE, { playerId });
  });

  // ROOM ENTER
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
    // Broadcast room update
    io.to(roomId).emit(EVENTS.ROOM_UPDATE, {
      roomId,
      players: Array.from(rooms.get(roomId).players),
      entities: rooms.get(roomId).entities
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

  // DISCONNECT
  socket.on('disconnect', () => {
    // Find and remove player
    for (const [playerId, player] of players.entries()) {
      if (player.socket === socket) {
        players.delete(playerId);
        // TODO: Sync with Supabase
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });

  // --- Add more event handlers as needed ---
});

server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
}); 