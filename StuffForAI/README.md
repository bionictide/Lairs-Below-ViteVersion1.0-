# StuffForAI

> **IMPORTANT:**
> Always update this folder FIRST when making any changes to multiplayer, events, or database logic. This is essential for AI and future development. Forgetting to update this folder can cause bugs, lost context, and broken features. If you have memory or cognitive issues, make it a habit to update this folder before anything else!

This folder contains all documentation, event specifications, schema definitions, and workflow checklists needed for AI assistants and developers to safely and consistently update multiplayer, event, and database logic in this project.

## How to Use

- **ALWAYS update this folder first** when adding or changing any multiplayer event, payload, or database schema. (Set a reminder or checklist if you have memory/cognitive issues!)
- **AI and developers should read all files in this folder** before making changes to the codebase.
- **Paste relevant files from this folder** into new AI conversations to provide instant context.

## Contents
- `events.md` — Human-readable event and payload specification
- `events.js` — Machine-readable event names/types
- `schema.md` — Supabase/Postgres schema and notes
- `workflow.md` — Checklist for adding features or making changes
- `ai_instructions.md` — Custom rules and reminders for AI

---

**Keep this folder up to date!**

- Dungeon generation and all related logic (loot, puzzles, encounters, etc.) are being refactored to use a deterministic, seedable RNG and shared module (`src/shared/DungeonCore.js`, `src/shared/RNG.js`).
- This ensures identical output on both client and server, and all randomization is now cross-platform and testable. 