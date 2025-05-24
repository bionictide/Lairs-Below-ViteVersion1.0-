// SpellManagerServer.js
// Server-authoritative spell resolution

// import { getPlayerStatsById } from "./PlayerStatsServer.js";

const spellGemRequirements = {
  "Blizzard": ["Blue Apatite"],
  "Firestorm": ["Raw Ruby"],
  "Void Blast": ["Amethyst"],
  "Neutron Crucible": ["Raw Ruby", "Amethyst", "Blue Apatite", "Emerald"],
  "Toxic Gaze": ["Emerald"],
  "Stop Breathing": ["Blue Apatite", "Raw Ruby", "Emerald"],
  "Break Time": ["Amethyst", "Blue Apatite", "Emerald"],
  "Earthquake": ["Blue Apatite", "Emerald"],
  "Bullet Hell": ["Amethyst", "Blue Apatite", "Raw Ruby"]
};

const spells = {
  "Blizzard": {
    name: "Blizzard",
    magicalBaseDamage: 75,
    element: "ice",
    effects: []
  },
  "Firestorm": {
    name: "Firestorm",
    magicalBaseDamage: 100,
    element: "fire",
    effects: []
  },
  "Void Blast": {
    name: "Void Blast",
    magicalBaseDamage: 125,
    element: "void",
    effects: []
  },
  "Neutron Crucible": {
    name: "Neutron Crucible",
    magicalBaseDamage: 300,
    element: "all",
    effects: []
  },
  "Toxic Gaze": {
    name: "Toxic Gaze",
    magicalBaseDamage: 80,
    element: "poison",
    effects: ["poison"]
  },
  "Stop Breathing": {
    name: "Stop Breathing",
    magicalBaseDamage: 175,
    element: "air",
    effects: ["stun"]
  },
  "Break Time": {
    name: "Break Time",
    magicalBaseDamage: 150,
    element: "time",
    effects: ["slow"]
  },
  "Bullet Hell": {
    name: "Bullet Hell",
    magicalBaseDamage: 200,
    element: "physical",
    effects: []
  },
  "Earthquake": {
    name: "Earthquake",
    magicalBaseDamage: 125,
    element: "earth",
    effects: ["knockdown"]
  }
};

export function getSpellData(spellName) {
  const data = spells[spellName];
  if (!data) return null;
  return { ...data };
}

export function getSpellRequirements(spellName) {
  return spellGemRequirements[spellName] || [];
}

export function castSpell(casterInventory, spellName) {
  const requirements = getSpellRequirements(spellName);
  const hasAll = requirements.every(gem => casterInventory.includes(gem));
  if (!hasAll) return null;
  return getSpellData(spellName);
}
