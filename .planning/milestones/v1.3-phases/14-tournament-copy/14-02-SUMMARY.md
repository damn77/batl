---
phase: 14-tournament-copy
plan: 02
subsystem: ui
tags: [react, react-bootstrap, i18n, tournament-copy]

# Dependency graph
requires:
  - phase: 14-01
    provides: POST /api/v1/tournaments/:id/copy backend endpoint

provides:
  - Three-dot action dropdown in TournamentSetupPage tournament list
  - copyTournament() frontend service function
  - Copy flow: dropdown -> pre-filled creation modal -> copyTournament API call

affects:
  - TournamentSetupPage
  - tournamentService

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React Bootstrap Dropdown used for per-row action menus (replaces multiple inline buttons)"
    - "Copy mode state pattern: copySource null/object controls modal title, banner, and submit handler routing"

key-files:
  created: []
  modified:
    - frontend/src/pages/TournamentSetupPage.jsx
    - frontend/src/services/tournamentService.js
    - frontend/src/i18n/locales/en.json
    - frontend/src/i18n/locales/sk.json

key-decisions:
  - "Reuse creation modal for copy flow (copySource state distinguishes modes) rather than separate modal"
  - "Three-dot dropdown (vertical ellipsis &#8942;) replaces multiple inline buttons to reduce visual noise"

patterns-established:
  - "Copy mode: null copySource = create mode, non-null copySource = copy mode; single modal handles both"

requirements-completed: [COPY-01, COPY-02, COPY-03, COPY-04, COPY-05]

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 14 Plan 02: Tournament Copy UI Summary

**Three-dot action dropdown replacing inline buttons, with copy flow that opens pre-filled creation modal showing source tournament banner and calling POST /tournaments/:id/copy on submit**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-04T16:05:00Z
- **Completed:** 2026-03-04T16:13:00Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Added `copyTournament(sourceId, overrides)` service function to `tournamentService.js`
- Replaced per-row inline buttons (Edit, Configure Rules, Configure Points, Recalc Seeding) with a single three-dot `Dropdown` component
- Dropdown contains all existing actions plus "Copy Tournament", with Recalculate Seeding still gated to DOUBLES categories
- `handleCopyClick()` pre-fills creation modal: empty name, today's dates, source tournament's category/description/club/address/capacity
- Modal shows info banner "Copying from: [name]" and title "Copy Tournament" when in copy mode
- `handleSubmitCreate` routes to `copyTournament` or `createTournament` based on `copySource` state
- Added translation keys to both `en.json` and `sk.json` for button, modal title, and banner

## Task Commits

Each task was committed atomically:

1. **Task 1: Add copyTournament to frontend service and action dropdown to tournament list** - `d625968` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `frontend/src/services/tournamentService.js` - Added `copyTournament()` function
- `frontend/src/pages/TournamentSetupPage.jsx` - Dropdown, copy state, handleCopyClick, modal banner/title, submit routing
- `frontend/src/i18n/locales/en.json` - Added buttons.copyTournament, modals.copyTournament.title, alerts.copyingFrom
- `frontend/src/i18n/locales/sk.json` - Same keys in Slovak

## Decisions Made
- Reused the existing create modal for copy mode rather than creating a separate modal — copySource state null/object controls all copy-specific UI (title, banner, submit handler)
- Three-dot dropdown (vertical ellipsis character &#8942;) used as toggle to consolidate per-row actions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All COPY-01 through COPY-05 requirements satisfied from the frontend perspective
- Backend copy endpoint (from Plan 01) and frontend copy UI (this plan) are both complete
- Phase 14 (tournament-copy) is fully complete

---
*Phase: 14-tournament-copy*
*Completed: 2026-03-04*
