---
phase: 07-consolation-points
plan: 01
subsystem: api
tags: [points, consolation, bracket, tournament-rankings, prisma]

# Dependency graph
requires:
  - phase: 04-configuration-and-consolation-draw
    provides: CONSOLATION bracket persistence (bracketType, roundNumber, match result JSON)
  - phase: 05-loser-routing
    provides: COMPLETED consolation matches written to DB
  - phase: 008-tournament-rankings
    provides: pointCalculationService with awardPoints* functions and getPointsForRound
provides:
  - roundNumberToName() pure function for bracket round-to-name mapping
  - deriveConsolationResults() async function for auto-deriving consolation winners
  - calculate-points endpoint enhanced to auto-include consolation results for MATCH_2 FINAL_ROUND tournaments
affects: [any future phase calling calculate-points on MATCH_2 tournaments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side result derivation: consolation results derived from DB, never passed by caller"
    - "fromEnd mapping: round names computed by distance from last round (0=FINAL, 1=SEMIFINAL, etc.)"
    - "TDD RED/GREEN: tests written before implementation, all 10 passing"

key-files:
  created:
    - backend/__tests__/unit/consolationPoints.test.js
  modified:
    - backend/src/services/pointCalculationService.js
    - backend/src/api/routes/tournamentRoutes.js

key-decisions:
  - "fromEnd=3 maps to FIRST_ROUND not SECOND_ROUND — consolation brackets max 4 rounds; SECOND_ROUND only appears in larger main brackets"
  - "Server-side derivation: consolation results appended after request body validation — caller never needs to know about consolation bracket structure"
  - "PLACEMENT method excluded: consolation point derivation only applies to FINAL_ROUND method (PLACEMENT uses numeric placement, not round names)"

patterns-established:
  - "roundNumberToName: distance-from-end mapping is bracket-size-agnostic"

requirements-completed: [PTS-01, PTS-02]

# Metrics
duration: 10min
completed: 2026-03-03
---

# Phase 07 Plan 01: Consolation Points Calculation Summary

**Server-side consolation bracket result derivation wired into calculate-points endpoint for MATCH_2 + FINAL_ROUND tournaments, awarding points to consolation match winners automatically**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-03T17:02:00Z
- **Completed:** 2026-03-03T17:12:56Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `roundNumberToName(roundNumber, totalRounds)` — pure function mapping consolation bracket round numbers to standard names (FINAL/SEMIFINAL/QUARTERFINAL/FIRST_ROUND) using distance-from-end logic
- Added `deriveConsolationResults(tournamentId)` — queries CONSOLATION bracket, finds completed match winners, returns entries with `isConsolation: true` and highest round each player/pair won in
- Enhanced `POST /:id/calculate-points` to auto-merge consolation bracket results for MATCH_2 + FINAL_ROUND tournaments before awarding points

## Task Commits

1. **Task 1: Create deriveConsolationResults service function** - `62f5d81` (feat)
2. **Task 2: Wire consolation results into calculate-points endpoint** - `f1a4e8b` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `backend/src/services/pointCalculationService.js` - Added `roundNumberToName` and `deriveConsolationResults` exports
- `backend/__tests__/unit/consolationPoints.test.js` - 10 unit tests (all passing): 4 for roundNumberToName, 6 for deriveConsolationResults
- `backend/src/api/routes/tournamentRoutes.js` - Imports `deriveConsolationResults`, applies MATCH_2 + FINAL_ROUND consolation auto-merge logic

## Decisions Made
- `fromEnd=3` maps to `FIRST_ROUND` (not `SECOND_ROUND`): consolation brackets in this system are at most 4 rounds (half of main bracket size up to 16 players); SECOND_ROUND is not reachable via consolation bracket depth
- Consolation results are derived server-side and appended after body validation — the caller's `results` array for main bracket participants validates normally; server appends consolation entries without requiring organizer to enumerate them
- PLACEMENT method is excluded from consolation derivation — consolation `getPointsForRound` requires a round name, which PLACEMENT does not use

## Deviations from Plan

None - plan executed exactly as written.

The `fromEnd=3 → FIRST_ROUND` mapping was corrected during TDD GREEN (the plan spec comment said SECOND_ROUND but the behavior test said FIRST_ROUND). Tests are the authoritative specification.

## Issues Encountered
- Minor discrepancy in plan: prose said `totalRounds - 3 → SECOND_ROUND` but behavior Test 4 specified `round 1 → FIRST_ROUND` for 4-round bracket. Tests resolved the ambiguity; `fromEnd=3` maps to `FIRST_ROUND`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Consolation point calculation fully wired for MATCH_2 FINAL_ROUND tournaments
- Seed data for consolation PointTable rows already present in seed.js (verified during plan)
- Admin Point Tables UI already displays and edits consolation rows (no code change needed)
- Ready for end-to-end verification: run a MATCH_2 tournament, play consolation matches, call calculate-points, check consolation points awarded

---
*Phase: 07-consolation-points*
*Completed: 2026-03-03*
