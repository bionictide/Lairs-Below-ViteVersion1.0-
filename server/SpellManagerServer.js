// SpellManagerServer.js
// Server-authoritative spell resolution

// import { getPlayerStatsById } from "./PlayerStatsServer.js";

const spells = {
  "Blizzard": {
    name: "Blizzard",
    gemCost: 1,
    effect: ({ caster, target }) => {
      const damage = 30;
      target.hp -= damage;
      return { type: "damage", amount: damage };
    }
  },
  "Toxic Breath": {
    name: "Toxic Breath",
    gemCost: 1,
    effect: ({ caster, target }) => {
      const damage = 20;
      target.hp -= damage;
      return { type: "damage", amount: damage };
    }
  },
  "Neutron Crucible": {
    name: "Neutron Crucible",
    gemCost: 3,
    effect: ({ caster, target }) => {
      const damage = 75;
      target.hp -= damage;
      return { type: "damage", amount: damage };
    }
  }
};

export function castSpell(caster, spellName, target) {
  const spell = spells[spellName];
  if (!spell) return;

  if ((caster.gems || 0) < spell.gemCost) return;

  caster.gems -= spell.gemCost;
  return spell.effect({ caster, target });
}
