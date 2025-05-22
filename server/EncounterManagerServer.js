// EncounterManagerServer.js
// Fully restored encounter flow — handles turns, AI, abilities, spell use, death

import { getPlayerStatsById } from "./PlayerStatsServer.js";
import { castSpell } from "./SpellManagerServer.js";
import { createLootBag } from "./BagManagerServer.js";
import { EVENTS } from "../src/shared/events.js";

const activeEncounters = {};

export function startEncounter(encounterId, participants) {
  activeEncounters[encounterId] = {
    participants: [...participants],
    currentTurnIndex: 0,
    state: "active"
  };
}

export function getCurrentEntity(encounterId) {
  const encounter = activeEncounters[encounterId];
  if (!encounter) return null;
  return encounter.participants[encounter.currentTurnIndex];
}

export function takeTurn(encounterId, entityId, action) {
  const encounter = activeEncounters[encounterId];
  if (!encounter || encounter.state !== "active") return;

  const currentEntity = getCurrentEntity(encounterId);
  if (!currentEntity || currentEntity.id !== entityId) return;

  // Handle action
  if (action.type === "attack") {
    const target = encounter.participants.find(p => p.id === action.targetId);
    if (!target) return;

    const attackerStats = getPlayerStatsById(entityId);
    const targetStats = getPlayerStatsById(action.targetId);

    const damage = Math.max(0, attackerStats.attack - targetStats.defense);
    targetStats.hp -= damage;

    if (targetStats.hp <= 0) {
      resolveDeath({
        entityId: target.id,
        killerId: currentEntity.id,
        killerFacing: currentEntity.facingDirection,
        roomId: target.roomId,
        items: targetStats.inventory || []
      });
    }
  }

  if (action.type === "cast") {
    castSpell(entityId, action.spell, action.targetId, encounterId);
  }

  // Advance turn
  encounter.currentTurnIndex = (encounter.currentTurnIndex + 1) % encounter.participants.length;
}

export function resolveDeath({ entityId, killerId, killerFacing, roomId, items }) {
  for (const [encounterId, encounter] of Object.entries(activeEncounters)) {
    const index = encounter.participants.findIndex(p => p.id === entityId);
    if (index !== -1) {
      encounter.participants.splice(index, 1);

      if (items && items.length > 0) {
        createLootBag({
          ownerId: entityId,
          roomId,
          facingDirection: killerFacing,
          items
        });
      }

      if (encounter.participants.length <= 1) {
        delete activeEncounters[encounterId];
      }

      break;
    }
  }
}
