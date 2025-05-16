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
    "entityId": "string",
    "entityType": "string"
  }
  ```

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