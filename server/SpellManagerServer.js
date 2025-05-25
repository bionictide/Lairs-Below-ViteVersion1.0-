// SpellManagerServer.js
// Server-authoritative spell resolution

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
    effects: ["poison"],
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

export function castSpell(casterInventory, spellName) {
  const requirements = getSpellRequirements(spellName);
  const hasAll = requirements.every(gem => casterInventory.includes(gem));
  if (!hasAll) return null;
  return getSpellData(spellName);
}

export function resolveSpellCast(casterId, targetId, spellName) {
  const caster = PlayerManagerServer.getPlayer(casterId);
  const target = PlayerManagerServer.getPlayer(targetId);
  if (!caster || !target) return { error: 'Invalid participants' };
  const spellData = getSpellData(spellName);
  if (!spellData) return { error: 'Invalid spell' };
  // Check gem requirements
  const requirements = getSpellRequirements(spellName);
  const inventory = caster.playerStats.inventory || [];
  const hasAll = requirements.every(gem => inventory.includes(gem));
  if (!hasAll) return { error: 'Missing required gems', requirements };
  // Remove gems from inventory
  for (const gem of requirements) {
    const idx = inventory.indexOf(gem);
    if (idx !== -1) inventory.splice(idx, 1);
  }
  // Calculate damage
  const baseDamage = spellData.magicalBaseDamage;
  let damage = baseDamage;
  if (caster.playerStats && caster.playerStats.getMagicalDamage) {
    // Optionally, allow stat scaling
    damage = caster.playerStats.getMagicalDamage({ ...spellData, damage: baseDamage });
  }
  // Evasion check (after all modifiers)
  if (target.playerStats.tryDodge()) {
    return {
      casterId,
      targetId,
      spellName,
      damage,
      damageDealt: 0,
      dodged: true,
      effects: [],
      targetDead: false,
      targetHealth: target.playerStats._currentHealth
    };
  }
  // Apply damage to target
  const damageDealt = target.playerStats.applyDamage(damage);
  const targetDead = target.playerStats._currentHealth <= 0;
  if (targetDead) PlayerManagerServer.setPlayerAlive(targetId, false);
  // Apply effects (stub: just return effect names)
  const effects = spellData.effects || [];
  return {
    casterId,
    targetId,
    spellName,
    damage,
    damageDealt,
    dodged: false,
    effects,
    targetDead,
    targetHealth: target.playerStats._currentHealth
  };
}
