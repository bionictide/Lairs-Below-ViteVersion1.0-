// SpellManagerServer.js
// Server-authoritative spell data only (no stat scaling or damage calculation)

import { EVENTS } from '../src/shared/events.js';
import PlayerManagerServer from './PlayerManagerServer.js';

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
  "Bullet Hell": ["Amethyst", "Blue Apatite", "Raw Ruby"],
  "Cure": ["Blue Apatite"],
  "Healing Wind": ["Blue Apatite", "Emerald"]
};

const spells = {
  "Blizzard": {
    name: "Blizzard",
    magicalBaseDamage: 75,
    element: "ice",
    effects: [],
    type: "damage",
    target: "enemy",
    multi: true
  },
  "Firestorm": {
    name: "Firestorm",
    magicalBaseDamage: 100,
    element: "fire",
    effects: [],
    type: "damage",
    target: "enemy",
    multi: false
  },
  "Void Blast": {
    name: "Void Blast",
    magicalBaseDamage: 125,
    element: "void",
    effects: [],
    type: "damage",
    target: "enemy",
    multi: false
  },
  "Neutron Crucible": {
    name: "Neutron Crucible",
    magicalBaseDamage: 300,
    element: "all",
    effects: [],
    type: "damage",
    target: "enemy",
    multi: true
  },
  "Toxic Gaze": {
    name: "Toxic Gaze",
    magicalBaseDamage: 80,
    element: "poison",
    effects: [
      {
        type: "poison",
        params: {
          damagePerTick: 5,
          tickIntervalMs: 3000,
          durationMs: 30000,
          maxStacks: 3
        }
      }
    ],
    type: "damage",
    target: "enemy",
    multi: false
  },
  "Stop Breathing": {
    name: "Stop Breathing",
    magicalBaseDamage: 175,
    element: "air",
    effects: ["stun"],
    type: "damage",
    target: "enemy",
    multi: false
  },
  "Break Time": {
    name: "Break Time",
    magicalBaseDamage: 150,
    element: "time",
    effects: ["slow"],
    type: "damage",
    target: "enemy",
    multi: false
  },
  "Bullet Hell": {
    name: "Bullet Hell",
    magicalBaseDamage: 200,
    element: "physical",
    effects: [],
    type: "damage",
    target: "enemy",
    multi: false
  },
  "Earthquake": {
    name: "Earthquake",
    magicalBaseDamage: 125,
    element: "earth",
    effects: ["knockdown"],
    type: "damage",
    target: "enemy",
    multi: false
  },
  // New healing spells
  "Cure": {
    name: "Cure",
    magicalBaseDamage: 100,
    element: "ice",
    effects: ["heal"],
    type: "heal",
    target: "ally",
    multi: false
  },
  "Healing Wind": {
    name: "Healing Wind",
    magicalBaseDamage: 75,
    element: "wind",
    effects: ["heal", "cleanse"],
    type: "heal",
    target: "ally",
    multi: true
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

export function getAllSpells() {
  return Object.keys(spells);
}

// No stat scaling, no damage calculation, no inventory logic here.
