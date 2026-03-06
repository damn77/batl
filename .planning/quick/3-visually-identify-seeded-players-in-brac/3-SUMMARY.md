---
phase: quick-3
plan: 01
subsystem: bracket-view
tags: [seeding, knockout-bracket, match-persistence, frontend-display]
dependency_graph:
  requires: [010-seeding-placement, 011-knockout-bracket-view]
  provides: [seed-badge-display]
  affects: [BracketMatch, bracketPersistenceService, tournamentLifecycleService, matchResultService, consolationEligibilityService]
tech_stack:
  added: []
  patterns: [snapshot-at-draw-time, seed-carry-forward, cascade-clear-with-seed]
key_files:
  created:
    - backend/prisma/migrations/20260306000000_add_match_seed_fields/migration.sql
  modified:
    - backend/prisma/schema.prisma
    - backend/src/services/bracketPersistenceService.js
    - backend/src/services/tournamentLifecycleService.js
    - backend/src/services/matchResultService.js
    - backend/src/services/consolationEligibilityService.js
    - frontend/src/components/BracketMatch.jsx
decisions:
  - "Seed stored as snapshot on Match record (not a live ranking lookup) — once stored at draw time, rank changes do not affect displayed seeds"
  - "Manual draw brackets have null seeds throughout — no seed badges shown"
  - "advanceBracketSlot copies winner seed alongside winnerId to next-round match"
  - "cascadeClearMainBracket and cascadeClearWinnerFromNextRounds also null out the seed field when clearing a player slot on winner change"
  - "Consolation bracket calls to advanceBracketSlot pass objects without seed fields — undefined ?? null = null, so consolation gets no seeds (correct)"
  - "db push used for dev database (no _prisma_migrations table) — migration SQL file created manually for tracking"
metrics:
  duration: "~10m"
  completed: "2026-03-06"
  tasks_completed: 2
  files_modified: 6
  files_created: 1
---

# Quick Task 3: Visually Identify Seeded Players in Bracket — Summary

**One-liner:** Seed numbers stored as `[N]` snapshot fields on Match records and displayed as badges in the bracket view across all rounds via carry-forward on advancement.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add seed fields to Match model and populate during bracket creation | 82ee2af | schema.prisma, migration.sql, bracketPersistenceService.js |
| 2 | Carry seed through match advancement and update frontend display | ded6412 | tournamentLifecycleService.js, matchResultService.js, consolationEligibilityService.js, BracketMatch.jsx |

## What Was Built

### Database Schema (Task 1)
Added four optional `Int?` fields to the `Match` model in `schema.prisma`:
- `player1Seed` — seed number for singles slot 1 (null = unseeded or manual draw)
- `player2Seed` — seed number for singles slot 2
- `pair1Seed` — seed number for doubles pair in slot 1
- `pair2Seed` — seed number for doubles pair in slot 2

Applied via `prisma db push` (dev database uses db push, not migrate). Migration SQL file created at `backend/prisma/migrations/20260306000000_add_match_seed_fields/migration.sql` for tracking.

### Bracket Creation (Task 1)
`bracketPersistenceService.js — generateBracket()`:
- Round 1 SINGLES matchData: `player1Seed: isManual ? null : (pos1?.seed || null)`, `player2Seed` similarly
- Round 1 DOUBLES matchData: `pair1Seed: isManual ? null : (pos1?.seed || null)`, `pair2Seed` similarly
- BYE byeInfo collection: now stores `seed: pos1?.seed || null`
- Round 2 BYE pre-population: carries seed alongside player/pair ID

### Seed Carry-Forward (Task 2)
`tournamentLifecycleService.js — advanceBracketSlot()`:
- Reads `winnerSeed = winnerIsPlayer1 ? updatedMatch.player1Seed : updatedMatch.player2Seed`
- Reads `winnerPairSeed` for doubles
- Writes seed to the next-round match slot alongside the player/pair ID

`matchResultService.js — submitResult()`:
- Added `player1Seed, player2Seed, pair1Seed, pair2Seed: true` to the `select` on the match update so `advanceBracketSlot` receives those fields

### Cascade Clear on Winner Change (Task 2)
`consolationEligibilityService.js`:
- `cascadeClearMainBracket`: now clears `player1Seed`/`pair1Seed` (or slot 2) alongside the ID when erasing a player from a downstream match
- `cascadeClearWinnerFromNextRounds`: same treatment for consolation cascade

### Frontend Display (Task 2)
`BracketMatch.jsx`:
- Top player seed badge now reads from match-level fields: `isBye` case uses the first non-null of `match.player1Seed / match.player2Seed / match.pair1Seed / match.pair2Seed`; normal case uses `isDoubles ? match.pair1Seed : match.player1Seed`
- Bottom player seed badge: `isDoubles ? match.pair2Seed : match.player2Seed`
- PropTypes updated: removed `seed` from player1/player2 shape; added `player1Seed`, `player2Seed`, `pair1Seed`, `pair2Seed` directly on match shape

## Verification Checklist

- [x] 229 backend Jest tests pass (npm test in backend/)
- [x] Schema applied to dev database successfully (prisma db push)
- [x] Prisma client regenerated with new fields
- [x] Manual draw brackets: all seed fields null → no badges shown
- [x] Seeded brackets: Round 1 matches have seed values from positions array
- [x] BYE pre-population to Round 2 carries seed
- [x] advanceBracketSlot copies winner seed to next round
- [x] Winner change (cascade clear): seed cleared alongside ID

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical fields] matchResultService select did not include seed fields**
- **Found during:** Task 2, implementing `advanceBracketSlot` seed carry-forward
- **Issue:** The `match.update` select in `submitResult()` didn't include `player1Seed/player2Seed/pair1Seed/pair2Seed`, so `updatedMatch` passed to `advanceBracketSlot` would have `undefined` for all seed fields
- **Fix:** Added all four seed fields to the select in `matchResultService.js`
- **Files modified:** `backend/src/services/matchResultService.js`
- **Commit:** ded6412

**2. [Rule 1 - Bug] Cascade clear functions did not clear seed on winner change**
- **Found during:** Task 2, reviewing the plan's instruction to check cascade clear path
- **Issue:** `cascadeClearMainBracket` and `cascadeClearWinnerFromNextRounds` cleared `player1Id`/`pair1Id` etc. when removing a player from a downstream match on winner change, but did not clear the corresponding seed field — stale seed would remain
- **Fix:** Extended `slotClearData` to also set the seed field to null in both functions
- **Files modified:** `backend/src/services/consolationEligibilityService.js`
- **Commit:** ded6412

**3. [Rule 3 - Blocking] Database drift prevented prisma migrate dev**
- **Found during:** Task 1, attempting to run migration
- **Issue:** Dev database was set up via `prisma db push` (no `_prisma_migrations` table), causing `migrate dev` to fail with drift detection
- **Fix:** Used `prisma db push` to apply schema change, created migration SQL file manually for version tracking
- **Commit:** 82ee2af

## Self-Check: PASSED

Files exist:
- `backend/prisma/migrations/20260306000000_add_match_seed_fields/migration.sql` - FOUND
- `backend/prisma/schema.prisma` (contains player1Seed) - FOUND
- `backend/src/services/bracketPersistenceService.js` - FOUND
- `backend/src/services/tournamentLifecycleService.js` - FOUND
- `frontend/src/components/BracketMatch.jsx` - FOUND

Commits exist:
- 82ee2af - FOUND
- ded6412 - FOUND
