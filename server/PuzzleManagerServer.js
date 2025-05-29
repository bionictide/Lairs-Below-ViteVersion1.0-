// PuzzleManagerServer.js
// Server-authoritative puzzle state and validation logic

import { EVENTS } from "../src/shared/events.js";
import DungeonCore from "./DungeonCore.js";
import { ManagerManager } from "./ManagerManager.js";

const puzzles = {};

export function createPuzzle(puzzleId, solution) {
  puzzles[puzzleId] = {
    id: puzzleId,
    solution,
    solved: false
  };
}

export function isPuzzleSolved(puzzleId) {
  return puzzles[puzzleId]?.solved || false;
}

export function handlePuzzleAttempt(socket, data) {
  const { puzzleId, answer } = data;
  const puzzle = puzzles[puzzleId];
  if (!puzzle || puzzle.solved) return;

  const correct = answer === puzzle.solution;
  if (correct) {
    puzzle.solved = true;
    socket.emit(EVENTS.PUZZLE_SOLVED, { puzzleId });
  } else {
    socket.emit(EVENTS.PUZZLE_FAILED, { puzzleId });
  }
}

// --- Key Pickup Logic (room-based puzzles) ---
export function handlePuzzlePickup(io, socket, data) {
  const { playerId, roomId, itemKey } = data;
  // Validate room and puzzle
  const room = ManagerManager.getRoomById(roomId);
  if (!room || room.puzzleType !== 'key') return socket.emit(EVENTS.ERROR, { message: 'No key puzzle in this room.' });
  // Remove the key from the room
  room.puzzleType = null;
  // Notify all clients to remove the key sprite
  io.emit('PUZZLE_UPDATE', { roomId });
  // Optionally: grant the key to the player (inventory logic)
  // ...
  return true;
}
