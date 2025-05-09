---

## Server Managers Audit

### BagManager.js
- **Purpose:** Manages server-authoritative inventory (bag) logic for players and dropped bags. Handles item placement, removal, grid logic, and inventory state for all server-side bag operations.
- **Major Methods/Logic:**
  - `constructor()`: Initializes grid size, inventory, and occupancy state.
  - `initializeGridOccupancy()`: Sets up the 2D grid for item placement.
  - `addItem(itemKey)`: Adds an item to the bag, finds a slot, and updates grid occupancy.
  - `removeItem(instanceId)`: Removes an item by instance ID and updates grid occupancy.
  - `findFirstAvailableSlot(itemWidth, itemHeight)`: Finds a slot for an item of given size.
  - `canPlaceItemAt(gridX, gridY, itemWidth, itemHeight)`: Checks if an item can be placed at a given grid position.
  - `markGridOccupancy`/`unmarkGridOccupancy`: Marks/unmarks grid cells as occupied by an item.
  - `hasItem(itemName)`: Checks if the bag contains an item by name.
  - `clearInventory()`: Clears the bag and grid occupancy.
  - `getRandomItemInstance()`: Returns a random item from the bag.
  - `itemData`: Local definition of item keys, names, assets, and grid sizes.
- **Key Data Structures:**
  - `inventory`: Array of item instances in the bag.
  - `gridOccupancy`: 2D array tracking which grid cells are occupied by which item instance.
- **Architectural Notes:**
  - **Server-Authoritative:** All bag/inventory logic is handled on the server; the client only displays state and requests changes.
  - **Grid-Based:** Inventory is managed as a grid, matching the client-side UI.
- **Pain Points:**
  - Duplicates itemData structure from other modules; risk of drift if not kept in sync.
  - No persistence; all state is in-memory unless explicitly saved elsewhere.
- **For LivingArchitecture:**
  - Document all dependencies on item definitions and grid logic.
  - Consider centralizing itemData for consistency.
  - Add persistence for inventory state if needed for long-term storage.

### CharacterTypes.js
- **Purpose:** Defines all character/entity types, their base stats, abilities, loot tiers, playability, and AI behaviors for both players and NPCs. Central source of truth for character archetypes on the server.
- **Major Data Structures:**
  - `characterDefinitions`: Object mapping type keys (e.g., 'dwarf', 'gnome', 'elvaan', 'bat') to full character definitions, including:
    - `name`, `type`, `assetPrefix`, `stats` (vit, str, int, dex, mnd, spd), `abilities`, `lootTier`, `playable`, and `aiBehavior` (aggression, actions, talk responses, moods).
- **AI Logic:**
  - Each character type defines `aiBehavior` with fields such as `aggression`, `lowHealthAction`, `talkResponses` (with keyword triggers and default responses), `standardAction`, and (for some) `angryAction` or weighted choices.
- **Helper Functions:**
  - `getCharacterDefinition(typeKey)`: Returns a deep copy of a character definition by key, with warning if not found.
  - `getPlayableCharacters()`: Returns all playable character definitions.
  - `getAllCharacterTypeKeys()`: Returns all available type keys.
- **Architectural Notes:**
  - **Single Source:** All character stat and behavior data is centralized here for consistency and server authority.
  - **Extensible:** New character types and AI behaviors can be added easily.
  - **AI as Data:** AI logic is encoded as data structures, allowing for flexible and testable behaviors.
- **Pain Points:**
  - Any drift between this file and client-side proxies can cause stat/behavior mismatches.
  - Some AI logic is embedded as data, which may complicate future refactors or more complex behaviors.
- **For LivingArchitecture:**
  - Ensure this file (or its canonical data) is the only source of truth for character stats/abilities/AI.
  - Document all cross-file and server dependencies on character definitions.
  - Consider extracting AI logic to a more testable, modular format if needed in the future.

### CombatVisuals.js (stub)
- **Purpose:** Currently empty. Intended as a placeholder for future server-side combat event/animation logic or event broadcasting.
- **Notes:**
  - No implementation yet; does not affect game logic or event flows at this time.

### DebugHelper.js
- **Purpose:** Provides a minimal server-side debug helper for toggling visibility state (for future expansion). Migrated from client, but currently only tracks a boolean flag.
- **Major Methods/Logic:**
  - `constructor()`: Initializes the `visible` flag to false.
  - `setVisibility(visible)`: Sets the visibility flag.
  - `toggleVisibility()`: Toggles the visibility flag.
- **Key Data Structures:**
  - `visible`: Boolean indicating debug visibility state.
- **Architectural Notes:**
  - **Server-Only:** No visual or Phaser logic; only tracks state for potential server-side debugging or logging.
  - **Minimal Implementation:** No logging, tracing, or event emission in this version.
- **Pain Points:**
  - Not a full-featured debug/logging utility; only tracks a flag.
- **For LivingArchitecture:**
  - Expand with actual logging, tracing, or state dump features if needed for server debugging.

### DungeonScene.js (stub)
- **Purpose:** Currently empty. Intended as a placeholder for the main server-side dungeon scene logic, which will eventually coordinate all managers and world state.
- **Notes:**
  - No implementation yet; does not affect game logic or event flows at this time.

### EncounterManager.js
- **Purpose:** Handles all server-authoritative encounter logic, including spawning, resolving, and tracking encounters (combat, stealing, turn order, cooldowns). Migrated from client; all logic/state is server-side.
- **Major Methods/Logic:**
  - `constructor()`: Initializes entity map, turn queue, cooldowns, encounter weights, and timers.
  - `initializeEncounter(room, playerId)`: (TODO) Placeholder for server-side encounter initialization logic.
  - `startTurnBasedEncounter(entityId, roomId, enemyStartsFirst, playerId)`: (TODO) Placeholder for turn-based encounter logic.
  - `handleAttack(initiatorId, targetId, playerId, dungeon, players)`: Validates entities, calculates and applies damage, updates health, checks for death, and returns result object.
  - `endTurn(initiatorId)`: (TODO) Placeholder for turn rotation logic.
  - `endEncounter(entityId)`: (TODO) Placeholder for encounter cleanup logic.
  - `handleSteal(initiatorId, targetId, playerId, dungeon, players)`: Handles stealing logic for both player and NPC targets, updates inventories, and returns result object.
  - `weightedRandom(items)`: Utility for weighted random selection (used for AI actions).
- **Key Data Structures:**
  - `entities`: Map of entityId to entity state (type, health, roomId, statBlock, etc.).
  - `turnQueue`: Array of entity/player IDs for turn order.
  - `pendingTalks`: Map for pending talk actions.
  - `lastEncounterTime`, `lastFleeTime`: Track cooldowns for each entity type.
  - `defeatCooldowns`, `FLEE_COOLDOWN`, `WAITING_DURATION`, `encounterWeights`, `ROOM_COOLDOWN_DURATION`: Various timing and weighting constants.
  - `waitingTimers`: Map of entityId to delayed removal timers after flee.
- **Architectural Notes:**
  - **Server-Authoritative:** All encounter, combat, and stealing logic is handled on the server; the client only sends/receives events.
  - **Extensible:** Placeholders for future expansion (turns, encounter init, cleanup).
  - **Stat Calculation:** Uses imported stat calculation helpers and PlayerStats for damage and health logic.
- **Pain Points:**
  - Several methods are placeholders (TODOs) and not yet implemented.
  - Some logic (e.g., PlayerStats, StatDefinitions) depends on other modules that must be present and secure.
  - Inventory and loot logic is split between player and NPC handling; must ensure consistency.
- **For LivingArchitecture:**
  - Document all event flows, state transitions, and cross-manager dependencies.
  - Complete and test all TODO methods for full encounter support.
  - Ensure all stat and inventory logic is server-authoritative and secure.

### HintManager.js
- **Purpose:** Manages server-side hint logic for rooms, tracking hint content and wall directions. Migrated from client; all logic/state is server-side.
- **Major Methods/Logic:**
  - `constructor()`: Initializes maps for hints and hint wall directions.
  - `initializeHints(room)`: Adds hint content for a room if present and not already tracked.
  - `getHint(room)`: Returns the hint content for a room, or null if none.
  - `clearHints()`: Clears all tracked hints.
- **Key Data Structures:**
  - `hints`: Map of roomId to hint content.
  - `hintWallDirections`: Map of roomId to wall direction (not used in current logic, but present for future expansion).
- **Architectural Notes:**
  - **Server-Only:** All hint logic is handled on the server; the client only receives hint content as needed.
  - **Minimal Implementation:** No UI or wall-facing logic; only tracks and provides hint content.
- **Pain Points:**
  - Wall direction logic is not implemented; only hint content is tracked.
- **For LivingArchitecture:**
  - Expand with wall direction and context logic if needed for more immersive or contextual hints.

### ItemManager.js
- **Purpose:** Handles server-side logic for using items, specifically applying item effects to targets (e.g., healing). Migrated from client; all logic/state is server-side.
- **Major Methods/Logic:**
  - `constructor()`: Initializes the `itemEffects` map, currently with healing potion effect.
  - `useItem(itemInstance, targetStats)`: Applies the effect of an item to the target's stats, returns result object indicating success, message, consumption, and amount healed.
- **Key Data Structures:**
  - `itemEffects`: Map of item keys to effect definitions (type, amount, etc.).
- **Architectural Notes:**
  - **Server-Only:** All item effect logic is handled on the server; the client only requests item use and receives results.
  - **Extensible:** Designed to support additional item types and effects in the future.
- **Pain Points:**
  - Assumes `targetStats` object has an `applyHealing` method; may break if target structure changes.
  - No validation of item ownership or inventory; relies on external systems for security.
- **For LivingArchitecture:**
  - Document all dependencies on item and target data structures.
  - Expand with additional item effects and validation as needed for gameplay.

### LootUIManager.js (stub)
- **Purpose:** Currently empty. Intended as a placeholder for future server-side loot UI event handling logic.
- **Notes:**
  - No implementation yet; does not affect game logic or event flows at this time.

### NPCLootManager.js
- **Purpose:** Handles server-side loot tables and drop probabilities for NPCs based on loot tiers. Migrated from client; all logic/state is server-side.
- **Major Methods/Logic:**
  - `getLootForTier(tierName)`: Returns an object mapping item keys to drop probabilities for a given loot tier, validating keys against local itemData.
- **Key Data Structures:**
  - `itemData`: Local definition of item keys, names, assets, and grid sizes (subset of all possible items).
  - `lootTiers`: Object mapping tier names to item drop probabilities.
- **Architectural Notes:**
  - **Tiered Loot:** Supports multiple loot tiers (Common, Uncommon, Rare, Epic, Legendary) with different item probabilities.
  - **Validation:** Only includes items present in itemData for the given tier.
- **Pain Points:**
  - Duplicates itemData structure from other modules; risk of drift if not kept in sync.
  - No dynamic or server-driven loot tables; all data is hardcoded.
- **For LivingArchitecture:**
  - Document all dependencies on item definitions and tier names.
  - Consider centralizing itemData and loot tables for consistency and maintainability.
  - Expand with dynamic or configurable loot tables if needed for gameplay.

### PlayerStats.js
- **Purpose:** Handles all server-side stat logic for players, including health, damage, defense, healing, and stat modifications from inventory. Migrated from client; all logic/state is server-side.
- **Major Methods/Logic:**
  - `constructor(playerId, statBlock)`: Initializes player stats, health, damage, defense, and multipliers. Accepts a stat block or defaults to balanced stats.
  - `getMaxHealth()`, `getCurrentHealth()`: Getters for health values.
  - `getPhysicalDamage()`: Calculates physical damage, factoring in sword count and multipliers.
  - `getDefenseRating()`: Calculates total defense, including item bonuses, capped at 0.9.
  - `applyDamage(rawDamage)`: Applies damage after mitigation, updates current health, returns actual damage taken.
  - `applyHealing(amount)`: Heals the player, returns amount healed.
  - `setHealth(newHealth)`: Sets current health, clamped to valid range.
  - `updateStatsFromInventory(items)`: Updates defense and sword count based on inventory items.
  - `modifyMagicalDamage(spellData)`: Modifies spell data for magical damage calculation.
  - `getMagicalDamage(spellData)`: Calculates magical damage, applying multipliers and element bonuses.
  - `getMagicalDamageMultiplier()`, `getElementalDamageMultiplier(element)`: Getters for multipliers.
- **Key Data Structures:**
  - `statBlock`: Object with base stats (vit, str, int, dex, mnd, spd).
  - `ITEM_STATS`: Map of item keys to stat modifications (e.g., sword1, helm1).
  - Various multipliers and health/damage state variables.
- **Architectural Notes:**
  - **Server-Only:** All stat logic is handled on the server; the client only requests stat changes and receives results.
  - **Inventory Integration:** Stat modifications from inventory are recalculated as needed.
  - **Extensible:** Designed to support additional stat modifications and item effects.
- **Pain Points:**
  - Assumes inventory items are well-formed and match ITEM_STATS keys.
  - No validation of statBlock input; defaults to balanced stats if missing.
- **For LivingArchitecture:**
  - Document all dependencies on stat and inventory data structures.
  - Expand with additional stat effects and validation as needed for gameplay.

### PuzzleManager.js
- **Purpose:** Handles server-side logic for room puzzles, specifically key puzzles. Tracks puzzle state and manages collection. Migrated from client; all logic/state is server-side.
- **Major Methods/Logic:**
  - `constructor()`: Initializes maps for puzzles and key wall directions.
  - `initializePuzzles(room)`: Adds a key puzzle to a room if not already present.
  - `collectPuzzle(room)`: Handles collection of a key puzzle, updates room state, and returns the key item.
  - `clearPuzzles()`: Clears all tracked puzzles.
- **Key Data Structures:**
  - `puzzles`: Map of roomId to puzzle data (currently only key puzzles).
  - `keyWallDirections`: Map of roomId to wall direction (not used in current logic, but present for future expansion).
- **Architectural Notes:**
  - **Server-Only:** All puzzle logic is handled on the server; the client only receives puzzle state as needed.
  - **Minimal Implementation:** Only supports key puzzles; extensible for other puzzle types.
- **Pain Points:**
  - Wall direction logic is not implemented; only puzzle presence and collection are tracked.
- **For LivingArchitecture:**
  - Expand with additional puzzle types and wall direction/context logic as needed for gameplay.

### RoomManager.js
- **Purpose:** Handles server-side logic for room connections, door logic, movement calculations, and direction mapping. Migrated from client; all logic/state is server-side.
- **Major Methods/Logic:**
  - `constructor()`: Initializes direction and inverse direction mappings for movement and door logic.
  - `getVisibleDoors(room, facing, dungeonService)`: Returns a list of visual door directions (left, forward, right) based on room connections and player facing.
  - `getCardinalDirection(room, target)`: Determines the cardinal direction (north, east, south, west) from one room to another.
  - `ensureConsistentDoors(dungeon)`: Ensures all room connections are bidirectional and valid.
  - `getMovementDelta(facing, direction, room, dungeonService)`: Calculates the movement delta and new facing when moving in a given direction.
  - `isValidMove(room, facing, direction, dungeonService)`: Checks if a move in a given direction is valid from the current room.
  - `rotateFacing(facing, rotation)`: Returns the new facing direction after a rotation (left, right, around).
  - `hasMiddleDoor(room)`: Returns true if the room has more than two doors.
- **Key Data Structures:**
  - `directionMappings`, `inverseDirectionMappings`: Maps for converting between logical and visual directions.
- **Architectural Notes:**
  - **Server-Only:** All room and movement logic is handled on the server; the client only receives room state and movement results.
  - **Bidirectional Consistency:** Provides utilities to ensure all room connections are valid in both directions.
  - **Extensible:** Designed to support additional movement and room logic as needed.
- **Pain Points:**
  - Assumes integer grid coordinates for rooms; may break with non-grid layouts.
  - Tightly coupled to dungeon structure and room data format.
- **For LivingArchitecture:**
  - Document all dependencies on direction logic and dungeon structure.
  - Expand with additional room features or movement rules as needed for gameplay.

### ShelfManager.js
- **Purpose:** Handles server-side logic for room shelves, including gem and potion collection. Tracks shelf state and manages collection. Migrated from client; all logic/state is server-side.
- **Major Methods/Logic:**
  - `constructor()`: Initializes maps for shelves and shelf wall directions.
  - `initializeShelves(room)`: Adds shelf data for a room if not already present, based on gem and potion presence.
  - `collectGem(room)`: Handles collection of a gem from a shelf, updates room state, and returns the gem key.
  - `collectPotion(room)`: Handles collection of a potion from a shelf, updates room state, and returns the potion key.
  - `clearShelves()`: Clears all tracked shelves.
- **Key Data Structures:**
  - `shelves`: Map of roomId to shelf data (gemKey, potion).
  - `shelfWallDirections`: Map of roomId to wall direction (not used in current logic, but present for future expansion).
- **Architectural Notes:**
  - **Server-Only:** All shelf logic is handled on the server; the client only receives shelf state as needed.
  - **Minimal Implementation:** Only supports gem and potion shelves; extensible for other shelf types.
- **Pain Points:**
  - Wall direction logic is not implemented; only shelf presence and collection are tracked.
  - Assumes room data structure includes expected shelf and item properties.
- **For LivingArchitecture:**
  - Expand with additional shelf types and wall direction/context logic as needed for gameplay.

### SpellManager.js
- **Purpose:** Handles server-side logic for spells, including requirements, validation, and spell casting. Tracks spell data and gem requirements. Migrated from client; all logic/state is server-side.
- **Major Methods/Logic:**
  - `constructor(bagManager, playerStats)`: Initializes references to bagManager and playerStats, sets up spell requirements and spell data.
  - `getAllSpells()`: Returns a list of all spell names.
  - `hasRequiredGemsForSpell(spellName)`: Checks if the player has all required gems for a spell.
  - `getValidSpells()`: Returns a list of spells the player can currently cast.
  - `getSpellRequirements(spellName)`: Returns the gem requirements for a spell.
  - `getSpellData(spellName)`: Returns a copy of the spell data for a spell.
  - `processSpellCast(spellName)`: Validates requirements and processes spell casting, returning modified spell data.
- **Key Data Structures:**
  - `spellGemRequirements`: Map of spell names to required gem arrays.
  - `spellData`: Map of spell names to spell data (damage, element, effects).
- **Architectural Notes:**
  - **Server-Only:** All spell logic is handled on the server; the client only requests spell actions and receives results.
  - **Inventory Integration:** Spell requirements are validated against the player's bag contents.
  - **Extensible:** Designed to support additional spells, requirements, and effects.
- **Pain Points:**
  - Assumes bagManager and playerStats are correctly initialized and available.
  - No validation of spellName input beyond presence in maps.
- **For LivingArchitecture:**
  - Expand with additional spell types, effects, and requirements as needed for gameplay.
  - Document all dependencies on inventory and stat data structures.

### StatDefinitions.js
- **Purpose:** Centralizes all stat conversion functions and constants for base-to-derived stat calculations. Used throughout the server for consistent stat logic.
- **Major Functions/Logic:**
  - `getHealthFromVIT(vit)`: Returns health as 50 times vitality.
  - `getDefenseFromVIT(vit)`: Returns defense as 0.5 times vitality.
  - `getPhysicalAttackFromSTR(str)`: Returns physical attack as 10 times strength.
  - `getMagicBonusFromINT(intStat)`: Returns magic bonus as 0.10 times intelligence.
  - `getMagicDefenseFromINT(intStat)`: Returns magic defense as 0.5 times intelligence.
  - `getStealBonusFromDEX(dex)`: Returns steal bonus as 0.02 times dexterity.
  - `getCritDamageFromDEX(dex)`: Returns crit damage as 0.10 times dexterity.
  - `getManaFromMND(mnd)`: Returns mana as 10 times mind.
  - `getCritSpellBonusFromMND(mnd)`: Returns crit spell bonus as 0.10 times mind.
  - `getFleeChanceFromSPD(spd)`: Returns flee chance as 0.02 times speed.
- **Key Constants:**
  - `BASE_CRIT_CHANCE = 0.05`
  - `BASE_CRIT_DAMAGE = 1.5`
  - `BASE_CRIT_SPELL_CHANCE = 0.10`
  - `BASE_CRIT_SPELL_DAMAGE = 2.0`
- **Architectural Notes:**
  - **Single Source:** Ensures all stat calculations are consistent and centralized.
  - **Server-Only:** Used by all server-side stat and combat logic; should be mirrored on the client only for display/preview purposes.
- **Pain Points:**
  - Any drift between this file and client-side stat logic can cause inconsistencies.
- **For LivingArchitecture:**
  - Document all dependencies on these functions and constants.
  - Ensure this file is the only source of truth for stat formulas.

### TreasureManager.js
- **Purpose:** Handles server-side logic for room treasures, including initialization, collection, and state tracking. Migrated from client; all logic/state is server-side.
- **Major Methods/Logic:**
  - `constructor()`: Initializes maps for treasures and treasure wall directions.
  - `initializeTreasures(room)`: Adds treasure data for a room if not already present, based on treasure level.
  - `collectTreasure(room)`: Handles collection of a treasure, updates room state, and returns the item key.
  - `clearTreasures()`: Clears all tracked treasures.
- **Key Data Structures:**
  - `treasures`: Map of roomId to treasure data (itemKey).
  - `treasureWallDirections`: Map of roomId to wall direction (not used in current logic, but present for future expansion).
- **Architectural Notes:**
  - **Server-Only:** All treasure logic is handled on the server; the client only receives treasure state as needed.
  - **Minimal Implementation:** Only supports sword, helm, and potion treasures; extensible for other treasure types.
- **Pain Points:**
  - Wall direction logic is not implemented; only treasure presence and collection are tracked.
  - Assumes room data structure includes expected treasure properties.
- **For LivingArchitecture:**
  - Expand with additional treasure types and wall direction/context logic as needed for gameplay.

--- 