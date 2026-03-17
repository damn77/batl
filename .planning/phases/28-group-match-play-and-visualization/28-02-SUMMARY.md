---
phase: 28-group-match-play-and-visualization
plan: 02
subsystem: ui
tags: [react, react-bootstrap, group-standings, match-modal, swr, doubles]

# Dependency graph
requires:
  - phase: 28-01
    provides: MatchResultModal component with isOrganizer/isParticipant/scoringRules/mutate props
  - phase: 27
    provides: group data structure with players/pairs, useMatches hook with groupId filter
provides:
  - GroupStandingsTable with full standings (Position, Player, P, W, L, Sets W-L, S+/-, Games W-L, G+/-, Pts)
  - Clickable match rows opening MatchResultModal for result submission
  - Doubles pair support displaying "Player A / Player B" names
  - Status-based match visibility (expanded for IN_PROGRESS, collapsed for COMPLETED)
  - Mobile responsive column hiding (d-none d-sm-table-cell for Sets W-L and Games W-L)
affects: [28-03-CombinedFormatDisplay, plan-03-accordion-wrapper]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Always-fetch pattern: shouldFetch=true in useMatches, no toggle gate on data loading"
    - "Participant check via isMatchParticipant helper covering both singles and doubles pair members"
    - "Status-based UI state: showMatches defaults from tournamentStatus prop comparison"
    - "Doubles detection via group.pairs?.length > 0"

key-files:
  created: []
  modified:
    - frontend/src/components/GroupStandingsTable.jsx

key-decisions:
  - "Match rows always fetched (shouldFetch=true); visibility controlled by showMatches state not fetch gate"
  - "showMatches defaults true for IN_PROGRESS, false for COMPLETED per CONTEXT.md locked decision"
  - "isMatchParticipant checks both singles player IDs and doubles pair member IDs"
  - "Differential columns setDiff/gameDiff computed during standings useMemo alongside sort"

patterns-established:
  - "Pattern 1: Entity abstraction over players/pairs — entities array unifies singles/doubles standings logic"
  - "Pattern 2: Show/Hide toggle as btn-link with small text — minimal chrome for match section toggle"

requirements-completed: [GPLAY-02, GPLAY-03, GPLAY-04, GPLAY-05, GVIEW-02, GVIEW-04]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 28 Plan 02: GroupStandingsTable Summary

**GroupStandingsTable rewritten with differential columns (S+/-, G+/-), clickable match rows opening MatchResultModal, doubles pair name display, and status-based match row visibility defaulting**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T15:22:05Z
- **Completed:** 2026-03-17T15:24:06Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Standings table now shows all 10 required columns including Set and Game differential (S+/-, G+/-)
- Match rows are clickable with 44px minimum tap targets, opening MatchResultModal with correct props (isOrganizer, isParticipant, scoringRules, mutate)
- Doubles groups display pair names as "Player A / Player B" throughout standings and match rows
- Matches section defaults expanded for IN_PROGRESS tournaments and collapsed for COMPLETED tournaments
- Secondary columns (Sets W-L, Games W-L) hidden below 576px using Bootstrap d-none d-sm-table-cell
- Medal emojis removed from standings position column per project guidelines

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite GroupStandingsTable with full standings, match rows, and doubles support** - `324c126` (feat)

## Files Created/Modified

- `frontend/src/components/GroupStandingsTable.jsx` - Full rewrite: extended prop interface, differential columns, always-fetch matches, MatchResultModal integration, doubles support, responsive column hiding, status-based match visibility

## Decisions Made

- Matches always fetched (shouldFetch=true) regardless of showMatches visibility state — data is available immediately for standings recalculation
- showMatches state initialized from `tournamentStatus === 'IN_PROGRESS'` per CONTEXT.md locked decision
- MatchResultDisplay compact prop is supported (checked source), used for match row display
- Entity abstraction (entities array) unifies singles/doubles standings calculation without branching throughout useMemo

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the `MatchResultDisplay` component already supports the `compact` prop as documented in line 12 of its source file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GroupStandingsTable is ready for integration into CombinedFormatDisplay (Plan 28-03) via accordion wrapper
- Prop interface is complete: tournamentId, group, isOrganizer, currentUserPlayerId, scoringRules, tournamentStatus
- Plan 28-03 must pass the new props when rendering GroupStandingsTable instances

---
*Phase: 28-group-match-play-and-visualization*
*Completed: 2026-03-17*
