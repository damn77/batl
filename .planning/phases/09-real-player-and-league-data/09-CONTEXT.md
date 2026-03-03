# Phase 9: Real Player and League Data - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Update the seed database to reflect actual league membership: 34 real named players (18 male, 16 female) with player profiles, 2 linked user accounts (Erich as ADMIN, Rene as ORGANIZER), 18 mixed doubles pairs in Mixed Doubles Open category, all players registered in that category, all tournaments at "ProSet" location, and age-specific tournaments with varied statuses. Existing generic test users and players are retained alongside real data.

</domain>

<decisions>
## Implementation Decisions

### Player Email Convention
- Pattern: `firstname@batl` for all real players (e.g., `erich@batl`, `rene@batl`, `tomas@batl`)
- Name collisions: first unique name gets plain email, duplicates get last initial suffix (e.g., `vlado@batl`, `vlado.f@batl`, `vlado.k@batl`)
- Known collisions: Vlado (Zvonar, Fatura, Koco), Roman (Rummel, Smahovsky), Marcel (Sramko, Pesko), Miro (Uhliar, Petrech), Danka (Kleinova, Peskova)

### Player Dates of Birth
- Approximate DOBs in 30-60 year range, clustered realistically to serve age-specific categories
- Distribute so that enough players qualify for 35+, 40+, and 50+ categories
- Not evenly spread — cluster around ages that make category tournaments viable

### Account & Role Mapping
- Only 2 user accounts for real players: Erich Siebenstich ml. (ADMIN) and Rene Parak (ORGANIZER)
- These are additional accounts — existing generic users (admin@batl.example.com, organizer@batl.example.com, player@batl.example.com, etc.) remain unchanged
- Both Erich and Rene have their player profiles linked to their user accounts (userId set)
- Remaining 32 real players are unlinked player profiles only (no login capability)

### Tournament Setup
- Replace all existing generic tournaments with new realistic ones at ProSet
- Remove "Spring Singles Championship", "Women's Summer League", "City Championship", etc.
- Create tournaments across age-specific categories (35+, 40+, 50+) with mixed statuses (SCHEDULED, IN_PROGRESS, COMPLETED)
- No tournament in Mixed Doubles Open category — rankings start at zero (TOURN-02)

### Location Setup
- Remove all 4 generic locations (Central Tennis Club, Riverside, Northside, Westside)
- Create single "ProSet" location — all tournaments reference this one location
- Every tournament in the app shows "ProSet" as location

### Seed Script Structure
- Real player data (34 players, 18 pairs) extracted to a separate data file (e.g., `backend/prisma/data/players.js`)
- seed.js imports the data file and iterates over it
- Keeps data vs. seeding logic cleanly separated

### Claude's Discretion
- Default passwords for Erich and Rene accounts
- Organizer profile creation for Erich and/or Rene
- Mixed Doubles ranking approach (empty ranking entries vs. no ranking records)
- Tournament count, names, and format distribution across categories
- ProSet location address
- Pair referencing strategy in the data file (by name, key, or index)

</decisions>

<specifics>
## Specific Ideas

- Data source is `notes/mix-doubles-data-2026.md` — 18 male players, 16 female players, 18 mixed pairs
- Some players appear in multiple pairs: Kleinova D. (with Zvonar V. and Parak R.), Sojkova D. (with Smahovsky R. and Petrech M.)
- Success criteria explicitly tests: `erich@batl` (ADMIN login) and `rene@batl` (ORGANIZER login)
- Success criteria explicitly tests: existing `admin@batl`, `organizer@batl`, `player@batl` credentials unchanged
- Mixed Doubles Open must show all 18 pairs in pairs list with 0 tournament points

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/prisma/seed.js`: Monolithic 913-line seed script with upsert patterns for all entities
- `seedRanking()` helper function: Creates ranking + entries in one call — reusable for new categories
- `bcrypt` hashing already configured with SALT_ROUNDS = 12

### Established Patterns
- Player profiles created with `prisma.playerProfile.upsert()` using email as unique key
- Users created with `prisma.user.upsert()` using email as unique key
- Doubles pairs created with `prisma.doublesPair.create()` referencing player1Id/player2Id and categoryId
- Categories use composite unique key: `type_ageGroup_gender`
- Tournaments reference locationId, organizerId, categoryId

### Integration Points
- `seed-knockout-test.js` depends on main seed data (finds organizer, category, location, players by query)
- Seed script is invoked via `prisma db seed` in package.json
- Point tables are seeded with `deleteMany()` + `create()` pattern (not upsert)
- Category registrations use `prisma.categoryRegistration` model

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-real-player-and-league-data*
*Context gathered: 2026-03-03*
