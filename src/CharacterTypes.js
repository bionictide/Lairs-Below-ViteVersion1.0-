// CharacterTypes.js (Client Stub)
// Only exports safe, non-sensitive mappings for UI rendering.

export const characterDisplayData = {
    dwarf: { name: 'Dwarf', assetPrefix: 'Dwarf' },
    gnome: { name: 'Gnome', assetPrefix: 'Gnome' },
    elvaan: { name: 'Elvaan', assetPrefix: 'Elvaan' },
    bat: { name: 'Giant Bat', assetPrefix: 'BatMonster' },
};

// Helper to get display data by type key
export function getCharacterDisplayData(typeKey) {
    return characterDisplayData[typeKey] || { name: typeKey, assetPrefix: typeKey };
}
