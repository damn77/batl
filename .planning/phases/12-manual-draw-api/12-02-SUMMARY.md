---
phase: 12-manual-draw-api
plan: "02"
subsystem: backend/bracket-generation
tags: [bracket, manual-draw, position-assignment, bye-auto-advance, transaction, api]
dependency_graph:
  requires:
    - "Phase 12 Plan 01: manual draw mode (generateBracket with mode='manual', empty bracket structure)"
    - "Phase 01.1 bracket persistence (bracketPersistenceService, bracketService, Match/Round/Bracket models)"
    - "Feature 003 tournament registration (TournamentRegistration, PairRegistration)"
  provides:
    - "PUT /tournaments/:id/bracket/positions endpoint for assigning/clearing bracket slots"
    - "assignPosition() service function with BYE auto-advance and atomic reassignment"
  affects:
    - "Phase 13 (UI draw page) — primary consumer of this endpoint"
    - "bracketPersistenceService.js — extended with assignPosition export"
    - "bracketPersistenceController.js — extended with assignBracketPosition handler"
    - "tournamentRoutes.js — new PUT route registered"
tech-stack:
  added: []
  patterns:
    - "BYE-adjacent check: load Round 1 matches sorted by matchNumber, find partner at posInRound +/- 1"
    - "Round 2 pre-population on assign / undo on clear — mirrors seeded mode behavior"
    - "Inner async helper function within prisma.$transaction for reusable BYE-adjacent logic"
    - "No-op return when assigning to a slot already occupied by the same entity"
key-files:
  created: []
  modified:
    - "backend/src/services/bracketPersistenceService.js"
    - "backend/src/api/validators/bracketPersistenceValidator.js"
    - "backend/src/api/bracketPersistenceController.js"
    - "backend/src/api/routes/tournamentRoutes.js"
    - "backend/__tests__/integration/bracketPersistenceRoutes.test.js"
key-decisions:
  - "Inner async helper getByeAdjacentRound2Update() defined inside prisma.$transaction closure for reuse across assign/clear/reassign steps"
  - "No-op on same-slot reassignment: if entityId is already in the exact matchId+slot, return early with action='assigned'"
  - "BYE-adjacent check uses Round 1 match sort order (matchNumber asc) to compute posInRound and partner index"
  - "assignPositionSchema uses default(null) for playerId/pairId instead of .oxor() — cleaner UX for passing null to clear"
requirements-completed: [DRAW-01, DRAW-02, DRAW-06]
duration: 2m
completed: 2026-03-04
---

# Phase 12 Plan 02: Position Assignment API Summary

**`PUT /tournaments/:id/bracket/positions` endpoint that assigns or clears single bracket slots with atomic BYE auto-advance and reassignment logic implemented in a Prisma transaction.**

## Performance

- **Duration:** 2m
- **Started:** 2026-03-04T10:54:52Z
- **Completed:** 2026-03-04T10:57:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Implemented `assignPosition()` service function with full validation (NOT_REGISTERED, ALREADY_PLACED, BYE_SLOT_NOT_ASSIGNABLE, BRACKET_LOCKED, MATCH_NOT_FOUND, NOT_ROUND_1)
- BYE auto-advance: assigning a player next to a BYE match immediately pre-populates their Round 2 slot
- BYE undo: clearing a BYE-adjacent slot removes the player from Round 2
- Atomic reassignment: replacing an occupant clears the old (with Round 2 undo) and places the new (with Round 2 advance) in one transaction
- Wired up `PUT /api/v1/tournaments/:id/bracket/positions` with Joi validation, controller handler, and route registration

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement assignPosition service function** - `ff14b06` (feat)
2. **Task 2: Wire up position assignment endpoint** - `c37868e` (feat)

**Plan metadata:** _(created next — final commit)_

## Files Created/Modified

- `backend/src/services/bracketPersistenceService.js` - Added `assignPosition()` export (~180 lines)
- `backend/src/api/validators/bracketPersistenceValidator.js` - Added `assignPositionSchema`
- `backend/src/api/bracketPersistenceController.js` - Added `assignBracketPosition` handler + new error codes
- `backend/src/api/routes/tournamentRoutes.js` - Registered `PUT /:id/bracket/positions` route
- `backend/__tests__/integration/bracketPersistenceRoutes.test.js` - Added `assignPosition` to mock + 3 new route tests

## Decisions Made

- Used `default(null)` for `playerId`/`pairId` in `assignPositionSchema` (cleaner than `.oxor()` for null-to-clear pattern)
- Inner helper function `getByeAdjacentRound2Update()` defined inside the `$transaction` closure — reused by reassign, clear, and assign steps without duplication
- No-op path for same-slot reassignment: if the entity is already at the exact `matchId + slot`, return `action: 'assigned'` immediately

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `assignPosition` mock to integration test file**
- **Found during:** Task 2 verification (full test suite run)
- **Issue:** The existing `bracketPersistenceRoutes.test.js` used `jest.unstable_mockModule` to mock `bracketPersistenceService.js` but only listed `closeRegistration`, `generateBracket`, `swapSlots`, `regenerateBracket`. After the controller was updated to import `assignPosition`, the mock module didn't provide that export, causing all 14 tests in the file to fail with `SyntaxError: ... does not provide an export named 'assignPosition'`.
- **Fix:** Added `mockAssignPosition = jest.fn()` and `assignPosition: mockAssignPosition` to the mock factory
- **Files modified:** `backend/__tests__/integration/bracketPersistenceRoutes.test.js`
- **Verification:** All 17 tests pass (14 original + 3 new for the new route)
- **Committed in:** c37868e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing mock export for new service function)
**Impact on plan:** Essential correctness fix — the new controller import broke the existing mock. No scope creep.

## Issues Encountered

None beyond the mock gap documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `PUT /api/v1/tournaments/:id/bracket/positions` is fully operational
- Phase 13 (UI draw page) can now call this endpoint to assign/clear bracket slots
- Full manual draw workflow functional: generate empty bracket (Plan 01) → assign positions (Plan 02) → start tournament (Plan 01 start-gate validates all placed)
- All 187 tests passing (18 suites, 0 failures)

---

*Phase: 12-manual-draw-api*
*Completed: 2026-03-04*
