# Project Audit Map & Architecture Reference

## Audit Status (as of latest pass)
- All core files from the OLD backup have been fully read, audited, and assimilated into the new system.
- All client files are pure renderers/intent emitters (no game logic or state mutation).
- All server logic is routed through ManagerManager (MM) for traceability and modularity.
- The audit is up to date except for GroupManagerServer (PVP/Group logic, to be done last).

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
| SpellManagerServer     |       ✅         |              ✅               |
| GroupManagerServer     |       ⬜         |              ⬜               |  <!-- PVP/Group logic, see design notes; TODO, will implement last unless needed sooner -->
| PlayerManagerServer    |       ⬜         |              ⬜               |  <!-- Tracks all player state: location, encounter status, group status, playerIDs, buffs, debuffs, resistances, etc. Essential for PVP/group monitoring. TODO: implement as server-authoritative, MM-routed. -->
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
- - GroupManagerServer (PVP/Group logic) will be implemented last unless dependencies require it sooner.
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

## PVP & Group Combat Design Notes (Authoritative Reference)

There should be ample documentation of how both pvp and group combat flows are designed to work within the stuff for AI folder, and even more in my other stuff from ai folder (not included, its from a different branch were we added both in). The basics though is quite simple. For PVP we handle it exactly like an NPC encounter except the turn rotation never goes to AI. It goes from Player turn, to other player turn, then repeats. Damage and Defense are handled by each player's PlayerStats instead of PlayerStats versus CharacterTypes for defense, it's PlayerStats versus PlayerStats for defense. Simple. Stealing works the same way as NPCs, PlayerStats checks modifiers on chance and if successful it removes a random item from the defenders bag and places it in the offenders bag. Simple. For group combat it's also VERY simple. We increase the turn rotation to include each enemy/player present. Simple. Joining up with other players can be done during a PVP encounter with the Invite to group button on the UI. If both players click it the encounter ends and they are now a party of 2. If another player joins they are a party of 3. Groups for both players and NPCs is always a maximum of 3 characters. Turn rotation is always Leader, Member 1, Member 2. The leader is the only one who can trigger encounters or control movement. Member 1 and Member 2 have their movement controls greyed out and a "Leave Group" button is added under their Open Bag button and doors will be disabled. The leader is the only person with the option to move the group. All other members follow/see exactly what the leader does. They essentially become one character for the sense of movement. If they click it they go back 1 room and become their own Party Leader thus freeing them from the movement locks and group rotations and preventing them from immediately triggering an encounter with their previous group. If they move forward to the room the group is in they will be treated as a new encounter again as normal. Simple. In encounters each player acts in the same order Leader, Member 1, Member 2. If the group is the one entering a room that already has enemies in it they will go first, then the enemy(s). If the group is static when enemy(s) enter THEIR room the enemy(s) go first then the group. Each group member NPC or Player is treated as an individual, they can all loot (first to click keeps), die (loot dropped, removed from group, dead). and perform all normal actions except movement or inviting others to group. Only the leader can invite more members. For trading (not yet implemented, future content but placeholders are in place now) they can select to trade with allies or enemies in the same way, but it will cost their turn either way. Enemies NPC groups are spawned off of a single enemy, when selecting an enemy for an encounter any non boss enemy has a 10% chance to randomly choose an ally (second enemy for their AI group), and then that ally has a 10% chance to choose an ally as well for a maximum of 3 members (Leader, Member 1, Member 2). And for displaying groups the encounter should always display the leader out front in their NORMAL position, then Member 1 10% smaller scale, 5% lower position, BACK ONE Z Position(depth) and 20% left of normal position, and member 2 (if there is one) 10% smaller scale, 5% lower position, back 2 Z (depth) positions from normal and 20% right of normal position. For PvP always use each player's character "Type" (Dwarf, gnome, Elvaan, ect.) to determine which sprite their OPPONENT will see (You don't see yourself you see your enemy). Back to group combat again, the most difficult part will be that when fighting AGAINST a group, actions will get one extra enhancement, they will allow you to SELECT WHICH TARGET. This can be done with a pointer that moves from each enemy sprite to select which, or by a pop up (styled like our other buttons) with each enemy name you can select which to target like a button. Either way works whichever is easier to implement. Finally, when an encounter is live of ANY kind, the doors leading to the room where it's taking place will be disabled for other players during the encounter displaying a message like normal combat text when clicked that says "You hear the clashing of weapons beyond, but the door won't budge." Whew. I think that covers it?

---

*This file is a living reference for the audit and future development. Update as the project evolves.* 