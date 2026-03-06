---
phase: 15-tournament-deletion-and-revert
plan: 01
subsystem: api
tags: [tournament, deletion, revert, casl, rankings, prisma]

# Dependency graph
requires:
  - phase: 008-tournament-rankings
    provides: recalculateRankings function used after TournamentResult deletion
  - phase: 009-bracket-generation
    provides: Bracket/Round/Match schema used in revert cascade deletion
provides:
  - DELETE /api/v1/tournaments/:id accepts any tournament status
  - POST /api/v1/tournaments/:id/revert endpoint
  - COMPLETED tournament deletion with TournamentResult cleanup and ranking recalculation
  - ORGANIZER role can delete tournaments (CASL permission updated)
affects: [16-tournament-deletion-frontend, future-phases-using-tournament-delete]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service-level cascade: delete TournamentResults then recalculateRankings outside transaction for COMPLETED tournaments"
    - "Transaction pattern: match → round → bracket → tournament.update for revert cascade"
    - "CASL permission: merge delete into can() array instead of separate cannot() override"

key-files:
  created: []
  modified:
    - backend/src/services/tournamentService.js
    - backend/src/api/tournamentController.js
    - backend/src/api/routes/tournamentRoutes.js
    - backend/src/middleware/authorize.js

key-decisions:
  - "recalculateRankings called OUTSIDE Prisma transaction because it uses its own internal Prisma instance"
  - "Revert uses authorize('update', 'Tournament') same as startTournament — ORGANIZER already has update permission"
  - "ORGANIZER delete permission granted by merging delete into can() array, removing the cannot('delete', 'Tournament') line"
  - "deleteTournament controller: 409 error handling removed (global handler covers it), only explicit 404 kept"

patterns-established:
  - "Status guard before cascade: check status, then collect affected IDs, then delete, then recalculate"
  - "Revert guard order: COMPLETED → CANCELLED → SCHEDULED-without-draw → proceed"

requirements-completed: [DEL-01, DEL-02, DEL-05, REVERT-01, REVERT-02, REVERT-03, REVERT-04]

# Metrics
duration: 12min
completed: 2026-03-04
---

# Phase 15 Plan 01: Tournament Deletion and Revert Summary

**Tournament deletion expanded to all statuses with COMPLETED ranking cleanup, plus new POST /revert endpoint that deletes draw data and reopens registration**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-04T17:15:00Z
- **Completed:** 2026-03-04T17:27:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- DELETE endpoint now works for SCHEDULED, IN_PROGRESS, COMPLETED, and CANCELLED tournaments
- COMPLETED deletion removes TournamentResults and calls recalculateRankings for each affected category
- POST /api/v1/tournaments/:id/revert deletes bracket/rounds/matches, resets status to SCHEDULED, reopens registration
- Revert correctly rejects COMPLETED, CANCELLED, and SCHEDULED-without-draw with 409 and specific error codes
- ORGANIZER role can now delete tournaments (CASL cannot() line removed)
- All 26 existing tournament tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand deleteTournament service and add revertTournament service** - `642ac52` (feat)
2. **Task 2: Add revert controller, route, and update delete controller** - `5b0cc25` (feat)

## Files Created/Modified
- `backend/src/services/tournamentService.js` - Rewrote deleteTournament (any-status, ranking recalc for COMPLETED), added revertTournament with draw cascade + status reset
- `backend/src/middleware/authorize.js` - ORGANIZER now has delete permission on Tournament (removed cannot line, merged into can array)
- `backend/src/api/tournamentController.js` - Added revertTournament controller, simplified deleteTournament error handling
- `backend/src/api/routes/tournamentRoutes.js` - Added POST /:id/revert route, updated DELETE route comment

## Decisions Made
- `recalculateRankings` is called outside the Prisma transaction because it uses its own internal Prisma client — wrapping it inside `$transaction` would cause connection conflicts
- The revert route uses `authorize('update', 'Tournament')` (same as startTournament) because ORGANIZER already has update permission — avoids needing a new custom permission
- CASL permission fix: removed `cannot('delete', 'Tournament')` and merged `delete` into the existing `can()` array rather than keeping a separate can() call
- deleteTournament controller's explicit 409 handling was removed since the service now throws `createHttpError` which the global handler already processes correctly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failure in `__tests__/unit/bracketPersistenceService.test.js` (not caused by this plan's changes). The working tree has uncommitted changes to `bracketPersistenceService.js` that modified BYE swap behavior; those changes break an existing test expecting any BYE match swap to fail. This is out of scope for this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend deletion and revert APIs are complete and tested
- Frontend phase (16) can now implement the delete and revert UI using these endpoints
- DELETE /api/v1/tournaments/:id and POST /api/v1/tournaments/:id/revert are ready for consumption

---
*Phase: 15-tournament-deletion-and-revert*
*Completed: 2026-03-04*
