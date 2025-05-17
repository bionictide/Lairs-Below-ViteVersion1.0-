# Lairs Below: Server-Authoritative Migration Handoff

## 1. Project State
- Migration to server-authoritative architecture is complete.
- Client: Only renders UI, emits player intent, and listens for server events.
- Server: Handles all gameplay logic, state, and sensitive data (stats, loot, AI, encounters, etc.).

## 2. Key Architectural Principles
- No sensitive data or logic on the client.
  - All stat formulas, loot tables, AI behavior, and encounter logic are on the server.
  - The client only has safe, hardcoded, or display-only data for UI.
- Client = "Dumb Renderer"
  - Emits intent (e.g., move, attack, cast spell, steal, etc.) to the server.
  - Renders state and UI based on server events and payloads.
- Server = Single Source of Truth
  - All state changes, combat, loot, and progression are validated and executed server-side.
  - Only the server can update stats, inventory, health, encounters, etc.

## 3. File/Module Structure
- Client (`src/`):
  - `CharacterTypes.js`: Only safe display data (names, images, base stats for UI).
  - `StatDefinitions.js`, `NPCLootManager.js`: Stubs for UI only, no logic.
  - `App.jsx`: Handles login, character creation (display only), and emits intent to server.
  - `socket.js`: Handles all multiplayer socket flows, connects to server with JWT.
  - All managers (BagManager, EncounterManager, etc.): Only handle UI state, never game logic.
- Server (`server/`):
  - `CharacterTypes.js`: Full sensitive character definitions, stats, AI, loot, etc.
  - `NPCLootManager.js`, `StatDefinitions.js`: All sensitive logic and data.
  - `server.js`: Main server logic, all gameplay flows, event handling, and state management.

## 4. Data & Event Flow
- Character Creation:
  - Client displays hardcoded base stats for each type.
  - On creation, client inserts new character into Supabase (stats are assigned by Supabase defaults).
  - All real stats for gameplay are loaded from Supabase and sent to the server.
- Gameplay:
  - Client emits intent (e.g., attack, spell, move) via socket events.
  - Server processes all logic, updates state, and emits authoritative events back to the client.
  - Client updates UI based on server events only.
- Encounters, Loot, AI:
  - All encounter logic, turn order, AI actions, loot drops, and stat calculations are server-side.
  - Client never calculates or predicts outcomes.

## 5. Security
- No sensitive data or logic is exposed to the client.
- All client input is validated on the server.
- Supabase RLS (Row Level Security) is enabled for character data.

## 6. Outstanding Issues / Next Steps
- Linter error about `Socket.js` is a case-sensitivity/caching issue, not a code bug.
  - Only one `socket.js` file exists; all imports are correct.
  - If error persists, clear build/IDE cache and restart.
- Any remaining issues are pure bug fixes or polish:
  - UI/UX bugs
  - Event flow mismatches
  - Minor client/server sync issues
  - Linter/build errors

## 7. How to Debug/Fix from Here
- If a bug is found:
  - Check if the issue is in the client (UI, event emission, rendering) or server (logic, state, event emission).
  - All gameplay logic should be debugged/fixed on the server.
  - All UI/UX issues should be debugged/fixed on the client.
- If a new feature is needed:
  - Add logic to the server, emit new events, and update the client to render new state or handle new events.

## 8. Key Contacts / Docs
- Design "bible" and requirements:
  - See `StuffForAI/ai_instructions.md`, `events.md`, `workflow.md` for all requirements and event payloads.
- Supabase:
  - Used for persistent character/account data only (not real-time gameplay).

## 9. Summary Table

| Area                | Client (src/)         | Server (server/)         |
|---------------------|----------------------|-------------------------|
| Stat/AI/Loot Logic  | ❌ (stub/display only) | ✅ (full logic/data)     |
| Encounter Logic     | ❌ (UI only)           | ✅ (all logic/state)     |
| Inventory/Bag Logic | ❌ (UI only)           | ✅ (all logic/state)     |
| Character Creation  | UI + intent           | Supabase + server assigns|
| Socket Events       | Emits/receives        | Handles all logic/events |
| Sensitive Data      | ❌                    | ✅                      |

---

If you need to bug fix or extend, start by checking the server for all logic, and the client for all UI.  
No more migration is needed—just bug fixing and polish. 