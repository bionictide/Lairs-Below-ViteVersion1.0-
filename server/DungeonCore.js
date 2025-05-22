class DungeonCore {
  constructor(seed) {
    this.seed = seed;
    this.rooms = [];
  }

  generate() {
    // Room generation logic here
    console.log("[DungeonCore] Generating dungeon with seed:", this.seed);
  }
}

export default DungeonCore;
