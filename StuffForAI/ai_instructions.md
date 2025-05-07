# AI Instructions

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