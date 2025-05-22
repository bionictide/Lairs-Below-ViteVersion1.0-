// CharacterTypes.js (client-only)
// Used for character creation/preview UI only. All gameplay logic is server-authoritative.

export const characterDefinitions = {
  Dwarf: {
    name: "Dwarf",
    type: "Dwarf",
    stats: { vit: 15, str: 6, int: 0, dex: 4, mnd: 3, spd: 7 },
    abilities: ["Bash"],
    lootTier: "Rare",
    playable: true,
    sprite: "dwarf_sprite.png"
  },
  Gnome: {
    name: "Gnome",
    type: "Gnome",
    stats: { vit: 8, str: 4, int: 0, dex: 10, mnd: 3, spd: 10 },
    abilities: ["Steal"],
    lootTier: "Uncommon",
    playable: true,
    sprite: "gnome_sprite.png"
  },
  Elvaan: {
    name: "Elvaan",
    type: "Elvaan",
    stats: { vit: 10, str: 8, int: 0, dex: 5, mnd: 2, spd: 10 },
    abilities: ["Double Shot"],
    lootTier: "Rare",
    playable: true,
    sprite: "elvaan_sprite.png"
  }
  // Add more playable types as needed
};

export function getPlayableCharacters() {
  return Object.values(characterDefinitions).filter(c => c.playable);
}

export function getCharacterDisplayData(typeKey) {
  return characterDefinitions[typeKey];
}

export function getAllCharacterTypeKeys() {
  return Object.keys(characterDefinitions);
} 