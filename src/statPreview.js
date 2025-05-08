// statPreview.js
// Display-only stat calculation functions for character selection preview

export function getHealthFromVIT(vit) {
  return 50 * vit;
}

export function getPhysicalAttackFromSTR(str) {
  return 10 * str;
}

export function getDefenseFromVIT(vit) {
  return 0.5 * vit;
} 