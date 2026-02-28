---
phase: 02-tournament-lifecycle-and-bracket-progression
plan: 01
subsystem: api
tags: [express, prisma, sqlite, tournament-lifecycle, bracket-advancement]

# Dependency graph
requires:
  - phase: 01.1-bracket-generation-and-seeding-persistence
    provides: "Bracket/Round/Match records in DB with matchNumber and roundId — required for advanceBracketSlot to traverse rounds"
provides:
  - "startTournament(): SCHEDULED → IN_PROGRESS transition with 404/400 guards"
  - "advanceBracketSlot(): in-transaction winner propagation to next-round match slot (singles + doubles)"
  - "checkAndCompleteTournament(): organizer-only auto-COMPLETED detection when all MAIN-bracket non-BYE matches done"
  - "PATCH /api/v1/tournaments/:id/start HTTP endpoint (organizer/admin auth)"
affects:
  - 02-02-frontend-lifecycle-controls
  - future match result submission flows

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "throwError(statusCode, code, message) helper pattern — inline in each service, not imported"
    - "Lifecycle hooks called inside Prisma transaction to guarantee atomicity with match result write"
    - "Route ordering: more-specific /:id/start registered before generic /:id in Express router"

key-files:
  created:
    - backend/src/services/tournamentLifecycleService.js
  modified:
    - backend/src/services/matchResultService.js
    - backend/src/api/tournamentController.js
    - backend/src/api/routes/tournamentRoutes.js

key-decisions:
  - "advanceBracketSlot + checkAndCompleteTournament run inside the existing Prisma transaction in submitResult() — no separate transaction needed"
  - "checkAndCompleteTournament guards on isOrganizer flag — player result submissions never trigger COMPLETED transition"
  - "winnerPairId set to undefined (not null) in updateData when pair fields absent — avoids overwriting existing pair fields with null for singles matches"
  - "PATCH /:id/start route registered before PATCH /:id in Express router to prevent path shadowing"

patterns-established:
  - "Pattern 1: Lifecycle hooks (advanceBracketSlot, checkAndCompleteTournament) are called inside tx after tx.match.update, ensuring all side-effects are part of the same atomic transaction"
  - "Pattern 2: advanceBracketSlot uses Math.ceil(matchNumber / 2) + odd/even detection to determine next-round slot — matches 1,2 → slot 1; matches 3,4 → slot 2"

requirements-completed: [LIFE-01, LIFE-02, LIFE-03, LIFE-04]

# Metrics
duration: 7min
completed: 2026-02-28
---

# Phase 02 Plan 01: Tournament Lifecycle Engine Summary

**Backend lifecycle engine: PATCH /api/v1/tournaments/:id/start + in-transaction bracket slot advancement + organizer-triggered auto-COMPLETED detection hooked into match result submission**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-28T08:51:52Z
- **Completed:** 2026-02-28T08:58:52Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- Created `tournamentLifecycleService.js` with three exported functions: `startTournament`, `advanceBracketSlot`, `checkAndCompleteTournament`
- Updated `matchResultService.js` to select all bracket-advancement fields from match.update and call lifecycle hooks inside the Prisma transaction
- Registered `PATCH /api/v1/tournaments/:id/start` endpoint with organizer/admin auth before the generic `PATCH /:id` route
- All 166 existing backend tests continue to pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tournamentLifecycleService.js** - `d62e7cd` (feat)
2. **Task 2: Update matchResultService — select fields, call lifecycle hooks** - `0a3fd86` (feat)
3. **Task 3: Wire PATCH /:id/start route** - `dd2d826` (feat)

## Files Created/Modified

- `backend/src/services/tournamentLifecycleService.js` - New service: startTournament, advanceBracketSlot, checkAndCompleteTournament
- `backend/src/services/matchResultService.js` - Added select clause + lifecycle hook calls inside transaction
- `backend/src/api/tournamentController.js` - Added startTournament HTTP handler + import from lifecycleService
- `backend/src/api/routes/tournamentRoutes.js` - Added startTournament import + PATCH /:id/start route registration

## Decisions Made

- `advanceBracketSlot` and `checkAndCompleteTournament` run inside the existing Prisma transaction in `submitResult()` so the bracket advancement and result write are one atomic operation — no risk of partial updates.
- `checkAndCompleteTournament` only fires when `isOrganizer === true`, satisfying the requirement that player submissions never trigger COMPLETED status even on the final match.
- `winnerPairId` omitted from updateData (rather than set to null) when no pair fields exist, preventing null from overwriting existing pair slots in singles matches.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. All three tasks loaded cleanly, 166/166 existing tests pass.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Backend lifecycle engine complete: start endpoint + bracket advancement + auto-completion all operational
- Plan 02-02 (frontend lifecycle controls) can now build a thin UI layer on top of these backend operations
- The `PATCH /api/v1/tournaments/:id/start` endpoint is immediately consumable by the frontend

---
*Phase: 02-tournament-lifecycle-and-bracket-progression*
*Completed: 2026-02-28*
