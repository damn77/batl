---
phase: 25-app-wide-responsive-pass
plan: 02
subsystem: ui
tags: [react, react-bootstrap, tanstack-table, responsive, mobile, bootstrap]

# Dependency graph
requires:
  - phase: 25-01
    provides: app.css with global tap targets and Bootstrap CSS variable overrides

provides:
  - TournamentsListPage dual-render card/table layout with d-sm-none / d-none d-sm-block
  - RankingsTable TanStack columnVisibility hiding tournamentCount on mobile (< 576px)
  - CategoryRankingsPage year selector flex-wrap overflow fix

affects:
  - 25-03
  - any phase touching TournamentsListPage, RankingsTable, CategoryRankingsPage

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-render responsive layout: d-none d-sm-block (desktop table) + d-sm-none (mobile cards)"
    - "TanStack useReactTable columnVisibility state for responsive column hiding"
    - "isMobile state with resize listener (< 576px) for JS-driven responsive behavior"
    - "useMemo on TanStack columns array with [t] dependency to prevent re-initialization"

key-files:
  created: []
  modified:
    - frontend/src/pages/TournamentsListPage.jsx
    - frontend/src/components/RankingsTable.jsx
    - frontend/src/pages/CategoryRankingsPage.jsx

key-decisions:
  - "Card layout on mobile: name + category badge + date, tap card navigates to tournament view"
  - "TanStack columnVisibility state (not CSS) hides tournamentCount column on mobile"
  - "Year selector uses className=w-auto instead of inline style={{ width: auto }}"
  - "CategoryRankingsPage flex container gets flex-wrap gap-2 to prevent year selector clip on narrow viewports"

patterns-established:
  - "Dual-render pattern: d-none d-sm-block table + d-sm-none card list for public list pages"
  - "TanStack column visibility: compute columnVisibility from isMobile state, pass to useReactTable state"

requirements-completed:
  - RESP-02
  - RESP-04
  - RESP-05

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 25 Plan 02: Public List Pages Responsive Summary

**TournamentsListPage card layout on mobile, RankingsTable column hiding via TanStack columnVisibility, and CategoryRankingsPage year selector overflow fix for 375px viewports**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T09:36:26Z
- **Completed:** 2026-03-15T09:41:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- TournamentsListPage renders tappable cards on mobile (xs) showing name, category badge, and end date; table remains on sm+
- RankingsTable hides tournamentCount column when viewport < 576px via TanStack columnVisibility state, keeping rank/name/points visible
- CategoryRankingsPage year selector no longer clips on narrow viewports — flex-wrap + gap-2 on container, w-auto class on select

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mobile card layout to TournamentsListPage** - `eb9207f` (feat)
2. **Task 2: Add columnVisibility to RankingsTable and fix CategoryRankingsPage overflow** - `cd1db29` (feat)

## Files Created/Modified
- `frontend/src/pages/TournamentsListPage.jsx` - Added useNavigate, Card, Badge imports; dual-render d-none d-sm-block table + d-sm-none card list
- `frontend/src/components/RankingsTable.jsx` - Added useState/useEffect for isMobile detection, useMemo on columns, columnVisibility state passed to useReactTable
- `frontend/src/pages/CategoryRankingsPage.jsx` - Year selector: style={{ width: auto }} -> className="w-auto"; flex container gains flex-wrap gap-2

## Decisions Made
- TanStack columnVisibility via JS state (not CSS utility classes) is the correct approach — it removes the column from the DOM, not just visually hidden, keeping table widths correct
- useMemo on columns array with [t] dependency prevents TanStack from reinitializing the table on every render

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tournament list and rankings pages are mobile-friendly; ready for Phase 25-03 (remaining organizer/admin pages)
- All three public-facing list pages verified via artifact checks (d-sm-none, columnVisibility, w-auto)

---
*Phase: 25-app-wide-responsive-pass*
*Completed: 2026-03-15*
