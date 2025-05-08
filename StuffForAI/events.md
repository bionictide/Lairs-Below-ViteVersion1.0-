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
    "effects": [ "string" ]
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
    "data": { /* optional, any */ }
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

---

## Placeholders for Future Events

### trade_request
- Direction: client → server
- Payload: `{ fromPlayerId, toPlayerId, items }`

### trade_response
- Direction: server → client
- Payload: `{ success, message }`

### party_invite
- Direction: client → server
- Payload: `{ fromPlayerId, toPlayerId }`

### party_update
- Direction: server → client
- Payload: `{ partyId, members }`

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