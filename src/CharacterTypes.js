// CharacterTypes.js
// This file defines the base stat blocks, assets, and properties for all character/entity types.

export var characterDefinitions = {
    dwarf: {
        name: 'Dwarf',
        type: 'Dwarf',
        assetPrefix: 'Dwarf',
        stats: {
            vit: 15,
            str: 6,
            int: 0,
            dex: 4,
            mnd: 3,
            spd: 7
        },
        abilities: [
            'Bash'
        ],
        lootTier: 'Rare',
        playable: true,
        // --- AI Behavior Definition ---
        aiBehavior: {
            aggression: 'Neutral',
            lowHealthAction: {
                type: 'HealAndStand',
                amount: 75,
                chance: 0.5,
                oncePerEncounter: true
            },
            talkResponses: {
                keywords: [
                    // Flee on farewell
                    {
                        words: [
                            'bye', 'farewell', 'goodbye', 'cya', 'see ya'
                        ],
                        action: { type: 'FleeAndEndEncounter' },
                        prompt: "The {NAME} nods curtly and decides to leave."
                    },
                    // Get angry on gem talk
                    {
                        words: [ 'gem', 'magic gem' ],
                        action: { type: 'SetMood', mood: 'angry' },
                        prompt: "The {NAME} eyes widen slightly. \"Magic gems you say? Some Dwarves would.. Kill for such things.. They say you can use them to conjure powerful spells and even escape this dungeon if you find all 3..\""
                    },
                    // Informational responses
                    {
                        words: [ 'helmet', 'armor' ],
                        prompt: "The {NAME} strokes his beard. \"Haven't seen any, but if you find one... Equip it, it will boost your defense.\""
                    },
                    {
                        words: [ 'sword', 'weapon' ],
                        prompt: "The {NAME} glances at your hands. \"Haven't seen any, but if you find one... Equip it, it will boost your attack.\""
                    },
                    {
                        words: [ 'key', 'keys' ],
                        prompt: "The {NAME} grunts. \"Keys? Haven't got any, but if you find one you can use it on locked doors... or trade it to me, and I'll give you armor or weapons.\""
                    },
                    {
                        words: [ 'navigation', 'lost', 'map' ],
                        prompt: "The {NAME} chuckles dryly. \"Are you lost?... Heh... Aren't we all?\""
                    }
                ],
                default: {
                    prompt: 'The {NAME} grunts in response to "{MESSAGE}".'
                }
            },
            standardAction: {
                type: 'ShowPrompt',
                prompt: 'The {NAME} grunts noncommittally.'
            }
        }
    },
    gnome: {
        name: 'Gnome',
        type: 'Gnome',
        assetPrefix: 'Gnome',
        stats: {
            vit: 8,
            str: 4,
            int: 0,
            dex: 10,
            mnd: 3,
            spd: 10
        },
        abilities: [
            'Steal'
        ],
        lootTier: 'Uncommon',
        playable: true,
        aiBehavior: {
            aggression: 'Opportunistic',
            lowHealthAction: {
                type: 'AttemptFlee',
                chance: 0.3
            },
            talkResponses: {
                keywords: [
                    {
                        words: [ 'hi', 'hello' ],
                        prompt: "Hello! Nice looking stuff you have there!..",
                        action: { type: 'SetMood', mood: 'angry' }
                    },
                    {
                        words: [ 'shiny', 'treasure', 'valuables', 'loot' ],
                        prompt: "The {NAME} rubs its hands together greedily. \"Treasure? Yes, yes! Always looking for more shiny things!\""
                    },
                    {
                        words: [ 'give back', 'stolen', 'return' ],
                        action: { type: 'SetMood', mood: 'angry' },
                        prompt: "The {NAME} hisses. \"Give back? Never! Finders keepers!\""
                    }
                ],
                default: {
                    prompt: 'The {NAME} eyes your pockets suspiciously in response to "{MESSAGE}".'
                }
            },
            standardAction: {
                type: 'AttemptSteal',
                chance: 0.7
            },
            angryAction: {
                type: 'WeightedChoice',
                choices: [
                    { type: 'Attack', weight: 65 },
                    { type: 'AttemptSteal', chance: 1.0, weight: 35 }
                ]
            }
        }
    },
    elvaan: {
        name: 'Elvaan',
        type: 'Elvaan',
        assetPrefix: 'Elvaan',
        stats: {
            vit: 10,
            str: 8,
            int: 0,
            dex: 5,
            mnd: 2,
            spd: 10
        },
        abilities: [
            'Double Shot'
        ],
        lootTier: 'Rare',
        playable: true,
        aiBehavior: {
            aggression: 'High',
            lowHealthAction: {
                type: 'AttemptFlee',
                chance: 0.3
            },
            talkResponses: {
                keywords: [
                    {
                        words: [ 'talk', 'hello', 'hi', 'speak' ],
                        action: { type: 'SetMood', mood: 'angry' },
                        prompt: "The {NAME} scoffs, \"I'm not here to talk, now hand over your loot!\""
                    },
                    {
                        words: [ 'help', 'mercy', 'spare', 'please' ],
                        action: { type: 'SetMood', mood: 'angry' },
                        prompt: "The {NAME} laughs cruelly. \"Mercy? There is no mercy here!\""
                    }
                ],
                default: {
                    prompt: 'The {NAME} glares impatiently in response to "{MESSAGE}".'
                }
            },
            standardAction: {
                type: 'Attack'
            }
        }
    },
    bat: {
        name: 'Giant Bat',
        type: 'BatMonster',
        assetPrefix: 'BatMonster',
        stats: {
            vit: 6,
            str: 5,
            int: 0,
            dex: 8,
            mnd: 6,
            spd: 10
        },
        abilities: [
            'Dive Bomb',
            'Leech Bite'
        ],
        lootTier: 'Common',
        playable: false,
        aiBehavior: {
            aggression: 'High',
            lowHealthAction: {
                type: 'AttemptFlee',
                chance: 0.4
            },
            talkResponses: {},
            standardAction: {
                type: 'Attack'
            }
        }
    }
};

// Helper function to get a definition by key
export function getCharacterDefinition(typeKey) {
    var definition = characterDefinitions[typeKey];
    if (!definition) {
        console.warn(`[CharacterTypes] getCharacterDefinition: No definition found for typeKey '${typeKey}'`);
    }
    // Return a deep copy to prevent accidental modification of the original definition
    return definition ? JSON.parse(JSON.stringify(definition)) : null;
}
// Optional: Function to get all playable character definitions
export function getPlayableCharacters() {
    return Object.values(characterDefinitions).filter(function(def) {
        return def.playable;
    });
}
// Optional: Function to get all available type keys
export function getAllCharacterTypeKeys() {
    return Object.keys(characterDefinitions);
}
