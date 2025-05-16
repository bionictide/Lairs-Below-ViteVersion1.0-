// CharacterTypes.js (Client Stub)
// Only exports safe, non-sensitive mappings for UI rendering and character creation.

export const characterDisplayData = {
    dwarf: {
        name: 'Dwarf',
        assetPrefix: 'Dwarf',
        type: 'dwarf',
        stats: { vit: 15, str: 6, int: 0, dex: 4, mnd: 3, spd: 7 },
        abilities: ['Bash']
    },
    gnome: {
        name: 'Gnome',
        assetPrefix: 'Gnome',
        type: 'gnome',
        stats: { vit: 8, str: 4, int: 0, dex: 10, mnd: 3, spd: 10 },
        abilities: ['Steal']
    },
    elvaan: {
        name: 'Elvaan',
        assetPrefix: 'Elvaan',
        type: 'elvaan',
        stats: { vit: 10, str: 8, int: 0, dex: 5, mnd: 2, spd: 10 },
        abilities: ['Double Shot']
    },
    bat: { name: 'Giant Bat', assetPrefix: 'BatMonster' },
};

// Helper to get display data by type key
export function getCharacterDisplayData(typeKey) {
    return characterDisplayData[typeKey] || { name: typeKey, assetPrefix: typeKey, stats: {}, abilities: [], type: typeKey };
}
