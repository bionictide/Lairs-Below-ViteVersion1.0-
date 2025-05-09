# LivingAudit: Comprehensive Codebase Audit

**Mission Statement:**
We read each file, in its entirety. All chunks of it. Then we update the audit with all of the useful information we can pull from it to act as both a troubleshooting guide later in our attempt to save this project from its current point, and as a bit of the whole for our Living Architecture guide we will make that's purpose is to map out the entire system as it SHOULD BE if it were WORKING which we can use as a guide if we have to roll back and start over.

---

## File: App.css

**Purpose:**
- Contains global and component-specific CSS styles for the React application.

**Key Styles:**
- `#root`: Centers content, sets max width, padding, and text alignment.
- `.logo`: Sets logo height, padding, and adds a filter transition. On hover, applies a drop-shadow (with a special color for `.logo.react`).
- `@keyframes logo-spin`: Defines a continuous rotation animation.
- `@media (prefers-reduced-motion: no-preference)`: Applies the spin animation to the second anchor's logo if user prefers motion.
- `.card`: Adds padding to card elements.
- `.read-the-docs`: Sets a muted color for documentation links or text.

**Architectural Notes:**
- Styles are simple and mostly for demo/boilerplate or landing page elements.
- No critical game or UI logic is tied to these styles; safe to refactor or replace as needed.
- No CSS variables or advanced selectors; all styles are flat and global.

---

## File: App.jsx

**Purpose:**
- Main entry point and state manager for the React client.
- Orchestrates all high-level UI screens, authentication, character/server selection, and game launch.

**Major Components/Functions:**
- `App`: Main React component, manages global state and screen transitions.
- `ResponsiveGameContainer`: Handles scaling and fullscreen logic for the game UI.
- `LoginScreen`: Handles Supabase login/signup and emits login events.
- `CharacterSelectScreen`: UI for creating/selecting a character, includes name validation and stat preview.
- `CharacterServerSelectScreen`: UI for selecting a character and server, and joining the game server.
- `IntroVideoScreen`: Plays intro video on app start.
- `LoadingScreen`: Custom loading screen with tips/logo, masks game setup.
- `FadeInOverlay`, `AutoShrinkText`: UI helpers.

**Key Event Flows:**
- **Login:** Uses Supabase for auth, then transitions to character selection.
- **Character Creation:** Validates name, creates character in Supabase, injects stats from canonical definitions.
- **Character/Server Selection:** Locks in choices, then attempts to join the game server via Socket.io.
- **Game Launch:** Shows loading screen, injects/corrects stats, initializes Phaser game, then transitions to game screen.
- **State Transitions:** All major UI flows are managed by a `screen` state variable (`intro`, `login`, `loading`, `characterServerSelect`, `characterCreate`, `game`).

**Architectural Notes:**
- **State Management:** All global state is managed in App.jsx via React state hooks. No Redux or context API.
- **Client/Server Boundary:** Uses Socket.io for real-time events, Supabase for persistent data. Client is responsible for UI and event emission; server is authoritative for game logic.
- **Event/Dependency Drift:** Many event flows (login, join, stat injection) are tightly coupled to UI state, making it hard to decouple or test in isolation.
- **Pain Points:**
  - Stat injection and game setup logic is scattered and sometimes duplicated.
  - Error handling for server connection and game launch is fragile.
  - Cross-component dependencies (e.g., character stats, dungeon data) are passed via props and global state, leading to potential drift.
  - Some legacy/demo code (e.g., CSS, logo, intro video) is still present and may be safely removed or refactored.
- **For LivingArchitecture:**
  - All event flows, state transitions, and cross-component dependencies should be mapped and refactored for clarity and testability.
  - Consider centralizing game setup and stat validation logic.
  - Document all Socket.io and Supabase event flows for future migration or refactor.

---

## File: BagManager.js

**Purpose:**
- Manages the player's inventory (bag) UI and logic within the game scene.
- Handles item storage, placement, drag/drop, context menus, and bag-related events.

**Major Methods/Logic:**
- `createToggleButton`, `toggleBag`, `openBagUI`, `closeBagUI`: UI controls for opening/closing the bag.
- `initializeGridOccupancy`, `findFirstAvailableSlot`, `canPlaceItemAt`, `markGridOccupancy`, `unmarkGridOccupancy`: Grid logic for item placement.
- `renderItems`, `handleItemDragStart/Drag/DragEnd`, `handleItemPointerUp/Click`: Item rendering and interaction.
- `showContextMenu`, `handleContextMenuAction`: Right-click context menu for item actions (use, drop, etc.).
- `createBagForNPC`, `createPlayerDroppedBag`, `removeBagSprite`: Handles dropped bags for NPCs and players.
- `updateBagVisibility`, `hasItem`, `clearInventory`, `getRandomItemInstance`: Utility and state methods.

**Key Event Flows:**
- Bag open/close emits UI and interaction state changes to the scene.
- Item actions (use, drop, etc.) emit events to the scene or server.
- Bag state is updated in response to game events (e.g., loot, NPC death).

**Architectural Notes:**
- **Client-Heavy:** Most bag logic is client-side; server authority for inventory is not enforced here.
- **Phaser Integration:** Deeply tied to Phaser scene and rendering lifecycle.
- **Event Coupling:** Emits/handles events with the main scene and other managers (e.g., ItemManager, playerStats).
- **Pain Points:**
  - Inventory state is vulnerable to client-side tampering; needs refactor for server authority.
  - Grid/item logic is complex and tightly coupled to UI.
  - Many cross-file dependencies (scene, ItemManager, playerStats, events).
- **For LivingArchitecture:**
  - Inventory logic should be migrated to server authority.
  - All bag-related events and state changes should be documented and mapped for refactor.
  - Consider decoupling UI from inventory logic for testability and security.

---

## File: CharacterTypes.js

**Purpose:**
- Defines all character/entity types, their base stats, abilities, assets, and AI behaviors.
- Central source of truth for playable and non-playable character archetypes.

**Major Data Structures:**
- `characterDefinitions`: Object mapping type keys (e.g., 'dwarf', 'gnome') to full character definitions, including:
  - `name`, `type`, `assetPrefix`, `stats` (vit, str, int, dex, mnd, spd), `abilities`, `lootTier`, `playable`, and `aiBehavior` (aggression, actions, talk responses).

**Helper Functions:**
- `getCharacterDefinition(typeKey)`: Returns a deep copy of a character definition by key.
- `getPlayableCharacters()`: Returns all playable character definitions.
- `getAllCharacterTypeKeys()`: Returns all available type keys.

**Architectural Notes:**
- **Single Source:** All character stat and behavior data is centralized here for consistency.
- **Extensible:** New character types and AI behaviors can be added easily.
- **Pain Points:**
  - Any drift between this file and server-side logic can cause stat/behavior mismatches.
  - Some AI logic is embedded as data, which may complicate future refactors to server authority.
- **For LivingArchitecture:**
  - Ensure this file (or its canonical data) is the only source of truth for character stats/abilities.
  - Document all cross-file and server dependencies on character definitions.
  - Consider extracting AI logic to a more testable, server-driven format in the future.

---

## File: CombatVisuals.js

**Purpose:**
- Handles all combat-related visual effects in the game scene (e.g., damage flashes, screen shake, overlays).

**Major Methods/Logic:**
- `playPlayerDamageEffect()`: Triggers player damage visuals (screen shake + red vignette/glass effect).
- `triggerScreenShake()`: Shakes the camera for impact feedback.
- `triggerVignetteFlash()`: Shows a red overlay and random glass break effect.
- `playEnemyDamageEffect(entityId)`: Flashes a white tint on an enemy sprite when damaged.

**Key Event Flows:**
- Called by the scene or combat logic when a player or enemy takes damage.
- Uses Phaser's tween and time systems for effect timing and cleanup.

**Architectural Notes:**
- **Phaser-Dependent:** All effects are tightly coupled to Phaser's rendering and scene lifecycle.
- **Stateless:** No persistent state; only manages transient visual effects.
- **Pain Points:**
  - Relies on correct sprite/entity mapping in the scene (e.g., `getSpriteForEntity`).
  - Effects logic is not easily testable outside Phaser.
- **For LivingArchitecture:**
  - Document all entry points and triggers for combat visuals.
  - Consider decoupling effect triggers from combat logic for testability.

---

## File: DebugHelper.js

**Purpose:**
- Provides developer/debugging tools for the game scene, including debug overlays and minimap.

**Major Methods/Logic:**
- `setVisibility`, `toggleVisibility`: Show/hide debug overlays and minimap.
- `updateDebugText`: Displays player/room state and other info.
- `updateMinimap`: Renders a minimap of the dungeon layout and player position.
- `addGemsToInventory`: Emits events to add gems to inventory for testing.

**Key Event Flows:**
- Toggled by developer input or debug mode.
- Emits events to the scene (e.g., add items, show prompts).
- Updates overlays/minimap in response to game state changes.

**Architectural Notes:**
- **Phaser-Dependent:** All debug visuals are tightly coupled to Phaser's rendering and scene lifecycle.
- **Event Coupling:** Relies on scene events and BagManager for debug actions.
- **Pain Points:**
  - Debug logic is not separated from game logic; can lead to accidental state changes in production.
  - Some debug actions (e.g., adding gems) emit server events, which may not be available in all environments.
- **For LivingArchitecture:**
  - Consider isolating debug tools from production code.
  - Document all debug event flows and dependencies.

---

## File: DungeonScene.js

**Purpose:**
- Central game scene for all dungeon gameplay, player movement, encounters, UI, and event handling.

**Major Subsystems/Components:**
- **Managers:** Integrates RoomManager, DungeonService, DebugHelper, EncounterManager, PuzzleManager, HintManager, ShelfManager, BagManager, NPCLootManager, LootUIManager, ItemManager, CombatVisuals, PlayerStatsProxy, HealthBar.
- **Player State:** Tracks player position, facing, health, inventory, and unique playerId.
- **UI:** Handles all in-game UI (action menus, prompts, health bar, talk input, minimap, overlays, navigation buttons, door zones).
- **Phaser Integration:** Implements full Phaser.Scene lifecycle (init, preload, create, update).

**Key Event Flows:**
- **Scene Lifecycle:**
  - `init(data)`: Receives character and dungeon data from the client.
  - `preload()`: Loads all assets (rooms, items, shelves, effects, character sprites).
  - `create()`: Initializes all managers, sets up player, UI, and event listeners.
  - `update()`: Handles per-frame updates (timers, encounter checks, debug overlays, etc.).
- **UI/Event Handling:**
  - Action menus, prompts, talk input, minimap, navigation, and overlays are all managed here.
  - Listens for and emits many events (e.g., showActionMenu, showActionPrompt, addToInventory, endEncounter, encounterStarted, enemyMoodChanged, rearrangeWarning, displayTalkInput, showTalkMessage, showActionPrompt, addToInventory, fleeToPreviousRoom, endEncounter, lootBagClicked, treasurePickupResult, attackResult, stealResult, requestRoomEnter, requestTurn, requestTreasurePickup, requestAddItem).
- **Player/Encounter Logic:**
  - Handles player placement, movement, encounters, combat, loot, and death.
  - Integrates with server via socket events for combat, inventory, and state changes.
  - Manages dropped bags, loot, and NPC deaths.
- **Manager Dependencies:**
  - Many managers depend on each other (e.g., BagManager needs PlayerStatsProxy and ItemManager; EncounterManager needs PlayerStatsProxy, CombatVisuals, etc.).
  - Circular dependencies are present and critical to the architecture.

**Architectural Notes:**
- **Highly Centralized:** Most game logic, UI, and event handling is centralized in this scene, leading to tight coupling and deep interdependencies.
- **Server Authority:** Some logic (combat, inventory) is now server-authoritative, but many flows are still client-driven or duplicated.
- **Event Coupling:** Heavy use of Phaser's event system and direct method calls between managers.
- **Cross-File Dependencies:**
  - Imports and coordinates nearly all major game systems and managers.
  - Relies on shared event constants, asset keys, and canonical data from other modules.
- **Pain Points:**
  - Difficult to test or refactor due to deep interdependencies and tight coupling.
  - Many cross-file and cross-manager dependencies; changes in one system can break others.
  - Some legacy/unused code and comments remain.
  - Error handling is inconsistent; some flows fail silently or with only console errors.
  - UI and logic are often intermingled, making separation of concerns difficult.
- **For LivingArchitecture:**
  - Map all event flows, socket interactions, and manager dependencies in detail.
  - Decouple UI from game logic where possible.
  - Move as much logic as possible to server authority, keeping the client as a thin UI/event layer.
  - Document all socket and event flows for future refactor.
  - Consider strategies for breaking up the monolithic scene and reducing circular dependencies.

---

## File: DungeonService.js

**Purpose:**
- Procedurally generates, manages, and rearranges the dungeon layout for the game.
- Handles room creation, connectivity, hub/dead-end assignment, item/puzzle/treasure/hint placement, and consistency checks.

**Major Methods/Logic:**
- `generateDungeon(playerCount)`: Generates a new dungeon grid and room list based on player count.
- `rearrangeDungeon(playerCount)`: Rearranges the dungeon if enough time has passed, preserving room list but repositioning and reconnecting rooms.
- `getTargetRoomCount()`: Determines room count based on player count (small/medium/large).
- `initializeRooms(targetRooms)`: Creates room objects with coordinates and initializes the grid.
- `repositionRooms()`: Repositions rooms in the grid for rearrangement.
- `generateComplexDungeon()`: Main algorithm for connecting rooms, assigning hubs/dead-ends, and ensuring full connectivity.
- `selectHubs()`: Randomly selects hub rooms, ensuring minimum distance between them.
- `getUnvisitedNeighbors(room, visited)`: Finds cardinally adjacent, unvisited rooms.
- `connectRooms(room1, room2)`: Adds bidirectional doors between rooms.
- `addLoops(probability)`: Adds cycles/loops to the dungeon for complexity.
- `enhanceHubs()`: Ensures hub rooms have at least 3 doors.
- `ensureExits()`: Ensures no room is isolated.
- `assignPlaceholders()`: Assigns shelves, gems, potions, puzzles, treasures, and hints to rooms based on rules and randomness.
- `finalConsistencyCheck()`: Ensures all door connections are bidirectional and valid.
- `getRoomById(id)`, `findRoomAt(x, y)`: Room lookup utilities.

**Key Data Structures:**
- `dungeonGrid`: 2D array of rooms by grid coordinates.
- `roomList`: Flat array of all room objects, each with id, x, y, doors, flags, and content properties.

**Architectural Notes:**
- **Procedural Generation:** Uses DFS and randomization for layout, with post-processing for connectivity and content.
- **Scalable:** Room count and complexity scale with player count.
- **Client-Side:** This logic is currently in the client, but should be server-authoritative for security.
- **Pain Points:**
  - Many random elements; results can vary widely between runs.
  - Some logic (e.g., shelf/gem/potion/hint placement) is complex and could be hard to test or debug.
  - No validation of input parameters; assumes Phaser and utility functions are always available.
  - If moved to the server, must ensure deterministic generation for all clients.
- **For LivingArchitecture:**
  - Document all event flows and cross-file dependencies (e.g., BagManager, RoomManager, EncounterManager).
  - Consider extracting generation logic to a shared module for both client and server.
  - Ensure all dungeon state is server-authoritative and only sent to clients as needed.

---

## File: EncounterManager.js

**Purpose:**
- Manages all turn-based encounters between the player and NPCs/monsters in a dungeon room.
- Handles encounter initialization, turn order, AI actions, player actions, loot, cooldowns, and event emission.

**Major Methods/Logic:**
- `initializeEncounter(room, triggerType)`: Starts an encounter in a room, checks cooldowns, determines enemy type, and sets up turn order.
- `startTurnBasedEncounter(entityId, roomId, enemyStartsFirst)`: Sets up the turn queue and emits the encounter start event.
- `showActionMenu(initiatorId, targetId, roomId, menuContext, keepTimer)`: Builds and emits the action menu for the player, including attack, spells, talk, trade, examine, flee, and invite options.
- `handleTalk`, `handleAttack`, `handleSteal`, `handleTrade`, `handleExamine`, `handleFlee`, `handleInvite`: Handle all possible player and AI actions, emitting events and updating state as needed.
- `handleAIAction(initiatorId, targetId)`: Executes AI logic for the current entity, using definitions from CharacterTypes.js (mood, health, talk responses, standard/angry actions).
- `endTurn(initiatorId)`: Rotates the turn queue, checks for defeat/flee, and triggers the next action (player or AI).
- `endEncounter(entityId, removeEntity)`: Cleans up after an encounter ends (defeat or flee), handles loot, cooldowns, and event emission.
- `submitTalk(message)`: Handles player-submitted talk messages and triggers AI responses.
- `handleSpellCast(initiatorId, targetId, spellName)`: Handles spell casting, damage, effects, and event emission.
- `getSpellEffectText(spellName, spellResult)`: Formats spell result text for display.
- Helper: `calculateInitialLoot(entityType)`, `startRoomCooldown(roomId)`

**Key Data Structures:**
- `entities`: Map of entityId to entity state (type, stats, health, mood, loot, roomId).
- `turnQueue`: Array of entity/player IDs for turn order.
- `pendingTalks`: Map of initiatorId to talk message/target.
- `lastEncounterTime`, `lastFleeTime`: Track cooldowns for each entity type.
- `waitingTimers`: Map of entityId to delayed removal timers after flee.

**Architectural Notes:**
- **Highly Centralized:** All encounter logic, turn management, and event emission is handled here.
- **AI-Driven:** AI actions are data-driven, using definitions from CharacterTypes.js for behavior, mood, and talk responses.
- **Event-Heavy:** Emits and listens for many Phaser events (showActionMenu, showActionPrompt, encounterStarted, endEncounter, entityDied, enemyMoodChanged, etc.).
- **Server Integration:** Some actions (attack, steal) are emitted to the server for validation and resolution.
- **Pain Points:**
  - Large, complex file with many responsibilities (turns, AI, UI, event emission, cooldowns, loot).
  - Deeply coupled to scene, managers, and event system; hard to test or refactor in isolation.
  - Some logic (e.g., spell/loot/AI) is duplicated or scattered across managers.
  - Cooldown and state tracking is manual and error-prone.
  - Many cross-file dependencies (BagManager, CharacterTypes, SpellManager, LootUIManager, etc.).
- **For LivingArchitecture:**
  - Consider splitting encounter, AI, and event logic into smaller, testable modules.
  - Document all event flows, state transitions, and cross-manager dependencies.
  - Move as much encounter and AI logic as possible to the server for security and consistency.

---

## File: Game.js

**Purpose:**
- Initializes and configures the Phaser game instance for the client.
- Serves as the entry point for launching the main game scene (`DungeonScene`).

**Major Methods/Logic:**
- `gameConfig`: Configuration object for Phaser, including renderer type, dimensions, physics, scaling, background color, and scene list.
- `initGame(parent, dungeon, character)`: Function to create a new Phaser.Game instance, injects the parent DOM node, dungeon data, and character data, and starts the `DungeonScene` with the provided data.

**Key Data Structures:**
- `gameConfig`: Centralized configuration for all Phaser game settings.
- `Phaser.Game`: The main game object created and returned by `initGame`.

**Architectural Notes:**
- **Single Responsibility:** This file is only responsible for game bootstrapping and configuration, not gameplay logic.
- **Scene Injection:** Passes server-provided dungeon and character data directly to the main scene.
- **Debug Logging:** Extensive debug logs for each step of game initialization and scene start, aiding troubleshooting.
- **Pain Points:**
  - Any changes to scene structure or data injection must be reflected here.
  - If Phaser or scene initialization fails, errors may not propagate cleanly to the React UI.
- **For LivingArchitecture:**
  - Document the full data flow from React/UI to Phaser game instance.
  - Ensure all game setup and teardown logic is centralized and robust against errors.
  - Consider hooks for server-driven scene switching or dynamic scene injection in the future.

---

## File: HealthBar.js

**Purpose:**
- Renders and manages the health bar UI for the player and NPCs within the game scene.
- Handles health updates, death events, and related visual feedback.

**Major Methods/Logic:**
- `HealthBar(scene, x, y, initialHealth, maxHealth, entityId)`: Constructor that creates background and foreground graphics for the health bar at the specified position, with initial and max health.
- `updateHealth(newHealth, attackerId)`: Updates the current health, redraws the bar, and checks for death. If health reaches zero, triggers `handleDeath`.
- `updateDisplay()`: Redraws the health bar with color changes (green/yellow/red) based on health percentage.
- `handleDeath(attackerId)`: Handles death logic, disables input, displays "YOU HAVE DIED" overlay for the player, emits events for NPC death, and destroys the health bar graphics.
- `destroy()`: Cleans up graphics objects and logs destruction.

**Key Data Structures:**
- `bg`, `fg`: Phaser graphics objects for the health bar background and foreground.
- `currentHealth`, `maxHealth`, `entityId`: Track health state and ownership.

**Architectural Notes:**
- **UI-Only:** Purely visual/UI component; does not manage health logic or state outside of display and death triggers.
- **Event Emission:** Emits `entityDied` and `playerKilledByNPC` events for scene/manager handling.
- **Player/NPC Handling:** Special logic for player death (input lock, overlay, event), generic for NPCs.
- **Pain Points:**
  - Assumes scene/playerStats structure; may break if scene structure changes.
  - Death logic is tightly coupled to UI and event system.
  - No animation for health changes except color; could be enhanced for better feedback.
- **For LivingArchitecture:**
  - Document all event flows and dependencies for health/death handling.
  - Consider decoupling UI from health/death logic for better testability and server authority.

---

## File: HintManager.js

**Purpose:**
- Manages the display and logic for in-room hints that provide clues to the player about treasure, puzzles, or navigation.
- Ensures hints are only visible when the player is facing the correct wall in a room.

**Major Methods/Logic:**
- `HintManager(scene)`: Constructor that initializes the manager with a Phaser scene, and sets up maps for hints and wall directions.
- `initializeHints(room)`: Creates and displays a hint text object for a room if it has hint content, determines which wall the hint should appear on (based on room doors and a seeded random selection), and stores the direction for consistency.
- `updateHintVisibility(text, room)`: Shows or hides the hint text based on the player's current facing direction and whether the player is facing a wall without a door.
- `clearHints()`: Destroys all hint text objects and clears the hints map, but preserves wall direction data for consistency between visits.

**Key Data Structures:**
- `hints`: Map of roomId to Phaser text objects for hints.
- `hintWallDirections`: Map of roomId to the chosen wall direction for hint display.

**Architectural Notes:**
- **Contextual UI:** Hints are only visible when the player is facing the correct wall, increasing immersion and challenge.
- **Deterministic Placement:** Wall direction for hints is chosen using a seeded method based on room ID, ensuring consistency across sessions.
- **Event Coupling:** Relies on `roomManager` and `dungeonService` for door and room data, and on `playerPosition` for facing direction.
- **Pain Points:**
  - Assumes room and player data structures; may break if these change.
  - No persistence of hints across reloads except for wall direction.
  - UI logic is tightly coupled to Phaser scene and rendering.
- **For LivingArchitecture:**
  - Document all dependencies on room, player, and scene data.
  - Consider decoupling hint logic from UI for better testability and server-driven hints in the future.

---

## File: index.css

**Purpose:**
- Provides global CSS styles for the application, including base typography, color scheme, and element resets.

**Major Styles/Logic:**
- `:root`: Sets font family, color scheme, background color, and font rendering optimizations.
- `a`, `a:hover`: Styles anchor tags with color and hover effects.
- `body`: Removes default margin, centers content, and sets minimum dimensions.
- `h1`: Sets large font size and line height for headings.
- `button`, `button:hover`, `button:focus`: Styles buttons with rounded corners, background color, transitions, and focus outlines.
- `@media (prefers-color-scheme: light)`: Adjusts colors for light mode, including root, anchor, and button backgrounds.

**Architectural Notes:**
- **Global Scope:** Affects all elements in the app; intended as a base stylesheet.
- **Accessibility:** Uses system fonts and focus outlines for better accessibility.
- **Pain Points:**
  - No component-specific or modular CSS; all styles are global.
  - May conflict with component or library styles if not scoped.
- **For LivingArchitecture:**
  - Consider modularizing styles or using CSS-in-JS for better maintainability.
  - Document any global style dependencies or overrides that affect UI components.

---

## File: ItemManager.js

**Purpose:**
- Handles the logic for using items within the game, specifically applying item effects to targets (e.g., healing the player).
- UI-only: does not mutate game state or inventory directly.

**Major Methods/Logic:**
- `ItemManager(scene)`: Constructor that initializes the manager with a Phaser scene and sets up a map of item effects.
- `useItem(itemInstance, targetStats)`: Attempts to use an item on a target, applies the effect (e.g., healing), and returns a result object indicating success, message, consumption, and amount healed.
- `itemEffects`: Object mapping item keys to their effect definitions (currently only healing potions).

**Key Data Structures:**
- `itemEffects`: Map of item keys to effect definitions (type, amount, etc.).

**Architectural Notes:**
- **UI-Only:** No state mutation or inventory management; only applies effects and returns results for UI/scene to handle.
- **Extensible:** Designed to support additional item types and effects (buffs, keys, etc.) in the future.
- **Pain Points:**
  - Assumes targetStats object has an `applyHealing` method; may break if target structure changes.
  - No validation of item ownership or inventory; relies on external systems for security.
- **For LivingArchitecture:**
  - Document all dependencies on item and target data structures.
  - Consider moving item effect resolution to the server for authoritative gameplay.

---

## File: LootUIManager.js

**Purpose:**
- Manages the UI for looting items from defeated NPCs or bags in the dungeon.
- Handles loot registration, display, interaction, and event emission for loot actions.

**Major Methods/Logic:**
- `LootUIManager(scene, npcLootManager, bagManager)`: Constructor that initializes the manager with references to the scene, NPC loot manager, and bag manager. Sets up state and grid properties.
- `registerNpcLoot(entityId, lootItems)`: Stores pre-generated loot for a specific NPC/entity.
- `openLootUI(deceasedEntityId, bagSprite)`: Opens the loot UI for a given entity, displays items in a grid, and blocks background interaction.
- `closeLootUI()`: Closes the loot UI, destroys UI elements, manages bag sprite cleanup, and emits a close event.
- `setInteractionBlocking(isBlocked)`: Blocks or unblocks background scene interactions and updates navigation/door UI.
- `_renderLootItems(gridStartX, gridStartY)`: Renders loot items as interactive sprites in the loot UI grid.
- `_handleLootItemClick(itemSprite)`: Handles clicking on a loot item, emits a server event to request looting the item.

**Key Data Structures:**
- `registeredLoot`: Map of entityId to arrays of item keys (loot contents).
- `lootContainer`: Phaser container for all loot UI elements.
- `currentLootItems`, `currentSourceEntityId`, `sourceBagSprite`: Track current loot state and source.

**Architectural Notes:**
- **UI-Driven:** All loot display and interaction is handled client-side; actual loot transfer is server-authoritative.
- **Event-Heavy:** Emits and listens for events to coordinate with BagManager, EncounterManager, and the server.
- **Grid-Based:** Uses a grid layout for loot display, matching BagManager's inventory grid.
- **Pain Points:**
  - UI logic is tightly coupled to Phaser scene and other managers.
  - Assumes itemData structure and asset availability; may break if item definitions change.
  - No local state mutation for loot transfer; relies on server events for updates.
- **For LivingArchitecture:**
  - Document all event flows and dependencies between loot, bag, and encounter systems.
  - Consider decoupling UI from loot logic for better testability and server-driven updates.

---

## File: NPCLootManager.js

**Purpose:**
- Manages loot tables and drop probabilities for NPCs based on loot tiers.
- Provides loot definitions and probabilities for use by EncounterManager and LootUIManager.

**Major Methods/Logic:**
- `NPCLootManager(scene)`: Constructor that initializes the manager with a Phaser scene.
- `getLootForTier(tierName)`: Returns an object mapping item keys to drop probabilities for a given loot tier, validating keys against local itemData.
- `itemData`: Local definition of item keys, names, assets, and grid sizes (mirrors BagManager).
- `lootTiers`: Object mapping tier names to item drop probabilities.

**Key Data Structures:**
- `itemData`: Map of item keys to item definitions (name, asset, width, height).
- `lootTiers`: Map of tier names to item drop probabilities.

**Architectural Notes:**
- **Tiered Loot:** Supports multiple loot tiers (Common, Uncommon, Rare, Epic, Legendary) with different item probabilities.
- **Validation:** Warns if loot tiers reference undefined item keys.
- **Pain Points:**
  - Duplicates itemData structure from BagManager; risk of drift if not kept in sync.
  - No dynamic or server-driven loot tables; all data is hardcoded.
- **For LivingArchitecture:**
  - Document all dependencies on item definitions and tier names.
  - Consider centralizing itemData and loot tables for consistency and maintainability.
  - Move loot table logic to the server for authoritative drops.

---

## File: PuzzleManager.js

**Purpose:**
- Manages the display and logic for in-room puzzle items (currently keys) that players can collect.
- Ensures puzzle items are only visible and interactable when the player is facing the correct wall in a room.

**Major Methods/Logic:**
- `PuzzleManager(scene)`: Constructor that initializes the manager with a Phaser scene, and sets up maps for puzzle sprites and wall directions.
- `initializePuzzles(room)`: Creates and displays a key sprite for a room if it has a puzzle, determines which wall the key should appear on (based on room doors and a seeded random selection), and stores the direction for consistency.
- `updateSpriteVisibility(sprite, room)`: Shows or hides the key sprite based on the player's current facing direction and whether the player is facing a wall without a door or is in a dead end.
- `clearPuzzles()`: Destroys all puzzle sprites and clears the puzzles map, but preserves wall direction data for consistency between visits.

**Key Data Structures:**
- `puzzles`: Map of roomId to Phaser sprite objects for puzzle items.
- `keyWallDirections`: Map of roomId to the chosen wall direction for puzzle display.

**Architectural Notes:**
- **Contextual UI:** Puzzle items are only visible when the player is facing the correct wall or is in a dead end, increasing immersion and challenge.
- **Deterministic Placement:** Wall direction for puzzles is chosen using a seeded method based on room ID, ensuring consistency across sessions.
- **Event Coupling:** Relies on `roomManager` and `dungeonService` for door and room data, and on `playerPosition` for facing direction.
- **Pain Points:**
  - Assumes room and player data structures; may break if these change.
  - No persistence of puzzle state across reloads except for wall direction.
  - UI logic is tightly coupled to Phaser scene and rendering.
- **For LivingArchitecture:**
  - Document all dependencies on room, player, and scene data.
  - Consider decoupling puzzle logic from UI for better testability and server-driven puzzles in the future.

---

## File: PlayerStatsProxy.js

**Purpose:**
- Acts as a secure proxy for player stats, ensuring all stat data is fetched from the server and never stored or mutated locally.
- Provides a client-side interface for requesting stat values and inventory actions, but delegates all authority to the server.

**Major Methods/Logic:**
- `PlayerStatsProxy(socket, playerId)`: Constructor that sets up socket listeners for stat updates and exposes an event emitter for stat changes.
- `getStat(statName)`: Requests a specific stat from the server and returns the cached value (may be undefined until server responds).
- `getHealth()`, `getAttack()`, `getDefense()`: Convenience getters for common stats.
- `addItemToInventory(item)`, `removeItemFromInventory(item)`, `updateStatsFromInventory(inventory)`: No-op methods that emit requests to the server; client never mutates inventory directly.
- `getMagicalDamage(spellResult)`, `applyHealing(amount)`: No-op methods that emit requests to the server for calculations; always return 0 or undefined until server responds.
- `events`: Internal event emitter for `statsChanged` and `healthChanged` notifications.

**Key Data Structures:**
- `_cache`: Local cache of the most recent stat values received from the server.
- `events`: EventEmitter instance for stat change notifications.

**Architectural Notes:**
- **Server-Authoritative:** All stat and inventory logic is handled by the server; the client only requests and displays data.
- **Event-Driven:** Uses an event emitter to notify listeners of stat changes, supporting reactive UI updates.
- **No Local Mutation:** All mutating methods are no-ops or emit server requests; no sensitive data is stored or changed on the client.
- **Pain Points:**
  - UI may display stale or undefined values until server responds.
  - Requires robust server-side validation and event handling.
  - All stat-dependent features must be refactored to use this proxy pattern.
- **For LivingArchitecture:**
  - Document all stat and inventory event flows between client and server.
  - Ensure all sensitive logic is server-side and only exposed to the client via secure events.
  - Consider standardizing proxy patterns for all sensitive game data.

---

## File: RoomManager.js

**Purpose:**
- Manages room asset selection, door logic, and movement calculations for the dungeon view.
- Provides utilities for mapping between logical room connections and visual representation based on player facing.

**Major Methods/Logic:**
- `RoomManager()`: Constructor initializes asset maps, direction mappings, and available keys.
- `getRoomImageKey(room, facing, dungeonService)`: Returns the asset key for the current room based on visible doors and facing.
- `getVisibleDoors(room, facing, dungeonService)`: Returns a list of visual door directions (left, forward, right) based on room connections and player facing.
- `getCardinalDirection(room, target)`: Determines the cardinal direction (north, east, south, west) from one room to another.
- `findBestMatchingRoomAsset(key)`: Finds the best asset key for a given door configuration, with support for alternates.
- `getDoorsFromAssetKey(assetKey)`: Returns a list of doors present in a given asset key.
- `ensureConsistentDoors(dungeon)`: Ensures all room connections are bidirectional and valid.
- `getMovementDelta(facing, direction, room, dungeonService)`: Calculates the movement delta and new facing when moving in a given direction.
- `isValidMove(room, facing, direction, dungeonService)`: Checks if a move in a given direction is valid from the current room.
- `rotateFacing(facing, rotation)`: Returns the new facing direction after a rotation (left, right, around).
- `hasMiddleDoor(room)`: Returns true if the room has more than two doors.

**Key Data Structures:**
- `roomAssets`: Map of visual asset keys to image paths.
- `directionMappings`, `inverseDirectionMappings`: Maps for converting between logical and visual directions.

**Architectural Notes:**
- **Visual Mapping:** Bridges the gap between logical dungeon structure and visual representation for the player.
- **Bidirectional Consistency:** Provides utilities to ensure all room connections are valid in both directions.
- **Pain Points:**
  - Asset key logic and alternates can be brittle if asset names or conventions change.
  - Assumes integer grid coordinates for rooms; may break with non-grid layouts.
  - Tightly coupled to Phaser and asset naming conventions.
- **For LivingArchitecture:**
  - Document all dependencies on asset keys, direction logic, and dungeon structure.
  - Consider decoupling visual logic from core dungeon logic for better testability and maintainability.

---

## File: shelfManager.js

**Purpose:**
- Manages the display and logic for in-room shelves, including empty shelves, gem shelves, and potion shelves.
- Ensures shelves and their contents are only visible and interactable when the player is facing the correct wall in a room.

**Major Methods/Logic:**
- `ShelfManager(scene)`: Constructor that initializes the manager with a Phaser scene, and sets up maps for shelf sprites and wall directions.
- `initializeShelves(room)`: Creates and displays shelf sprites for a room if it has shelf data, determines which wall the shelf should appear on (based on room doors and a seeded random selection), and stores the direction for consistency. Handles click events for looting gems and potions.
- `getShelfAssetForPerspective(baseAssetName, direction)`: Returns the correct asset name for a shelf based on the player's perspective (forward, left, right).
- `updateShelfVisibility(sprite, room)`: Shows or hides a shelf sprite based on the player's current facing direction and whether the player is facing a wall without a door.
- `updateAllShelvesVisibility(room)`: Updates visibility for all shelves in a specific room.
- `clearShelves()`: Destroys all shelf sprites and clears the shelves map, but preserves wall direction data for consistency between visits.

**Key Data Structures:**
- `shelves`: Map of roomId to objects containing Phaser sprite objects for each shelf type.
- `shelfWallDirections`: Map of roomId to the chosen wall direction for shelf display.

**Architectural Notes:**
- **Contextual UI:** Shelves and their contents are only visible when the player is facing the correct wall, increasing immersion and challenge.
- **Deterministic Placement:** Wall direction for shelves is chosen using a seeded method based on room ID, ensuring consistency across sessions.
- **Event Coupling:** Relies on `roomManager` and `dungeonService` for door and room data, and on `playerPosition` for facing direction.
- **Pain Points:**
  - Assumes room and player data structures; may break if these change.
  - No persistence of shelf state across reloads except for wall direction.
  - UI logic is tightly coupled to Phaser scene and rendering.
  - Some click handlers reference undefined variables (e.g., `gemKey`), which may cause runtime errors if not set correctly.
- **For LivingArchitecture:**
  - Document all dependencies on room, player, and scene data.
  - Consider decoupling shelf logic from UI for better testability and server-driven shelf content in the future.

---

## File: socket.js

**Purpose:**
- Manages the Socket.io client connection for multiplayer communication between the client and server.
- Provides connection, authentication, player join, and room entry logic for the game client.

**Major Methods/Logic:**
- `connectSocket(token)`: Connects to the Socket.io server with JWT authentication, disconnects any existing connection first.
- `joinPlayer({ playerId, user_id }, onSuccess, onError)`: Emits a player join event, listens for join result or error, and calls the appropriate callback.
- `enterRoom({ playerId, roomId })`: Emits a room enter event for late join or reconnect scenarios.
- Exports the current `socket` instance for use elsewhere in the client.

**Key Data Structures:**
- `socket`: The Socket.io client instance, managed as a singleton.

**Architectural Notes:**
- **Connection Management:** Ensures only one active socket connection at a time.
- **Event-Driven:** Uses event listeners and callbacks for join and error handling.
- **Pain Points:**
  - Assumes Socket.io client is loaded globally (via CDN in index.html).
  - Hardcoded server URL; not environment-configurable.
  - No reconnection/backoff logic beyond manual reconnect.
- **For LivingArchitecture:**
  - Document all event flows and authentication mechanisms.
  - Consider centralizing socket management and supporting environment-based configuration.
  - Ensure robust error handling and reconnection strategies for production.

---

## File: statPreview.js

**Purpose:**
- Provides display-only stat calculation functions for character selection and preview screens.
- Used to show derived stats (health, attack, defense) before entering the game.

**Major Methods/Logic:**
- `getHealthFromVIT(vit)`: Returns health as 50 times vitality.
- `getPhysicalAttackFromSTR(str)`: Returns physical attack as 10 times strength.
- `getDefenseFromVIT(vit)`: Returns defense as 0.5 times vitality.

**Architectural Notes:**
- **Display-Only:** Not used for authoritative stat calculation; only for preview/UI purposes.
- **Pain Points:**
  - Must remain in sync with server-side and canonical stat calculation logic.
- **For LivingArchitecture:**
  - Document all stat calculation flows and ensure a single source of truth for stat formulas.
  - Consider moving all stat logic to a shared or server-authoritative module.

---

# Beginning Server File Audit

The following section will systematically audit all files in the `server/` directory (and its subdirectories) in strict alphabetical order, reading each file in its entirety, chunk by chunk, and updating the LivingAudit with all useful, architectural, and troubleshooting information, following the same process as the client audit above.

---

## File: server/package.json

**Purpose:**
- Defines the Node.js server's package metadata and dependencies for the Lairs Below multiplayer backend.

**Major Fields:**
- `name`, `version`, `main`, `type`: Standard Node.js package fields.
- `dependencies`:
  - `socket.io`: Real-time multiplayer communication.
  - `dotenv`: Environment variable management.
  - `node-fetch`: HTTP requests (used for Supabase and other APIs).
  - `seedrandom`: Deterministic random number generation for dungeon generation and game logic.

**Architectural Notes:**
- **ES Modules:** Uses `type: module` for ES6 import/export syntax.
- **Minimal:** Only includes core dependencies for multiplayer, environment, and deterministic logic.
- **Pain Points:**
  - No devDependencies or scripts; assumes manual server start.
- **For LivingArchitecture:**
  - Document all server dependencies and their roles in the architecture.
  - Ensure all dependencies are kept up to date and minimal for security.

---

## File: server/server.js

**Purpose:**
- Main entry point for the multiplayer server, handling all real-time game logic, player state, and event routing.
- Implements server-authoritative logic for dungeon state, inventory, combat, and player actions.

**Major Methods/Logic:**
- Imports all server-side managers and shared logic (DungeonCore, events, etc.).
- Sets up Socket.io server with CORS and JWT authentication (Supabase integration).
- Maintains in-memory state for players, rooms, bags, and visited rooms.
- Generates and manages the canonical dungeon state using a deterministic seed.
- Handles all major game events:
  - Player join/leave, room enter, inventory updates, loot bag pickup, spell cast, trade, party, stat allocation, add/remove/drop/clear inventory, room movement, loot/puzzle/shelf/treasure pickup, attack, steal, and disconnect.
- Persists inventory and character state to Supabase as needed.
- Resets dungeon state when all players leave or disconnect.
- Responds to HTTP GET requests for health checks.

**Key Data Structures:**
- `players`: Map of playerId to player state (socket, character, roomId, inventory, etc.).
- `rooms`: Map of roomId to room state (players, entities).
- `bags`: Map of bagId to loot bag contents and room.
- `visitedRooms`: Map of playerId to set of visited roomIds.
- `dungeon`: Canonical dungeon state, generated at startup and reset as needed.

**Architectural Notes:**
- **Server-Authoritative:** All game state and logic is managed on the server; clients only send/receive events.
- **Supabase Integration:** Uses Supabase for authentication and persistent character/inventory data.
- **Event-Driven:** All game actions are handled via Socket.io events, with clear separation between client and server responsibilities.
- **Pain Points:**
  - In-memory state is not persistent; server restarts will lose all live game state.
  - Some placeholder logic (trade, party, stat allocation) is not implemented.
  - Some event handlers are duplicated or verbose; could be modularized further.
  - Hardcoded CORS and Supabase URLs; not environment-configurable beyond .env.
- **For LivingArchitecture:**
  - Document all event flows, state transitions, and Supabase interactions.
  - Consider adding persistent storage for live game state.
  - Modularize event handlers and manager logic for maintainability and testability.

---

## File: server/managers/BagManager.js

**Purpose:**
- Manages server-authoritative inventory (bag) logic for players and dropped bags.
- Handles item placement, removal, grid logic, and inventory state for all server-side bag operations.

**Major Methods/Logic:**
- `BagManager()`: Constructor initializes grid size, inventory, and occupancy state.
- `addItem(itemKey)`: Adds an item to the bag, finds a slot, and updates grid occupancy.
- `removeItem(instanceId)`: Removes an item by instance ID and updates grid occupancy.
- `findFirstAvailableSlot(itemWidth, itemHeight)`: Finds a slot for an item of given size.
- `canPlaceItemAt(gridX, gridY, itemWidth, itemHeight)`: Checks if an item can be placed at a given grid position.
- `markGridOccupancy`/`unmarkGridOccupancy`: Marks/unmarks grid cells as occupied by an item.
- `hasItem(itemName)`: Checks if the bag contains an item by name.
- `clearInventory()`: Clears the bag and grid occupancy.
- `getRandomItemInstance()`: Returns a random item from the bag.
- `itemData`: Local definition of item keys, names, assets, and grid sizes.

**Key Data Structures:**
- `inventory`: Array of item instances in the bag.
- `gridOccupancy`: 2D array tracking which grid cells are occupied by which item instance.

**Architectural Notes:**
- **Server-Authoritative:** All bag/inventory logic is handled on the server; the client only displays state and requests changes.
- **Grid-Based:** Inventory is managed as a grid, matching the client-side UI.
- **Pain Points:**
  - Duplicates itemData structure from other modules; risk of drift if not kept in sync.
  - No persistence; all state is in-memory unless explicitly saved elsewhere.
- **For LivingArchitecture:**
  - Document all dependencies on item definitions and grid logic.
  - Consider centralizing itemData for consistency.
  - Add persistence for inventory state if needed for long-term storage. 