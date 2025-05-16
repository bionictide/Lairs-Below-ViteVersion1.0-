# AI Instructions

> **NEW Q&A CLARIFICATIONS (2024-06):**
> - Never guess or assume anything about the code, game, or plans. If you are unsure, always ask the user for clarification and commit the answer here.
> - All new lessons, clarifications, or user answers must be added to this folder immediately for future AI/developers.
> - This folder is the single source of truth for all multiplayer, event, and schema logic. Always update it first.

> **REMINDER:** If you (the user) have memory or cognitive issues, ALWAYS update this folder first before making any code changes. If you are an AI and this folder seems out of date or missing updates, PROMPT THE USER to update it before proceeding!

- **Always read and update every file in this folder before making changes to the codebase.**
- When adding or changing a feature, event, or schema:
  - Update `events.md` and `events.js` for all new/changed events.
  - Update `schema.md` for any database changes.
  - Update `workflow.md` if the process changes.
- **Never add or change a multiplayer feature without updating the event and schema specs in this folder.**
- Always check and update all layers:
  - Client (React/Phaser)
  - Server (Socket.io/Node.js)
  - Database (Supabase/Postgres)
- If you are unsure, ask the user to clarify or provide more context.
- If you are a future AI, thank the user for keeping this folder up to date!
- **As of the latest audit, every event, payload, and schema field in this folder is fully mapped to the codebase.**
- **If you add or change any event, payload, or schema field in the codebase, you MUST update this folder immediately.**
- **This folder is the single source of truth for all multiplayer logic, event names, and payloads.**

---

**This folder is your source of truth for multiplayer and event-driven logic.**

## Multiplayer World Persistence & Dynamic Player Join (2024-06 Baseline)

- The dungeon/world instance is created and persists on the server, independent of player connections.
- The world continues to exist even if no players are connected (true persistence).
- Players join and leave dynamically, after the world is created.
- When a player joins, their stats are validated and injected into the world as a new player entity.
- When a player leaves, their entity is removed from the world, but the world continues running.
- There is no fallback stat block: joining is only allowed if the player's correct stats are available and valid.
- The world can be "never-ending" (no win condition) for now, supporting continuous multiplayer play and late-joining.
- This architecture is required for robust multiplayer, late-joining, reconnections, and future win/loss conditions.
- All real-time state changes (player join/leave, movement, encounters, etc.) are handled via Socket.io events.
- Supabase is used only for persistent player/account data (progression, inventory, etc.).

---

## Multiplayer Dungeon Instance Flow & Win Condition (2024-06 Update)

- When a player triggers the win condition (collects all 4 gems and exits), a portal is created and the dungeon instance is immediately locked for new entries.
- The portal remains open for a set time, allowing any current players to escape and win.
- All new joiners after this point are routed to a new, freshly generated dungeon instance.
- When the portal timer expires, the dungeon collapses and all remaining players lose.
- Players who win or lose are sent to their respective "You Win" or "You Lose" screens, which are not tied to the dungeon state and allow for post-game actions (rewards, stat allocation, etc.).
- When players return to the lobby and start a new game, they join the current open dungeon instance.
- The server manages multiple dungeon instances as needed, each with its own lifecycle.
- This approach is designed for robust multiplayer, late-joining, and future scalability.
- All stat validation and injection must occur before a player is allowed to join a dungeon instance.
- Socket.io events should be used for all real-time multiplayer state changes, while Supabase is used for persistent player/account data (progression, inventory, etc.).

---

## Persistent Dungeon & Late Join Player System (2024-06 Master Plan)

### 1. Persistent Dungeon World (Server-Side)
- The server creates and maintains a dungeon/world instance on startup, independent of player connections.
- The world persists and continues running even if all players disconnect.
- Dungeon layout, rooms, entities, and loot are stored in memory (or DB for true persistence).

### 2. Player Join Flow
- On player connection:
  - Fetch and validate player data from Supabase: id, user_id, name, type, level, vit, str, int, dex, mnd, spd.
  - If valid, inject the player as a new entity into the running dungeon (assign spawn location).
  - Send the current world state and player's spawn info to the client.
  - If invalid, reject the join and show an error.
- Sprite info is derived from the `type` field using local character definitions.

### 3. Player Entity Injection
- Player entity is created in the world after validation, not at world init.
- All player data (id, type, name, level, stats) is available to the server and other clients for PvP, rendering, and logic.

### 4. Player Leave/Disconnect
- On disconnect, remove the player entity from the world and drop their loot bag in their current room.
- The world continues running.

### 5. Reconnection
- On reconnect, if the player was alive, place them back in their last room (if possible).
- If they died, spawn them randomly in the dungeon.
- If their loot bag is still present, allow them to recover it.

### 6. Room Locking During Encounters
- If a room is in an encounter (PvE or PvP), all doors to that room are locked for other players.
- Attempting to enter shows a dialog: "You hear the clash of weapons beyond, but the door appears blocked for now…"

### 7. Inventory Management
- During play, inventory is managed in-memory (Socket.io) for real-time updates.
- Inventory is synced to Supabase at key points (death, win, logout, or intervals) for persistence.

### 8. PvP and Player Data Sharing
- All player entities expose their id, type, name, level, and stats to the server and other clients as needed.
- Sprite info is always derived from type.
- Combat: Attacker uses their PlayerStats for offense; defender uses theirs for defense.

### 9. Late-Joining & Multiple Players
- Players can join at any time and are injected into the persistent world.
- No fallback stats—joining is only allowed if the player's correct stats are available and valid.

### 10. (Optional/Future) World Save/Load
- For true persistence, periodically serialize and save the world state to a database.
- On server restart, load the last saved state.

### 11. Client-Side: Dynamic Player Creation
- After connecting and validation, the client receives the current world state and their spawn info.
- The player entity is created in the running scene, not at scene creation.

### 12. Edge Cases
- Room locking during encounters.
- Loot bag drop on disconnect/death.
- Reconnection logic for loot recovery.
- Random spawn on death/rejoin.
- No new joiners to a dungeon in "ending" state (for future win conditions).

---

## 2024-06 Audit: Dungeon Mutators, Managers, and Multiplayer Event Payloads

- All core dungeon logic (generation, room state, encounters, loot, inventory, puzzles, etc.) is now server-authoritative. Only non-damaging, non-authoritative logic (visuals, asset mappings) may be shared.
- **Item, spell, and stat definitions must be server-authoritative.** Do not share these with the client in a way that allows tampering; all calculations for attack, defense, spell effects, and stat bonuses must be validated and enforced on the server.
- DungeonService, EncounterManager, BagManager, and all mutators that affect persistent or multiplayer state are server-only. RoomManager and similar visual helpers may be shared.
- All real-time state changes (player join/leave, movement, encounters, inventory, loot, etc.) are handled via Socket.io events, with payloads fully documented in `events.md`.
- Supabase is used only for persistent player/account data, not for real-time dungeon state.
- The `/StuffForAI` folder is fully up to date with event payloads, architectural notes, and workflow checklists. All multiplayer and event-driven logic is documented and matches the codebase.
- This approach ensures nothing is lost, all logic is preserved, and the refactor is both safe and future-proof. The architecture is robust against cheating and ready for future multiplayer features.

---

## Absolutely Critical, Proven Rules for a Secure Migration (2024-06)

- All game logic and state must be server-authoritative. The client must never calculate, guess, or create any gameplay state (stats, encounters, inventory, etc.). The server must send all necessary data for gameplay.
- No client-side fallbacks or guessing. If the server does not provide a value, the client must not "fill in the blanks." Missing data = error or "waiting for server," never a guess or default.
- All encounters and entities are created by the server. The client only requests actions (e.g., "start encounter"). The server responds with a complete, authoritative payload. The client only renders what the server sends.
- Stat calculation for gameplay is server-only. Any stat values used in gameplay (health, attack, defense, etc.) must come from the server. The client may hard-code values for character creation/preview only, never for gameplay.
- Event flow is always request/response. The client emits a request (e.g., "move," "attack," "start encounter"). The server responds with the result and all data needed to render the new state. The client never assumes the result.
- No per-frame or excessive debug logging. Only log errors and critical warnings. Remove or comment out all per-frame or spammy debug logs.

---

## 2024-06: Server-Authoritative Architecture and Client Contract (Clarified)

- The client is a pure renderer and event sender. It does not calculate, simulate, or guess any gameplay state (stats, encounters, inventory, etc.).
- All game logic, stat calculations, AI, encounters, PVP, and event handling are performed server-side. The client only displays what the server sends and emits user actions as requests.
- There is no client-side fallback logic. If the server does not provide a value, the client must not fill in the blanks. Missing data results in an error or a 'Disconnected' pop-up, returning the player to the lobby.
- Stat calculations (including derived stats, damage, healing, etc.) are server-only. The client never has access to formulas or definitions for gameplay. For character creation/preview, hard-coded values may be used in the UI only.
- All encounter and AI logic (turns, loot, actions) are server-side. The client only receives authoritative event payloads and renders the results. No simulation or prediction is allowed on the client.
- PVP is fully server-authoritative. All actions, stat checks, and results are processed on the server. The client only sees what the server sends, never direct access to other players' stats or state.
- All game events (move, attack, spell, loot, etc.) are request/response. The client emits a request and always waits for the server's confirmation and result before updating the UI.
- Error handling: If the server fails to send required data, the client retries once silently. If that fails, the client shows a retry/disconnect pop-up. After two more failed retries, the client disconnects and returns to the lobby.
- Debug mode is server-driven and password-protected. CTRL+D on the client opens a password prompt (validated server-side). The debug menu is GUI-based and only available after server validation. All debug actions affecting game state are processed server-side.

These rules are absolute and must be followed for all future development and migration. Any deviation risks desync, security issues, or loss of multiplayer integrity.

---

## PVP Event and Calculation Rules (2024-06)

- PVP encounters follow the same flow as NPC encounters unless otherwise specified.
- When two players enter the same room, both are tracked as entities in the server's room state. If PVP is enabled, the server triggers a PVP encounter and locks the room for others.
- **Turn Order:** The player who enters the room always goes first. This matches NPC encounter logic and is enforced by the server.
- **Physical Attacks:**
  1. Start with the attacker's character type STR to get base physical damage.
  2. Apply all attacker multipliers (items, buffs, etc.).
  3. Apply defender's modifiers (defense, resistances, etc.) to reduce the damage.
  4. Apply final damage to the defender and update both players' states.
  5. Server sends the result to both clients for display. The client never calculates or modifies damage.
- **Spell Attacks:**
  1. Use the attacker's PlayerStats and spell definition to calculate base spell damage.
  2. Apply all attacker modifiers (items, buffs, etc.).
  3. Apply defender's PlayerStats (resistances, modifiers) to reduce the damage.
  4. Apply final damage and effects, update both players' states.
  5. Server sends the result to both clients for display.
- **Steal Attempts:**
  1. Server calculates base steal chance.
  2. Applies attacker's modifiers (steal bonuses).
  3. Applies defender's modifiers (steal protection).
  4. Rolls for success.
  5. If successful, removes a random item from the defender's inventory and adds it to the attacker's.
  6. Server sends the result and updated inventories to both clients.
- All calculations, rolls, and state changes are performed server-side. The client only displays results and never simulates, guesses, or modifies gameplay state.
- All PVP event flows must be mapped in events.md and events.js, and all state changes must be documented in this folder.

---

## 2024-06: Client as Dumb Renderer (Clarification)

- The client is strictly a renderer, intent emitter, and listener. It does not store, mutate, or calculate any gameplay state (stats, inventory, encounters, room state, etc.).
- The only logic allowed on the client is perspective/view logic (e.g., determining which wall or object to display based on the player's facing direction).
- The client listens for server events and only performs rendering or UI updates in direct response to server-sent state/events.
- All gameplay logic, state changes, and validation are performed server-side. The client only emits user intent (actions, requests) and renders the state/data sent by the server.
- No fallback, guessing, or local state mutation is allowed on the client. If server data is missing, the client must show an error or loading state, never fill in the blanks.
- This rule is absolute and must be followed for all future development and migration.

---

## 2024-06: PvP, Party, and Migration Lessons (User Directives)

### PvP Flow (as per user design)
- PvP encounters follow the same turn-based pattern as PvE, but both sides are player-controlled.
- No AI turn phase; turns alternate between players. The player who enters the room goes first.
- Attacks and spells use the same calculation pipeline as PvE: SpellManager and stats → PlayerStats (StatDefinitions) → modifiers → defender's stats → total → health.
- Stealing: Roll chance vs. protection. On success, take one random item from the enemy and add to stealer's bag.
- Fleeing: Works exactly as in NPC encounters.
- Talking: Player uses turn to send a message; opponent can use their turn for any action.
- Examine: 50/50 pass/fail. On fail: Themed, vague feedback. On success: Reveal one core stat (STR, DEX, INT, VIT, SPD, MND) with a qualitative comparison based on examiner's own stats.
- Trade: Not implemented yet; defer until after migration.
- Invite to Team: Sends invite; if accepted, inviter controls movement for both. Team combat: Leader, party, enemy leader, enemy party, repeat (or reversed if enemy entered last).
- Sprite Display: Character type is shown to opponent as in NPC encounters. Party members are displayed left/right behind the leader.

### Migration and Design Principles (User Directives)
- Never guess, embellish, or deviate from existing flows or code. Always ask the user for clarification if unsure.
- Do not omit or modify any mechanic or feature present in the code or user documentation.
- Be methodical, surgical, and precise. Preserve all interconnected features as designed.
- Both incremental and bulk migrations have risks; hybrid states are especially dangerous and should be minimized.
- Single source of truth (e.g., lootMap) is a good end-state, but only after server-authoritative migration is stable.
- Defer new features (like trade) until after migration. Implement examine, talking, and team invite exactly as described by the user.

--- 