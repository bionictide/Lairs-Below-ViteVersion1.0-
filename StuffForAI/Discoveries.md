# Discoveries

> This document is a running log of all findings, hidden flows, and migration notes during the server-authoritative migration. Do not change any game logic or flow here. Only consolidate into StuffForAI after migration is complete and tested.

---

## [Date]
- Start of migration log. No changes made yet. 

## [Inventory, Loot, and Bag Flows Migration Start]

### Files Read:
- src/BagManager.js
- src/ItemManager.js
- src/PlayerStats.js
- src/StatDefinitions.js
- src/LootUIManager.js

### Key Findings & Notes:
- **BagManager** handles all inventory UI, item placement, drag/drop, context menu (use/drop), and emits events for loot bag interactions. It directly updates player stats and syncs inventory to Supabase.
- **ItemManager** is responsible for item use logic (e.g., healing potions) and is called by BagManager for 'use' actions.
- **PlayerStats** manages all stat calculations, health, and stat updates from inventory. It emits events for health changes and death, and is updated by BagManager when inventory changes.
- **StatDefinitions** provides all stat conversion functions and constants, used by PlayerStats for derived stat calculations.
- **LootUIManager** handles the loot UI for bags, registers loot for entities, and manages the transfer of loot items to the player's bag. It calls BagManager.addItem for each loot item and removes the bag sprite when empty.
- **Event Flow:**
  - BagManager emits 'lootBagClicked' when a loot bag is clicked, which is handled by LootUIManager to open the loot UI.
  - LootUIManager calls BagManager.addItem when a loot item is clicked, and removes the item from the loot list if successful.
  - BagManager updates PlayerStats after inventory changes, and syncs to Supabase if available.
  - All UI and state changes are currently local/client-side.
- **Critical Logic to Preserve:**
  - Individual loot item transfer (not whole bag at once).
  - Inventory grid placement and space checks.
  - Stat recalculation after inventory changes.
  - No change to UX or game flow.
- **Migration Requirement:**
  - All inventory, loot, and stat logic must move to the server.
  - Client must only emit intent (e.g., 'use item', 'drop item', 'pickup loot') and render state from server events.
  - All emitters/handlers must be reciprocated on both client and server.
  - Supabase sync should be handled server-side only.

### [Server-Authoritative Event Contracts and State: Inventory, Loot, Bag]

#### Core Events (Client → Server):
- `INVENTORY_ADD_ITEM` { playerId, itemKey }: Request to add an item to inventory (e.g., from loot, pickup).
- `INVENTORY_REMOVE_ITEM` { playerId, instanceId }: Request to remove an item (e.g., drop, use).
- `INVENTORY_USE_ITEM` { playerId, instanceId }: Request to use an item (e.g., potion).
- `LOOT_BAG_PICKUP` { playerId, bagId, itemKey }: Request to pick up a specific item from a loot bag.
- `LOOT_BAG_DROP` { playerId, roomId, items }: Request to drop a bag (e.g., on death/disconnect).

#### Core Events (Server → Client):
- `INVENTORY_UPDATE` { playerId, inventory }: Authoritative inventory state after any change.
- `LOOT_BAG_UPDATE` { bagId, items }: Authoritative state of a loot bag (after pickup, drop, etc.).
- `ACTION_RESULT` { action, success, message, data }: Result of any inventory/loot action.
- `ERROR` { message, code }: Error for invalid actions or state.

#### Server State:
- `players`: Map of playerId → { inventory, ... }
- `bags`: Map of bagId → { roomId, items }
- All stat calculations and inventory effects are performed server-side.
- Supabase sync is triggered server-side at key points (death, logout, win, interval).

#### Flow Mapping:
- Client emits intent (e.g., use item, pick up loot) → Server validates, updates state, and emits authoritative state/events back.
- All inventory/loot UI is updated only in response to server events.
- No local state changes for inventory, loot, or stats on the client.

#### Critical Parity Points:
- Individual loot item transfer (not whole bag at once).
- Inventory grid placement and space checks are performed server-side.
- Stat recalculation after inventory changes is server-side.
- No change to UX or game flow.

## [Process & Quality Assurance Lesson]

- **Lesson:** When a bug or problem is discovered after an edit, always review the *entire scope* of the previous changes—not just the direct lines or files involved in the bug. This means:
  - Re-examining every file and section touched during the problematic update.
  - Looking for any accidental changes, deletions, or logic errors introduced at the same time, not just the same type of error.
  - Documenting both the root cause and any collateral findings in the Discoveries log.
- **Principle:** Never patch only the symptom. Always check for and address any collateral or hidden issues caused by the same edit.

## [Missed Steps & Should-Have-Done-Differently: Inventory/Loot Migration]

- **Socket Instance Refactor:**
  - Missed: Initially, each manager (BagManager, ItemManager, LootUIManager, PlayerStats) created its own unauthenticated socket.io-client instance. This caused all real-time events to be rejected by the server.
  - Should have: Passed the single authenticated socket instance from login to all managers at instantiation, and removed all direct `io()` calls and duplicate sockets from the start of the migration.

- **Transpiler Helpers:**
  - Missed: During manual edits, the transpiler helpers (`_class_call_check`, `_defineProperties`, `_create_class`) were accidentally omitted from the top of BagManager.js, causing runtime errors.
  - Should have: Ensured all transpiler helpers were present at the top of every manager file after any manual or bulk edit, especially when copying or restructuring ES5/ES6 code.

- **Event Payload Consistency:**
  - Missed: Some client events (e.g., loot pickup) were emitted with undefined `playerId`, and loot bag structures were inconsistent (arrays of strings instead of objects with `itemKey` and `instanceId`).
  - Should have: Standardized all event payloads and structures before wiring up event flows, and validated payloads in both emitters and handlers during migration.

--- 