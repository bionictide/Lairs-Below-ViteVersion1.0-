# Multiplayer Events and Payloads

## Treasure Pickup (Server-Authoritative)

### Client -> Server
- **requestTreasurePickup**
  - `{ roomId: string }`
  - Requests to pick up a treasure in the specified room. Server validates and mutates state.

### Server -> Client (response to picker)
- **treasurePickupResult**
  - `{ success: boolean, item?: object, roomId: string, message?: string }`
  - Success/failure and item details if successful.

### Server -> All Clients (broadcast)
- **EVENTS.TREASURE_PICKED_UP**
  - `{ roomId: string }`
  - Informs all clients in the dungeon that the treasure in this room has been picked up and should be removed from the UI.

## Physical Attack (Server-Authoritative)

### Client -> Server
- **requestAttack**
  - `{ initiatorId: string, targetId: string }`
  - Requests to perform a physical attack. Server validates and mutates state.

### Server -> All Clients (broadcast)
- **attackResult**
  - `{ success: boolean, initiatorId: string, targetId: string, damage: number, targetHealth: number, died: boolean, message: string }`
  - Result of the attack, including damage dealt, updated health, and death status.

## Steal (Server-Authoritative)

### Client -> Server
- **requestSteal**
  - `{ initiatorId: string, targetId: string }`
  - Requests to attempt a steal. Server validates and mutates state.

### Server -> All Clients (broadcast)
- **stealResult**
  - `{ success: boolean, initiatorId: string, targetId: string, item?: object, message: string }`
  - Result of the steal attempt, including item stolen (if any) and a message.

---

// ... existing documentation ... 