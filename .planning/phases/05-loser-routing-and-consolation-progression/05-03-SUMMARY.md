---
phase: 05-loser-routing-and-consolation-progression
plan: "03"
subsystem: api
tags: [prisma, express, consolation, opt-out, tournament-lifecycle]

# Dependency graph
requires:
  - phase: 05-01
    provides: ConsolationOptOut model in Prisma schema with unique constraints on (tournamentId, playerId) and (tournamentId, pairId)
  - phase: 05-02
    provides: consolationEligibilityService.routeLoserToConsolation which already checks ConsolationOptOut at placement time
provides:
  - POST /api/v1/tournaments/:id/consolation-opt-out endpoint returning 201 with ConsolationOptOut record
  - consolationOptOutService.recordOptOut() with full validation (tournament guard, auth, duplicate, played-match)
  - consolationOptOutController.recordConsolationOptOut() with body validation (MISSING_ENTITY, AMBIGUOUS_ENTITY)
affects: [phase-05-future, integration-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Authorization in service layer — isOrganizer + submitterPlayerId passed from controller, service enforces player vs organizer rules"
    - "Pre-draw opt-out: consolation bracket existence check determines whether to run played-match guard"
    - "Route-level auth split: isAuthenticated middleware in router, PLAYER vs ORGANIZER check inside service"

key-files:
  created:
    - backend/src/services/consolationOptOutService.js
    - backend/src/api/consolationOptOutController.js
  modified:
    - backend/src/api/routes/tournamentRoutes.js

key-decisions:
  - "No authorize('update','Tournament') on opt-out route — would block players from self-opting out; auth delegated to service"
  - "Pre-draw opt-out is valid: if no consolation bracket exists yet, skip the played-match check entirely"
  - "Doubles pair authorization: fetch DoublesPair and verify submitterPlayerId is player1Id or player2Id"

patterns-established:
  - "Authorization pattern: isOrganizer and submitterPlayerId extracted in controller and passed to service"
  - "Consolation bracket existence check: findFirst({bracketType:'CONSOLATION'}) before played-match query"

requirements-completed: [LIFE-05]

# Metrics
duration: 1min
completed: 2026-03-01
---

# Phase 5 Plan 03: Consolation Opt-Out API Summary

**POST /api/v1/tournaments/:id/consolation-opt-out endpoint with service-layer authorization, duplicate guard, and pre-draw opt-out support**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-01T14:08:43Z
- **Completed:** 2026-03-01T14:10:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- consolationOptOutService.js with full business rule validation: tournament guard (MATCH_2 check), role-based authorization (self vs organizer), duplicate guard (409 ALREADY_OPTED_OUT), played-match guard (409 NEXT_MATCH_ALREADY_PLAYED)
- consolationOptOutController.js with body validation: rejects missing entity (400 MISSING_ENTITY) and ambiguous entity (400 AMBIGUOUS_ENTITY)
- Route registered in tournamentRoutes.js under POST /:id/consolation-opt-out with isAuthenticated middleware; authorization handled inside service layer

## Task Commits

Each task was committed atomically:

1. **Task 1: Create consolationOptOutService.js** - `9603366` (feat)
2. **Task 2: Create opt-out controller and wire route** - `e0092f0` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `backend/src/services/consolationOptOutService.js` - recordOptOut() with 6-step validation: tournament fetch, MATCH_2 check, authorization, duplicate guard, played-match guard, opt-out create
- `backend/src/api/consolationOptOutController.js` - POST handler with body validation and delegation to service
- `backend/src/api/routes/tournamentRoutes.js` - Added import and Phase 05 route section with POST /:id/consolation-opt-out

## Decisions Made
- No `authorize('update', 'Tournament')` middleware on the route — that CASL guard only passes for ORGANIZER/ADMIN and would block players from self-opting out. Authorization (player-self vs organizer-any) is handled inside the service.
- Pre-draw opt-out is valid: service checks for consolation bracket existence first; if no bracket exists yet, the played-match guard is skipped entirely.
- Doubles pair authorization fetches the DoublesPair record and confirms submitterPlayerId matches player1Id or player2Id.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- LIFE-05 (consolation opt-out API) is complete
- Phase 5 is fully complete: schema (05-01), loser routing (05-02), opt-out API (05-03)
- Phase 6 (consolation progression, match result propagation within consolation bracket) can proceed

---
*Phase: 05-loser-routing-and-consolation-progression*
*Completed: 2026-03-01*
