# MigrationMap

## src/App.jsx

- Emitters: joinPlayer (requests to join game), connectSocket (establishes connection)
- Handlers: PLAYER_JOIN_NOTIFICATION, PLAYER_LEAVE_NOTIFICATION (UI only)
- Dependencies: CharacterTypes.js, StatDefinitions.js, socket.js, shared/events.js, Game.js
- Globals: window.supabase, window.currentCharacterId, window.currentCharacter (must be removed)
- Stat/data fallbacks: tryInjectStatBlock (must be removed; client must error if server data is missing)
- All gameplay state, stat blocks, and dungeon data must come from the server only
- Only hard-code stat values for character creation/preview UI; all other stat logic must be server-side
- Client must only render and communicate with the server; no local data or logic 

## src/BagManager.js

- Dependencies: Phaser, PlayerStats, ItemManager, LootUIManager, EncounterManager, DungeonScene
- State: inventory (array of item instances), gridOccupancy, activeBagSprites, bag UI state
- Emitters: scene.events.emit('showActionPrompt', ...), scene.events.emit('lootBagClicked', ...)
- Handlers: pointerdown, pointerup, drag events on bag/item sprites; context menu actions ('use', 'drop')
- Inventory sync: Updates Supabase directly (window.supabase, window.currentCharacterId) — must be migrated to server events
- All inventory logic, item add/remove, bag drops, and stat updates must move to server
- No inventory or bag state should remain client-side except for rendering
- Remove all direct Supabase updates from client
- All bag/loot/interaction events must be request/response with server
- Client must only render bag UI and emit user actions to server 

## src/CharacterTypes.js

- Exports: characterDefinitions (all character/entity base stats, assets, AI behavior), getCharacterDefinition, getPlayableCharacters, getAllCharacterTypeKeys
- Used for: character creation/preview UI only; all gameplay stat logic must be server-side
- No emitters or handlers
- No state to migrate; definitions must be duplicated server-side for authoritative logic
- Remove from client except for hard-coded preview data 

## src/CombatVisuals.js

- Dependencies: Phaser, scene (expects getSpriteForEntity, cameras, tweens, time)
- State: prevGlassKey, prevGlassFlip, glassTextureKeys (visual only)
- No emitters or handlers for game logic; only visual effects
- Methods: playPlayerDamageEffect, playEnemyDamageEffect (triggered by game state changes)
- All combat logic and state must be server-side; this file should only render effects based on server events
- No sensitive data or logic; keep only rendering code client-side 

## src/DebugHelper.js

- Dependencies: Phaser, scene (expects bagManager, dungeonService, playerPosition, events)
- State: debugText, minimap, visible
- Emitters: scene.events.emit('showActionPrompt', ...)
- Methods: setVisibility, toggleVisibility, updateDebugText, updateMinimap, addGemsToInventory
- addGemsToInventory calls bagManager.addItem (must be server-authoritative)
- All debug actions that affect game state (e.g., adding items) must be server-side
- Only debug rendering and UI should remain client-side 

## src/DungeonScene.js

- Dependencies: Phaser, Game.js, DungeonService, RoomManager, DebugHelper, EncounterManager, PuzzleManager, TreasureManager, HintManager, ShelfManager, BagManager, HealthBar, NPCLootManager, LootUIManager, PlayerStats, ItemManager, CharacterTypes, CombatVisuals, SpellManager
- State: playerPosition, dungeon, entitySprites, statBlock, isInEncounter, isRearranging, bag/loot/action menu UI state, timers
- Emitters: this.events.emit('showActionPrompt', ...), 'entityDied', 'playerKilledByNPC', 'lootBagClicked', 'showActionMenu', 'showTalkDialog', 'displayTalkInput', 'showTalkMessage', 'addToInventory', 'fleeToPreviousRoom', 'endEncounter', 'encounterStarted', 'enemyMoodChanged', 'rearrangeWarning'
- Handlers: pointerdown on doors, nav buttons, bag, loot, action menu, talk input, etc.
- All game logic, state changes, and event handling must move to server; client only renders and emits user actions
- Remove all local state and logic except for rendering and UI
- All emitters/handlers must become request/response with server; no local fallback or guessing
- All stateful managers must be refactored to server-side, preserving circular dependencies and event flows 

## src/EncounterManager.js

- Dependencies: Phaser, StatDefinitions, BagManager, CharacterTypes, NPCLootManager, SpellManager, PlayerStats, LootUIManager, RoomManager
- State: entities (Map of all encounter entities), turnQueue, currentTurn, pendingTalks, lastEncounterTime, lastFleeTime, defeatCooldowns, waitingTimers
- Emitters: this.scene.events.emit('encounterStarted', ...), 'showActionMenu', 'showActionPrompt', 'entityDied', 'playerKilledByNPC', 'lootBagClicked', 'enemyMoodChanged', 'endEncounter', etc.
- Handlers: all encounter actions (attack, talk, steal, trade, examine, flee, invite, AI actions, spell cast, etc.)
- All encounter logic, state, and event handling must move to server; client only renders and emits user actions
- Remove all local state and logic except for rendering and UI
- All emitters/handlers must become request/response with server; no local fallback or guessing
- All stateful managers and entity state must be refactored to server-side, preserving event flows and dependencies 

## src/DungeonService.js

- Dependencies: Phaser
- State: dungeonGrid, roomList, playerCount, lastRearrangeTime, roomCounts, hubCount, maxDeadEnds
- Methods: generateDungeon, rearrangeDungeon, getRoomById, findRoomAt, and all room/door/puzzle/treasure/hint logic
- All dungeon generation, world state, and room logic must move to server; client only renders and requests state
- Remove all local state and logic except for rendering and UI
- All dungeon/room state must be server-authoritative and event-driven 

## src/Game.js

- Dependencies: Phaser, DungeonScene
- Exports: gameConfig, initGame
- No emitters or handlers; only initializes Phaser and DungeonScene
- All game initialization and scene data must be server-authoritative
- Client should only start the game with server-provided state 

## src/HealthBar.js

- Dependencies: Phaser, scene (expects playerStats, events)
- State: currentHealth, maxHealth, entityId, bar graphics
- Emitters: this.scene.events.emit('entityDied', ...), 'playerKilledByNPC'
- Methods: updateHealth, updateDisplay, handleDeath, destroy
- All health/death logic and state must be server-authoritative; client only renders health bar and emits user actions
- Remove all local state and logic except for rendering and UI 

## src/HintManager.js

- Dependencies: Phaser, scene (expects roomManager, dungeonService, playerPosition)
- State: hints (Map), hintWallDirections (Map)
- Methods: initializeHints, updateHintVisibility, clearHints
- All hint logic and state must be server-authoritative; client only renders hints based on server data
- Remove all local state and logic except for rendering and UI 

## src/index.css

- Pure CSS file; no logic, state, emitters, or handlers
- No migration required 

## src/ItemManager.js

- Dependencies: scene (expects PlayerStats)
- State: itemEffects
- Methods: useItem (handles item usage/effects)
- All item usage logic and effects must be server-authoritative; client only renders and emits user actions
- Remove all local state and logic except for rendering and UI 

## src/LootUIManager.js

- Dependencies: Phaser, BagManager, itemData (from BagManager), npcLootManager, scene (expects events, add, game, config)
- State: isOpen, lootContainer, currentLootItems, currentSourceEntityId, sourceBagSprite, registeredLoot (Map)
- Emitters: this.scene.events.emit('lootUIClosed')
- Methods: registerNpcLoot, openLootUI, closeLootUI, setInteractionBlocking, _renderLootItems, _handleLootItemClick
- All loot registration, transfer, and state logic must be server-authoritative; client only renders loot UI and emits user actions
- Remove all local state and logic except for rendering and UI 

## src/main.jsx

- Dependencies: React, react-dom, App.jsx
- No emitters, handlers, or state; only mounts App to DOM
- No migration required except to ensure entry point only renders server-driven UI 

## src/NPCLootManager.js

- Dependencies: scene (expects events), itemData (local), lootTiers (local)
- State: none (stateless, only provides loot probabilities)
- Methods: getLootForTier (used by EncounterManager)
- All loot table logic and entity loot assignment must be server-authoritative; client only renders loot UI
- Remove from client except for rendering loot preview if needed 

## src/PlayerStats.js

- Dependencies: Phaser, StatDefinitions.js
- State: statBlock, _maxHealth, _currentHealth, physicalBaseDamage, magicalBaseDamage, _defenseRating, itemDefenseBonus, swordCount, multipliers, ITEM_STATS
- Emitters: this.events.emit('healthChanged', ...), this.events.emit('playerDied')
- Methods: getMaxHealth, getCurrentHealth, getPhysicalDamage, getDefenseRating, applyDamage, applyHealing, setHealth, updateStatsFromInventory, modifyMagicalDamage, getMagicalDamage, getMagicalDamageMultiplier, getElementalDamageMultiplier
- All stat calculation, health, damage, and inventory effect logic must be server-authoritative; client only renders and emits user actions
- Remove all local state and logic except for rendering and UI 

## src/PuzzleManager.js

- Dependencies: Phaser, scene (expects roomManager, dungeonService, playerPosition, events)
- State: puzzles (Map), keyWallDirections (Map)
- Emitters: this.scene.events.emit('showActionPrompt', ...), this.scene.events.emit('addToInventory', ...)
- Methods: initializePuzzles, updateSpriteVisibility, clearPuzzles
- All puzzle/key logic and state must be server-authoritative; client only renders and emits user actions
- Remove all local state and logic except for rendering and UI 

## src/RoomManager.js

- Dependencies: Phaser, dungeonService
- State: roomAssets, availableAssetKeys, directionMappings, inverseDirectionMappings
- Methods: getRoomImageKey, getVisibleDoors, getCardinalDirection, findBestMatchingRoomAsset, getDoorsFromAssetKey, ensureConsistentDoors, getMovementDelta, isValidMove, rotateFacing, hasMiddleDoor
- All room/door logic and state must be server-authoritative; client only renders and emits user actions
- Remove all local state and logic except for rendering and UI 

## src/ShelfManager.js

- Dependencies: Phaser, scene (expects roomManager, dungeonService, playerPosition, events)
- State: shelves (Map), shelfWallDirections (Map)
- Emitters: this.scene.events.emit('addToInventory', ...), this.scene.events.emit('showActionPrompt', ...)
- Methods: initializeShelves, getShelfAssetForPerspective, updateShelfVisibility, updateAllShelvesVisibility, clearShelves
- All shelf/gem/potion logic and state must be server-authoritative; client only renders and emits user actions
- Remove all local state and logic except for rendering and UI 

## src/SpellManager.js

- Dependencies: Phaser, bagManager, playerStats, combatVisuals
- State: spellGemRequirements (Map), spellData (Map)
- Methods: getAllSpells, hasRequiredGemsForSpell, getValidSpells, getSpellRequirements, getSpellData, processSpellCast
- All spell logic, requirements, and cast processing must be server-authoritative; client only renders and emits user actions
- Remove all local state and logic except for rendering and UI 

## src/StatDefinitions.js

- Exports: stat conversion functions (getHealthFromVIT, getDefenseFromVIT, getPhysicalAttackFromSTR, getMagicBonusFromINT, etc.), base stat constants
- No emitters, handlers, or state; pure stat conversion logic
- All stat conversion logic must be duplicated server-side for authoritative calculations
- Remove from client except for character creation/preview UI

## src/TreasureManager.js

- Dependencies: Phaser, scene (expects roomManager, dungeonService, playerPosition, events)
- State: treasures (Map), treasureWallDirections (Map)
- Emitters: this.scene.events.emit('addToInventory', ...), this.scene.events.emit('showActionPrompt', ...)
- Methods: initializeTreasures, updateSpriteVisibility, clearTreasures
- All treasure logic and state must be server-authoritative; client only renders and emits user actions
- Remove all local state and logic except for rendering and UI

## src/socket.js

- Dependencies: socket.io-client (CDN), window.io
- State: socket (singleton)
- Emitters: socket.emit('player_join', { playerId, user_id }), socket.emit('room_enter', { playerId, roomId })
- Handlers: socket.on('action_result', ...), socket.on('error', ...)
- joinPlayer: emits player_join, handles result via action_result, uses callbacks for success/error, removes listeners after response
- enterRoom: emits room_enter for late join/reconnect
- Migration pattern: All player join, room enter, and related flows are now request/response with the server; no local fallback or guessing. Client only emits actions and handles server responses. Listeners are cleaned up after each request to avoid leaks or duplicate handling. JWT auth is used for secure connection. All gameplay state is server-driven.

## src/shared/dungeoncore.js

- Dependencies: ./RNG.js (createRNG, shuffle, uuidv4)
- Exports: generateDungeon(seed, options)
- State: dungeonGrid, roomList (local to generator)
- Methods: generateDungeon, initializeRooms, repositionRooms, connectRooms, selectHubs, generateComplexDungeon, addLoops, enhanceHubs, ensureExits, assignPlaceholders, finalConsistencyCheck
- Migration pattern: Dungeon generation logic has already been successfully migrated to server-side/shared code. All dungeon structure, room state, and layout are generated server-authoritatively and sent to the client as a payload. No local fallback or guessing. Client only renders the dungeon based on server data. Deterministic generation (seeded RNG) ensures consistency between server and client for preview/visualization. All gameplay state is server-driven.

## src/shared/events.js

- Exports: EVENTS (object with all machine-readable event names for Socket.io)
- No emitters, handlers, or state; pure event name definitions
- Migration pattern: All multiplayer, inventory, encounter, and state events are now defined centrally and used for server-authoritative request/response flows. Client and server share the same event names, ensuring consistency and reducing errors. No local fallback or guessing. All gameplay state is server-driven.

## src/shared/RNG.js

- Dependencies: seedrandom
- Exports: createRNG (seeded RNG), shuffle (deterministic shuffle), uuidv4 (deterministic UUID)
- No emitters, handlers, or state; pure deterministic utility functions
- Migration pattern: All randomization and UUID generation for dungeon and game state is now deterministic and server-authoritative. Shared code ensures consistency between server and client for preview/visualization. No local fallback or guessing. All gameplay state is server-driven.

## server/server.js

- Dependencies: socket.io, http, dotenv, node-fetch, ../src/shared/events.js, ../src/shared/DungeonCore.js
- State: players (Map), rooms (Map), bags (Map), visitedRooms (Map), dungeon (object)
- Emitters: socket.emit(EVENTS.ACTION_RESULT, ...), socket.emit(EVENTS.ERROR, ...), socket.emit(EVENTS.ROOM_UPDATE, ...), io.to(roomId).emit(EVENTS.LOOT_BAG_DROP, ...), socket.broadcast.emit(...)
- Handlers: socket.on(EVENTS.PLAYER_JOIN, ...), socket.on(EVENTS.PLAYER_LEAVE, ...), socket.on(EVENTS.ROOM_ENTER, ...), socket.on(EVENTS.INVENTORY_UPDATE, ...), socket.on(EVENTS.LOOT_BAG_PICKUP, ...), socket.on(EVENTS.SPELL_CAST, ...), socket.on(EVENTS.TRADE_REQUEST, ...), socket.on(EVENTS.PARTY_INVITE, ...), socket.on(EVENTS.STAT_ALLOCATION, ...), socket.on('disconnect', ...)
- Migration pattern: All game logic, world state, and event handling are now server-authoritative. Client only emits requests and renders server responses. Player join, room enter, inventory, loot, and dungeon state are all managed and validated on the server. JWT auth is enforced for all connections. No client-side fallback or guessing. All gameplay state is server-driven and persistent. Event flows are request/response, and all state changes are validated and broadcast by the server. Successfully migrated flows include player join, room enter, inventory update, loot bag drop/pickup, and dungeon reset on 0 players.

## server/package.json

- Dependencies: socket.io, dotenv, node-fetch, seedrandom
- All dependencies are required for server-authoritative logic, event handling, environment config, fetch, and deterministic RNG
- Migration pattern: All server logic and event flows rely on these dependencies for secure, consistent, and deterministic multiplayer gameplay

# === MIGRATION OVERLAP/REDUNDANCY NOTES ===

- For all files where logic has already been migrated to shared/server code (e.g., dungeon generation, event names, player join/leave, inventory, loot), do NOT duplicate or re-migrate. Remove or stub out any remaining client code for these systems. Only migrate what is still client-side and not yet server-authoritative.

## src/DungeonService.js
- NOTE: All dungeon generation, world state, and room logic is now handled by shared/dungeoncore.js and server/server.js. Do NOT re-migrate. Remove all local state and logic except for rendering and UI. Only use server payloads.

## src/shared/dungeoncore.js
- NOTE: Dungeon generation and structure is already server-authoritative and shared. Do NOT duplicate or re-migrate. Client only renders based on server data.

## src/shared/events.js
- NOTE: All event names and flows are now defined centrally and used by both client and server. Do NOT duplicate or hard-code event names elsewhere. Only use these shared definitions.

## server/server.js
- NOTE: All game logic, world state, and event handling are server-authoritative. Do NOT attempt to migrate these flows again from the client. Only migrate remaining client logic not yet server-authoritative.

## src/socket.js
- NOTE: Player join, room enter, and related flows are already migrated to request/response with the server. Do NOT duplicate or re-migrate. Only emit actions and handle server responses as implemented.

## src/RoomManager.js, src/PlayerStats.js, src/BagManager.js, src/EncounterManager.js, src/CombatVisuals.js, src/HealthBar.js, src/HintManager.js, src/ItemManager.js, src/LootUIManager.js, src/NPCLootManager.js, src/PuzzleManager.js, src/ShelfManager.js, src/SpellManager.js, src/TreasureManager.js
- NOTE: Only migrate logic that is still client-side and not yet server-authoritative. Remove or stub out any local state, logic, or event handling that overlaps with already-migrated server/shared systems.