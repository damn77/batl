---
phase: 09-real-player-and-league-data
plan: "01"
subsystem: database
tags: [prisma, postgres, seed, players, doubles-pairs, category-registration]

# Dependency graph
requires: []
provides:
  - 34 real BATL league players (18 male, 16 female) in database
  - 18 mixed doubles pairs in Mixed Doubles Open category with seedingScore 0
  - 34 real players registered in Mixed Doubles Open category
  - 2 real user accounts: erich@batl (ADMIN), rene@batl (ORGANIZER) linked to profiles
  - Single ProSet location (all tournaments reference it)
  - Separated data file at backend/prisma/data/players.js
affects:
  - 10-seeding-placement (uses seeding data)
  - seed-knockout-test.js (depends on seed data)
  - any script querying locations or real player profiles

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Seed data extracted to separate ES module data file (backend/prisma/data/players.js)
    - email@domain as lookup key for player profile map during seed execution
    - findFirst-guard pattern for DoublesPair idempotency (no upsert for pairs)
    - Sequential fake phone numbers (+421900000001 incrementing) for real players without phones

key-files:
  created:
    - backend/prisma/data/players.js
  modified:
    - backend/prisma/seed.js

key-decisions:
  - "Player data extracted to backend/prisma/data/players.js as separate ES module — keeps seeding logic and data cleanly separated"
  - "Email collision resolution: first unique name gets plain email (vlado@batl), duplicates get last-initial suffix (vlado.f@batl, vlado.k@batl)"
  - "Mixed doubles pairs created with seedingScore: 0 — no tournaments played yet, rankings start at zero"
  - "findFirst-guard pattern used for DoublesPair creation since Prisma lacks upsert for composite unique key with nullable deletedAt"
  - "ProSet location replaces all 4 generic locations; old locations deleted by clubName before ProSet is created"
  - "Generic test data retained alongside real data for continued test coverage of existing features"

patterns-established:
  - "Pattern 1: Separate data files — real player/pair data lives in backend/prisma/data/*.js, imported by seed.js"
  - "Pattern 2: Email map — profilesByEmail and usersByEmail maps built during seed loop to support cross-reference (e.g., pair creation)"
  - "Pattern 3: Real + generic coexistence — generic players retained for test coverage, real players added alongside them"

requirements-completed:
  - PLAY-01
  - PLAY-02
  - PLAY-03
  - ACCT-01
  - ACCT-02
  - ACCT-03
  - PAIR-01
  - PAIR-02
  - LOC-01
  - LOC-02
  - TOURN-01

# Metrics
duration: 7min
completed: 2026-03-03
---

# Phase 9 Plan 01: Real Player and League Data Summary

**34 real BATL league players seeded with 18 mixed doubles pairs, ProSet-only location, and linked accounts for Erich (ADMIN) and Rene (ORGANIZER)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-03T22:05:22Z
- **Completed:** 2026-03-03T22:12:24Z
- **Tasks:** 2
- **Files modified:** 2 (+ 1 created)

## Accomplishments

- Created `backend/prisma/data/players.js` exporting 18 male players, 16 female players, 18 mixed doubles pair definitions, and 2 account users as named ES module arrays
- Rewrote `backend/prisma/seed.js` to import real player data, creating 47 total player profiles (13 generic + 34 real), 7 user accounts (5 generic + 2 real), 18 mixed doubles pairs with seedingScore 0, 34 category registrations in Mixed Doubles Open, and a single ProSet location
- All 5 verification checks passed: 47 profiles, erich@batl ADMIN + rene@batl ORGANIZER, ProSet-only location, 18 mixed pairs, 34 category registrations

## Task Commits

1. **Task 1: Create real player data file** - `350ff40` (feat)
2. **Task 2: Rewrite seed.js with real player data** - `e12796c` (feat)

**Plan metadata:** _(docs commit — recorded after SUMMARY creation)_

## Files Created/Modified

- `backend/prisma/data/players.js` — Created: ES module exporting malePlayers (18), femalePlayers (16), mixedPairs (18), accountUsers (2). Source of truth for all real league player data.
- `backend/prisma/seed.js` — Modified: imports data file, adds real user accounts and player profiles, replaces 4 generic locations with single ProSet, creates 18 mixed doubles pairs and 34 category registrations. All generic test data retained.

## Decisions Made

- **Data file separation:** `backend/prisma/data/players.js` keeps player data out of seed logic. Future plans can import it directly (e.g., for test seeds referencing real player emails).
- **Email collision rules applied:** vlado@batl / vlado.f@batl / vlado.k@batl, roman@batl / roman.s@batl, marcel@batl / marcel.p@batl, miro@batl / miro.p@batl, danka@batl / danka.p@batl.
- **Pair idempotency via findFirst guard:** DoublesPair has no single-field unique key for upsert; used `findFirst` check before `create` to avoid duplicate constraint errors on re-run.
- **seedingScore: 0 for all mixed pairs:** No tournaments have been played in Mixed Doubles Open — ranking starts fresh per TOURN-02 requirement.
- **Old locations deleted by name:** `prisma.location.deleteMany({ where: { clubName: { in: [...] } } })` removes the 4 generic locations before ProSet is created, ensuring only one location exists post-seed.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `npx prisma db push --force-reset` requires explicit user consent (Prisma safety gate). Documented as authentication gate; user approved and execution continued.
- Windows file lock warning during Prisma client regeneration after `db push` (`EPERM: operation not permitted, rename ...tmp -> .dll.node`). This is a known harmless Windows-specific Prisma issue — the client was already loaded in memory and the seed ran successfully.
- `npx prisma db execute --stdin` returned no output rows with Prisma 6.18 (undocumented behavior). Switched to verification via Prisma Client node script, which confirmed all counts correctly.

## User Setup Required

None — no external service configuration required beyond the already-configured PostgreSQL DATABASE_URL.

**Note for user:** The database reset (`prisma db push --force-reset`) should eventually be wired into the DEV deployment pipeline so that new environments auto-seed from scratch. This is a separate task tracked outside this plan.

## Next Phase Readiness

- All 34 real players and 18 mixed pairs are in the database
- Plan 02 (Phase 9) can now add age-specific tournament data using real players and ProSet location
- `backend/prisma/data/players.js` is available for import in `seed-knockout-test.js` and any future test seeds that need real player data
- No blockers

---
*Phase: 09-real-player-and-league-data*
*Completed: 2026-03-03*
