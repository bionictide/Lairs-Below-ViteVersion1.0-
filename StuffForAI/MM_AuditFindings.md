# Lairs Below: Migration Audit Findings & Notes

This document tracks all findings, missing logic, and critical notes from the ongoing audit of the codebase migration from client-authoritative to server-authoritative architecture.

---

## Audit Methodology
- Compare old client logic files to new server logic files.
- Trace any missing logic through all relevant files (including ManagerManager, server.js, etc.).
- Report findings as **Good** (logic present), **Bad** (logic present but incorrect/incomplete), or **Missing** (logic not found, with details).
- Only expand on critical missing pieces; keep all other notes brief.
- Maintain a "dumb renderer" client: all logic must be server-side, but client must still submit intent and process render instructions.

---

## Findings Log

### [Date/Time: Start of Audit]

#### RoomManager (Client)
- **Finding:** `src/RoomManager.js` is empty.
- **Trace:** All logic moved to `server/RoomManagerServer.js`. Client now receives room render instructions via socket events and renders in `DungeonScene.js`.
- **Status:** Good for server-authoritative model, but empty file is a code smell. Should be removed or given a minimal interface for intent submission/event handling.
- **Action:** No immediate repair needed, but flag for future cleanup/refactor.

#### [Critical] Door Click Zones & Navigation UI (Client)
- **Finding:** Door click zones and navigation UI logic are missing in the current client (`DungeonScene.js`).
- **Trace:** Old client dynamically created interactive door zones and navigation buttons for movement. New client does not render or handle navigation intent at all.
- **Status:** **Missing. Critical.** Players cannot move in the dungeon; game is unplayable.
- **Action:** Must be repaired after the audit. Log as a top priority.

#### [Critical] Entity Placement
- **Finding:** General entity (NPC, etc.) placement logic is missing or unclear in the new system.
- **Trace:** Old client handled entity placement and management. New server has encounter entity logic, but no clear regular entity placement for dungeon rooms.
- **Status:** **Missing/Unclear. Critical.**
- **Action:** Must be repaired after the audit. Needs further tracing if entity placement is found elsewhere.

#### [Critical] Dynamic Encounter (Timer) Logic
- **Finding:** Dynamic/timed encounter logic (periodic random encounters) is missing in the new system.
- **Trace:** Old client used a timer to trigger dynamic encounters. No such timer or logic found in new client or server.
- **Status:** **Missing. Critical.**
- **Action:** Must be repaired after the audit.

#### [Critical] Door Click → Encounter Flow
- **Finding:** Door click zones are missing, so door click → encounter flow is broken.
- **Trace:** Old client could trigger encounters on door click. New client cannot, as door click zones are not rendered.
- **Status:** **Missing. Critical.**
- **Action:** Must be repaired after the audit.

#### [Critical] Treasure/Puzzle/Shelf/Hint Placement & Manager Logic
- **Finding:** Item placement and manager initialization logic for treasures, puzzles, shelves, and hints is missing in the current client. No clear server-driven replacement found.
- **Trace:** Old client called `initializeTreasures`, `initializePuzzles`, `initializeShelves`, and `initializeHints` in `DungeonScene.js`. New client does not. Managers exist, but are not used for placement/rendering. No evidence of server sending item placement/render instructions to client.
- **Status:** **Missing. Critical.**
- **Action:** Must be repaired after the audit. Further tracing of item manager logic will be done when those managers are reviewed in detail.

#### [Critical] AI Combat Behavior (handleAIAction) (**Critical**)
- **Missing in new:** No server-side AI combat/turn logic (e.g., handleAIAction, standardAction, angryAction, lowHealthAction) in EncounterManagerServer. NPCs/entities do not act on their own.
- **Exists in old:** Fully implemented in old EncounterManager.js using aiBehavior from CharacterTypes.js.
- **Repair required:** Port AI turn logic (handleAIAction and all aiBehavior types) to the server. Ensure all enemy/NPC actions are server-driven and routed through MM.

#### [Add further findings below as audit continues]

---

## Notes for Future Repairs
- Do not repair as you go; collect all issues for a single, coordinated repair phase after full audit.
- Use this document to keep memory fresh and avoid conversational memory limitations.
- Maintain this analytical, code-tracing mentality throughout the audit.

---

## Critical Missing/Partial Logic (Detailed)

### 1. Talk/Keyword/Mood System (**Critical**)
- **Missing in new:** Only stubbed in `ManagerManager.emitTalk` and `EncounterManagerServer.handleAction` (action === 'talk'). No server-side parsing of player messages, keyword matching, mood changes, or prompt emission.
- **Exists in old:** Fully implemented in `EncounterManager.js` (see `handleTalk`, `handleAIAction`, and keyword/mood logic in `CharacterTypes.js`).
- **Repair required:**
  - Port keyword parsing and matching from old `EncounterManager.js`.
  - Implement mood changes and prompt emission based on `CharacterTypesServer` definitions.
  - Ensure all talk actions are handled server-side and results are emitted to clients.

### 2. Dynamic/Timed Encounters (**Critical**)
- **Missing in new:** No server-side logic for timed/dynamic entity encounters, random encounters, or timed room events. No equivalent to old timers or cooldowns.
- **Exists in old:** Managed in `EncounterManager.js` (`startRoomCooldown`, `endEncounter`, AI timers) and `DungeonScene.js` (timed encounter triggers, entity placement, cooldowns).
- **Repair required:**
  - Implement server-side timers for room/encounter cooldowns and dynamic entity spawns.
  - Port logic for random/timed encounters and ensure all state is server-authoritative.
  - Ensure all encounter triggers and timers are managed on the server, not the client.

### 3. Invite System (**Critical**)
- **Missing in new:** Only stubbed in `ManagerManager.emitInvite` and `EncounterManagerServer.handleAction` (action === 'invite'). No group state changes or notifications.
- **Exists in old:** Implemented in `EncounterManager.js` (`handleInvite`) and related UI flows.
- **Repair required:**
  - Port invite logic to server, including group state changes and notifications.
  - Ensure all invite actions are handled server-side and results are emitted to clients.

### 4. AI Combat Behavior (handleAIAction) (**Critical**)
- **Missing in new:** No server-side AI combat/turn logic (e.g., handleAIAction, standardAction, angryAction, lowHealthAction) in EncounterManagerServer. NPCs/entities do not act on their own.
- **Exists in old:** Fully implemented in old EncounterManager.js using aiBehavior from CharacterTypes.js.
- **Repair required:** Port AI turn logic (handleAIAction and all aiBehavior types) to the server. Ensure all enemy/NPC actions are server-driven and routed through MM.

---

(Trade system is expected to be unimplemented for now and is not flagged as critical.)

*End of current log. Continue adding findings as audit progresses.* 