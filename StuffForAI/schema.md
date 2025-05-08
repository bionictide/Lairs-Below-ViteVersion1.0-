# Supabase/Postgres Schema

> **As of the latest audit, this schema is fully mapped to the codebase. If you add or change any schema field in the codebase, you MUST update this file immediately. This file is the single source of truth for persistent data structure.**

## Table: characters

| Column      | Type    | Description                                 |
|------------|---------|---------------------------------------------|
| id         | uuid    | Primary key                                 |
| user_id    | uuid    | Foreign key to users                        |
| name       | text    | Character name                              |
| type       | text    | Character class/type (e.g., dwarf, elvaan)  |
| level      | int     | Character level                             |
| vit        | int     | Vitality stat                               |
| str        | int     | Strength stat                               |
| int        | int     | Intelligence stat                           |
| dex        | int     | Dexterity stat                              |
| mnd        | int     | Mind stat                                   |
| spd        | int     | Speed stat                                  |
| inventory  | jsonb   | Array of item objects (see below)           |
| created_at | timestamptz | Creation timestamp                       |

### Inventory JSONB Example
```json
[
  { "itemKey": "sword1", "quantity": 1 },
  { "itemKey": "Potion1(red)", "quantity": 3 }
]
```

---

## Notes for Future Fields
- `mana` (int): For spellcasting resource
- `party_id` (uuid): For party/group membership
- `experience` (int): For leveling up
- `stat_points` (int): For stat allocation
- `win_count` (int): For tracking win conditions

---

**Update this file whenever you change the schema!**
**As of the latest audit, this schema is fully mapped to the codebase.** 