// Machine-readable event names for Socket.io
// Update this file whenever you add or change events!

export const EVENTS = {
  PLAYER_JOIN: 'player_join',
  PLAYER_LEAVE: 'player_leave',
  ROOM_ENTER: 'room_enter',
  ROOM_UPDATE: 'room_update',
  ENCOUNTER_START: 'encounter_start',
  ENCOUNTER_END: 'encounter_end',
  INVENTORY_UPDATE: 'inventory_update',
  LOOT_BAG_DROP: 'loot_bag_drop',
  LOOT_BAG_PICKUP: 'loot_bag_pickup',
  LOOT_ITEM_PICKUP: 'loot_item_pickup',
  HEALTH_UPDATE: 'health_update',
  SPELL_CAST: 'spell_cast',
  SPELL_RESULT: 'spell_result',
  // Future events
  TRADE_REQUEST: 'trade_request',
  TRADE_RESPONSE: 'trade_response',
  PARTY_INVITE: 'party_invite',
  PARTY_UPDATE: 'party_update',
  MANA_UPDATE: 'mana_update',
  STAT_ALLOCATION: 'stat_allocation',
  WIN_CONDITION: 'win_condition',
  ERROR: 'error',
  ACTION_RESULT: 'action_result',
  PLAYER_STATE_UPDATE: 'player_state_update',
  PLAYER_JOIN_NOTIFICATION: 'player_join_notification',
  PLAYER_LEAVE_NOTIFICATION: 'player_leave_notification',
}; 