---
phase: 29-group-standings-and-tiebreakers
plan: 03
subsystem: ui
tags: [react, react-bootstrap, swr, tiebreakers, group-standings, tournament]

# Dependency graph
requires:
  - phase: 29-02
    provides: Backend standings API with tiebreaker chain, override endpoints, unresolvedTies/overrideIsStale fields

provides:
  - useGroupStandings SWR hook and three API functions in tournamentViewService.js
  - GroupStandingsTable rewritten to consume backend standings with full tiebreaker UI

affects: [phase-30-knockout-phase, any feature consuming GroupStandingsTable]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SWR hook for group standings with dedupingInterval=5000 (frequent data for active group stage)
    - OverlayTrigger+Tooltip pattern for tiebreaker criterion badges (hover/focus/click triggers)
    - Dual mutate pattern: match result modal triggers mutateMatches()+mutateStandings() together

key-files:
  created: []
  modified:
    - frontend/src/services/tournamentViewService.js
    - frontend/src/components/GroupStandingsTable.jsx

key-decisions:
  - "GroupStandingsTable no longer owns standings computation — pure renderer of backend data"
  - "dedupingInterval=5000 (5s) vs 30s for matches — standings change more frequently during active group play"
  - "Stale override warning uses local staleDismissed state — persists until page reload, intentional UX"
  - "Modal tieRange parsed from standings entry, not re-fetched — positions derived from backend tiedRange field"

patterns-established:
  - "Dual mutate: any action that changes match results should call both mutateMatches() and mutateStandings()"
  - "Backend-authoritative standings: remove client-side computation when API provides tiebreaker-aware data"

requirements-completed: [GSTAND-05, GSTAND-04, GSTAND-06]

# Metrics
duration: 6min
completed: 2026-03-17
---

# Phase 29 Plan 03: Group Standings Frontend Summary

**GroupStandingsTable rewritten as pure SWR consumer with tiebreaker criterion badges, tied-position ranges, organizer resolution modal, and stale override warning — Points column removed**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-17T18:54:13Z
- **Completed:** 2026-03-17T19:00:00Z
- **Tasks:** 2 auto (+ 1 checkpoint pending human verify)
- **Files modified:** 2

## Accomplishments
- Added `getGroupStandings`, `saveGroupTieOverride`, `deleteGroupTieOverride` API functions and `useGroupStandings` SWR hook to `tournamentViewService.js`
- Removed entire client-side standings `useMemo` computation block from `GroupStandingsTable.jsx` (was 118 lines)
- Added tiebreaker criterion badges with OverlayTrigger tooltips ("Resolved by: Head-to-head", etc.)
- Added tied position range display (e.g., "2-3") when `tiedRange` field is set
- Added organizer-only tie alert banners per unresolved tie with "Resolve tie" button opening resolution modal
- Added manual resolution modal with per-entity dropdown position selectors, unique-position validation, saving state, error display
- Added stale override warning with Dismiss and Re-resolve actions
- Removed Pts column and updated legend to "S +/- = Set differential, G +/- = Game differential"
- Match result modal now triggers both `mutateMatches()` and `mutateStandings()` for consistent refresh
- Vite build passes (864 modules, no errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add useGroupStandings SWR hook and API functions** - `117ae95` (feat)
2. **Task 2: Rewrite GroupStandingsTable to consume API standings with tiebreaker UI** - `0264bb0` (feat)

## Files Created/Modified
- `frontend/src/services/tournamentViewService.js` - Added 64 lines: 3 API functions + 1 SWR hook
- `frontend/src/components/GroupStandingsTable.jsx` - Full rewrite: removed client computation, added tiebreaker badge, tie alert, resolution modal, stale warning

## Decisions Made
- GroupStandingsTable is now a pure renderer — all standings computation is backend-authoritative
- `dedupingInterval=5000` for standings (vs 30000 for matches) because standings change with each match result during active group play
- Stale override dismissed state is local (not persisted) — intentional, reappears on next page load as reminder
- Modal positions derived from `tiedRange` on the standings entry, no separate API call needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx vite build` run from root directory failed (no index.html there). Re-run from `frontend/` directory succeeded. Not a code issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 29 frontend complete. Task 3 is a human-verify checkpoint awaiting visual confirmation.
- After verification, Phase 30 (knockout phase bracket management) can begin.
- GroupStandingsTable is wired and ready; backend standings API (Plan 29-02) provides all data fields.

---
*Phase: 29-group-standings-and-tiebreakers*
*Completed: 2026-03-17*
