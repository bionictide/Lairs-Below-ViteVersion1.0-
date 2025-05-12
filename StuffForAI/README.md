# StuffForAI

> **IMPORTANT:**
> Always update this folder FIRST when making any changes to multiplayer, events, or database logic. This is essential for AI and future development. Forgetting to update this folder can cause bugs, lost context, and broken features. If you have memory or cognitive issues, make it a habit to update this folder before anything else!

This folder contains all documentation, event specifications, schema definitions, and workflow checklists needed for AI assistants and developers to safely and consistently update multiplayer, event, and database logic in this project.

## How to Use

- **ALWAYS update this folder first** when adding or changing any multiplayer event, payload, or database schema. (Set a reminder or checklist if you have memory/cognitive issues!)
- **AI and developers should read all files in this folder** before making changes to the codebase.
- **Paste relevant files from this folder** into new AI conversations to provide instant context.
- **Every event, payload, and schema field in this folder is now mapped to the actual codebase as of the latest audit.**
- **If you add or change any event, payload, or schema field in the codebase, you MUST update this folder immediately.**
- **This folder is the single source of truth for all multiplayer logic, event names, and payloads.**

## Contents
- `events.md` — Human-readable event and payload specification (fully mapped to codebase)
- `events.js` — Machine-readable event names/types (fully mapped to codebase)
- `schema.md` — Supabase/Postgres schema and notes
- `workflow.md` — Checklist for adding features or making changes
- `ai_instructions.md` — Custom rules and reminders for AI

## 2024-06 Q&A Clarifications and Lessons Learned

This section summarizes key clarifications and lessons from the latest Q&A session. If you are a new AI or developer, read this to understand the current architecture, goals, and future plans:

- **Debug Menu:**
  - Debug commands are being moved server-side. Access will require a password prompt (triggered by CTRL+D), with the password stored and validated server-side only. The debug menu will be styled and expanded, accessible only after server validation. All debug actions affecting game state are processed server-side. The debug menu is GUI-based and only available after server validation.

- **Inventory/Items:**
  - Inventory is currently a simple array of `{ itemKey, quantity }`. Future plans may include item metadata or instance data (e.g., durability, enchantments), but this is not part of the current refactor.

- **Player State & Persistence:**
  - Experience, level, and stat points will be added after the refactor. Win/Lose screens and stat application are also post-refactor tasks. Persistent player data is managed via Supabase and updated at key points.

- **Dungeon/World Persistence:**
  - The dungeon resets only when player count transitions to zero. Procedural generation and world transformation logic are server-side. Win condition: Portal opens, world locks to new joiners, then collapses after a timer. No persistent world, but a persistent lobby may be added in the future.

- **PvP and Cheating:**
  - Server authority and validation are the focus for now. Advanced anti-cheat is a future plan.

- **Client-Server Data Exposure:**
  - Only send the client what is visible to the player. No full data drops; server retains all authority. Minimap and room discovery are future features.

- **Future Features:**
  - Focus is on core multiplayer, trading, and party features after stable refactor. Other features (guilds, cosmetics, etc.) are out of scope for this refactor.

- **Testing & Migration:**
  - Manual QA is used for now. No parallel migration; full switch to server authority. Follow existing working code and logic patterns.
  - Error handling: If the server fails to send required data, the client retries once silently. If that fails, the client shows a retry/disconnect pop-up. After two more failed retries, the client disconnects and returns to the lobby.

- **General Rule:**
  - Never guess or assume anything about the code, game, or plans. If unsure, always ask the user for clarification. Update this folder with any new lessons or clarifications immediately.

If you are a new AI or developer, this section—along with the rest of this folder—should bring you fully up to speed with the current state and goals of the project.

## Absolutely Critical, Proven Rules for a Secure Migration (2024-06)

- **All Game Logic and State Must Be Server-Authoritative**
  - The client must never calculate, guess, or create any gameplay state (stats, encounters, inventory, etc.).
  - The server must send all necessary data for gameplay.

- **No Client-Side Fallbacks or Guessing**
  - If the server does not provide a value, the client must not "fill in the blanks."
  - Missing data = error or "waiting for server," never a guess or default.

- **All Encounters and Entities Are Created by the Server**
  - The client only requests actions (e.g., "start encounter").
  - The server responds with a complete, authoritative payload.
  - The client only renders what the server sends.

- **Stat Calculation for Gameplay Is Server-Only**
  - Any stat values used in gameplay (health, attack, defense, etc.) must come from the server.
  - The client may hard-code values for character creation/preview only, never for gameplay.

- **Event Flow Is Always Request/Response**
  - The client emits a request (e.g., "move," "attack," "start encounter").
  - The server responds with the result and all data needed to render the new state.
  - The client never assumes the result.

- **No Per-Frame or Excessive Debug Logging**
  - Only log errors and critical warnings.
  - Remove or comment out all per-frame or spammy debug logs.

## Process & Quality Assurance

- When a bug or problem is discovered after an edit, always review the *entire scope* of the previous changes—not just the direct lines or files involved in the bug.
- Re-examine every file and section touched during the problematic update.
- Look for any accidental changes, deletions, or logic errors introduced at the same time, not just the same type of error.
- Document both the root cause and any collateral findings.
- Never patch only the symptom. Always check for and address any collateral or hidden issues caused by the same edit.

---

**Keep this folder up to date!**

- Dungeon generation and all related logic (loot, puzzles, encounters, etc.) are being refactored to use a deterministic, seedable RNG and shared module (`src/shared/DungeonCore.js`, `src/shared/RNG.js`).
- This ensures identical output on both client and server, and all randomization is now cross-platform and testable.
- **All multiplayer events, payloads, and schema fields in this folder are now fully mapped to the codebase as of the latest audit.**
- **If you find any event, payload, or schema field in the codebase that is not documented here, update this folder immediately.** 