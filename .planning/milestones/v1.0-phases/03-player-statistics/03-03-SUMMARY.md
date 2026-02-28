---
phase: 03-player-statistics
plan: 03
subsystem: ui
tags: [react, react-router-dom, bracket, rankings, navigation]

# Dependency graph
requires:
  - phase: 03-01
    provides: Public player profile page at /players/:id route
  - phase: 011-knockout-bracket-view
    provides: BracketMatch component for knockout bracket display
  - phase: 008-tournament-rankings
    provides: RankingsTable component for category rankings display
provides:
  - Clickable player name links in BracketMatch navigating to /players/:id
  - Clickable player name links in RankingsTable navigating to /players/:id
  - Pair entries in RankingsTable render two individually-linked player names
affects:
  - 03-player-statistics (completes navigation discovery path into player profiles)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Link with e.stopPropagation(): wrap interactive names inside clickable containers using Link + stopPropagation to prevent parent click handlers from firing"
    - "Conditional Link rendering: render Link only when entity id is available, fall back to plain text for BYE/TBD/missing ids"

key-files:
  created: []
  modified:
    - frontend/src/components/BracketMatch.jsx
    - frontend/src/components/RankingsTable.jsx

key-decisions:
  - "Singles-only linking in BracketMatch: doubles matches use pair entity which has no public profile page, so only isDoubles=false players are wrapped in Link"
  - "stopPropagation on bracket links: prevents score entry modal from opening when user clicks a player name link inside the match card"
  - "Individual pair member links in RankingsTable: each player in a PAIR entry links separately to their own profile, preserving the 'p1 / p2' visual format"

patterns-established:
  - "Link-in-clickable-container: always call e.stopPropagation() when wrapping a Link inside a div with an onClick handler to prevent event bubbling"
  - "Conditional Link: id ? <Link to={...}>{name}</Link> : name — standard pattern for optional navigation when entity id may be absent"

requirements-completed: [STATS-02]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 03 Plan 03: Clickable Player Name Links in Bracket and Rankings

**react-router-dom Link wrapping player names in BracketMatch (singles-only) and RankingsTable (PLAYER + PAIR members), completing the navigation discovery path from bracket/rankings into player profiles**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T13:30:00Z
- **Completed:** 2026-02-28T13:33:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- BracketMatch.jsx: singles player name spans now wrap in `<Link to="/players/:id">` with stopPropagation to keep the score modal from triggering
- RankingsTable.jsx: PLAYER rows link to `/players/:id`; PAIR rows render two separate linked names (`p1Name / p2Name`) each pointing to the respective player's profile
- Doubles pair names in BracketMatch remain plain text since pairs have no public profile page

## Task Commits

Each task was committed atomically:

1. **Task 1: Make player names clickable in BracketMatch.jsx** - `03ca380` (feat)
2. **Task 2: Make player names clickable in RankingsTable.jsx** - `987e877` (feat)

## Files Created/Modified

- `frontend/src/components/BracketMatch.jsx` - Added Link import; wrapped player1/player2 name spans in conditional Link with stopPropagation
- `frontend/src/components/RankingsTable.jsx` - Added Link import; replaced name cell renderer with JSX returning Links for PLAYER and PAIR entries

## Decisions Made

- Singles-only linking in BracketMatch: doubles pair entities have no public profile page, so only `isDoubles=false` players get Links
- `e.stopPropagation()` on bracket Links: the match card has an `onClick` handler that opens the score entry modal; clicking a player name should not trigger it
- Individual pair member Links in RankingsTable: each player in a PAIR entry links separately to `/players/:id`, preserving the "p1 / p2" visual separator

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Player profile navigation discovery is complete: users can reach `/players/:id` from both the knockout bracket and the rankings table
- Completes Wave 2 of Phase 03 (runs parallel with Plan 02, no file overlap)
- Phase 03 profile page (Plan 01) + statistics API (Plan 02) + navigation links (this plan) = full player statistics feature set

---
*Phase: 03-player-statistics*
*Completed: 2026-02-28*
