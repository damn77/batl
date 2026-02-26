---
phase: 01-match-result-submission
plan: 01
subsystem: api
tags: [express, prisma, joi, match-results, organizer-lock, participant-check]

# Dependency graph
requires: []
provides:
  - "PATCH /api/v1/matches/:id/result endpoint — player submissions, organizer overrides, special outcomes"
  - "Canonical result JSON schema with server-side submittedBy derivation"
  - "Organizer-lock mechanism preventing player edits after organizer writes"
  - "Prisma transaction preventing race conditions in concurrent submissions"
affects:
  - 01-02-match-result-submission
  - 01-03-match-result-submission

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Joi alternatives() for body schemas that accept two distinct shapes (scored vs special outcome)"
    - "Prisma.$transaction for serialized read-modify-write to prevent race conditions"
    - "throwError() helper with statusCode + code properties for controller-handled errors"
    - "submittedBy always server-derived from req.user.role — never read from request body"

key-files:
  created:
    - backend/src/api/validators/matchValidator.js
    - backend/src/services/matchResultService.js
    - backend/src/api/matchController.js
    - backend/src/api/routes/matchRoutes.js
  modified:
    - backend/src/index.js

key-decisions:
  - "Organizer-lock is read inside the Prisma transaction — prevents race condition where organizer writes just after player reads the lock state"
  - "Joi alternatives() rather than a single merged schema — keeps scored and special-outcome paths semantically distinct and avoids complex conditional validation"
  - "matchRoutes.js registered after matchOverridesRouter in index.js — both mount at /api/v1/matches without conflict since they handle different sub-paths"

patterns-established:
  - "Result JSON canonical format: { winner, submittedBy, sets, outcome } — all later features inherit this"
  - "isMatchParticipant() handles both singles (player1Id/player2Id) and doubles (pair member ids)"

requirements-completed: [MATCH-01, MATCH-02, MATCH-03, MATCH-04, MATCH-05]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 1 Plan 01: Match Result Submission — Backend API Summary

**PATCH /api/v1/matches/:id/result with Prisma transaction, participant check, organizer-lock, and special outcome restriction**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T21:21:45Z
- **Completed:** 2026-02-26T21:26:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- `PATCH /api/v1/matches/:id/result` endpoint live with full middleware chain (auth, UUID validation, body validation)
- Role-based access: players can submit/update results; organizers can override anything and record special outcomes
- Organizer-lock enforced atomically inside Prisma transaction — no race condition window
- Canonical result JSON schema established: `{ winner, submittedBy, sets, outcome }` — `submittedBy` always derived from server role

## Task Commits

Each task was committed atomically:

1. **Task 1: Joi validation schemas + matchResultService** - `a642499` (feat)
2. **Task 2: matchController + matchRoutes + register in index.js** - `4ffba6f` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `backend/src/api/validators/matchValidator.js` - submitResultSchema (SETS/BIG_TIEBREAK) and submitSpecialOutcomeSchema
- `backend/src/services/matchResultService.js` - submitResult() with participant check, organizer-lock, and Prisma transaction
- `backend/src/api/matchController.js` - submitMatchResult handler with role guard for special outcomes
- `backend/src/api/routes/matchRoutes.js` - PATCH /:id/result with Joi alternatives() body schema
- `backend/src/index.js` - Added matchRoutes import and app.use registration

## Decisions Made
- Organizer-lock read happens **inside** the Prisma transaction — eliminates the window where a player could read "unlocked" just before an organizer writes
- `Joi.alternatives()` accepts two completely different body shapes (scored vs special outcome) without merging them into a confusing mega-schema
- `matchRoutes` registered alongside existing `matchOverridesRouter` — both safely share the `/api/v1/matches` mount point because they handle different sub-paths (`/:id/result` vs `/:id/rules`)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Backend write path complete — Plan 02 (frontend utilities: bracketColors, isMatchParticipant, matchService, score forms) can start immediately
- The canonical result JSON format is now established and must be respected by all frontend parsing code
- Plan 03 (MatchResultModal + bracket wiring) depends on Plan 02 utilities

---
*Phase: 01-match-result-submission*
*Completed: 2026-02-26*
