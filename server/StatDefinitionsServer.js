// StatDefinitionsServer.js
// Server-side authoritative stat calculation formulas

export function getHealthFromVIT(vit) {
  return vit * 50;
}

export function getDefenseFromVIT(vit) {
  return vit * 0.5;
}

export function getPhysicalAttackFromSTR(str) {
  return str * 10;
}

export function getMagicBonusFromINT(intellect) {
  return intellect * 2;
}

export function getMagicDefenseFromINT(intellect) {
  return intellect * 0.75;
}

export function getManaFromMND(mind) {
  return mind * 40;
}

export function getCritSpellBonusFromMND(mind) {
  return mind * 1.25;
}

export function getFleeChanceFromSPD(speed) {
  return speed * 0.8;
}


export function getEvasionFromSPD(speed) {
  return speed * 0.5; // 1 SPD = 0.5 evasion
}
