// CharacterTypesServer.js
// Server-authoritative character definitions (no sprite data)

export const CharacterTypes = {
  Dwarf: {
    name: "Dwarf",
    type: "Dwarf",
    stats: { vit: 15, str: 6, int: 0, dex: 4, mnd: 3, spd: 7 },
    abilities: ["Bash"],
    lootTier: "Rare",
    playable: true,
    aiBehavior: {
      aggression: "Neutral",
      lowHealthAction: {
        type: "HealAndStand",
        amount: 75,
        chance: 0.5,
        oncePerEncounter: true
      },
      talkResponses: {
        keywords: [
          {
            words: ["bye", "farewell", "goodbye", "cya", "see ya"],
            action: { type: "FleeAndEndEncounter" },
            prompt: "The {NAME} nods curtly and decides to leave."
          }
        ],
        default: {
          prompt: 'The {NAME} grunts in response to "{MESSAGE}".'
        }
      },
      standardAction: {
        type: "ShowPrompt",
        prompt: "The {NAME} grunts noncommittally."
      }
    }
  },
  Gnome: {
    name: "Gnome",
    type: "Gnome",
    stats: { vit: 8, str: 4, int: 0, dex: 10, mnd: 3, spd: 10 },
    abilities: ["Steal"],
    lootTier: "Uncommon",
    playable: true,
    aiBehavior: {
      aggression: "Opportunistic",
      lowHealthAction: { type: "AttemptFlee", chance: 0.3 },
      standardAction: { type: "AttemptSteal", chance: 0.7 },
      angryAction: {
        type: "WeightedChoice",
        choices: [
          { type: "Attack", weight: 65 },
          { type: "AttemptSteal", chance: 1.0, weight: 35 }
        ]
      },
      talkResponses: {
        default: {
          prompt: 'The {NAME} eyes your pockets suspiciously in response to "{MESSAGE}".'
        }
      }
    }
  },
  Elvaan: {
    name: "Elvaan",
    type: "Elvaan",
    stats: { vit: 10, str: 8, int: 0, dex: 5, mnd: 2, spd: 10 },
    abilities: ["Double Shot"],
    lootTier: "Rare",
    playable: true,
    aiBehavior: {
      aggression: "High",
      lowHealthAction: { type: "AttemptFlee", chance: 0.3 },
      standardAction: { type: "Attack" },
      talkResponses: {
        default: {
          prompt: 'The {NAME} glares impatiently in response to "{MESSAGE}".'
        }
      }
    }
  },
  BatMonster: {
    name: "Giant Bat",
    type: "BatMonster",
    stats: { vit: 6, str: 5, int: 0, dex: 8, mnd: 6, spd: 10 },
    abilities: ["Dive Bomb", "Leech Bite"],
    lootTier: "Common",
    playable: false,
    aiBehavior: {
      aggression: "High",
      lowHealthAction: { type: "AttemptFlee", chance: 0.4 },
      standardAction: { type: "Attack" }
    }
  },
  miniboss1: {
    name: "Minotaur",
    type: "miniboss1",
    stats: { vit: 25, str: 13, int: 8, dex: 10, mnd: 10, spd: 12 },
    abilities: ["Crushing Blow", "Roar"],
    lootTier: "Epic",
    playable: false,
    aiBehavior: {
      aggression: "Boss",
      lowHealthAction: {
        type: "HealAndStand",
        amount: 100,
        chance: 0.5,
        oncePerEncounter: true
      },
      standardAction: { type: "Attack" },
      angryAction: { type: "Attack" },
      talkResponses: {
        default: {
          prompt: 'The {NAME} snorts in response to "{MESSAGE}".'
        }
      }
    }
  },
  miniboss2: {
    name: "Baba Yaga",
    type: "miniboss2",
    stats: { vit: 45, str: 20, int: 10, dex: 12, mnd: 12, spd: 13 },
    abilities: ["Neutron Crucible", "Stomp", "Blizzard", "Toxic Breath"],
    lootTier: "Epic",
    playable: false,
    inventory: [{ item: "Gem", quantity: 1 }],
    aiBehavior: {
      aggression: "Neutral",
      lowHealthAction: {
        type: "CastSpell",
        spell: "Neutron Crucible",
        chance: 0.5,
        oncePerEncounter: true
      },
      standardAction: {
        type: "WeightedChoice",
        choices: [
          { type: "ShowPrompt", prompt: "You going to buy something or undress me with your eyes?!", weight: 15 },
          { type: "ShowPrompt", prompt: "I don't have all day, I'm old — every day could be the last!", weight: 15 },
          { type: "ShowPrompt", prompt: "You smell like death. I like that.", weight: 15 },
          { type: "ShowPrompt", prompt: "The old woman glares at you.", weight: 15 },
          { type: "ShowPrompt", prompt: "What are you gawking at? Haven’t seen a hag before?", weight: 10 },
          { type: "ShowPrompt", prompt: "Mmm... fresh blood. Just kidding. Unless?", weight: 10 },
          { type: "ShowPrompt", prompt: "Back in my day we burned adventurers like you!", weight: 10 },
          { type: "ShowPrompt", prompt: "Don’t touch anything unless you plan to pay... with interest.", weight: 10 }
        ]
      },
      angryAction: {
        type: "WeightedChoice",
        choices: [
          { type: "CastSpell", spell: "Blizzard", weight: 40 },
          { type: "CastSpell", spell: "Toxic Breath", weight: 40 },
          { type: "Attack", weight: 20 }
        ]
      },
      talkResponses: {
        default: {
          prompt: 'The {NAME} cackles softly.'
        }
      }
    }
  },
  boss: {
    name: "Troll",
    type: "boss",
    stats: { vit: 50, str: 22, int: 12, dex: 14, mnd: 14, spd: 14 },
    abilities: ["Shadow Strike", "Howl"],
    lootTier: "Epic",
    playable: false,
    aiBehavior: {
      aggression: "Boss",
      lowHealthAction: {
        type: "HealAndStand",
        amount: 140,
        chance: 0.5,
        oncePerEncounter: true
      },
      standardAction: { type: "Attack" },
      angryAction: { type: "Attack" },
      talkResponses: {
        default: {
          prompt: 'FRESH MEAT!'
        }
      }
    }
  }
};
