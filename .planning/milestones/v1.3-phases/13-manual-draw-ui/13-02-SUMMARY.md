---
phase: 13-manual-draw-ui
plan: "02"
subsystem: ui
tags: [react, vite, bracket, manual-draw, assignment-grid]

# Dependency graph
requires:
  - phase: 13-manual-draw-ui
    plan: "01"
    provides: isManualDraw flag in BracketGenerationSection, assignPosition() service function
  - phase: 12-manual-draw-api
    provides: PUT /api/v1/tournaments/:id/bracket/positions endpoint

provides:
  - ManualDrawEditor component: interactive Round 1 assignment grid with progress bar
  - BracketGenerationSection State C: conditional rendering of ManualDrawEditor vs seeded editor
  - TournamentViewPage: manual-draw-aware Start Tournament button with hint text

affects:
  - Human verification checkpoint (Task 3): end-to-end workflow testing required

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Immediate-save pattern: per-slot dropdown onChange calls API directly, no batch/save step"
    - "assigning lock state: single boolean disables all controls during any in-flight API call"
    - "Filtered dropdown options: derive placedIds Set from current match data, exclude from options"
    - "isManualDraw guard wrapping Save Draw button in State C header"

key-files:
  created:
    - frontend/src/components/ManualDrawEditor.jsx
  modified:
    - frontend/src/components/BracketGenerationSection.jsx
    - frontend/src/pages/TournamentViewPage.jsx

key-decisions:
  - "ManualDrawEditor uses immediate-save (no batch) — each dropdown selection calls assignPosition API immediately, consistent with the API's single-assignment design"
  - "Save Draw button hidden for manual draws with !isManualDraw guard — manual mode has no pending swaps state to save"
  - "Regenerate Draw button remains visible for manual draws so organizers can start over"
  - "TournamentViewPage uses outline-success variant for Start button on manual draws to indicate action required; backend enforces completeness"
  - "Singles sorted alphabetically (seeding score not in registrations response); doubles sorted by seedingScore descending"

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 13 Plan 02: Manual Draw Assignment Grid Summary

**Interactive manual bracket draw editor with per-slot dropdowns, progress bar, BYE cards, and Start Tournament button integration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T12:21:29Z
- **Completed:** 2026-03-04T12:23:49Z
- **Tasks:** 2 of 3 complete (Task 3 is human-verify checkpoint)
- **Files modified:** 3

## Accomplishments

- New `ManualDrawEditor` component (310 lines) provides the complete manual assignment grid:
  - Progress bar with `{filledSlots}/{totalSlots}` counter and green completion state
  - Round 1 non-BYE matches render per-slot `Form.Select` dropdowns
  - Dropdown options computed by excluding already-placed entity IDs (Set-based filter)
  - Selecting an option immediately calls `assignPosition()` API (no save step)
  - Filled slots show entity name with `×` clear button that calls `assignPosition(null)`
  - BYE matches render as disabled greyed cards with BYE badge, no interactive controls
  - `assigning` state lock prevents race conditions during API calls
  - API errors displayed via `useToast().showError()`
- `BracketGenerationSection` State C updated:
  - Imports and conditionally renders `ManualDrawEditor` when `isManualDraw` is true
  - Existing seeded slot editor preserved exactly for seeded draws
  - Save Draw button wrapped with `{!isManualDraw && ...}` guard (manual mode uses immediate-save)
  - Regenerate Draw button remains visible for both draw modes
- `TournamentViewPage` updated:
  - Imports `useFormatStructure`, fetches format structure for SCHEDULED tournaments
  - Derives `isManualDraw` and `hasBracket` from format structure
  - Start Tournament button: `outline-success` variant + hint text for manual draws
  - Backend error handling unchanged (INCOMPLETE_BRACKET response shown in existing Alert)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ManualDrawEditor component** - `0dd20d4` (feat)
2. **Task 2: Wire ManualDrawEditor into BracketGenerationSection and update Start button** - `e4a3faf` (feat)

**Task 3:** Pending human-verify checkpoint (visual/functional testing)

## Files Created/Modified

- `frontend/src/components/ManualDrawEditor.jsx` — New component: assignment grid, progress bar, dropdowns, clear buttons, BYE cards
- `frontend/src/components/BracketGenerationSection.jsx` — Added ManualDrawEditor import, conditional State C rendering, hidden Save Draw for manual mode
- `frontend/src/pages/TournamentViewPage.jsx` — Added useFormatStructure hook, isManualDraw derivation, updated Start Tournament button

## Decisions Made

- Immediate-save pattern chosen over batch-save: each dropdown selection triggers an API call directly, consistent with the backend's single-position assignment design and providing instant visual feedback
- Save Draw button hidden (not disabled) for manual draws: there are no pending swaps to batch-save in manual mode, so showing the button would be confusing
- Regenerate Draw visible for both modes: organizers should be able to start over regardless of draw mode
- `outline-success` variant for Start button on manual draws: visual cue that action (filling positions) is required before starting; actual enforcement is backend-side (INCOMPLETE_BRACKET error)
- `useFormatStructure` fetch gated on `tournament?.status === 'SCHEDULED'` to avoid unnecessary API calls for non-schedulable tournaments

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `frontend/src/components/ManualDrawEditor.jsx`
- FOUND commit `0dd20d4`: feat(13-02): create ManualDrawEditor component
- FOUND commit `e4a3faf`: feat(13-02): wire ManualDrawEditor into BracketGenerationSection and update Start button
- Frontend build: passed (2.37s, 2.31s)

## Pending

**Task 3 (checkpoint:human-verify):** End-to-end manual draw workflow testing required. See checkpoint details in plan.

---
*Phase: 13-manual-draw-ui*
*Completed: 2026-03-04 (Tasks 1-2; Task 3 pending human verification)*
