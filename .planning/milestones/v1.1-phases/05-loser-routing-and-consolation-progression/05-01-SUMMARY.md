---
phase: "05-loser-routing-and-consolation-progression"
plan: "01"
subsystem: "database-schema"
tags: [schema, prisma, migration, match-outcomes, consolation]
dependency_graph:
  requires: []
  provides: [RETIRED-match-status, ConsolationOptOut-model]
  affects: [bracketPersistenceService, matchController, tournamentLifecycleService]
tech_stack:
  added: []
  patterns: [prisma-enum-extension, joi-schema-extension]
key_files:
  created:
    - backend/prisma/migrations/20260301115004_add_retired_status_and_consolation_opt_out/migration.sql
  modified:
    - backend/prisma/schema.prisma
    - backend/src/api/validators/matchValidator.js
    - backend/__tests__/unit/bracketPersistenceService.test.js
decisions:
  - "RETIRED match status added to MatchStatus enum; counts as 1 real match played for both players"
  - "ConsolationOptOut uses two separate @@unique constraints (tournamentId+playerId and tournamentId+pairId) rather than a single composite — supports both singles and doubles opt-out cleanly"
  - "recordedBy field is a String enum ('SELF'|'ORGANIZER'|'AUTO') rather than a DB enum — keeps schema simple, validation enforced at service layer"
  - "partialScore is optional in submitSpecialOutcomeSchema — retiring player may have partial game scores recorded"
metrics:
  duration: "2 min"
  completed_date: "2026-03-01"
  tasks_completed: 2
  files_changed: 4
---

# Phase 05 Plan 01: Schema Foundations for RETIRED and Consolation Opt-Out Summary

Extended the database schema and API validator to support RETIRED match outcomes and consolation opt-out tracking, providing the foundation for all Phase 5 loser routing and consolation progression features.

## What Was Built

**Task 1: Schema changes (6a2d5d0)**

Added `RETIRED` to the `MatchStatus` enum — the sixth match status alongside SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, and BYE. RETIRED represents a match that started but where one player retired mid-match, distinct from WALKOVER (never started).

Created the `ConsolationOptOut` model:
- Tracks that a player or pair has opted out of the consolation bracket for a specific tournament
- Supports both singles (`playerId`) and doubles (`pairId`) via nullable FK fields
- `recordedBy` field captures the opt-out trigger: 'SELF' (player chose), 'ORGANIZER' (organizer recorded), 'AUTO' (system-triggered by RETIRED outcome)
- Unique constraints: one opt-out per player per tournament, one opt-out per pair per tournament
- Cascade delete from Tournament, PlayerProfile, and DoublesPair

Added `consolationOptOuts ConsolationOptOut[]` relation to Tournament, PlayerProfile, and DoublesPair models.

Migration applied cleanly: `20260301115004_add_retired_status_and_consolation_opt_out`

**Task 2: Validator changes (f98da61)**

Updated `submitSpecialOutcomeSchema` in `matchValidator.js`:
- Added `'RETIRED'` as a valid outcome alongside WALKOVER, FORFEIT, NO_SHOW
- Added optional `partialScore` object (`player1Games`, `player2Games`) for recording games played before retirement

## Verification

- `npx prisma validate` passes cleanly
- All 16 bracketPersistenceService tests pass
- Validator correctly accepts RETIRED (with and without partialScore) and rejects invalid outcomes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed bracketPersistenceService test mock missing bracket.count**
- **Found during:** Task 2 verification
- **Issue:** Pre-existing WIP change in `bracketPersistenceService.js` added `prisma.bracket.count()` call to the bracket lock guard, but the test mock `mockPrisma.bracket` was never updated to include `count`. Two bracket lock tests were failing with `TypeError: prisma.bracket.count is not a function`.
- **Fix:** Added `count: jest.fn()` to `mockPrisma.bracket` and `mockPrisma.bracket.count.mockResolvedValue(1)` in the two bracket lock test cases (returning 1 = bracket exists = locked).
- **Files modified:** `backend/__tests__/unit/bracketPersistenceService.test.js`
- **Commit:** f98da61

## Self-Check: PASSED

Files exist:
- backend/prisma/schema.prisma: FOUND
- backend/src/api/validators/matchValidator.js: FOUND
- backend/prisma/migrations/20260301115004_add_retired_status_and_consolation_opt_out/migration.sql: FOUND

Commits exist:
- 6a2d5d0: FOUND (feat(05-01): add RETIRED to MatchStatus enum and ConsolationOptOut model)
- f98da61: FOUND (feat(05-01): add RETIRED outcome to submitSpecialOutcomeSchema with partialScore)
