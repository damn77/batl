---
phase: 27-group-formation
plan: "03"
subsystem: frontend
tags: [react, react-bootstrap, group-formation, group-draw, swap, format-visualization]
dependency_graph:
  requires:
    - frontend/src/services/bracketPersistenceService.js (closeRegistration)
    - frontend/src/services/tournamentViewService.js (revertTournament)
    - frontend/src/components/GroupStandingsTable.jsx (rendered in State C)
    - frontend/src/components/ExpandableSection.jsx (collapsible group sections)
    - frontend/src/utils/ToastContext.jsx (showSuccess, showError)
    - POST /api/v1/tournaments/:id/group-draw (Plan 02)
    - POST /api/v1/tournaments/:id/group-draw/swap (Plan 02)
  provides:
    - frontend/src/services/groupDrawService.js (generateGroupDraw, swapGroupParticipants)
    - frontend/src/components/GroupDrawGenerationSection.jsx (4-state draw workflow)
    - frontend/src/components/FormatVisualization.jsx (GROUP + COMBINED organizer routing)
  affects:
    - frontend/src/components/FormatVisualization.jsx (GROUP + COMBINED branches updated)
tech_stack:
  added: []
  patterns:
    - SWR mutate cascade (mutateFormatStructure + mutateMatches after each API call)
    - 4-state machine matching BracketGenerationSection pattern (A/B/C/D)
    - apiClient error pattern (err.message, not err.response.data)
    - isOrganizerOrAdmin guard matching existing KNOCKOUT branch pattern
key_files:
  created:
    - frontend/src/services/groupDrawService.js
    - frontend/src/components/GroupDrawGenerationSection.jsx
  modified:
    - frontend/src/components/FormatVisualization.jsx
decisions:
  - "State C organizer swap: Player B dropdown filters out Player A's group to enforce cross-group swap client-side"
  - "COMBINED format: organizer with no groups sees only GroupDrawGenerationSection; with groups sees both GroupDrawGenerationSection and CombinedFormatDisplay stacked"
  - "GROUP format IN_PROGRESS without groups: still shows GroupDrawGenerationSection (handles State D locked view internally)"
metrics:
  duration: "~3 minutes"
  completed: "2026-03-17"
  tasks_completed: 3
  files_changed: 3
---

# Phase 27 Plan 03: Frontend Group Draw Workflow Summary

Frontend API service and 4-state organizer workflow component for GROUP/COMBINED tournament draw generation, player swap, and FormatVisualization routing.

## What Was Built

**Task 1: groupDrawService.js**

API client following the exact `bracketPersistenceService.js` pattern:
- `generateGroupDraw(tournamentId, { groupCount, seededRounds, randomSeed? })` — POST `/v1/tournaments/:id/group-draw`, returns `response.data.data`
- `swapGroupParticipants(tournamentId, participantAId, participantBId)` — POST `/v1/tournaments/:id/group-draw/swap`, returns `response.data.data`
- JSDoc annotations include all error codes from Plan 02 API layer

**Task 2: GroupDrawGenerationSection.jsx (609 lines)**

4-state machine component following the `BracketGenerationSection.jsx` pattern exactly:

- **State A** (SCHEDULED + registration open): "Draw Generation" card, player count sentence, `Button variant="primary" size="lg"` "Close Registration" with Spinner during async
- **State B** (SCHEDULED + registration closed, no groups): Registered player/pair ListGroup, group count number input, live group size preview Alert (updates reactively), seeded rounds input with helper text, "Generate Group Draw" button disabled when player count < 4 or invalid group count
- **State C** (SCHEDULED + groups exist): "Draw" + "Generated" Badge header with Regenerate Draw + Revert buttons, one ExpandableSection+GroupStandingsTable per group, Swap UI with two Form.Select dropdowns (Player B filters out Player A's group), "Swap Players" outline-primary button commits immediately
- **State D** (IN_PROGRESS): Revert-only card with locked message

Confirmation modals with exact UI-SPEC copy: "Regenerate Group Draw" (Keep Current Draw/Regenerate), "Revert to Scheduled" (Keep Groups/Revert to Scheduled). Error/success alerts auto-clear after 5000ms.

**Task 3: FormatVisualization.jsx updates**

- Added `import GroupDrawGenerationSection from './GroupDrawGenerationSection'`
- **GROUP branch**: `isOrganizerOrAdmin` guard — organizers in SCHEDULED/IN_PROGRESS-no-groups see `GroupDrawGenerationSection`; everyone else sees read-only `GroupStandingsTable` list (same guard pattern as KNOCKOUT branch)
- **COMBINED branch**: Three-way conditional — organizer SCHEDULED no-groups → GroupDrawGenerationSection only; organizer SCHEDULED with groups → GroupDrawGenerationSection + CombinedFormatDisplay; everyone else → CombinedFormatDisplay only

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| frontend/src/services/groupDrawService.js | FOUND |
| frontend/src/components/GroupDrawGenerationSection.jsx | FOUND |
| frontend/src/components/FormatVisualization.jsx | FOUND |
| GroupDrawGenerationSection.jsx >= 150 lines | FOUND (609 lines) |
| Commit c566083 (groupDrawService) | FOUND |
| Commit fcfbcf4 (GroupDrawGenerationSection) | FOUND |
| Commit 0e223ed (FormatVisualization) | FOUND |
| Frontend build: no errors | PASSED |
