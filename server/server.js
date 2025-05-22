// server.js
// Clean socket handler, all logic routed to authoritative managers

import { Server } from "socket.io";
import { EVENTS } from "../src/shared/events.js";

import { handlePuzzleAttempt } from "./PuzzleManagerServer.js";
import { handleShelfAccess } from "./ShelfManagerServer.js";
import { handleTreasureAccess } from "./TreasureManagerServer.js";
import { lootItem, markLootBagChecked } from "./BagManagerServer.js";
import { takeTurn } from "./EncounterManagerServer.js";

const io = new Server();

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on(EVENTS.PUZZLE_ATTEMPT, (data) => handlePuzzleAttempt(socket, data));
  socket.on(EVENTS.SHELF_INTERACT, (data) => handleShelfAccess(socket, data));
  socket.on(EVENTS.TREASURE_INTERACT, (data) => handleTreasureAccess(socket, data));
  socket.on(EVENTS.LOOT_ITEM, (data) => lootItem(data));
  socket.on(EVENTS.MARK_BAG_CHECKED, (data) => markLootBagChecked(data.bagId));
  socket.on(EVENTS.TAKE_TURN, (data) => takeTurn(data.encounterId, data.entityId, data.action));

  // Additional connections (player join/leave, room sync, etc.) would route here too
});

export default io;
