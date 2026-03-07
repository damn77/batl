---
phase: 22-tournament-view-layout
plan: 02
subsystem: ui
tags: [react, react-bootstrap, accordion, tournament-view, mobile]

# Dependency graph
requires:
  - phase: 22-01
    provides: tournamentSectionOrder utility, TournamentInfoPanel Accordion.Item refactor, alwaysExpanded prop on FormatVisualization
provides:
  - Status-driven hero zone + accordion layout in TournamentViewPage
  - SCHEDULED tournaments open with Location & Schedule section expanded
  - IN_PROGRESS tournaments show bracket as hero element above collapsed accordion
  - COMPLETED tournaments show champion banner above hero bracket above collapsed accordion
affects: [23-bracket-touch-fix, 24-organizer-mobile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hero zone above accordion: status-driven section visibility using buildSectionOrder + getDefaultActiveKeys"
    - "React Bootstrap Accordion with alwaysOpen + flush for independent collapsible sections"
    - "renderSection switch function maps section keys to Accordion.Item components"

key-files:
  created: []
  modified:
    - frontend/src/pages/TournamentViewPage.jsx

key-decisions:
  - "Organizer & Registration accordion section collapsed by default for ALL statuses (not just IN_PROGRESS) — avoids overwhelming users on first load"
  - "TournamentInfoPanel renders both location-schedule and organizer-registration Accordion.Items as a fragment; renderSection skips organizer-registration key to avoid double-render"
  - "OrganizerRegistrationPanel moved inside TournamentInfoPanel organizer-registration body with user/onRegistrationComplete props"

patterns-established:
  - "renderSection(key) switch pattern: maps string section keys from buildSectionOrder to JSX Accordion.Items"
  - "Hero zone pattern: conditional render of FormatVisualization with alwaysExpanded=true above the Accordion for active/completed tournaments"

requirements-completed: [LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05]

# Metrics
duration: ~2 days (multi-session with checkpoint)
completed: 2026-03-07
---

# Phase 22 Plan 02: Tournament View Layout Integration Summary

**TournamentViewPage refactored with status-driven hero zone + React Bootstrap Accordion — bracket visible immediately for IN_PROGRESS, champion banner prominent for COMPLETED, collapsible secondary sections for all statuses**

## Performance

- **Duration:** Multi-session with human-verify checkpoint
- **Started:** 2026-03-07T00:51:30Z
- **Completed:** 2026-03-07T00:51:30Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced flat top-to-bottom layout with two-zone structure: hero zone (always-visible) + accordion (collapsible secondary sections)
- IN_PROGRESS tournaments now show bracket immediately as hero element above all collapsed secondary sections — no scrolling required on mobile
- SCHEDULED tournaments open with Location & Schedule expanded by default (Organizer & Registration collapsed for all statuses per user feedback)
- COMPLETED tournaments display champion banner prominently above hero bracket, all accordion sections collapsed
- ConsolationOptOutPanel appended as final accordion item for IN_PROGRESS KNOCKOUT MATCH_2 tournaments
- OrganizerRegistrationPanel integrated inside organizer-registration accordion body with role-gating

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor TournamentViewPage to hero zone + accordion layout** - `a884eaf` (feat)
2. **Fix: collapse organizer-registration by default for all statuses** - `c0a8b6a` (fix — applied at checkpoint per user feedback)

## Files Created/Modified

- `frontend/src/pages/TournamentViewPage.jsx` - Full refactor: hero zone + Accordion layout with buildSectionOrder/getDefaultActiveKeys, renderSection switch, status-driven section ordering

## Decisions Made

- **Organizer & Registration collapsed by default for all statuses:** User verified the layout and requested that the Organizer & Registration section start minimized even for SCHEDULED tournaments. `getDefaultActiveKeys('SCHEDULED')` was updated to return only `['location-schedule']` instead of `['location-schedule', 'organizer-registration']`. Rationale: registration panel is secondary information; expanding it by default adds visual noise on first load.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getDefaultActiveKeys for SCHEDULED status**
- **Found during:** Task 2 (human verification checkpoint)
- **Issue:** Plan specified SCHEDULED status should expand both Location & Schedule AND Organizer & Registration by default. User verified and found Organizer & Registration expanding by default was unwanted behavior.
- **Fix:** Updated `getDefaultActiveKeys('SCHEDULED')` in `frontend/src/utils/tournamentSectionOrder.js` to return `['location-schedule']` only, removing `'organizer-registration'`
- **Files modified:** frontend/src/utils/tournamentSectionOrder.js
- **Verification:** User approved after fix at checkpoint
- **Committed in:** c0a8b6a (fix commit at checkpoint)

---

**Total deviations:** 1 auto-fixed (behavior adjustment based on user verification)
**Impact on plan:** Minor UX improvement — all 5 LAYOUT requirements still satisfied. No scope creep.

## Issues Encountered

None - implementation followed plan with one UX adjustment at checkpoint.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tournament view layout complete — all 5 LAYOUT requirements met and human-verified
- Phase 23 (bracket touch fix) can proceed: hero bracket now rendered with alwaysExpanded=true which is the correct context for touch event fixes
- Concern for Phase 23: BYE row vertical whitespace on mobile — visibility:hidden wastes space; display:none may break connector lines (pre-existing blocker)

---
*Phase: 22-tournament-view-layout*
*Completed: 2026-03-07*
