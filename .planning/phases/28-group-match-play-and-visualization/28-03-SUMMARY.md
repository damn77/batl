---
phase: 28-group-match-play-and-visualization
plan: 03
subsystem: ui

tags: [react, react-bootstrap, accordion, progress-bar, group-standings, combined-format, match-modal]

# Dependency graph
requires:
  - phase: 28-02
    provides: GroupStandingsTable with full prop interface (isOrganizer, currentUserPlayerId, scoringRules, tournamentStatus)
provides:
  - FormatVisualization GROUP section: Accordion layout with per-group ProgressBar headers, auto-expand first group for IN_PROGRESS
  - FormatVisualization COMBINED section: full prop pass-through to CombinedFormatDisplay (groupsComplete, isOrganizer, allMatches)
  - CombinedFormatDisplay: stacked Group Stage (Accordion) + Knockout Phase sections with completion banner and bracket placeholder
  - MatchResultModal: skip dry-run network request for group match corrections
affects: [plan-04-if-any, COMBINED-format-display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Accordion defaultActiveKey driven by tournament status (IN_PROGRESS auto-expands first group)"
    - "ProgressBar height 4px inline style as thin completion indicator in accordion header"
    - "computeGroupsComplete + computeGroupCompletionPct helper functions computed from allMatches prop"
    - "useMatches shouldFetch extended to hasBrackets || hasGroups to feed progress bars"
    - "groupId guard in runDryRunIfNeeded short-circuits before network request"

key-files:
  created: []
  modified:
    - frontend/src/components/FormatVisualization.jsx
    - frontend/src/components/CombinedFormatDisplay.jsx
    - frontend/src/components/MatchResultModal.jsx

key-decisions:
  - "ExpandableSection removed from GROUP format section — React Bootstrap Accordion used instead"
  - "ExpandableSection removed from CombinedFormatDisplay — Accordion used for groups, direct KnockoutBracket for brackets"
  - "Generate Knockout Bracket button is a no-op (window.scrollTo) with TODO for Phase 30 wiring"
  - "allMatches passed as prop to CombinedFormatDisplay to avoid re-fetch — single useMatches call feeds both FormatVisualization and CombinedFormatDisplay"
  - "MatchResultModal groupId guard placed after winnerChanging check, before submitMatchResultDryRun call"

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 28 Plan 03: FormatVisualization Accordion Wiring Summary

**Accordion layout for GROUP format with per-group progress bars, CombinedFormatDisplay stacked sections with organizer completion banner, and dry-run skip for group match corrections**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T15:28:03Z
- **Completed:** 2026-03-17T15:30:56Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- GROUP format now shows groups in React Bootstrap Accordion with auto-expand of first group when tournament is IN_PROGRESS
- Each accordion header has a thin (4px) progress bar showing per-group match completion percentage
- GroupStandingsTable now receives all required props: isOrganizer, currentUserPlayerId, scoringRules, tournamentStatus
- CombinedFormatDisplay fully rewritten: Accordion for groups, direct KnockoutBracket for brackets, completion banner, bracket placeholder
- Organizer sees "Group stage complete" banner with Generate Knockout Bracket button when all group matches done and no bracket exists
- Non-organizer sees "Knockout bracket will appear after group stage completes" when no brackets
- Emoji removed from section headings (Group Stage, Knockout Phase)
- About Combined Format info alert removed
- MatchResultModal skips dry-run network request for group match corrections (match.groupId guard)
- useMatches shouldFetch now includes hasGroups so progress bars work even without brackets

## Task Commits

Each task was committed atomically:

1. **Task 1: Update FormatVisualization with Accordion layout and prop wiring** - `a8f55f0` (feat)
2. **Task 2: Update CombinedFormatDisplay with accordion groups, completion banner, bracket placeholder** - `af43a7b` (feat)
3. **Task 3: Skip dry-run in MatchResultModal for group matches** - `d93e05e` (feat)

## Files Created/Modified

- `frontend/src/components/FormatVisualization.jsx` - Added Accordion/ProgressBar imports, computeGroupsComplete/computeGroupCompletionPct helpers, extended useMatches shouldFetch, replaced ExpandableSection GROUP section with Accordion, updated COMBINED CombinedFormatDisplay calls with new props
- `frontend/src/components/CombinedFormatDisplay.jsx` - Full rewrite: Accordion for groups, completion banner, bracket placeholder, emoji removed, ExpandableSection removed, About Combined Format removed
- `frontend/src/components/MatchResultModal.jsx` - Added match?.groupId guard in runDryRunIfNeeded

## Decisions Made

- ExpandableSection removed from GROUP format — Accordion provides built-in collapse/expand with better UX
- allMatches passed as prop rather than re-fetching in CombinedFormatDisplay — avoids duplicate network requests
- Generate Knockout Bracket button wired to no-op (window.scrollTo) with TODO for Phase 30 — button presence signals next step to organizer
- groupId guard placed after winnerChanging check so fast-path for non-changing-winner still works

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FormatVisualization and CombinedFormatDisplay are ready for Phase 30 (Combined Format Advancement) where the Generate Knockout Bracket button action will be wired
- All GVIEW-01, GVIEW-02, GVIEW-03, GVIEW-04 requirements are now implemented

---
*Phase: 28-group-match-play-and-visualization*
*Completed: 2026-03-17*
