# Multiplayer Feature Change Checklist

0. **Review the 'Absolutely Critical, Proven Rules for a Secure Migration' section in README.md and ai_instructions.md. These rules are mandatory for all multiplayer, event, and state logic changes.**

1. **Review the latest Q&A clarifications in `README.md` and `ai_instructions.md`. Never guess or assume; always ask for clarification and update this folder with new lessons.**

2. **Update `/StuffForAI` folder:**
   - Add or update event(s) in `events.md` and `events.js`.
   - Update `schema.md` if the database changes.
   - Add notes to `ai_instructions.md` if needed.
   - **Verify that every event, payload, and schema field in this folder matches the codebase after any change.**
   - **This folder is the single source of truth for all multiplayer logic, event names, and payloads. Update it first.**

3. **Update Supabase/Postgres schema:**
   - Add/alter columns as needed (e.g., inventory, mana, party_id).
   - Document changes in `schema.md`.

4. **Update server-side Socket.io logic:**
   - Add/modify event handlers for new/changed events.
   - Ensure all payloads match the spec in `events.md`.
   - Test server logic for new features.

5. **Update client-side logic (React/Phaser):**
   - Emit/listen for new/changed events.
   - Update UI and local state as needed.
   - Test client logic for new features.

6. **Test the full flow:**
   - Simulate all relevant client-server interactions.
   - Ensure data is consistent between client, server, and database.
   - Verify that the client never calculates, simulates, or guesses any gameplay state. All stat, encounter, and event logic must be server-authoritative.
   - Check that error handling and retry logic for missing server data matches the latest requirements (1 silent retry, then prompt, then disconnect after 2 more failures).

7. **Update documentation:**
   - Add notes to `

8. **Verify PvP, Party, and AI Group Logic:**
   - Ensure all PvP, party, and AI group flows, events, and payloads are fully documented in ai_instructions.md and events.md.
   - Confirm that all new or changed logic is reflected in the canonical user directives and event specs.
   - This is a required QA step before any code changes or migration.

9. **Verify Group Targeting and Evasion Mechanics:**
   - Ensure group targeting (target selection submenu for attacks/spells/steal) and evasion (SPD-based dodge, evasion prompt, and event payloads) are fully documented in ai_instructions.md and events.md.
   - Confirm that all relevant event payloads include targetId, evaded, and prompt fields as needed.
   - This is a required QA step before any code changes or migration.

10. **Verify Party/Group Leader-Only Encounter Triggers and Shared State:**
   - Only party/group leaders can trigger encounters (door click or dynamic/random); non-leaders never trigger or affect encounter chance.
   - All encounter, combat, and loot events are based on a single shared encounter state per room, and all participants receive the same updates.
   - Loot is always handled individually, even in parties or groups—never shared or split.
   - Navigation/encounter restrictions only apply to initiating actions, not to following or being included in group flows.
   - All new requirements and clarifications are reflected in ai_instructions.md and events.md before any code changes or migration.
   - This is a required QA step before any code changes or migration.