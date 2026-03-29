---
phase: 22-tournament-view-layout
plan: 01
subsystem: ui
tags: [react, react-bootstrap, accordion, tournament-view, layout, components]

# Dependency graph
requires: []
provides:
  - buildSectionOrder(status) pure function for status-driven section ordering
  - getDefaultActiveKeys(status) pure function for default expanded accordion keys
  - TournamentInfoPanel refactored as two Accordion.Item elements with compact InfoRow layout
  - FormatVisualization alwaysExpanded prop for hero bracket rendering without toggle
affects:
  - 22-tournament-view-layout plan 02 (TournamentViewPage wiring)
  - Any consumer of TournamentInfoPanel (must wrap in parent Accordion)
  - Any consumer of FormatVisualization (can now pass alwaysExpanded=true)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Accordion.Item as building block: components render Accordion.Item children, parent page owns Accordion wrapper"
    - "Compact InfoRow: d-flex justify-content-between with border-bottom, 0.8rem label / 0.85rem value font sizes"
    - "alwaysExpanded prop pattern: boolean prop that collapses toggle+wrapper and fetches data immediately on mount"
    - "visualizationContent local JSX variable: avoids duplication between conditional render paths"

key-files:
  created:
    - frontend/src/utils/tournamentSectionOrder.js
  modified:
    - frontend/src/components/TournamentInfoPanel.jsx
    - frontend/src/components/FormatVisualization.jsx

key-decisions:
  - "TournamentInfoPanel renders Accordion.Item children (not a full Accordion) — parent TournamentViewPage owns the Accordion wrapper and alwaysOpen/activeKey props"
  - "COMPLETED status section order: points/players first so rankings are prominent, info/format last"
  - "IN_PROGRESS and COMPLETED default to all sections collapsed — bracket hero is the primary focus"
  - "alwaysExpanded initializes isExpanded state to true so toggle state is consistent when prop changes"
  - "Compact InfoRow uses border-bottom border-light as visual separator, replacing hr elements"

patterns-established:
  - "Pure status-driven utilities: export from utils/tournamentSectionOrder.js, no component coupling"
  - "Fragment return with Accordion.Item siblings: TournamentInfoPanel returns <> <Accordion.Item> <Accordion.Item> <Modal> </>"

requirements-completed: [LAYOUT-03, LAYOUT-04]

# Metrics
duration: 3min
completed: 2026-03-07
---

# Phase 22 Plan 01: Tournament View Layout Building Blocks Summary

**buildSectionOrder/getDefaultActiveKeys utility + TournamentInfoPanel as two compact Accordion.Item elements + FormatVisualization alwaysExpanded hero prop**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-07T00:38:38Z
- **Completed:** 2026-03-07T00:41:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 refactored)

## Accomplishments
- Created `tournamentSectionOrder.js` with two pure functions: `buildSectionOrder(status)` and `getDefaultActiveKeys(status)` covering all three tournament statuses
- Refactored `TournamentInfoPanel` from Card+Collapse+two-column grid to a React Fragment with two `Accordion.Item` elements and a compact single-column InfoRow layout
- Added `alwaysExpanded` prop to `FormatVisualization` enabling hero bracket rendering without toggle header or Collapse wrapper, with immediate data fetching on mount

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tournamentSectionOrder utility and refactor TournamentInfoPanel** - `cce6bde` (feat)
2. **Task 2: Add alwaysExpanded prop to FormatVisualization** - `8eafe47` (feat)

**Plan metadata:** See final commit below.

## Files Created/Modified
- `frontend/src/utils/tournamentSectionOrder.js` - Pure utility functions for status-driven section ordering and default accordion key selection
- `frontend/src/components/TournamentInfoPanel.jsx` - Refactored to two Accordion.Item elements with compact flex InfoRow layout, no Card wrapper or Collapse toggle
- `frontend/src/components/FormatVisualization.jsx` - Added alwaysExpanded prop with shared visualizationContent variable to avoid JSX duplication

## Decisions Made
- TournamentInfoPanel renders `Accordion.Item` children (not a self-contained `Accordion`) so that Plan 02's `TournamentViewPage` can own the parent `Accordion` with `alwaysOpen` and `activeKey` control
- COMPLETED status puts points/players first in `buildSectionOrder` — rankings/participants are the primary content after a tournament ends
- Both IN_PROGRESS and COMPLETED return `[]` from `getDefaultActiveKeys` — the bracket hero above the accordion is the focus, no sections auto-expand
- The `alwaysExpanded` prop initializes `useState(alwaysExpanded)` so the internal state starts in the correct position
- Removed `<hr>` separators from TournamentInfoPanel — compact `border-bottom border-light` on each InfoRow provides sufficient visual separation at smaller font sizes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (`TournamentViewPage` wiring) can now import `buildSectionOrder`, `getDefaultActiveKeys` from `frontend/src/utils/tournamentSectionOrder.js`
- `TournamentInfoPanel` must be placed inside a parent `<Accordion>` in Plan 02 (it no longer self-contains an Accordion)
- `FormatVisualization` accepts `alwaysExpanded={true}` for hero rendering in IN_PROGRESS and COMPLETED views
- Build passes cleanly (859 modules, no errors)

---

## Self-Check: PASSED

- FOUND: frontend/src/utils/tournamentSectionOrder.js
- FOUND: frontend/src/components/TournamentInfoPanel.jsx
- FOUND: frontend/src/components/FormatVisualization.jsx
- FOUND commit: cce6bde
- FOUND commit: 8eafe47
- Utility verification: PASS (all status cases return correct arrays)
- Vite build: SUCCESS (859 modules, 0 errors)

---
*Phase: 22-tournament-view-layout*
*Completed: 2026-03-07*
