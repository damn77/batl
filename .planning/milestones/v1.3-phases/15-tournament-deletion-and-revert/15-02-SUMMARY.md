---
phase: 15-tournament-deletion-and-revert
plan: 02
subsystem: ui
tags: [react, react-bootstrap, modal, toast, tournament-management]

# Dependency graph
requires:
  - phase: 15-01
    provides: DELETE /api/v1/tournaments/:id and POST /api/v1/tournaments/:id/revert backend endpoints
provides:
  - Delete Tournament dropdown item (all statuses) with confirmation modal in TournamentSetupPage
  - Revert to Scheduled dropdown item (conditional) with confirmation modal in TournamentSetupPage
  - Revert to Scheduled button on tournament detail page (BracketGenerationSection)
  - revertTournament() in tournamentService.js and tournamentViewService.js
affects: [tournament-setup, bracket-generation, tournament-detail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useToast pattern for success/error feedback (showSuccess/showError) rather than inline Alert state
    - Conditional dropdown items based on tournament status + registrationClosed proxy for draw detection

key-files:
  created: []
  modified:
    - frontend/src/services/tournamentService.js
    - frontend/src/services/tournamentViewService.js
    - frontend/src/pages/TournamentSetupPage.jsx
    - frontend/src/components/BracketGenerationSection.jsx

key-decisions:
  - "registrationClosed used as proxy for 'has draw' in dropdown visibility (list page has no structure data)"
  - "IN_PROGRESS+hasBracket case in BracketGenerationSection shows revert-only card instead of returning null — allows organizer to revert rather than being locked out"
  - "revertTournament duplicated in tournamentService.js (list page) and tournamentViewService.js (detail page) — intentional, each file serves its own page context"

patterns-established:
  - "Delete confirmation modal pattern: name + status badge + registeredCount + conditional danger Alert for destructive statuses"
  - "Revert confirmation modal pattern: bullet list of consequences (draw deleted, registration reopened)"

requirements-completed: [DEL-01, DEL-03, DEL-04, REVERT-01, REVERT-02, REVERT-03]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 15 Plan 02: Tournament Deletion and Revert UI Summary

**Delete and revert confirmation modals in TournamentSetupPage dropdown and BracketGenerationSection detail page, with status-aware danger warnings and toast feedback**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T17:41:50Z
- **Completed:** 2026-03-04T17:44:00Z
- **Tasks:** 2 of 2 (Task 3 is human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- Added `revertTournament()` API function to both tournamentService.js and tournamentViewService.js
- Delete Tournament dropdown item (red text, all statuses) with confirmation modal showing status badge, player count, and conditional danger Alert for IN_PROGRESS/COMPLETED tournaments
- Revert to Scheduled dropdown item (conditional: IN_PROGRESS or SCHEDULED+registrationClosed) with confirmation modal explaining consequences
- Revert to Scheduled button on tournament detail page (BracketGenerationSection) for SCHEDULED tournaments with a bracket, plus a dedicated revert-only card for IN_PROGRESS tournaments

## Task Commits

Each task was committed atomically:

1. **Task 1: Add delete and revert to TournamentSetupPage with confirmation modals** - `ed3a271` (feat)
2. **Task 2: Add Revert button on tournament detail page (BracketGenerationSection)** - `cc11c8b` (feat)

## Files Created/Modified
- `frontend/src/services/tournamentService.js` - Added `revertTournament()` function
- `frontend/src/services/tournamentViewService.js` - Added `revertTournament()` function
- `frontend/src/pages/TournamentSetupPage.jsx` - Delete/Revert dropdown items, confirmation modals, handlers
- `frontend/src/components/BracketGenerationSection.jsx` - Revert button, revert-only card for IN_PROGRESS, confirmation modal

## Decisions Made
- `registrationClosed` used as proxy for "has draw" in the dropdown (list page has no `structure` data available, only tournament object fields)
- IN_PROGRESS + hasBracket case: instead of returning null (previous behavior), show a minimal card with just a Revert button so organizers aren't locked out
- `revertTournament` duplicated in both services — this is intentional per plan: `tournamentService` serves the list page, `tournamentViewService` serves the detail page

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added revert-only card for IN_PROGRESS + hasBracket case**
- **Found during:** Task 2 (BracketGenerationSection)
- **Issue:** Original render guard returned null for IN_PROGRESS + hasBracket, which would hide the revert button for exactly the most common revert use case (a started tournament)
- **Fix:** Replaced `return null` guard with `showRevertOnly` flag that renders a minimal card containing only the Revert to Scheduled button
- **Files modified:** frontend/src/components/BracketGenerationSection.jsx
- **Verification:** Build passes
- **Committed in:** cc11c8b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correct behavior — the revert button must be accessible for IN_PROGRESS tournaments.

## Issues Encountered
- Pre-existing failing test in `backend/__tests__/unit/bracketPersistenceService.test.js` (swapSlots BYE guard test — mock issue with `tx.round.findUnique`). This is unrelated to our changes and was already failing before this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task 3 (checkpoint:human-verify) requires human testing of delete and revert flows
- All UI code is in place; backend endpoints from Phase 15-01 are ready
- Resume signal: "approved" or describe issues

---
*Phase: 15-tournament-deletion-and-revert*
*Completed: 2026-03-04*
