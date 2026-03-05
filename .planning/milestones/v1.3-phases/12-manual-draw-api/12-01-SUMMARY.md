---
phase: 12-manual-draw-api
plan: "01"
subsystem: backend/bracket-generation
tags: [bracket, draw-mode, manual-draw, start-gate, validation]
dependency_graph:
  requires:
    - "Phase 01.1 bracket persistence (bracketPersistenceService, bracketService)"
    - "Feature 010 seeding placement (generateSeededBracket)"
    - "Tournament lifecycle service (startTournament)"
  provides:
    - "Manual draw mode: POST /tournaments/:id/bracket with mode='manual'"
    - "Bracket integrity gate: PATCH /tournaments/:id/start validates all slots filled"
  affects:
    - "bracketPersistenceService.generateBracket - new mode parameter"
    - "tournamentLifecycleService.startTournament - new integrity checks"
    - "Bracket model - new drawMode field"
tech_stack:
  added: []
  patterns:
    - "mode branch in service: manual vs seeded"
    - "throwError helper for structured errors with .details"
    - "Bracket integrity check before SCHEDULED -> IN_PROGRESS transition"
key_files:
  created: []
  modified:
    - "backend/prisma/schema.prisma"
    - "backend/src/services/bracketPersistenceService.js"
    - "backend/src/api/validators/bracketPersistenceValidator.js"
    - "backend/src/api/bracketPersistenceController.js"
    - "backend/src/services/tournamentLifecycleService.js"
    - "backend/src/api/tournamentController.js"
    - "backend/__tests__/unit/bracketPersistenceService.test.js"
decisions:
  - "drawMode stored as String (not enum) in schema to avoid a migration for two values"
  - "Manual mode imports getBracketByPlayerCount from bracketService.js for BYE structure"
  - "Skip BYE Round 2 pre-population in manual mode — no players placed yet"
  - "Bracket integrity check catches both seeded and manual modes as a safety net"
  - "INCOMPLETE_BRACKET error details include unplacedPlayers, duplicatePlacements, emptySlotCount"
metrics:
  duration: "3m"
  completed_date: "2026-03-04"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 7
---

# Phase 12 Plan 01: Manual Draw Mode and Start-Gate Validation Summary

**One-liner:** Added `mode='manual'` parameter to bracket generation (creates empty slot structure) and bracket integrity check to tournament start (prevents starting with unplaced players/pairs).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add manual draw mode to bracket generation | 660cea2 | schema.prisma, bracketPersistenceService.js, bracketPersistenceValidator.js, bracketPersistenceController.js |
| 2 | Add start-gate bracket integrity validation | 3745fa5 | tournamentLifecycleService.js, tournamentController.js, bracketPersistenceService.test.js |

## What Was Built

### Task 1: Manual Draw Mode

**Schema change (`backend/prisma/schema.prisma`):**
- Added `drawMode String @default("SEEDED")` to Bracket model — stores `"SEEDED"` or `"MANUAL"`
- Applied via `npx prisma db push --accept-data-loss` (development workflow)

**Validator change (`bracketPersistenceValidator.js`):**
- Added `mode: Joi.string().valid('seeded', 'manual').optional().default('seeded')` to `generateBracketSchema`

**Controller change (`bracketPersistenceController.js`):**
- Extracts `mode` from `req.body` alongside existing `randomSeed` and `doublesMethod`
- Passes `mode` through to `generateBracket()` service
- Includes `drawMode: result.bracket.drawMode` in the 201 response data

**Service change (`bracketPersistenceService.js`):**
- Imports `getBracketByPlayerCount` from `./bracketService.js`
- Extracts `mode = 'seeded'` from options
- Manual mode branch (after player count guard):
  - Calls `getBracketByPlayerCount(playerCount)` to get `{ bracketSize, structure }`
  - Builds a positions array of `bracketSize` null slots (no players placed)
- Both modes share the Step 8 transaction, but:
  - Bracket create includes `drawMode: isManual ? 'MANUAL' : 'SEEDED'`
  - Manual mode: all player/pair fields in Round 1 matches are `null` (even BYE matches)
  - BYE matches still have `isBye: true`, `status: 'BYE'` in manual mode
  - BYE Round 2 pre-population (Step 8d) is skipped in manual mode
  - Consolation bracket generated in both modes when `matchGuarantee === 'MATCH_2'`

### Task 2: Start-Gate Bracket Integrity Validation

**Service change (`tournamentLifecycleService.js`):**
- Expanded initial `findUnique` to include `categoryId` and `category: { select: { type: true } }`
- Added validation block after status guard, before `prisma.tournament.update`:
  1. Load all registered entity IDs (players or pairs) with status `REGISTERED`
  2. Find MAIN bracket — throw `NO_BRACKET (400)` if missing
  3. Find Round 1 — throw `NO_BRACKET (400)` if missing
  4. Load all Round 1 matches
  5. Collect all placed entity IDs from both slots across all Round 1 matches
  6. Check: every non-BYE match has both slots filled (singles: player1Id + player2Id, doubles: pair1Id + pair2Id)
  7. Check: every registered entity appears in the bracket
  8. Check: no entity appears in multiple bracket positions (duplicate detection)
  9. If any check fails: throw error with `statusCode: 400`, `code: 'INCOMPLETE_BRACKET'`, `details: { unplacedPlayers, duplicatePlacements, emptySlotCount, placedCount, totalRequired }`

**Controller change (`tournamentController.js`):**
- `startTournament` catch block now spreads `err.details` into error response when present
- Pattern: `...(err.details && { details: err.details })`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test expectation for Bracket.create call shape**
- **Found during:** Task 2 test run
- **Issue:** Existing test `'creates exactly one Bracket record for the tournament'` asserted exact Prisma `bracket.create` call shape without `drawMode` field. After Task 1 added `drawMode: 'SEEDED'` to all Bracket creates, this test failed with "Expected vs Received" diff.
- **Fix:** Added `drawMode: 'SEEDED'` to the expected data object in the test
- **Files modified:** `backend/__tests__/unit/bracketPersistenceService.test.js`
- **Commit:** 3745fa5 (included in Task 2 commit)

## Verification

All 184 tests passing (18 test suites):
- `bracketPersistenceService.test.js`: 16/16 passing (including updated Bracket.create assertion)
- Full test suite: 184/184 passing with no regressions
- `npx prisma db push` succeeded — `drawMode` field added to Bracket table
- Both service modules verified to export their functions correctly via `node -e` checks

## Self-Check: PASSED

Files verified:
- backend/prisma/schema.prisma: contains `drawMode`
- backend/src/services/bracketPersistenceService.js: contains `mode.*manual` and `INCOMPLETE_BRACKET` pattern
- backend/src/api/validators/bracketPersistenceValidator.js: contains `mode.*manual.*seeded`
- backend/src/services/tournamentLifecycleService.js: contains `INCOMPLETE_BRACKET`
- Commits 660cea2 and 3745fa5 exist in git log
