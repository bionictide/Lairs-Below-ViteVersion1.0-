// EncounterManagerServer.js
// Fully patched with real spell casting logic

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

  if (action.type === "attack") {
    const attacker = currentEntity;
    const target = encounter.participants.find(p => p.id === action.targetId);
    if (!target) return;
    const damage = Math.max(0, (attacker.attack || 0) - (target.defense || 0));
    target.hp = (target.hp || 0) - damage;
    if (target.hp <= 0) {
      resolveDeath({
        entityId: target.id,
        killerId: attacker.id,
        killerFacing: attacker.facingDirection,
        roomId: target.roomId,
        items: target.inventory || []
      });
    }
  }

  if (action.type === "cast") {
    const attacker = currentEntity;
    const target = encounter.participants.find(p => p.id === action.targetId);
    if (!target) return;
    const result = castSpell(attacker, action.spell, target);
    if (result?.type === "damage" && target.hp <= 0) {
      resolveDeath({
        entityId: target.id,
        killerId: attacker.id,
        killerFacing: attacker.facingDirection,
        roomId: target.roomId,
        items: target.inventory || []
      });
    }
  }

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
