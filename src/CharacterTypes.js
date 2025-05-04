// CharacterTypes.js
// This file will define the base stats, assets, and other properties for all character/entity types.
// Define base stats and properties for each character type
export var characterDefinitions = {
    dwarf: {
        name: 'Dwarf',
        assetPrefix: 'Dwarf',
        baseStats: {
            health: 750,
            physicalBaseDamage: 60,
            magicalBaseDamage: 0,
            defense: 8,
            speed: 10,
            fleeThreshold: 0.3
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
                amount: 75
            },
            talkResponses: {
                keywords: [
                    // Flee on farewell
                    {
                        words: [
                            'bye',
                            'farewell',
                            'goodbye',
                            'cya',
                            'see ya'
                        ],
                        action: {
                            type: 'FleeAndEndEncounter'
                        },
                        prompt: "The {NAME} nods curtly and decides to leave."
                    },
                    // Get angry on gem talk
                    {
                        words: [
                            'gem',
                            'magic gem'
                        ],
                        action: {
                            type: 'SetMood',
                            mood: 'angry'
                        },
                        prompt: "The {NAME} eyes widen slightly. \"Magic gems you say? Some Dwarves would.. Kill for such things.. They say you can use them to conjure powerful spells and even escape this dungeon if you find all 3..\""
                    },
                    // Informational responses
                    {
                        words: [
                            'helmet',
                            'armor'
                        ],
                        prompt: "The {NAME} strokes his beard. \"Haven't seen any, but if you find one... Equip it, it will boost your defense.\""
                    },
                    {
                        words: [
                            'sword',
                            'weapon'
                        ],
                        prompt: "The {NAME} glances at your hands. \"Haven't seen any, but if you find one... Equip it, it will boost your attack.\""
                    },
                    {
                        words: [
                            'key',
                            'keys'
                        ],
                        prompt: "The {NAME} grunts. \"Keys? Haven't got any, but if you find one you can use it on locked doors... or trade it to me, and I'll give you armor or weapons.\""
                    },
                    {
                        words: [
                            'navigation',
                            'lost',
                            'map'
                        ],
                        prompt: "The {NAME} chuckles dryly. \"Are you lost?... Heh... Aren't we all?\""
                    }
                ],
                default: {
                    prompt: 'The {NAME} grunts in response to "{MESSAGE}".'
                } // Generic grunt if no keyword match
            },
            standardAction: {
                type: 'ShowPrompt',
                prompt: 'The {NAME} grunts noncommittally.'
            } // Default action if neutral and no talk
        }
    },
    gnome: {
        name: 'Gnome',
        assetPrefix: 'Gnome',
        baseStats: {
            health: 500,
            physicalBaseDamage: 40,
            magicalBaseDamage: 0,
            defense: 4,
            speed: 15,
            fleeThreshold: 0.3
        },
        abilities: [
            'Steal'
        ],
        lootTier: 'Uncommon',
        playable: true,
        // --- AI Behavior Definition ---
        aiBehavior: {
            aggression: 'Opportunistic',
            lowHealthAction: {
                type: 'AttemptFlee',
                chance: 0.3
            },
            talkResponses: {
                keywords: [
                    {
                        words: [
                            'hi',
                            'hello'
                        ],
                        prompt: "Hello! Nice looking stuff you have there!..",
                        action: {
                            type: 'SetMood',
                            mood: 'angry'
                        } // Set mood to angry after greeting
                    },
                    {
                        words: [
                            'shiny',
                            'treasure',
                            'valuables',
                            'loot'
                        ],
                        prompt: "The {NAME} rubs its hands together greedily. \"Treasure? Yes, yes! Always looking for more shiny things!\""
                    },
                    {
                        words: [
                            'give back',
                            'stolen',
                            'return'
                        ],
                        action: {
                            type: 'SetMood',
                            mood: 'angry'
                        },
                        prompt: "The {NAME} hisses. \"Give back? Never! Finders keepers!\""
                    }
                ],
                // Use default from existing logic for initial talk
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
                    {
                        type: 'Attack',
                        weight: 65
                    },
                    {
                        type: 'AttemptSteal',
                        chance: 1.0,
                        weight: 35
                    } // 35% chance to attempt steal (always succeeds roll *if chosen*)
                ]
            }
        }
    },
    elvaan: {
        name: 'Elvaan',
        assetPrefix: 'Elvaan',
        baseStats: {
            health: 500,
            physicalBaseDamage: 80,
            magicalBaseDamage: 0,
            defense: 6,
            speed: 12,
            fleeThreshold: 0.3
        },
        abilities: [
            'Double Shot'
        ],
        lootTier: 'Rare',
        playable: true,
        // --- AI Behavior Definition ---
        aiBehavior: {
            aggression: 'High',
            lowHealthAction: {
                type: 'AttemptFlee',
                chance: 0.3
            },
            talkResponses: {
                keywords: [
                    {
                        words: [
                            'talk',
                            'hello',
                            'hi',
                            'speak'
                        ],
                        action: {
                            type: 'SetMood',
                            mood: 'angry'
                        },
                        prompt: "The {NAME} scoffs, \"I'm not here to talk, now hand over your loot!\"" // Updated dialog
                    },
                    {
                        words: [
                            'help',
                            'mercy',
                            'spare',
                            'please'
                        ],
                        action: {
                            type: 'SetMood',
                            mood: 'angry'
                        },
                        prompt: "The {NAME} laughs cruelly. \"Mercy? There is no mercy here!\""
                    }
                ],
                default: {
                    prompt: 'The {NAME} glares impatiently in response to "{MESSAGE}".'
                }
            },
            standardAction: {
                type: 'Attack'
            } // Default action is always attack
        }
    },
    bat: {
        name: 'Giant Bat',
        assetPrefix: 'BatMonster',
        baseStats: {
            health: 350,
            physicalBaseDamage: 50,
            magicalBaseDamage: 0,
            defense: 2,
            speed: 20,
            fleeThreshold: 0.4
        },
        abilities: [
            'Dive Bomb',
            'Leech Bite'
        ],
        lootTier: 'Common',
        playable: false,
        // --- AI Behavior Definition ---
        aiBehavior: {
            aggression: 'High',
            lowHealthAction: {
                type: 'AttemptFlee',
                chance: 0.4
            },
            talkResponses: {
            },
            standardAction: {
                type: 'Attack'
            } // Default action is always attack
        }
    }
};
// Helper function to get a definition by key
export function getCharacterDefinition(typeKey) {
    var definition = characterDefinitions[typeKey];
    if (!definition) {
        console.warn("[CharacterTypes] getCharacterDefinition: No definition found for typeKey '".concat(typeKey, "'"));
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
