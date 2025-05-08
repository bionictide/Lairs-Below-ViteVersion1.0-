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
  - Debug commands are being moved server-side. Access will require a password prompt (triggered by CTRL+D), with the password stored and validated server-side only. The debug menu will be styled and expanded, accessible only after server validation.

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

- **General Rule:**
  - Never guess or assume anything about the code, game, or plans. If unsure, always ask the user for clarification. Update this folder with any new lessons or clarifications immediately.

If you are a new AI or developer, this section—along with the rest of this folder—should bring you fully up to speed with the current state and goals of the project.

---

**Keep this folder up to date!**

- Dungeon generation and all related logic (loot, puzzles, encounters, etc.) are being refactored to use a deterministic, seedable RNG and shared module (`src/shared/DungeonCore.js`, `src/shared/RNG.js`).
- This ensures identical output on both client and server, and all randomization is now cross-platform and testable.
- **All multiplayer events, payloads, and schema fields in this folder are now fully mapped to the codebase as of the latest audit.**
- **If you find any event, payload, or schema field in the codebase that is not documented here, update this folder immediately.** 