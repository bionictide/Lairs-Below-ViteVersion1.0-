# Multiplayer Feature Change Checklist

1. **Update `/StuffForAI` folder:**
   - Add or update event(s) in `events.md` and `events.js`.
   - Update `schema.md` if the database changes.
   - Add notes to `ai_instructions.md` if needed.

2. **Update Supabase/Postgres schema:**
   - Add/alter columns as needed (e.g., inventory, mana, party_id).
   - Document changes in `schema.md`.

3. **Update server-side Socket.io logic:**
   - Add/modify event handlers for new/changed events.
   - Ensure all payloads match the spec in `events.md`.
   - Test server logic for new features.

4. **Update client-side logic (React/Phaser):**
   - Emit/listen for new/changed events.
   - Update UI and local state as needed.
   - Test client logic for new features.

5. **Test the full flow:**
   - Simulate all relevant client-server interactions.
   - Ensure data is consistent between client, server, and database.

6. **Update documentation:**
   - Add notes to `README.md` and/or `CHANGELOG.md`.
   - Ensure `/StuffForAI` is current before finishing.

---

**Always keep this folder up to date!** 