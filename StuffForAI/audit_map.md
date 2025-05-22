# Project Audit Map & Architecture Reference

## Golden Rule
> This game is one giant circulatory system, not a collection of individual files. Everything is connected and must function as one unit.

---

## 1. Modular File Pairs (Client ↔ Server)
| Client File                | Server File                  | Purpose/Notes                                      |
|----------------------------|------------------------------|----------------------------------------------------|
| CharacterTypes.js          | CharacterTypesServer.js      | Character definitions (client: preview, server: logic) |
| StatDefinitions.js         | StatDefinitionsServer.js     | Stat formulas (client: preview, server: logic)     |
| BagManager.js              | BagManagerServer.js          | Inventory/bag logic (client: UI, server: logic)    |
| ShelfManager.js            | ShelfManagerServer.js        | Shelf/gem logic                                    |
| TreasureManager.js         | TreasureManagerServer.js     | Treasure logic                                     |
| PuzzleManager.js           | PuzzleManagerServer.js       | Puzzle/key logic                                   |
| RoomManager.js             | RoomManagerServer.js         | Room/door logic                                    |
| ItemManager.js             | ItemManagerServer.js         | Item logic                                         |
| NPCLootManager.js          | NPCLootManagerServer.js      | NPC loot logic                                     |
| HintManager.js             | HintManagerServer.js         | Hint logic                                         |
| LootUIManager.js           | PlayerLootManagerServer.js   | Loot UI (client) vs. loot logic (server)           |
| CombatVisuals.js           | EncounterManagerServer.js    | Combat visuals (client) vs. combat logic (server)   |
| socket.js                  | server.js                    | Socket routing (client/server)                     |
| DungeonScene.js            | EncounterManagerServer.js    | Main UI scene (client) vs. encounter logic (server) |

---

## 2. Server-Only Modules
| Server File                | Purpose/Notes                                      |
|----------------------------|----------------------------------------------------|
| DungeonCore.js             | The living world, dungeon state, entity management |
| PlayerStatsServer.js       | Player stat calculation, modification, and lookup  |
| SpellManagerServer.js      | Spell logic and resolution                         |
| RNG.js                     | Deterministic random number generation             |

---

## 3. Client-Only Modules
| Client File                | Purpose/Notes                                      |
|----------------------------|----------------------------------------------------|
| DungeonScene.js            | Main Phaser scene, renders world/encounters        |
| HealthBar.js               | UI health bar                                      |
| DebugHelper.js             | Debug UI                                           |
| App.jsx                    | React root, UI flow                                |

---

## 4. Intended Data & Event Flows

### Player Join
1. Client emits join intent via socket.js.
2. server.js receives, fetches from Supabase, creates PlayerStatsServer instance, injects into DungeonCore, emits world state to client.

### Gameplay Actions (move, attack, spell, loot, etc.)
1. Client emits intent via socket.js.
2. server.js routes to appropriate manager (e.g., EncounterManagerServer, BagManagerServer).
3. Manager updates state, emits authoritative result to client(s).

### Persistence
- Only server interacts with Supabase, at login, logout, death, or save interval.

### Rendering
- Client receives state, renders via DungeonScene and helpers.

---

## 5. Audit Priorities & Next Steps
- Audit server.js for relic logic and modularize as needed.
- Audit PlayerStatsServer.js and DungeonCore.js for correct, centralized logic.
- Ensure all gameplay logic is server-side and modular.
- Remove any logic from client that should be server-only.
- Document any mismatches, broken flows, or missing logic.

---

*This file is a living reference for the audit and future development. Update as the project evolves.* 