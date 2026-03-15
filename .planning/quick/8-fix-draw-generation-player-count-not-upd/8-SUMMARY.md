---
phase: quick-8
plan: 01
subsystem: frontend
tags: [bug-fix, registration, bracket-generation, state-sync]
dependency_graph:
  requires: [quick-7]
  provides: [real-time player count in Draw Generation section]
  affects: [BracketGenerationSection, FormatVisualization, TournamentViewPage]
tech_stack:
  added: []
  patterns: [prop-threading, useEffect dependency tracking]
key_files:
  created: []
  modified:
    - frontend/src/pages/TournamentViewPage.jsx
    - frontend/src/components/FormatVisualization.jsx
    - frontend/src/components/BracketGenerationSection.jsx
decisions:
  - Both FormatVisualization usages in TournamentViewPage (accordion and hero bracket) received the registrationVersion prop for completeness
metrics:
  duration: "3min"
  completed: "2026-03-15"
  tasks: 1
  files: 3
---

# Quick Task 8: Fix Draw Generation Player Count Not Updating — Summary

**One-liner:** Threaded registrationVersion counter through TournamentViewPage -> FormatVisualization -> BracketGenerationSection useEffect dependency to trigger re-fetch on registration changes.

## What Was Done

Quick task 7 introduced a `registrationVersion` counter in TournamentViewPage that increments whenever an organizer adds or removes a player from the registration list. That counter was already passed to `PlayerListPanel` (via `refreshKey`), but `BracketGenerationSection` was missed — it fetched registrations once on mount and never re-fetched.

This task closed that gap with three targeted one-line changes:

1. **TournamentViewPage.jsx** — Added `registrationVersion={registrationVersion}` to both `<FormatVisualization>` usages (the accordion-wrapped SCHEDULED version and the hero bracket IN_PROGRESS/COMPLETED version).

2. **FormatVisualization.jsx** — Added `registrationVersion` to destructured props and forwarded it as a prop to `<BracketGenerationSection>`.

3. **BracketGenerationSection.jsx** — Added `registrationVersion` to destructured props and to the `useEffect` dependency array (changed `[tournament?.id]` to `[tournament?.id, registrationVersion]`).

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Thread registrationVersion from TournamentViewPage through FormatVisualization to BracketGenerationSection | abc4b6e | BracketGenerationSection.jsx, FormatVisualization.jsx, TournamentViewPage.jsx |

## Deviations from Plan

None — plan executed exactly as written. The only addition was applying the prop to both FormatVisualization usages in TournamentViewPage (accordion and hero bracket), which the plan's single-line description implied but did not enumerate explicitly.

## Self-Check: PASSED

- FOUND: frontend/src/components/BracketGenerationSection.jsx
- FOUND: frontend/src/components/FormatVisualization.jsx
- FOUND: frontend/src/pages/TournamentViewPage.jsx
- FOUND: commit abc4b6e
