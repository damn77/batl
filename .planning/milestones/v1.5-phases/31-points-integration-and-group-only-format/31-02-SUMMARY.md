---
phase: 31-points-integration-and-group-only-format
plan: 02
subsystem: frontend
tags: [group-standings, advancement-badges, calculate-points, tiebreaker-guard]
dependency_graph:
  requires: [31-01]
  provides: [GVIEW-05, PTS-03-frontend]
  affects: [GroupStandingsTable, CombinedFormatDisplay, TournamentPointConfigPage, tournamentService]
tech_stack:
  added: []
  patterns: [React Bootstrap Badge, useMemo for computed display state, OverlayTrigger disabled-button tooltip]
key_files:
  created: []
  modified:
    - frontend/src/components/GroupStandingsTable.jsx
    - frontend/src/components/CombinedFormatDisplay.jsx
    - frontend/src/pages/TournamentPointConfigPage.jsx
    - frontend/src/services/tournamentService.js
decisions:
  - "advancementMap computed via useMemo in GroupStandingsTable from standings + advancementConfig + matches terminal state"
  - "GROUP-only format: advancementConfig prop omitted (defaults null) — no badges rendered by design"
  - "Calculate Points card shown only for COMPLETED GROUP/COMBINED tournaments, not KNOCKOUT (handled separately)"
  - "loadData fetches group standings for all groups to check unresolvedTies pre-emptively on page load"
  - "tournamentService.calculateTournamentPoints updated with null results default — empty body for GROUP/COMBINED, backward compatible with KNOCKOUT results array"
metrics:
  duration: 15m
  completed: "2026-03-28"
  tasks: 2
  files: 4
---

# Phase 31 Plan 02: Advancement Badges and Calculate Points Button Summary

Advancement status badges added to group standings rows for COMBINED tournaments, and a Calculate Points button with unresolved-ties guard added to TournamentPointConfigPage for GROUP/COMBINED formats.

## What Was Built

### Task 1: advancementConfig prop and advancement badges in GroupStandingsTable

`GroupStandingsTable.jsx` now accepts an `advancementConfig = null` prop. When provided (COMBINED tournaments only), a `useMemo` computes `advancementMap` — a map of entity IDs to `'MAIN'` or `'SECONDARY'` — based on standings position thresholds and match terminal state. Badges only appear when all group matches are COMPLETED or CANCELLED. The entity name cell in the standings table now renders inline `<Badge bg="primary">Main</Badge>` or `<Badge bg="secondary">Secondary</Badge>` at `fontSize: '10px'`, matching the existing tiebreaker criterion badge style.

`CombinedFormatDisplay.jsx` parses `tournament.formatConfig` to extract `advancePerGroup` and `advancePerGroupSecondary`, then passes `advancementConfig` to each `GroupStandingsTable`. If `advancePerGroup === 0`, null is passed and no badges are shown.

`FormatVisualization.jsx` GROUP path: no changes — `GroupStandingsTable` gets no `advancementConfig`, so badges remain absent for GROUP-only tournaments (correct by design per D-09).

### Task 2: Calculate Points button with unresolved-ties guard

`TournamentPointConfigPage.jsx` now shows a "Calculate Points" card for COMPLETED GROUP/COMBINED tournaments. On `loadData`, after fetching the tournament, the page fetches format structure and then individual group standings to pre-check for `unresolvedTies`. The Calculate Points button is disabled with an `OverlayTrigger` tooltip ("Resolve all group tiebreakers first") when `unresolvedGroups.length > 0`. A Bootstrap `danger` alert lists which groups have unresolved tied positions with instructions.

`handleCalculatePoints` calls `calculateTournamentPoints(id, null)` — the backend auto-derives all results for GROUP/COMBINED formats. On `UNRESOLVED_TIES` error code, `loadData` is refreshed to update the list. Success shows a `variant="success"` alert.

`tournamentService.calculateTournamentPoints` updated: accepts `results = null` default. When null, sends `{}` (empty body). When truthy, sends `{ results }`. This preserves full backward compatibility with the existing KNOCKOUT point calculation flow.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired to real API responses.

## Self-Check: PASSED

- GroupStandingsTable.jsx: FOUND
- CombinedFormatDisplay.jsx: FOUND
- TournamentPointConfigPage.jsx: FOUND
- tournamentService.js: FOUND
- Task 1 commit 9c75fe0: FOUND
- Task 2 commit db685e3: FOUND
- Frontend build: passes (0 errors, chunk size warning is pre-existing)
