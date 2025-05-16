// NPCLootManager.js (Client Stub)
// Only provides safe UI helpers if needed. All loot logic is server-authoritative.

export const npcItemDisplayData = {
  'sword1': { name: 'Sword', asset: 'Sword1' },
  'helm1': { name: 'Helm', asset: 'Helm1' },
  'Potion1(red)': { name: 'Red Potion', asset: 'Potion1(red)' },
  'Key1': { name: 'Key', asset: 'Key1' },
};

export function getNpcItemDisplayData(itemKey) {
  return npcItemDisplayData[itemKey] || { name: itemKey, asset: itemKey };
}
