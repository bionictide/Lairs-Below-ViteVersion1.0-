# Socket.io Event Specification

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