---
phase: 28-group-match-play-and-visualization
plan: "01"
subsystem: backend
tags: [group-play, lifecycle, doubles, tdd]
dependency_graph:
  requires: []
  provides: [COMBINED-lifecycle-guard, doubles-pair-in-group-structure]
  affects: [tournamentLifecycleService, tournamentService, Wave0-tests]
tech_stack:
  added: []
  patterns: [jest-unstable-mockModule, tx-mock-pattern]
key_files:
  created:
    - backend/__tests__/unit/combinedLifecycleGuard.test.js
    - backend/__tests__/unit/groupMatchResult.test.js
  modified:
    - backend/src/services/tournamentLifecycleService.js
    - backend/src/services/tournamentService.js
decisions:
  - "Wave 0 test stubs use jest.unstable_mockModule for ES module safe mocking of prisma singleton and tournamentLifecycleService"
  - "COMBINED guard queries tournament.findUnique INSIDE the incompleteCount===0 block — no query cost on partial completions"
  - "bracket.findFirst used (not findMany) — only need to know if ANY knockout bracket exists"
  - "getFormatStructure GROUP and COMBINED transforms now emit both players[] and pairs[] — empty arrays for inapplicable type, no nullable undefined"
metrics:
  duration: 3m
  completed_date: "2026-03-17"
  tasks_completed: 2
  files_changed: 4
---

# Phase 28 Plan 01: Wave 0 Test Stubs + COMBINED Lifecycle Guard + Doubles Pair Support Summary

COMBINED tournament lifecycle guard prevents premature tournament completion when group stage is complete but no knockout bracket exists yet, plus doubles pair data exposed through getFormatStructure for GROUP and COMBINED formats.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create Wave 0 test stubs (combinedLifecycleGuard + groupMatchResult) | 703c923 | `combinedLifecycleGuard.test.js`, `groupMatchResult.test.js` |
| 2 | COMBINED lifecycle guard + doubles pair in getFormatStructure | acfe1fd | `tournamentLifecycleService.js`, `tournamentService.js` |

## What Was Built

**COMBINED lifecycle guard** (`tournamentLifecycleService.js`): When all matches are complete (`incompleteCount === 0`), the function now checks if the tournament is COMBINED format. If so, it queries `bracket.findFirst` — if no knockout bracket exists, it returns early (tournament stays `IN_PROGRESS`). If a bracket exists, or if the format is not COMBINED, tournament proceeds to `COMPLETED`. This is a minimal query-cost guard that only runs when all matches are done.

**Doubles pair in getFormatStructure** (`tournamentService.js`): Both `GROUP` and `COMBINED` cases now include the `pair` relation (with `player1` and `player2` sub-selects) in the `groupParticipants` include block. The transform maps `groupParticipants` to two arrays: `players[]` (filtered by `gp.player`) and `pairs[]` (filtered by `gp.pair`). Singles tournaments get an empty `pairs[]`, doubles tournaments get an empty `players[]`. Both arrays always exist (never undefined).

**Wave 0 test stubs**: 8 tests across 2 files. All pass GREEN after Task 2 implementation. Tests use the `buildTx` mock pattern (jest.fn() objects for each prisma method) and `jest.unstable_mockModule` for ES module safe mocking.

## Decisions Made

1. **COMBINED guard location**: Guard queries `tournament.findUnique` inside the `incompleteCount === 0` block — no extra DB query on partial completions. Only called when all matches are done.
2. **bracket.findFirst not findMany**: Only need to know if ANY knockout bracket exists. `findFirst` returns immediately on first match.
3. **Both arrays always present**: `players[]` and `pairs[]` both emitted from transform regardless of tournament type. Prevents frontend from needing null checks.
4. **Wave 0 tests use direct tx mock**: `combinedLifecycleGuard.test.js` passes mock `tx` directly to `checkAndCompleteTournament` — no module-level prisma mock needed since the function accepts `tx` as parameter.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

```
cd backend && npm test -- --testPathPatterns="combinedLifecycle|groupMatchResult"
# 8 passed, 8 total

grep -c "formatType === 'COMBINED'" backend/src/services/tournamentLifecycleService.js
# 1

grep -c "gp.pair" backend/src/services/tournamentService.js
# 2

npm test
# 295 passed, 295 total (no regressions)
```
