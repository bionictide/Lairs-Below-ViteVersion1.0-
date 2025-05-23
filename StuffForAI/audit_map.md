# Project Audit Map & Architecture Reference

## Golden Rule
> This game is one giant circulatory system, not a collection of individual files. Everything is connected and must function as one unit.

---

## 1. Modular File Pairs (Client ↔ Server)
| Client File                | Server File                  | Purpose/Notes                                      |
|----------------------------|------------------------------|----------------------------------------------------|
| CharacterTypes.js          | CharacterTypesServer.js      | Character definitions (client: preview, server: logic) |
| StatDefinitions.js         | StatDefinitionsServer.js     | Stat formulas (client: preview, server: logic)     |
| BagManager.js              | BagManagerServer.js          | Inventory/loot UI (client), loot state (server)    |
| EncounterManager.js        | EncounterManagerServer.js    | Combat/encounter UI (client), logic (server)       |
| ShelfManager.js            | ShelfManagerServer.js        | Shelf UI (client), shelf logic (server)            |
| TreasureManager.js         | TreasureManagerServer.js     | Treasure UI (client), logic (server)               |
| PuzzleManager.js           | PuzzleManagerServer.js       | Puzzle UI (client), logic (server)                 |
| HintManager.js             | HintManagerServer.js         | Hint UI (client), hint logic (server)              |
| NPCLootManager.js          | NPCLootManagerServer.js      | NPC loot UI (client), loot logic (server)          |
| ItemManager.js             | ItemManagerServer.js         | Item UI (client), item logic (server)              |
| (no client)                | DungeonCore.js               | Living world, server-only (✅ deterministic RNG, fully audited) |
| socket.js                  | server.js                    | Routing layer (client/server)                      |

---

## 2. MM Registration & Routing Checklist
| Manager                | Registered in MM | All Server Logic Routed via MM |
|------------------------|:----------------:|:-----------------------------:|
| BagManagerServer       |       ✅         |              ✅               |
| EncounterManagerServer |       ✅         |              ✅               |
| ShelfManagerServer     |       ✅         |              ✅               |
| TreasureManagerServer  |       ✅         |              ✅               |
| PuzzleManagerServer    |       ✅         |              ✅               |
| HintManagerServer      |       ✅         |              ✅               |
| NPCLootManagerServer   |       ✅         |              ✅               |
| ItemManagerServer      |       ✅         |              ✅               |
| StatDefinitionsServer  |       ✅         |              ✅               |
| RoomManagerServer      |       ✅         |              ✅               |
| ...                   |                  |                               |

---

## 3. Current Audit Progress
- 1:1 client-server file structure is solid and being preserved.
- Logic within each file is being systematically restored to match the original, working system (pre-migration). DungeonCore now uses deterministic RNG/uuid and is fully server-authoritative.
- Unique ID generation is being refactored to remove all `uuid` npm package usage:
  - Loot bags, items: use timestamp-based IDs (e.g., `bag-${ownerId}-${Date.now()}`)
  - Dungeon/room/entity: use deterministic `uuidv4` from `server/RNG.js` if needed
- All server-authoritative flows (join, leave, loot, combat, etc.) are being restored to match the old, working logic.
- All unnecessary complexity and GPT artifacts are being removed.

---

## 4. Next Steps
- Continue systematic audit and refactor of all modules, updating this map as progress is made.
- Prioritize restoring the "circulatory system" and server-authoritative design everywhere.

---

## 5. Intended Data & Event Flows

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

## 6. Audit Priorities & Next Steps
- Audit server.js for relic logic and modularize as needed.
- Audit PlayerStatsServer.js and DungeonCore.js for correct, centralized logic.
- Ensure all gameplay logic is server-side and modular.
- Remove any logic from client that should be server-only.
- Document any mismatches, broken flows, or missing logic.

---

## 7. Upcoming Refactors for True Dumb Renderer Security
- All placement/facing/visibility calculations for treasures, shelves, puzzles, etc. will be migrated to the server (e.g., TreasureManagerServer.js) for true server-authoritative rendering.
- Client managers will become pure renderers, using only server-sent data for display.
- This is a high-priority security and consistency fix to prevent exploits and desyncs.

---

*This file is a living reference for the audit and future development. Update as the project evolves.* 