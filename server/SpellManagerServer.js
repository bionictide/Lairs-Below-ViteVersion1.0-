// Spell resolution logic
import { calculateDamage } from "./StatDefinitionsServer.js";

export class SpellManager {
  constructor(spellList = []) {
    this.spells = spellList;
  }

  castSpell(spellName, caster, target) {
    const spell = this.spells.find(s => s.name === spellName);
    if (!spell) return { success: false, message: "Unknown spell" };

    const damage = calculateDamage(caster.getStat("int"), spell.baseDamage || 5);
    target.applyDamage(damage);

    return { success: true, damage, spell };
  }
}
