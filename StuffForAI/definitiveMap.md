# Rules & Architectural Summaries

**MANDATORY RULES FOR MAINTAINING THIS MAP AND THE CODEBASE:**

1. **Superset Refactor:** The refactor must be a superset—preserve all new/current logic and features (group combat, PvP, party system, buffs/debuffs, new enemy types, etc.) while restoring any missing old logic/interconnections. Never overwrite or regress new code with old logic; only merge in missing features.
2. **Explicit Dependencies:** Always explicitly list all real dependencies for each manager. Never write "None after refactor"—every manager has dependencies, even if routed through MM.
3. **Preserve Gameplay Logic:** All gameplay logic and interconnections from the old project files must be present in the new structure. The refactor is for architecture, not for changing gameplay.
4. **MM as the Only Route:** ManagerManager (MM) is the only route for cross-manager communication, but the dependency map must show which managers interact (via MM) for the game to function.
5. **Read Every Chunk:** Always read every chunk of every file you interact with, both old and new. Never assume you have the full logic from a partial read. Leave no logic unmapped.
6. **Living Trace Map:** Use this doc as a living trace map and troubleshooting guide. Update it as you refactor, add features, or discover new dependencies.
7. **Final Codebase:** The final codebase must be strictly more complete, robust, and feature-rich than either the old or new code alone. All new systems and their dependencies must be mapped and routed through MM.

---

# Server-Side Event & Manager Routing: Definitive Map

## Purpose
- **Checklist and trace map** for routing all server-side events and manager interactions through ManagerManager (MM).
- **Tracks:**
  - Events handled (from EVENTS.js)
  - Events emitted
  - MM methods used
  - Direct dependencies
  - Direct cross-manager calls (to be refactored)
- **Use as:**
  - Progress checklist
  - Trace routing guide
  - Troubleshooting reference

---

## Managers Checklist

### BagManagerServer
- [ ] All events routed through MM
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - LOOT_BAG_DROP
  - LOOT_BAG_PICKUP
  - LOOT_BAG_UPDATE
  - LOOT_ITEM
  - MARK_BAG_CHECKED
- **Events Emitted:**
  - LOOT_BAG_DROP
  - LOOT_BAG_UPDATE
- **MM Methods Used:**
  - createLootBag
  - lootItem
  - markLootBagChecked
  - removeEmptyBags
  - destroyRoomBags
  - getBagById
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### CharacterSpritesServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - (Usually utility, but list if any)
- **Events Emitted:**
  - (Usually utility, but list if any)
- **MM Methods Used:**
  - getCharacterSprite
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### CharacterTypesServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - (Usually utility, but list if any)
- **Events Emitted:**
  - (Usually utility, but list if any)
- **MM Methods Used:**
  - getCharacterDefinition
  - getPlayableCharacters
  - getAllCharacterTypeKeys
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### DebugHelperServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - DEV_DEBUG_AUTH
- **Events Emitted:**
  - (List if any)
- **MM Methods Used:**
  - (List as refactored)
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### DungeonCore
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - (Usually utility, but list if any)
- **Events Emitted:**
  - (Usually utility, but list if any)
- **MM Methods Used:**
  - getDungeonCore
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### DungeonServiceServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - (List if any)
- **Events Emitted:**
  - (List if any)
- **MM Methods Used:**
  - (List as refactored)
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### EncounterManagerServer
- [ ] All events routed through MM
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - ENCOUNTER_START
  - ENCOUNTER_END
  - ENCOUNTER_ATTACK_RESULT
  - ENCOUNTER_SPELL_RESULT
  - ENCOUNTER_KO
  - ENCOUNTER_FLEE_RESULT
  - ENCOUNTER_ACTION_MENU
  - ENCOUNTER_TARGET_SELECTION
  - ENCOUNTER_EXAMINE_INFO
  - ENCOUNTER_TRADE_OFFER
  - ENCOUNTER_INVITE
  - ENCOUNTER_TALK
  - ENCOUNTER_INVALID_ACTION
  - ENCOUNTER_LOCK_ACTIONS
  - ENCOUNTER_UNLOCK_ACTIONS
- **Events Emitted:**
  - ENCOUNTER_* events
- **MM Methods Used:**
  - encounterStarted
  - emitAttackResult
  - emitSpellResult
  - emitKO
  - emitFleeResult
  - emitActionMenu
  - emitTargetSelection
  - emitExamineInfo
  - emitTradeOffer
  - emitInvite
  - emitTalk
  - emitInvalidAction
  - lockActions
  - unlockActions
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### GroupManagerServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - (List if any)
- **Events Emitted:**
  - (List if any)
- **MM Methods Used:**
  - getPlayerGroup
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### HintManagerServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - SHOW_HINT
  - CLEAR_HINT
- **Events Emitted:**
  - (List if any)
- **MM Methods Used:**
  - sendHintToPlayer
  - broadcastHintToRoom
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### ItemManagerServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - (List if any)
- **Events Emitted:**
  - (List if any)
- **MM Methods Used:**
  - useItem
  - canPlaceItemInGrid
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### NPCLootManagerServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - (List if any)
- **Events Emitted:**
  - (List if any)
- **MM Methods Used:**
  - handleNpcDefeat
  - getLootForTier
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### PlayerManagerServer
- [ ] All events routed through MM
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - PLAYER_JOIN
  - PLAYER_LEAVE
  - PLAYER_STATE_UPDATE
- **Events Emitted:**
  - PLAYER_STATE_UPDATE
- **MM Methods Used:**
  - getPlayerStatus
  - getPlayerGroup
  - getHealth
  - getRoomId
  - getType
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### PlayerStatsServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - (List if any)
- **Events Emitted:**
  - (List if any)
- **MM Methods Used:**
  - resolvePlayerStatsFromSupabase
  - createStatsFromDefinition
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### PuzzleManagerServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - PUZZLE_ATTEMPT
  - PUZZLE_SOLVED
  - PUZZLE_FAILED
  - PUZZLE_UPDATE
- **Events Emitted:**
  - PUZZLE_UPDATE
- **MM Methods Used:**
  - createPuzzle
  - isPuzzleSolved
  - handlePuzzleAttempt
  - handlePuzzlePickup
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### RNG.js
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - (Utility only)
- **Events Emitted:**
  - (Utility only)
- **MM Methods Used:**
  - (List if any)
- **Direct Dependencies:**
  - None
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### RoomManagerServer
- [ ] All events routed through MM
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - ROOM_ENTER
  - ROOM_UPDATE
- **Events Emitted:**
  - ROOM_UPDATE
- **MM Methods Used:**
  - playerEnteredRoom
  - playerTurned
  - updateRoomState
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### server.js
- [ ] All events routed through MM
- [ ] No direct calls from/to managers (except MM)
- **Events Handled:**
  - All EVENTS.js events
- **Events Emitted:**
  - All EVENTS.js events
- **MM Methods Used:**
  - All as needed
- **Direct Dependencies:**
  - ManagerManager
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### ShelfManagerServer
- [ ] All events routed through MM
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - SHELF_INTERACT
  - SHELF_UPDATE
- **Events Emitted:**
  - SHELF_UPDATE
- **MM Methods Used:**
  - handleShelfAccess
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### SpellManagerServer
- [ ] All events routed through MM
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - SPELL_CAST
  - SPELL_RESULT
- **Events Emitted:**
  - SPELL_RESULT
- **MM Methods Used:**
  - castSpell
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### StatDefinitionsServer
- [ ] All events routed through MM (if any)
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - (Utility only)
- **Events Emitted:**
  - (Utility only)
- **MM Methods Used:**
  - getHealthFromVIT
  - getDefenseFromVIT
  - getPhysicalAttackFromSTR
  - getMagicBonusFromINT
  - getMagicDefenseFromINT
  - getStealBonusFromDEX
  - getCritDamageFromDEX
  - getManaFromMND
  - getCritSpellBonusFromMND
  - getFleeChanceFromSPD
- **Direct Dependencies:**
  - None
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

### TreasureManagerServer
- [ ] All events routed through MM
- [ ] No direct calls from/to other managers
- **Events Handled:**
  - TREASURE_INTERACT
  - TREASURE_UPDATE
- **Events Emitted:**
  - TREASURE_UPDATE
- **MM Methods Used:**
  - handleTreasureAccess
- **Direct Dependencies:**
  - None (after refactor)
- **Direct Cross-Manager Calls:**
  - [ ] (List any found)

---

## Progress
- [ ] All managers refactored to MM-only routing
- [ ] All direct cross-manager calls removed
- [ ] All events mapped and routed through MM
- [ ] Debug logging in all MM methods
- [ ] This doc updated as refactor progresses

---

## Notes
- Update this doc as you refactor each manager/event.
- Use as a troubleshooting and onboarding guide once complete. 