// PuzzleManagerServer.js
// Server-authoritative puzzle state and validation logic

import { EVENTS } from "../src/shared/events.js";

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
