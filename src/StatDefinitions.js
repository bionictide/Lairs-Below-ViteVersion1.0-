// StatDefinitions.js (Client Stub)
// Only provides safe UI helpers if needed. All stat calculations are server-authoritative.

// Example: If you want to display stat names or icons, add here.
export const statDisplayNames = {
  vit: 'Vitality',
  str: 'Strength',
  int: 'Intelligence',
  dex: 'Dexterity',
  mnd: 'Mind',
  spd: 'Speed',
};

export function getStatDisplayName(statKey) {
  return statDisplayNames[statKey] || statKey;
} 