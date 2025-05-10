# DependencyEventMap

## /server/server.js

### Emitters
- EVENTS.ACTION_RESULT (to socket): player join result, inventory update, loot bag pickup, trade/party/stat allocation responses
- EVENTS.ERROR (to socket): error messages for failed player data fetch, missing fields, Supabase errors, bag not found, etc.
- EVENTS.PLAYER_JOIN_NOTIFICATION (to all except sender): when a player joins
- EVENTS.PLAYER_LEAVE_NOTIFICATION (to all except leaver): when a player leaves
- EVENTS.LOOT_BAG_DROP (to room): when a player leaves or disconnects and drops a loot bag
- EVENTS.PLAYER_LEAVE (to all except leaver): when a player leaves
- EVENTS.ROOM_UPDATE (to socket): when a player enters a room (includes roomId, players, entities, visited)
- EVENTS.SPELL_RESULT (to socket): placeholder for spell cast result

### Handlers
- EVENTS.PLAYER_JOIN: Handles player join, fetches/validates from Supabase, injects into dungeon, emits join result and notifications
- EVENTS.PLAYER_LEAVE: Handles player leave, drops loot bag, emits leave notifications, resets dungeon if last player leaves
- EVENTS.ROOM_ENTER: Handles player moving to a new room, updates room membership, visited rooms, emits room update
- EVENTS.INVENTORY_UPDATE: Updates player inventory, emits result
- EVENTS.LOOT_BAG_PICKUP: Handles loot bag pickup, updates inventory, emits result or error
- EVENTS.SPELL_CAST: Placeholder, emits spell result (TODO: implement logic)
- EVENTS.TRADE_REQUEST: Placeholder, emits not implemented result
- EVENTS.PARTY_INVITE: Placeholder, emits not implemented result
- EVENTS.STAT_ALLOCATION: Placeholder, emits not implemented result
- 'disconnect': Handles player disconnect, drops loot if alive, resets dungeon if last player, logs disconnect

### State
- players (Map): playerId → { socket, character, roomId, inventory, lastKnownRoom, alive }
- rooms (Map): roomId → { players: Set, entities: [] }
- bags (Map): bagId → { roomId, items }
- visitedRooms (Map): playerId → Set of visited roomIds
- dungeon: generated at startup, reset when all players leave or disconnect

### Functions/Logic
- Player join: Validates via Supabase, injects into state, assigns spawn, emits state to client
- Player leave: Drops loot, notifies, cleans up, resets dungeon if empty
- Room enter: Moves player between rooms, updates state, tracks visited rooms, emits room update
- Inventory update: Updates player inventory, emits result
- Loot bag pickup: Transfers items, updates state, emits result or error
- Spell cast: Placeholder, emits dummy result (TODO: implement logic)
- Trade/party/stat allocation: Placeholders, emit not implemented
- Disconnect: Drops loot if alive, cleans up, resets dungeon if last player, logs disconnect
- HTTP GET /: Health check endpoint for Render.com

### Dependencies
- EVENTS from shared/events.js (all event names)
- generateDungeon from shared/DungeonCore.js (dungeon generation)
- Supabase for player validation
- node-fetch for HTTP requests
- dotenv for environment variables

### Notes
- All dungeon, player join/leave, inventory, loot, and room logic is server-authoritative and event-driven.
- Placeholders (TODOs) for spell, trade, party, and stat allocation logic must be implemented server-side in the future.
- No client-side fallback or guessing for these flows.
- All state changes and notifications are mapped to events and documented.

---

## src/shared/DungeonCore.js

### Exports
- `generateDungeon(seed, options = {})`: Main export. Returns `{ grid, rooms }` for the dungeon.

### Internal Functions
- `getTargetRoomCount()`: Determines room count based on player count.
- `initializeRooms(targetRooms)`: Creates room objects and grid.
- `repositionRooms()`: Repositions rooms in the grid.
- `getUnvisitedNeighbors(room, visited)`: Finds unvisited neighbor rooms.
- `connectRooms(room1, room2)`: Connects two rooms by door.
- `selectHubs()`: Selects hub rooms.
- `generateComplexDungeon()`: Main DFS for dungeon layout.
- `addLoops(probability)`: Adds cycles/loops to the dungeon.
- `enhanceHubs()`: Ensures hubs have enough connections.
- `ensureExits()`: Ensures all rooms are accessible.
- `assignPlaceholders()`: Assigns encounter types, shelves, gems, potions, puzzles, treasures, hints.
- `finalConsistencyCheck()`: Ensures all door connections are bidirectional.

### State
- `dungeonGrid`: 2D array of rooms.
- `roomList`: Array of all rooms.

### Dependencies
- `createRNG`, `shuffle`, `uuidv4` from `./RNG.js` (deterministic RNG, shuffling, UUIDs)

### Notes
- Pure logic module. No emitters, handlers, or side effects.
- Used for deterministic, server-authoritative dungeon generation.
- All randomization is seedable and testable.
- No state is persisted outside the returned dungeon object.

---

## src/shared/events.js

### Exports
- `EVENTS` (object): Centralized, machine-readable event names for all multiplayer and state flows.
  - Includes: PLAYER_JOIN, PLAYER_LEAVE, ROOM_ENTER, ROOM_UPDATE, ENCOUNTER_START, ENCOUNTER_END, INVENTORY_UPDATE, LOOT_BAG_DROP, LOOT_BAG_PICKUP, HEALTH_UPDATE, SPELL_CAST, SPELL_RESULT, TRADE_REQUEST, TRADE_RESPONSE, PARTY_INVITE, PARTY_UPDATE, MANA_UPDATE, STAT_ALLOCATION, WIN_CONDITION, ERROR, ACTION_RESULT, PLAYER_STATE_UPDATE, PLAYER_JOIN_NOTIFICATION, PLAYER_LEAVE_NOTIFICATION

### Notes
- This file is the single source of truth for all event names used in Socket.io flows.
- Any new or changed event must be added here and documented in events.md.
- Used by both client and server to ensure consistency and prevent typos or mismatches.

---

## src/shared/RNG.js

### Exports
- `createRNG(seed)`: Returns a deterministic, seedable RNG function (using seedrandom).
- `shuffle(array, rng)`: Returns a shuffled copy of the array using the provided RNG (Fisher-Yates, deterministic).
- `uuidv4(rng)`: Returns a deterministic UUID string using the provided RNG.

### Dependencies
- `seedrandom` (npm package): For deterministic RNG.

### Notes
- Pure utility module. No emitters, handlers, or persistent state.
- Used for deterministic dungeon generation, shuffling, and UUID creation.
- All randomness is seedable and testable for cross-platform consistency.

---

## src/socket.js

### Emitters
- 'player_join' (to server): Sent with `{ playerId, user_id }` when joining a player.
- 'room_enter' (to server): Sent with `{ playerId, roomId }` when entering a room.

### Handlers
- 'action_result' (from server): Listens for join result payloads after emitting 'player_join'.
- 'error' (from server): Listens for error payloads after emitting 'player_join'.

### Functions/Logic
- `connectSocket(token)`: Connects to the server with JWT auth, disconnects any previous socket.
- `joinPlayer({ playerId, user_id }, onSuccess, onError)`: Emits 'player_join', listens for 'action_result' and 'error', calls callbacks, and cleans up listeners.
- `enterRoom({ playerId, roomId })`: Emits 'room_enter' to the server.

### State
- `socket`: Singleton socket.io client instance (exported).

### Dependencies
- Relies on `window.io` (socket.io-client) loaded via CDN in `index.html`.
- Exports: `connectSocket`, `joinPlayer`, `enterRoom`, `socket`.

### Notes
- Pure client-side socket interface for multiplayer flows.
- All event names must match those in `shared/events.js` for consistency.
- No persistent state; all logic is event-driven and stateless except for the socket instance.

### Potential Server Event/Handler Needs
- No additional needs; this file is already structured as a thin client-side socket interface. All new events must be defined in shared/events.js and handled server-side.

---

## src/app.css

### Emitters
- None

### Handlers
- None

### Functions/Logic
- None

### State
- None

### Dependencies
- None

### Notes
- Pure CSS file for styling the root app container, logo, cards, and documentation links.
- No JavaScript, events, or state logic present.

### Potential Server Event/Handler Needs
- None. Pure CSS file.

---

## src/app.jsx

### Emitters
- Calls `connectSocket(token)` (from socket.js) to connect to the server with JWT auth.
- Calls `joinPlayer({ playerId, user_id }, onSuccess, onError)` (from socket.js) to emit 'player_join' to the server.
- Calls `enterRoom({ playerId, roomId })` (from socket.js) to emit 'room_enter' to the server (not directly in this file, but imported for use).

### Handlers
- Listens for `EVENTS.PLAYER_JOIN_NOTIFICATION` (from server): Shows notification when a player joins.
- Listens for `EVENTS.PLAYER_LEAVE_NOTIFICATION` (from server): Shows notification when a player leaves.
- Handles 'action_result' and 'error' via joinPlayer callback (see socket.js).

### Functions/Logic
- React components: `App`, `ResponsiveGameContainer`, `LoginScreen`, `CharacterSelectScreen`, `CharacterServerSelectScreen`, `IntroVideoScreen`, `LoadingScreen`, `FadeInOverlay`, `AutoShrinkText`.
- `App` manages all UI state, login, character creation, character/server selection, and game start.
- Handles Supabase authentication, character CRUD, and session management.
- Handles socket connection and multiplayer join flows.
- Passes stat blocks and dungeon data to Phaser game via `initGame` (from Game.js).
- Handles all UI transitions and error states for login, character, and server flows.

### State
- React state: `screen`, `user`, `characters`, `selectedCharacter`, `servers`, `selectedServer`, `lockedCharacter`, `lockedServer`, `fadeInLogin`, `charCreateError`, `deletePrompt`, `notification`, `connectionError`, `dungeon`.
- Exposes `window.supabase`, `window.currentCharacterId`, `window.currentCharacter`, and `window.socket` for global access.

### Dependencies
- `@supabase/supabase-js` for authentication and character data.
- `./CharacterTypes.js` for character definitions.
- `./StatDefinitions.js` for stat calculations.
- `./socket.js` for all multiplayer socket flows.
- `./shared/events.js` for event names.
- `./Game.js` for starting the Phaser game.
- Uses assets from `public/Assets` for backgrounds, tips, and logo.

### Notes
- All multiplayer and state flows are event-driven and server-authoritative.
- All event names must match those in `shared/events.js` for consistency.
- No direct emitters/handlers; all socket logic is abstracted via `socket.js`.
- Handles all UI, login, character, and server selection logic for the client.
- No persistent state outside React and Supabase.

### Potential Server Event/Handler Needs
- Character creation, deletion, and stat allocation: All logic currently handled via Supabase and local state will need to emit events to the server (e.g., CHARACTER_CREATE, CHARACTER_DELETE, STAT_ALLOCATE) and handle server responses.
- Inventory changes (add/remove/clear): Should emit events to the server for validation and persistence, not just update Supabase directly.
- Game start, dungeon generation, and stat block injection: All must be triggered by server events, with the client only rendering state received from the server.
- Any UI state that reflects game state (e.g., notifications, dungeon state, character state) should be updated in response to server events, not local logic.

---

## src/BagManager.js

### Emitters
- Emits 'showActionPrompt' (to scene.events): For UI prompts (e.g., bag full, item picked up, item dropped, use result).
- Emits 'lootBagClicked' (to scene.events): When a loot bag sprite is clicked, with bag/entity ID and sprite reference.
- Emits 'setupNavigationButtons', 'updateDoorZoneVisibility', 'setDoorInteractivity' (to scene): For UI and interaction state changes.

### Handlers
- Handles pointer events on bag toggle button and item sprites (pointerdown, pointerup, dragstart, drag, dragend).
- Handles context menu actions ('use', 'drop') via UI.
- Handles outside click to close context menu.

### Functions/Logic
- `BagManager(scene, playerStats, itemManager)`: Main class for inventory and bag UI management.
- Inventory management: `addItem`, `removeItem`, `clearInventory`, `hasItem`, `getRandomItemInstance`.
- UI management: `createToggleButton`, `toggleBag`, `openBagUI`, `closeBagUI`, `renderItems`, `showContextMenu`, `closeContextMenu`.
- Drag/drop and click handling: `handleItemDragStart`, `handleItemDrag`, `handleItemDragEnd`, `handleItemPointerUp`, `handleItemClick`.
- Bag drop logic: `createBagForNPC`, `createPlayerDroppedBag`, `removeBagSprite`, `updateBagVisibility`, `getRelativeDirection`.
- Grid management: `initializeGridOccupancy`, `findFirstAvailableSlot`, `canPlaceItemAt`, `markGridOccupancy`, `unmarkGridOccupancy`.
- Syncs inventory to Supabase on add/remove/clear if `window.supabase` and `window.currentCharacterId` are set.

### State
- `inventory`: Array of item instances (with grid position, itemKey, etc.).
- `gridOccupancy`: 2D array for slot tracking.
- `bagContainer`, `bagToggleButton`, `contextMenu`: Phaser UI elements.
- `activeBagSprites`: Map of entityId → { sprite, roomId, droppedFacingDirection } for dropped bags.
- `PLAYER_BAG_ID`: Constant for player's own dropped bag.
- UI state: `isOpen`, `gridStartX`, `gridStartY`, etc.

### Dependencies
- `Phaser` (via CDN/ESM import).
- `itemData` (exported for use by other modules).
- `playerStats` and `itemManager` (passed in for stat and item logic).
- Relies on global `window.supabase` and `window.currentCharacterId` for inventory sync.
- Scene must provide `events`, `add`, `input`, `time`, `game.config`, and other Phaser APIs.

### Notes
- All inventory and bag UI logic is client-side, but inventory is synced to Supabase for persistence.
- Emits events for UI prompts and loot bag interactions; expects other managers (e.g., LootUIManager) to handle loot flows.
- No direct socket or multiplayer logic; all multiplayer flows are handled elsewhere.
- Designed for use in Phaser scenes; not a React component.
- Exports both `BagManager` class and `itemData` object.

### Potential Server Event/Handler Needs
- All inventory changes (addItem, removeItem, clearInventory) must emit events to the server for validation and state update, with the server broadcasting the new inventory state back to the client.
- Bag drops (createBagForNPC, createPlayerDroppedBag) and loot interactions (lootBagClicked) should be server-authoritative: emit events to the server, which then validates and broadcasts state changes.
- Context menu actions (use, drop) must be validated and executed server-side, with the client only sending intent and rendering results from server events.
- All state changes that affect gameplay (inventory, bag drops, item use) must be event-driven and server-authoritative.

---

## src/CharacterTypes.js

### Emitters
- None

### Handlers
- None

### Functions/Logic
- Exports `characterDefinitions`: Object containing all character/entity type definitions, stats, assets, abilities, AI behavior, and dialogue.
- `getCharacterDefinition(typeKey)`: Returns a deep copy of the definition for the given type key.
- `getPlayableCharacters()`: Returns an array of all playable character definitions.
- `getAllCharacterTypeKeys()`: Returns an array of all available type keys.

### State
- Pure data module; no persistent or mutable state outside exported objects/functions.

### Dependencies
- None (self-contained logic and data).

### Notes
- Central source of truth for all character/entity types, stats, assets, and AI behaviors.
- Used by both client and server for consistent character logic and stat blocks.
- No side effects, emitters, or event handlers.

### Potential Server Event/Handler Needs
- None directly; this is a pure data/logic module. However, any logic that uses these definitions for state changes (e.g., stat allocation, ability use) must be event-driven and validated server-side.

---

## src/CombatVisuals.js

### Emitters
- None (all effects are local visual changes, not event-driven).

### Handlers
- None (no event listeners registered; all methods are called directly by game logic).

### Functions/Logic
- `CombatVisuals(scene)`: Main class for combat visual effects.
- `playPlayerDamageEffect()`: Triggers screen shake and red vignette flash when player takes damage.
- `triggerScreenShake()`: Shakes the main camera.
- `triggerVignetteFlash()`: Shows a red overlay and random broken glass effect, then fades out.
- `playEnemyDamageEffect(entityId)`: Flashes the enemy sprite for a given entity ID.

### State
- `prevGlassKey`, `prevGlassFlip`: Track last used glass texture and flip for effect variation.
- `glassTextureKeys`: List of available glass break textures.

### Dependencies
- `Phaser` (via CDN/ESM import).
- Expects `scene` to provide `cameras`, `add`, `tweens`, `time`, `game.config`, and `getSpriteForEntity`.

### Notes
- Purely visual/UX module for combat feedback; no emitters, handlers, or persistent state.
- Designed for use in Phaser scenes; not a React component.
- Exports `CombatVisuals` class.

### Potential Server Event/Handler Needs
- All combat effects (damage, status, visual feedback) should be triggered by server events (e.g., PLAYER_TAKES_DAMAGE, ENEMY_TAKES_DAMAGE) rather than local logic. The client should only play effects in response to these events, not as a result of local calculations.

---

## src/DebugHelper.js

### Emitters
- Emits 'showActionPrompt' (to scene.events): For UI feedback when gems are added to inventory.
- Calls scene.updateDoorZoneVisibility(visible): Triggers door zone debug visuals.

### Handlers
- None (all methods are called directly by debug UI or developer input).

### Functions/Logic
- `DebugHelper(scene)`: Main class for debug overlays and minimap.
- `setVisibility(visible)`, `toggleVisibility()`: Show/hide debug overlays and minimap, add gems to inventory in debug mode.
- `updateDebugText(position, room, facing, imageKey, assetKey)`: Updates on-screen debug text.
- `updateMinimap(grid, player)`: Draws minimap and player position/direction.
- `addGemsToInventory()`: Adds one of each gem type to the player's inventory and emits a UI prompt.

### State
- `debugText`, `minimap`: Phaser UI elements for debug overlays.
- `visible`, `prevVisible`: Debug overlay visibility state.

### Dependencies
- `Phaser` (via CDN/ESM import).
- Expects `scene` to provide `add`, `cameras`, `dungeonService`, `playerPosition`, `bagManager`, and `events`.

### Notes
- Purely for developer/debug use; not part of normal gameplay.
- Directly manipulates inventory and UI for testing.
- Exports `DebugHelper` class.

### Potential Server Event/Handler Needs
- Any debug actions that affect game state (e.g., adding items to inventory) should emit events to the server for validation and state update, with the server broadcasting the new state back to the client.
- Debug overlays and minimap should reflect server state, not local state, in a fully authoritative model.

---

## src/DungeonScene.js

### Emitters
- Emits 'showActionMenu', 'showTalkDialog', 'displayTalkInput', 'showTalkMessage', 'showActionPrompt', 'addToInventory', 'fleeToPreviousRoom', 'endEncounter', 'encounterStarted', 'enemyMoodChanged', 'rearrangeWarning', 'entityDied', 'playerKilledByNPC', 'lootBagClicked' (to scene.events or managers): For all major UI, encounter, inventory, and state flows.
- Calls scene.updateDoorZoneVisibility, setDoorInteractivity: For UI/interaction state.

### Handlers
- Handles all above events for UI, encounter, inventory, and state changes.
- Handles pointer and keyboard events for navigation, action menus, talk input, and loot.

### Functions/Logic
- `DungeonScene`: Main Phaser scene for dungeon gameplay.
- `init`, `preload`, `create`: Scene lifecycle and setup.
- `setupUIEvents`: Registers all event listeners for UI and gameplay flows.
- `update`: Main update loop for timers, encounters, and debug overlays.
- Navigation: `placePlayerRandomly`, `displayCurrentRoom`, `setupDoorInteractions`, `setupNavigationButtons`, `handleDoorClick`, `handleTurn`.
- Encounter/combat: `handleEntityDeath`, `handlePlayerKilledByNPC`, `handleLootBagClick`, `getSpriteForEntity`.
- UI: Action menu, talk input, prompts, minimap, debug overlays.
- Inventory: BagManager, loot UI, add/remove items, bag drops.
- State: playerPosition, isInEncounter, isRearranging, timers, entitySprites, statBlock, etc.

### State
- `playerPosition`, `dungeon`, `dungeonService`, `roomManager`, `debugHelper`, `encounterManager`, `puzzleManager`, `treasureManager`, `hintManager`, `shelfManager`, `bagManager`, `npcLootManager`, `lootUIManager`, `playerStats`, `itemManager`, `combatVisuals`, `spellManager`, `playerId`, `entitySprites`, `statBlock`, and all UI/timer refs.

### Dependencies
- `Phaser` (via CDN/ESM import).
- All major managers: DungeonService, RoomManager, DebugHelper, EncounterManager, PuzzleManager, TreasureManager, HintManager, ShelfManager, BagManager, NPCLootManager, LootUIManager, PlayerStats, ItemManager, CombatVisuals, SpellManager, HealthBar.
- CharacterTypes for definitions.
- Expects serverDungeon and statBlock injected at init.

### Notes
- Central orchestrator for all dungeon gameplay, UI, and state.
- All state changes, inventory, encounters, and navigation are currently local but must become server-authoritative.
- Exports `DungeonScene` class.

### Potential Server Event/Handler Needs
- All navigation (room entry, turn, movement) must emit events to the server and update state only in response to server events.
- All encounter/combat logic (start, end, actions, entity death, loot, mood changes) must be server-driven, with the client only rendering state from server events.
- All inventory changes (add, remove, bag drop, loot) must be validated and broadcast by the server.
- All UI prompts, action menus, and talk/dialog flows must be triggered by server events, not local logic.
- All timers, state transitions, and entity state (health, position, mood) must be server-authoritative.
- Debug overlays and minimap should reflect server state, not local state, in a fully authoritative model.

---

## src/DungeonService.js

### Emitters
- None (all logic is internal and synchronous; no event emitters or handlers).

### Handlers
- None (all methods are called directly by other managers/scenes).

### Functions/Logic
- `DungeonService`: Main class for dungeon generation, layout, and room management.
- `generateDungeon(playerCount)`: Generates a new dungeon grid and room list based on player count.
- `rearrangeDungeon(playerCount)`: Rearranges the dungeon layout for a new player count.
- Room/graph logic: `getTargetRoomCount`, `initializeRooms`, `repositionRooms`, `generateComplexDungeon`, `selectHubs`, `getUnvisitedNeighbors`, `connectRooms`, `addLoops`, `enhanceHubs`, `ensureExits`, `assignPlaceholders`, `hasMiddleDoor`, `finalConsistencyCheck`, `getRoomById`, `findRoomAt`.

### State
- `baseGridSize`, `dungeonGrid`, `roomList`, `hubCount`, `maxDeadEnds`, `minRearrangeInterval`, `lastRearrangeTime`, `playerCount`, `roomCounts`.

### Dependencies
- `Phaser` (for random, array, and math utilities).

### Notes
- Pure logic/service module for dungeon structure and room data.
- No emitters, handlers, or persistent state outside the class instance.
- Used by DungeonScene and other managers for all dungeon/room queries and generation.
- Exports `DungeonService` class.

### Potential Server Event/Handler Needs
- All dungeon generation, rearrangement, and room state must be server-authoritative. The server should emit events or payloads to the client with the full dungeon/room state, and the client should only render state received from the server.
- Any changes to dungeon layout, room state, or encounter placement must be triggered by server events and not by local logic.

---

## src/EncounterManager.js

### Emitters
- Emits to `scene.events`:
  - 'showActionMenu': For displaying player/AI action menus.
  - 'showTalkDialog', 'displayTalkInput', 'showTalkMessage': For talk/communication UI.
  - 'showActionPrompt': For all encounter feedback (damage, steal, trade, examine, flee, etc.).
  - 'addToInventory': For loot and item pickup.
  - 'fleeToPreviousRoom', 'endEncounter', 'encounterStarted', 'enemyMoodChanged', 'entityDied', 'playerKilledByNPC', 'lootBagClicked': For encounter, state, and UI flows.
- Calls to `scene` methods: `updateDoorZoneVisibility`, `setDoorInteractivity`, `time.delayedCall`, `bagManager`, `lootUIManager`, `spellManager`, `roomManager`.

### Handlers
- Handles all above events for UI, encounter, inventory, and state changes.
- Handles pointer and keyboard events for navigation, action selection, and input.
- Handles turn queue, AI action, and player input.

### Functions/Logic
- `EncounterManager(scene, playerStats, playerId, combatVisuals)`: Main class for all encounter logic.
- `initializeEncounter(room)`: Sets up encounter state, entities, and turn order.
- `startTurnBasedEncounter(entityId, roomId, enemyStartsFirst)`: Begins turn-based combat.
- `showActionMenu(initiatorId, targetId, roomId, menuContext, keepTimer)`: Displays action menu with context-sensitive options.
- `handleTalk`, `handleAttack`, `handleSteal`, `handleTrade`, `handleExamine`, `handleFlee`, `handleInvite`, `handleAIAction`: Core action handlers for all encounter actions.
- `endTurn(initiatorId)`: Rotates turn queue, triggers next action.
- `endEncounter(entityId, removeEntity)`: Cleans up encounter, handles loot, cooldowns, and entity removal.
- `submitTalk(message)`: Handles player-submitted talk messages.
- `handleSpellCast(initiatorId, targetId, spellName)`: Handles spell casting, damage, and effects.
- `getSpellEffectText(spellName, spellResult)`: Formats spell result text.
- Internal helpers for loot, AI, and state management.

### State
- `entities`: Map of all entities in the encounter (player, NPCs, etc.).
- `turnQueue`, `currentTurn`: Turn order and active entity.
- `pendingTalks`: Map of pending talk messages.
- `lastEncounterTime`, `lastFleeTime`, `waitingTimers`: Cooldown and timing state.
- `scene`, `playerStats`, `playerId`, `combatVisuals`: References to core systems.

### Dependencies
- Depends on: `scene` (Phaser), `PlayerStats`, `CombatVisuals`, `BagManager`, `LootUIManager`, `SpellManager`, `RoomManager`, `DungeonService`, `itemData`, `getCharacterDefinition`.
- Emits and listens to many scene-level events.
- Interacts with all major managers for inventory, loot, spells, and room state.

### Potential Server Event/Handler Needs
- **All encounter logic must move server-side:**
  - All state changes (health, mood, inventory, loot, turn order, etc.) must be authoritative on the server.
  - All player actions (attack, steal, talk, trade, examine, flee, invite, cast spell) must be sent as events to the server, which validates, updates state, and emits results to clients.
  - All AI actions, turn progression, and encounter resolution must be server-driven, with the client only rendering state and UI.
  - All loot, bag, and inventory changes must be server-authoritative, with the server emitting updates to clients.
  - All spell casting, damage, and effects must be processed server-side, with results sent to clients.
  - All encounter start/end, cooldowns, and entity removal must be server-driven.
  - All prompts, menus, and feedback must be triggered by server events, not local logic.
- **New events needed:**
  - `ENCOUNTER_START`, `ENCOUNTER_UPDATE`, `ENCOUNTER_END`: For all encounter state changes.
  - `PLAYER_ACTION`: For all player-initiated actions (with payload: action type, target, context).
  - `AI_ACTION`: For server-driven AI actions.
  - `ENCOUNTER_RESULT`: For all results (damage, steal, trade, talk, etc.).
  - `ENTITY_STATE_UPDATE`: For health, mood, inventory, loot, etc.
  - `TURN_UPDATE`: For turn order and active entity.
  - `PROMPT_UPDATE`, `MENU_UPDATE`: For UI feedback and menu state.
  - `LOOT_UPDATE`, `BAG_UPDATE`, `INVENTORY_UPDATE`: For all loot and inventory changes.
  - `SPELL_CAST_RESULT`: For spell casting and effects.
- **All local state and logic must be replaced with event-driven flows and server state sync.**

### Notes
- This file is central to all encounter, combat, and turn-based logic. All flows must be carefully migrated to server events and state, with the client acting only as a renderer and input relay. 

---

## src/Game.js

### Emitters
- None (no direct event emitters; all logic is configuration and scene bootstrapping).

### Handlers
- None (no event listeners; all logic is setup and initialization).

### Functions/Logic
- `gameConfig`: Phaser game configuration object (type, size, physics, scenes, scale, etc.).
- `initGame(parent, dungeon, statBlock)`: Initializes Phaser game with provided parent DOM node, dungeon data, and stat block. Starts `DungeonScene` with injected data.

### State
- No persistent or mutable state; all logic is stateless except for the returned Phaser game instance.

### Dependencies
- `Phaser` (via ESM import).
- `DungeonScene` (imported as the main scene).
- Expects `dungeon` and `statBlock` to be provided at initialization (from server or client logic).

### Notes
- Purely responsible for bootstrapping the Phaser game and injecting initial state.
- No emitters, handlers, or persistent state outside the Phaser game instance.
- Exports both `gameConfig` and `initGame`.

### Potential Server Event/Handler Needs
- All dungeon and stat block data injected here must originate from the server in a fully authoritative model.
- Game initialization should be triggered by a server event (e.g., GAME_START or DUNGEON_READY), with the client only starting the game in response to server state.
- Any future scene transitions or state changes should be event-driven and server-authoritative. 

---

## src/healthbar.js

### Emitters
- Emits to `scene.events`:
  - 'playerKilledByNPC': When the player is killed by an NPC (with npcId).
  - 'entityDied': When any entity (player or NPC) reaches 0 health (with entityId and attackerId).

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `HealthBar(scene, x, y, initialHealth, maxHealth, entityId)`: Main class for health bar UI and death handling.
- `updateHealth(newHealth, attackerId)`: Updates health, triggers death if health reaches 0.
- `updateDisplay()`: Redraws the health bar with color based on health percentage.
- `handleDeath(attackerId)`: Handles death visuals, disables input, emits events, and destroys the health bar.
- `destroy()`: Cleans up graphics.

### State
- `currentHealth`, `maxHealth`, `entityId`, `x`, `y`, `barWidth`, `barHeight`.
- `bg`, `fg`: Phaser graphics objects for the health bar.
- References to `scene` and its managers.

### Dependencies
- `Phaser` (via ESM import).
- Expects `scene` to provide `add`, `tweens`, `input`, `events`, and config.
- Used by `DungeonScene`, `EncounterManager`, and other managers for entity health display.

### Notes
- Purely visual/UX module for health display and death feedback.
- Emits events for death handling, but does not manage state or logic beyond the UI.
- Exports `HealthBar` class.

### Potential Server Event/Handler Needs
- All health changes and death events must be triggered by server events (e.g., ENTITY_HEALTH_UPDATE, ENTITY_DIED), not local calculations.
- The client should only update the health bar and play death visuals in response to server state/events.
- All input disabling, game over, and entity removal should be triggered by server-driven events, not local logic. 

---

## src/hintmanager.js

### Emitters
- None (no direct event emitters; all logic is local UI management).

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `HintManager(scene)`: Main class for managing room hints and their visibility.
- `initializeHints(room)`: Creates and displays hint text for a room, determines which wall to show it on.
- `updateHintVisibility(text, room)`: Shows/hides hint text based on player facing and wall state.
- `clearHints()`: Destroys all hint text objects and clears the hints map.

### State
- `hints`: Map of roomId → Phaser text object for each room's hint.
- `hintWallDirections`: Map of roomId → wall direction for hint display.
- Reference to `scene` and its managers.

### Dependencies
- `Phaser` (via ESM import).
- Expects `scene` to provide `add`, `game.config`, `playerPosition`, `roomManager`, and `dungeonService`.
- Used by `DungeonScene` for hint display in rooms.

### Notes
- Purely visual/UX module for displaying room hints based on player position and facing.
- No emitters, handlers, or persistent state outside the Phaser scene.
- Exports `HintManager` class.

### Potential Server Event/Handler Needs
- All hint content and visibility logic should be driven by server state (e.g., ROOM_HINT_UPDATE, PLAYER_POSITION_UPDATE).
- The client should only display hints in response to server events or state, not local calculations.
- Any changes to room hints or player position/facing should be validated and broadcast by the server. 

---

## src/index.css

### Emitters
- None

### Handlers
- None

### Functions/Logic
- None

### State
- None

### Dependencies
- None

### Notes
- Pure CSS file for global styles, typography, color scheme, and button styling.
- No JavaScript, events, or state logic present.

### Potential Server Event/Handler Needs
- None. Pure CSS file.

---

## src/itemmanager.js

### Emitters
- None (no direct event emitters; all logic is local item use and effect application).

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `ItemManager(scene)`: Main class for item effect logic and usage.
- `useItem(itemInstance, targetStats)`: Attempts to use an item on a target, applies effect, and returns result object.
- `itemEffects`: Object mapping item keys to effect definitions (type, amount, etc.).

### State
- `itemEffects`: Map of item keys to effect definitions.
- Reference to `scene` and its managers.

### Dependencies
- Expects `scene` to provide access to game state and managers.
- Used by `BagManager`, `PlayerStats`, and other managers for item use logic.

### Notes
- Pure logic module for item usage and effect resolution.
- No emitters, handlers, or persistent state outside the class instance.
- Exports `ItemManager` class.

### Potential Server Event/Handler Needs
- All item use and effect application must be validated and executed server-side (e.g., ITEM_USE_REQUEST, ITEM_USE_RESULT).
- The client should only send intent to use an item, and update state/UI in response to server events.
- All item effect logic (healing, buffs, etc.) must be server-authoritative. 

---

## src/lootuimanager.js

### Emitters
- Emits to `scene.events`:
  - 'lootUIClosed': When the loot UI is closed (for BagManager or others to react).

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `LootUIManager(scene, npcLootManager, bagManager)`: Main class for loot UI management and item transfer.
- `registerNpcLoot(entityId, lootItems)`: Stores generated loot for a specific NPC.
- `openLootUI(deceasedEntityId, bagSprite)`: Opens the loot UI for a specific entity and displays loot items.
- `closeLootUI()`: Closes the loot UI, destroys UI elements, and notifies BagManager.
- `setInteractionBlocking(isBlocked)`: Blocks or unblocks background scene interactions.
- `_renderLootItems(gridStartX, gridStartY)`: Renders loot items as sprites in the UI.
- `_handleLootItemClick(itemSprite)`: Handles clicking on a loot item and transfers it to the player's bag.

### State
- `isOpen`: Whether the loot UI is currently open.
- `lootContainer`: Phaser container for loot UI elements.
- `currentLootItems`: Array of item keys currently in the loot UI.
- `currentSourceEntityId`: The entity ID whose loot is being displayed.
- `sourceBagSprite`: Reference to the bag sprite for the loot source.
- `registeredLoot`: Map of entityId → loot items.
- Grid properties: `gridCols`, `gridRows`, `cellSize`, `gridPadding`, `gridStartX`, `gridStartY`.
- References to `scene`, `npcLootManager`, and `bagManager`.

### Dependencies
- `Phaser` (via ESM import).
- `itemData` (imported from BagManager.js).
- Expects `scene` to provide `add`, `game.config`, `events`, and other managers.
- Used by `DungeonScene`, `BagManager`, and encounter flows for loot handling.

### Notes
- Purely UI/UX module for displaying and transferring loot from NPCs to the player.
- Emits events for UI state changes, but does not manage game state or logic beyond the UI.
- Exports `LootUIManager` class.

### Potential Server Event/Handler Needs
- All loot registration, transfer, and removal must be validated and executed server-side (e.g., LOOT_REGISTER, LOOT_PICKUP_REQUEST, LOOT_PICKUP_RESULT).
- The client should only display loot and update UI in response to server events/state.
- All loot state (available items, bag destruction, etc.) must be server-authoritative. 

---

## src/main.jsx

### Emitters
- None (no direct event emitters; only React root rendering).

### Handlers
- None (no event listeners; only React root rendering).

### Functions/Logic
- Imports React and ReactDOM's `createRoot`.
- Imports `App` from `App.jsx`.
- Locates or creates a DOM element with id 'root'.
- Renders the `App` React component into the root container.

### State
- No persistent or mutable state; all logic is stateless except for the React root instance.

### Dependencies
- `react`, `react-dom/client` (for rendering).
- `App.jsx` (main React application component).
- Expects a DOM element with id 'root' to exist or creates one.

### Notes
- Pure entry point for React application; no emitters, handlers, or persistent state.
- Exports nothing; side effect is rendering the app.

### Potential Server Event/Handler Needs
- None directly; this file is only responsible for bootstrapping the React app. All server-driven logic should be handled within `App.jsx` and its children. 

---

## src/npclootmanager.js

### Emitters
- None (no direct event emitters; all logic is loot probability calculation).

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `NPCLootManager(scene)`: Main class for NPC loot probability and tier logic.
- `getLootForTier(tierName)`: Returns an object mapping item keys to drop probabilities for a given loot tier, validating against known item keys.
- `itemData`: Local object mapping item keys to asset and size info.
- `lootTiers`: Local object mapping tier names to item drop probabilities.

### State
- Reference to `scene` and its managers.
- `itemData`, `lootTiers`: Local static data for loot logic.

### Dependencies
- Expects `scene` to provide access to game state and managers.
- Used by `EncounterManager` and other managers for loot generation.

### Notes
- Pure logic module for loot probability and tier lookup.
- No emitters, handlers, or persistent state outside the class instance.
- Exports `NPCLootManager` class.

### Potential Server Event/Handler Needs
- All loot generation and probability rolls must be performed server-side (e.g., LOOT_GENERATE, LOOT_ASSIGN).
- The client should only display loot as provided by the server, not generate or randomize loot locally.
- All loot tier and item data should be validated and broadcast by the server. 

---

## src/playerstats.js

### Emitters
- Emits to `this.events` (Phaser EventEmitter):
  - 'healthChanged': When health changes (current, max).
  - 'playerDied': When health reaches 0.

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `PlayerStats(scene, playerId, statBlock)`: Main class for player stat management and calculations.
- `getMaxHealth()`, `getCurrentHealth()`: Getters for health values.
- `getPhysicalDamage()`, `getDefenseRating()`, `getStealSuccessBonus()`, `getStealProtection()`: Stat calculations.
- `applyDamage(rawDamage)`: Applies damage, emits events, and returns actual damage taken.
- `applyHealing(amount)`: Applies healing, emits events.
- `setHealth(newHealth)`: Directly sets health, emits events.
- `updateStatsFromInventory(items)`: Updates stat bonuses from inventory items.
- `modifyMagicalDamage(spellData)`, `getMagicalDamage(spellData)`, `getMagicalDamageMultiplier()`, `getElementalDamageMultiplier(element)`: Magic/stat calculations.
- Internal: stat block, derived stats, item bonuses, multipliers.

### State
- `statBlock`: Player's base stats (vit, str, int, dex, mnd, spd).
- `_maxHealth`, `_currentHealth`, `physicalBaseDamage`, `magicalBaseDamage`, `elementalBaseDamage`, `_defenseRating`.
- `itemDefenseBonus`, `swordCount`, `physicalDamageMultiplier`, `magicalDamageMultiplier`, `elementalDamageMultiplier`.
- `ITEM_STATS`: Static item stat definitions.
- Reference to `scene` and its managers.
- `events`: Phaser EventEmitter for stat changes.

### Dependencies
- `Phaser` (for EventEmitter and math utils).
- `StatDefinitions.js` for stat calculation helpers.
- Used by `DungeonScene`, `EncounterManager`, `BagManager`, and others for stat and health logic.

### Notes
- Pure logic module for player stat management, health, and damage calculations.
- Emits events for health and death, but does not manage game state or logic beyond stats.
- Exports `PlayerStats` class.

### Potential Server Event/Handler Needs
- All stat changes, health updates, and death events must be triggered by server events (e.g., PLAYER_STAT_UPDATE, PLAYER_HEALTH_UPDATE, PLAYER_DIED), not local calculations.
- The client should only update stats and health in response to server state/events.
- All inventory-driven stat changes must be validated and broadcast by the server. 

---

## src/puzzlemanager.js

### Emitters
- Emits to `scene.events`:
  - 'showActionPrompt': When attempting to loot a key during combat.
  - 'addToInventory': When a puzzle item (key) is collected and should be added to inventory.

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `PuzzleManager(scene)`: Main class for puzzle/key management and UI.
- `initializePuzzles(room)`: Creates and displays puzzle (key) sprite for a room, sets up click handler for collection.
- `updateSpriteVisibility(sprite, room)`: Shows/hides puzzle sprite based on player facing and wall state.
- `clearPuzzles()`: Destroys all puzzle sprites and clears the puzzles map.

### State
- `puzzles`: Map of roomId → Phaser sprite for each room's puzzle.
- `keyWallDirections`: Map of roomId → wall direction for puzzle display.
- Reference to `scene` and its managers.

### Dependencies
- `Phaser` (via ESM import).
- Expects `scene` to provide `add`, `game.config`, `playerPosition`, `roomManager`, `dungeonService`, and `events`.
- Used by `DungeonScene` for puzzle/key display and collection.

### Notes
- Purely visual/UX module for displaying and collecting puzzle items (keys) based on player position and facing.
- Emits events for inventory and UI state changes, but does not manage game state or logic beyond the UI.
- Exports `PuzzleManager` class.

### Potential Server Event/Handler Needs
- All puzzle/key state (placement, collection, visibility) must be server-authoritative (e.g., PUZZLE_STATE_UPDATE, PUZZLE_COLLECT_REQUEST, PUZZLE_COLLECT_RESULT).
- The client should only display and collect puzzle items in response to server events/state.
- All inventory changes from puzzle collection must be validated and broadcast by the server. 

---

## src/roommanager.js

### Emitters
- None (no direct event emitters; all logic is room/door calculation and navigation helpers).

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `RoomManager()`: Main class for room asset, door, and navigation logic.
- `getRoomImageKey(room, facing, dungeonService)`: Returns the asset key for the current room/facing.
- `getVisibleDoors(room, facing, dungeonService)`: Returns visible doors for the current room/facing.
- `getCardinalDirection(room, target)`: Returns cardinal direction from one room to another.
- `findBestMatchingRoomAsset(key)`: Finds the best matching asset key for a door configuration.
- `getDoorsFromAssetKey(assetKey)`: Returns door directions from an asset key.
- `ensureConsistentDoors(dungeon)`: Ensures all doors are bidirectional.
- `getMovementDelta(facing, direction, room, dungeonService)`: Returns movement delta and new facing for a move.
- `isValidMove(room, facing, direction, dungeonService)`: Checks if a move is valid.
- `rotateFacing(facing, rotation)`: Rotates facing direction.
- `hasMiddleDoor(room)`: Checks if a room has more than two doors.
- Internal: asset/direction mappings, alternates, helpers.

### State
- `roomAssets`, `availableAssetKeys`, `directionMappings`, `inverseDirectionMappings`.
- No persistent or mutable state outside the class instance.

### Dependencies
- `Phaser` (for math/utils, not strictly required).
- Used by `DungeonScene`, `HintManager`, `PuzzleManager`, and others for room/door logic.

### Notes
- Pure logic module for room/door asset and navigation calculations.
- No emitters, handlers, or persistent state outside the class instance.
- Exports `RoomManager` class.

### Potential Server Event/Handler Needs
- All room/door state, navigation, and movement must be server-authoritative (e.g., ROOM_STATE_UPDATE, PLAYER_MOVE_REQUEST, PLAYER_MOVE_RESULT).
- The client should only update room/door visuals and navigation in response to server events/state.
- All navigation and door logic must be validated and broadcast by the server. 

---

## src/shelfmanager.js

### Emitters
- Emits to `scene.events`:
  - 'showActionPrompt': When attempting to loot a shelf item during combat or after pickup.
  - 'addToInventory': When a shelf item (gem or potion) is collected and should be added to inventory.

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `ShelfManager(scene)`: Main class for shelf/gem/potion management and UI.
- `initializeShelves(room)`: Creates and displays shelf sprites for a room, sets up click handlers for collection.
- `getShelfAssetForPerspective(baseAssetName, direction)`: Returns the correct asset for the shelf based on player perspective.
- `updateShelfVisibility(sprite, room)`: Shows/hides shelf sprite based on player facing and wall state.
- `updateAllShelvesVisibility(room)`: Updates visibility for all shelves in a room.
- `clearShelves()`: Destroys all shelf sprites and clears the shelves map.

### State
- `shelves`: Map of roomId → shelf sprite objects for each room.
- `shelfWallDirections`: Map of roomId → wall direction for shelf display.
- Reference to `scene` and its managers.

### Dependencies
- `Phaser` (via ESM import).
- Expects `scene` to provide `add`, `game.config`, `playerPosition`, `roomManager`, `dungeonService`, and `events`.
- Used by `DungeonScene` for shelf/gem/potion display and collection.

### Notes
- Purely visual/UX module for displaying and collecting shelf items (gems, potions) based on player position and facing.
- Emits events for inventory and UI state changes, but does not manage game state or logic beyond the UI.
- Exports `ShelfManager` class.

### Potential Server Event/Handler Needs
- All shelf/gem/potion state (placement, collection, visibility) must be server-authoritative (e.g., SHELF_STATE_UPDATE, SHELF_COLLECT_REQUEST, SHELF_COLLECT_RESULT).
- The client should only display and collect shelf items in response to server events/state.
- All inventory changes from shelf collection must be validated and broadcast by the server. 

---

## src/spellmanager.js

### Emitters
- None (no direct event emitters; all logic is spell validation and processing).

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `SpellManager(bagManager, playerStats, combatVisuals)`: Main class for spell validation, requirements, and processing.
- `getAllSpells()`: Returns a list of all available spell names.
- `hasRequiredGemsForSpell(spellName)`: Checks if the player has the required gems for a spell.
- `getValidSpells()`: Returns a list of spells that can currently be cast.
- `getSpellRequirements(spellName)`: Returns the gem requirements for a spell.
- `getSpellData(spellName)`: Returns a copy of the base spell data for modification.
- `processSpellCast(spellName)`: Validates requirements, gets base data, and processes spell cast via PlayerStats.
- Internal: `spellGemRequirements`, `spellData` (Maps for requirements and spell base data).

### State
- `spellGemRequirements`: Map of spell names to required gems.
- `spellData`: Map of spell names to base spell data (damage, element, effects).
- References to `bagManager`, `playerStats`, `combatVisuals`.

### Dependencies
- `Phaser` (for logging, not strictly required).
- Expects `bagManager` for inventory checks, `playerStats` for stat modification, `combatVisuals` for effects.
- Used by `EncounterManager`, `DungeonScene`, and others for spell logic.

### Notes
- Pure logic module for spell validation, requirements, and processing.
- No emitters, handlers, or persistent state outside the class instance.
- Exports `SpellManager` class.

### Potential Server Event/Handler Needs
- All spell validation, casting, and effect application must be server-authoritative (e.g., SPELL_CAST_REQUEST, SPELL_CAST_RESULT).
- The client should only send intent to cast a spell, and update state/UI in response to server events.
- All spell requirements, inventory checks, and effect logic must be validated and broadcast by the server. 

---

## src/StatDefinitions.js

### Exports
- `getHealthFromVIT(vit)`: Returns 50 * vit.
- `getDefenseFromVIT(vit)`: Returns 0.5 * vit.
- `getPhysicalAttackFromSTR(str)`: Returns 10 * str.
- `getMagicBonusFromINT(intStat)`: Returns 0.10 * intStat (multiplier).
- `getMagicDefenseFromINT(intStat)`: Returns 0.5 * intStat.
- `getStealBonusFromDEX(dex)`: Returns 0.02 * dex.
- `getCritDamageFromDEX(dex)`: Returns 0.10 * dex.
- `getManaFromMND(mnd)`: Returns 10 * mnd.
- `getCritSpellBonusFromMND(mnd)`: Returns 0.10 * mnd.
- `getFleeChanceFromSPD(spd)`: Returns 0.02 * spd.
- `BASE_CRIT_CHANCE`: 0.05 (5% physical crit chance).
- `BASE_CRIT_DAMAGE`: 1.5 (150% physical crit damage multiplier).
- `BASE_CRIT_SPELL_CHANCE`: 0.10 (10% spell crit chance).
- `BASE_CRIT_SPELL_DAMAGE`: 2.0 (200% spell crit damage multiplier).

### Functions/Logic
- Centralized stat conversion functions for all base stats to derived stats.
- Used for health, defense, attack, magic, crit, mana, steal, and flee calculations.

### State
- No persistent or mutable state; all logic is pure functions and constants.

### Dependencies
- None (pure utility module).
- Used by `PlayerStats`, `EncounterManager`, and other stat logic modules.

### Notes
- Pure stat conversion and constant definitions; no emitters, handlers, or side effects.
- Exports only pure functions and constants.

### Potential Server Event/Handler Needs
- All stat calculations and conversions must be performed server-side for authoritative state.
- The client should only use these functions for rendering or prediction, not for authoritative game logic. 

---

## src/treasuremanager.js

### Emitters
- Emits to `scene.events`:
  - 'showActionPrompt': When attempting to loot a treasure item during combat.
  - 'addToInventory': When a treasure item (sword, helm, potion) is collected and should be added to inventory.

### Handlers
- None (all methods are called directly by game logic or managers).

### Functions/Logic
- `TreasureManager(scene)`: Main class for treasure management and UI.
- `initializeTreasures(room)`: Creates and displays treasure sprite for a room, sets up click handler for collection.
- `updateSpriteVisibility(sprite, room)`: Shows/hides treasure sprite based on player facing and wall state.
- `clearTreasures()`: Destroys all treasure sprites and clears the treasures map.

### State
- `treasures`: Map of roomId → Phaser sprite for each room's treasure.
- `treasureWallDirections`: Map of roomId → wall direction for treasure display.
- Reference to `scene` and its managers.

### Dependencies
- `Phaser` (via ESM import).
- Expects `scene` to provide `add`, `game.config`, `playerPosition`, `roomManager`, `dungeonService`, and `events`.
- Used by `DungeonScene` for treasure display and collection.

### Notes
- Purely visual/UX module for displaying and collecting treasure items based on player position and facing.
- Emits events for inventory and UI state changes, but does not manage game state or logic beyond the UI.
- Exports `TreasureManager` class.

### Potential Server Event/Handler Needs
- All treasure state (placement, collection, visibility) must be server-authoritative (e.g., TREASURE_STATE_UPDATE, TREASURE_COLLECT_REQUEST, TREASURE_COLLECT_RESULT).
- The client should only display and collect treasure items in response to server events/state.
- All inventory changes from treasure collection must be validated and broadcast by the server. 