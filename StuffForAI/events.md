# Socket.io Event Specification

> **2024-06 Audit Clarifications:**
> - All client-to-server action events must use the canonical event names and payloads as defined here and in events.js. No legacy or ad-hoc event names should remain. All action results must be returned via `action_result`, `spell_result`, or the appropriate canonical event.
> - All attack, spell, and steal actions must always present a target selection submenu, even if there is only one valid target. Evasion (SPD-based dodge) is always checked server-side for every attack, spell, or steal, and the result is included in the action result payload (`evaded`, `prompt`, etc.).
> - See ai_instructions.md for the full 2024-06 Audit Clarifications section.

## player_join
- Direction: client → server
- Payload:
  ```json
  {
    "playerId": "string",
    "character": { /* character object */ }
  }
  ```

## player_leave
- Direction: client → server
- Payload:
  ```json
  {
    "playerId": "string"
  }
  ```

## room_enter
- Direction: client → server
- Payload:
  ```json
  {
    "playerId": "string",
    "roomId": "string"
  }
  ```

## room_update
- Direction: server → client
- Payload:
  ```json
  {
    "roomId": "string",
    "players": [ /* array of playerIds */ ],
    "entities": [ /* array of entities */ ],
    "visited": [ /* array of roomIds */ ]
  }
  ```

## encounter_start
- Direction: server → client
- Payload:
  ```json
  {
    "roomId": "string",
    "participants": [ /* array of participant objects */ ],
    "turnQueue": ["string"],
    "currentTurn": "string",
    "parties": { /* partyId: { leaderId, members } */ },
    "aiGroups": { /* groupId: [entityIds] */ }
  }
  ```
- Notes: Only party/group leaders can trigger encounter events (door click or dynamic/random). Non-leader members never trigger or affect encounter chance. All participants receive the same encounter state and updates.

## encounter_end
- Direction: server → client
- Payload:
  ```json
  {
    "roomId": "string"
  }
  ```

## inventory_update
- Direction: client ↔ server (bidirectional)
- Payload:
  ```json
  {
    "playerId": "string",
    "inventory": [ /* array of item objects */ ]
  }
  ```

## loot_bag_drop
- Direction: server → client
- Payload:
  ```json
  {
    "roomId": "string",
    "bagId": "string",
    "items": [ /* array of item objects */ ]
  }
  ```

## loot_bag_pickup
- Direction: client → server
- Payload:
  ```json
  {
    "playerId": "string",
    "bagId": "string"
  }
  ```

## health_update
- Direction: server → client
- Payload:
  ```json
  {
    "playerId": "string",
    "health": number,
    "maxHealth": number
  }
  ```

## spell_cast
- Direction: client → server
- Payload:
  ```json
  {
    "playerId": "string",
    "spellName": "string",
    "targetId": "string"
  }
  ```

## spell_result
- Direction: server → client
- Payload:
  ```json
  {
    "result": "string",
    "damage": number,
    "effects": [ "string" ],
    "targetId": "string",
    "evaded": false,
    "prompt": "string"
  }
  ```

## error
- Direction: server → client
- Payload:
  ```json
  {
    "message": "string",
    "code": "string" // optional error code
  }
  ```

## action_result
- Direction: server → client
- Payload:
  ```json
  {
    "action": "string",
    "success": true,
    "message": "string",
    "data": { /* optional, any */ },
    "targetId": "string",
    "evaded": false,
    "prompt": "string"
  }
  ```

## player_state_update
- Direction: server → client
- Payload:
  ```json
  {
    "playerId": "string",
    "state": { /* arbitrary player state, e.g., buffs, debuffs, etc. */ }
  }
  ```

## player_join_notification
- Direction: server → client
- Payload:
  ```json
  {
    "name": "string"
  }
  ```

## player_leave_notification
- Direction: server → client
- Payload:
  ```json
  {
    "name": "string"
  }
  ```

## party_invite
- Direction: client → server
- Payload:
  ```json
  { "fromPlayerId": "string", "toPlayerId": "string" }
  ```
- Notes: Sent by a player during a PvP encounter to invite another player to form a party. If the other player also clicks party invite (now "Party Accept"), the party is formed and the encounter ends.

## party_update
- Direction: server → client
- Payload:
  ```json
  { "partyId": "string", "leaderId": "string", "members": ["string"], "roomId": "string" }
  ```
- Notes: Sent when a party is formed, updated, or a member leaves. The leader controls movement. All members are synced to the leader's room. Only the leader can interact with doors. All other interactions (loot, treasure, etc.) are available to all members.

## party_leave
- Direction: client → server
- Payload:
  ```json
  { "playerId": "string", "partyId": "string" }
  ```
- Notes: Sent when a party member clicks "Leave Party". The player is moved to the previous room and removed from the party. If the party is reduced to one, it is dissolved.

## ai_group_encounter
- Direction: server → client
- Payload:
  ```json
  { "roomId": "string", "entities": [ { "entityId": "string", "type": "string", "groupIndex": number } ] }
  ```
- Notes: Sent when an AI group encounter is created. Each entity in the group has its own ID and type. The groupIndex determines sprite display (see ai_instructions.md for offsets and z-order).

## encounter_turn_update
- Direction: server → client
- Payload:
  ```json
  { "roomId": "string", "turnQueue": ["string"], "currentTurn": "string" }
  ```
- Notes: Sent at the start of each turn or when the turn order changes. Only the party leader can use flee; party members' flee option is disabled (greyed out in UI).

## attack_result, spell_result, steal_result, health_update, entity_died
- Direction: server → client
- Notes: All combat and event flows are based on a single shared encounter state per room. All participants receive the same updates. Health, death, and loot are synchronized for all party/group members and AI. No duplicate or desynced encounter states.

## loot_bag_drop, loot_bag_pickup, inventory_update
- Direction: server → client
- Notes: Loot is always handled individually, even in parties or groups. Each player or AI has their own inventory, loot drops, and loot bag on death. There is no shared or split loot—first to click an item claims it, and all loot flows are per-entity.

## showActionMenu
- Direction: server → client
- Notes: Only leaders can navigate/flee. Members always follow the leader and are included in all group events, but cannot initiate navigation or encounters themselves.

---

## Universal Multiplayer Loot/Event State & Inventory Sync Pattern (2024-06)

### When to Apply
- Whenever the server emits an authoritative update event for any interactable/lootable object (e.g., SHELF_UPDATE, TREASURE_UPDATE, PUZZLE_UPDATE, LOOT_BAG_UPDATE, etc.).

### What Every Client Must Do (in this order):
1. Destroy the relevant sprite for the object in the current room (immediate visual feedback).
2. Remove the sprite from the manager's tracking map (to prevent lingering references).
3. Update the local room state in the client's dungeon/room cache to match the server's authoritative state (e.g., set room.treasureLevel = null, room.puzzleType = null, room.gemType = null, room.hasPotion = false, etc.).
4. Never mutate local state in anticipation—only in direct response to a server event.
5. For inventory: Only add the looted item to the bag/inventory UI in response to an INVENTORY_UPDATE event from the server. Never add it locally on click.

### Why This Pattern?
- Ensures all clients are always in sync with the server (the single source of truth).
- Prevents ghosting, reappearing, or desynced loot/interactables.
- Works for all loot types, interactables, and future event-driven state (not just shelves/treasure/puzzles).

### Example (for any loot type):
```js
this.socket.on('TREASURE_UPDATE', (data) => {
  // 1. Destroy the sprite
  const entry = this.activeTreasures.get(data.roomId);
  if (entry && entry.key === data.itemKey && entry.sprite && entry.sprite.scene) {
    entry.sprite.destroy();
    // 2. Remove from tracking map
    this.activeTreasures.delete(data.roomId);
    // 3. Update local room state
    const room = this.scene.dungeonService.getRoomById(data.roomId);
    if (room) room.treasureLevel = null;
  }
});
// 5. Inventory is only updated in response to:
this.socket.on('INVENTORY_UPDATE', ({ playerId, inventory }) => {
  if (playerId === this.scene.playerId) {
    this.bagManager.updateInventory(inventory);
  }
});
```

### Universal Checklist
- [ ] Listen for the server's update event for the object.
- [ ] Destroy the relevant sprite.
- [ ] Remove the sprite from the manager's tracking map.
- [ ] Update the local room state to match the server.
- [ ] Never mutate state in anticipation—only in response to server events.
- [ ] Only update inventory/bag UI in response to INVENTORY_UPDATE from the server.
- [ ] Never add loot to inventory or remove from room except in response to server events.

---

This is the universal, multiplayer-safe, server-authoritative pattern for all interactable state and inventory flows.

---

## Placeholders for Future Events

### trade_request
- Direction: client → server
- Payload: `{ fromPlayerId, toPlayerId, items }`

### trade_response
- Direction: server → client
- Payload: `{ success, message }`

### mana_update
- Direction: server → client
- Payload: `{ playerId, mana, maxMana }`

### stat_allocation
- Direction: client → server
- Payload: `{ playerId, stats }`

### win_condition
- Direction: server → client
- Payload: `{ winnerId, reason }`

---

**Update this file whenever you add or change events!** 