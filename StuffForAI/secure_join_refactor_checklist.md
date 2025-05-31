# Secure Join Refactor Checklist

## Step-by-Step Implementation Plan

### Client-Side
1. Only send `playerId` and `user_id` on join.
2. Remove any code that sends or merges Supabase character data for gameplay.
3. Only use the minimal, derived info from the server for rendering (e.g., health, maxHealth, name, type, roomId).
4. Ensure UI elements (like health bar) are initialized only after receiving this minimal info.

### Server-Side
1. On join, verify JWT/session and match `user_id`.
2. Fetch the full Supabase row for the given `playerId` and `user_id`.
3. Coerce all int fields to numbers.
4. Derive all gameplay stats using `PlayerStatsServer` and `StatDefinitions`.
5. Build the authoritative character object (with derived stats and non-sensitive fields).
6. Assign or restore the correct `roomId` (spawn location) server-side.
7. Send only the minimal, safe, derived info to the client for rendering.
8. All gameplay logic, stat calculations, and state changes remain server-side.

### General
- Audit for any remaining use of raw Supabase data on the client.
- Test join, reconnect, and spawn logic for both new and returning players.
- Add debug logs to verify the correct data is sent at each step.

---

## Client-Side
- [ ] Only send `playerId` and `user_id` (from JWT/session) on join request
- [ ] Do **not** send or use any raw Supabase character data for gameplay
- [ ] Do **not** merge Supabase data with server data for gameplay
- [ ] Only use the server's derived character object for rendering/UI
- [ ] Remove any code that passes raw stats, inventory, or sensitive fields to the game logic

## Server-Side
- [ ] On join, verify JWT/session and match `user_id` to join request
- [ ] Fetch the full Supabase row for the given `playerId` and `user_id`
- [ ] Validate the Supabase row (all required fields, not deleted, etc.)
- [ ] Derive all stats and build the authoritative character object using PlayerStatsServer
- [ ] Assign or restore the correct `roomId` (spawn location) server-side
- [ ] Never trust or use client-provided roomId or stats
- [ ] Send only the minimal, safe, derived character object to the client (for rendering/UI)
- [ ] All gameplay logic, stat calculations, and state changes remain server-side

## General
- [ ] Audit for any remaining use of raw Supabase data on the client
- [ ] Ensure all managers and scenes use only server-authoritative data
- [ ] Test join, reconnect, and spawn logic for both new and returning players

---
*Remove this doc after refactor is complete.* 