const seedrandom = require('seedrandom');

// Create a deterministic, seedable RNG
function createRNG(seed) {
  return seedrandom(seed);
}

// Deterministic Fisher-Yates shuffle using provided RNG
function shuffle(array, rng) {
  const arr = array.slice(); // Do not mutate original
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Deterministic UUID generator using RNG (v4-like)
function uuidv4(rng) {
  let uuid = '', i;
  for (i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else if (i === 19) {
      uuid += ((rng() * 4 | 8)).toString(16);
    } else {
      uuid += (Math.floor(rng() * 16)).toString(16);
    }
  }
  return uuid;
}

module.exports = { createRNG, shuffle, uuidv4 }; 