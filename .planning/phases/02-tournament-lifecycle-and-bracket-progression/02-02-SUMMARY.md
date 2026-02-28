---
phase: 02-tournament-lifecycle-and-bracket-progression
plan: 02
subsystem: ui
tags: [react, swr, react-bootstrap, tournament-lifecycle, bracket]

# Dependency graph
requires:
  - phase: 02-01
    provides: PATCH /api/v1/tournaments/:id/start endpoint, advanceBracketSlot, checkAndCompleteTournament
provides:
  - startTournament() in frontend tournamentService
  - Champion field in GET /api/v1/tournaments/:id response
  - Start Tournament button (organizer-only, SCHEDULED status)
  - Champion banner (COMPLETED status with winner name)
  - Read-only bracket gate for players after COMPLETED
affects:
  - TournamentViewPage
  - KnockoutBracket
  - FormatVisualization

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SWR mutate() called after successful startTournament() for optimistic cache invalidation
    - window.confirm() for lightweight confirmation dialogs (no modal component)
    - tournamentStatus prop threaded from TournamentViewPage → FormatVisualization → KnockoutBracket

key-files:
  created: []
  modified:
    - frontend/src/services/tournamentService.js
    - frontend/src/pages/TournamentViewPage.jsx
    - frontend/src/components/KnockoutBracket.jsx
    - frontend/src/components/FormatVisualization.jsx
    - backend/src/services/tournamentService.js
    - backend/src/api/tournamentController.js

key-decisions:
  - "PlayerProfile uses a single name field (not firstName/lastName) — champion name assembled directly"
  - "Champion banner uses Alert variant=warning (yellow) for visual prominence without alarm semantics"
  - "tournamentStatus prop passes through FormatVisualization to KnockoutBracket — minimal prop drilling to avoid modifying KnockoutBracket's internal architecture"

patterns-established:
  - "Lifecycle button pattern: role-gated + status-gated, inline error Alert, SWR mutate on success"
  - "Champion query: findFirst with bracket.bracketType=MAIN + isBye=false + status=COMPLETED, orderBy roundNumber desc"

requirements-completed: [LIFE-01, LIFE-02, LIFE-03, LIFE-04]

# Metrics
duration: 12min
completed: 2026-02-28
---

# Phase 02 Plan 02: Tournament Lifecycle Frontend Summary

**Start Tournament button, champion banner, and read-only bracket gate wired to the 02-01 backend lifecycle engine**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-28T08:56:26Z
- **Completed:** 2026-02-28T09:08:00Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 6

## Accomplishments
- Added `startTournament()` export to frontend service calling PATCH `/api/v1/tournaments/:id/start`
- Added champion computation in `getTournamentWithRelatedData()` — queries final MAIN bracket match, parses result JSON winner
- Exposed `champion: {id, name}` field in tournament GET response (null when not COMPLETED)
- TournamentViewPage: organizer Start Tournament button with window.confirm + SWR mutate + inline error display
- TournamentViewPage: champion banner (Alert variant=warning) visible on COMPLETED tournaments
- KnockoutBracket: `tournamentStatus` prop gates player click handler when COMPLETED (organizers retain full access)
- FormatVisualization: passes `tournamentStatus={tournament.status}` through to KnockoutBracket

## Task Commits

Each task was committed atomically:

1. **Task 1: Add startTournament() to frontend tournamentService.js and compute champion in backend** - `34dec5a` (feat)
2. **Task 2: TournamentViewPage — Start Tournament button + champion banner; KnockoutBracket — read-only gate** - `392db6c` (feat)
3. **Task 3: Human verification** - Checkpoint (awaiting human approval)

## Files Created/Modified
- `frontend/src/services/tournamentService.js` - Added startTournament() export
- `frontend/src/pages/TournamentViewPage.jsx` - Start Tournament button, champion banner, handleStartTournament handler
- `frontend/src/components/KnockoutBracket.jsx` - tournamentStatus prop + read-only gate in handleMatchClick
- `frontend/src/components/FormatVisualization.jsx` - Pass tournamentStatus to KnockoutBracket
- `backend/src/services/tournamentService.js` - Champion computation in getTournamentWithRelatedData()
- `backend/src/api/tournamentController.js` - Expose champion field in GET /tournaments/:id response

## Decisions Made
- `PlayerProfile` uses a single `name` field (verified via schema grep) — no firstName/lastName concatenation needed
- `window.confirm()` used for Start Tournament confirmation (plan explicitly allows this)
- Champion query uses `bracket: { bracketType: 'MAIN' }` filter via Prisma relation traversal

## Deviations from Plan

None - plan executed exactly as written. The only adjustment was using `name` (single field) instead of `firstName + lastName` for the champion name, which the plan anticipated with its "verify field names" instruction.

## Issues Encountered
None. Backend tests all pass (166/166). Vite build succeeds.

## Next Phase Readiness
- Frontend lifecycle controls complete — human verification needed to confirm end-to-end flow
- Backend: champion computation is in getTournamentWithRelatedData() — queries MAIN bracket final completed match
- All LIFE-01 through LIFE-04 requirements implemented; pending human verification (Task 3)

---
*Phase: 02-tournament-lifecycle-and-bracket-progression*
*Completed: 2026-02-28*
