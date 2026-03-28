---
phase: 31-points-integration-and-group-only-format
plan: "01"
subsystem: backend
tags: [points, group-format, combined-format, tdd, ranking]
dependency_graph:
  requires:
    - "29-group-standings-and-tiebreakers (getGroupStandings)"
    - "30-combined-format-advancement (bracket structure, MAIN/SECONDARY types)"
    - "008-tournament-rankings (RankingEntry, TournamentResult, Ranking models)"
  provides:
    - "deriveGroupResults() — reads group standings into results array"
    - "computeTierOffsets() — calculates mainOffset/secondaryOffset for COMBINED"
    - "awardGroupPointsSingles() — awards points using group.groupSize"
    - "awardGroupPointsDoubles() — awards pair + individual points from groups"
    - "deriveKnockoutResults() — derives placements from bracket match records"
    - "GROUP/COMBINED format auto-derive in POST /:id/calculate-points"
  affects:
    - "POST /api/v1/tournaments/:id/calculate-points"
    - "backend/src/services/pointCalculationService.js"
tech_stack:
  added: []
  patterns:
    - "TDD: RED (22 unit tests written first) → GREEN (implementation added)"
    - "Jest ES module mocking via jest.unstable_mockModule for prisma and groupStandingsService"
    - "Offset-based tier hierarchy: mainOffset > secondaryOffset > 0"
key_files:
  created:
    - "backend/__tests__/unit/groupPointCalculation.test.js"
    - "backend/__tests__/integration/groupCalculatePoints.test.js"
  modified:
    - "backend/src/services/pointCalculationService.js"
    - "backend/src/api/routes/tournamentRoutes.js"
decisions:
  - "Used groupSize field (Group.groupSize) for all group placement point calculations — not total registrations (D-02)"
  - "computeTierOffsets formula: secondaryOffset = maxGroupPoints + 1, mainOffset = maxSecondaryPoints + 1"
  - "Integration tests use service-level mocking — auth-protected endpoint tested for 401 only"
  - "GROUP auto-completion requires no code change to tournamentLifecycleService (verified by test)"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_modified: 4
  tests_added: 39
---

# Phase 31 Plan 01: Group Point Calculation and Route Extension Summary

**One-liner:** Backend group point derivation with groupSize-based participant count, COMBINED tier offset hierarchy, and GROUP/COMBINED auto-derive branch in calculate-points route.

## What Was Built

### Task 1: Group point derivation service functions (TDD)

Added 5 new functions and 2 exported helpers to `pointCalculationService.js`:

1. **`deriveGroupResults(tournamentId)`** — Calls `getGroupStandings()` per group, collects standings positions into `{playerId/pairId, placement}` results. Throws `UNRESOLVED_TIES` error if any group has unresolved tied positions (D-11). Detects singles vs doubles from `tournament.category.type`.

2. **`computeTierOffsets(largestGroupSize, pointConfig, secondaryBracketSize)`** — Computes `{mainOffset, secondaryOffset}` guaranteeing worst main bracket result > best secondary result > best group-only result (D-07). Formula: `secondaryOffset = maxGroupPoints + 1`, `mainOffset = maxSecondaryPoints + 1`.

3. **`awardGroupPointsSingles(tournamentId, groupResults, pointConfig, offset=0)`** — Awards points using `group.groupSize` as participant count (not total registrations). Creates `RankingEntry` + `TournamentResult` records per player. Supports optional offset for COMBINED tier.

4. **`awardGroupPointsDoubles(tournamentId, groupResults, pointConfig, offset=0)`** — Same as above for doubles. Creates PAIR + individual player (MEN/WOMEN) ranking entries following `awardPointsDoublesTournament` pattern.

5. **`deriveKnockoutResults(tournamentId, bracketId, isDoubles)`** — Reads completed bracket matches, derives placement from match progression (final winner = 1st, final loser = 2nd, semifinal losers = 3rd, etc.).

Also **exported** two previously-private helpers: `updateRankingEntry` and `recalculateRanks`.

**22 unit tests** covering: `computeTierOffsets` math, `deriveGroupResults` singles/doubles shape, `UNRESOLVED_TIES` throwing, `awardGroupPointsSingles` with groupSize count and offset, `awardGroupPointsDoubles` with offset, and `deriveKnockoutResults` placement derivation.

### Task 2: Extended calculate-points route + integration tests

Rewrote the `POST /:id/calculate-points` handler in `tournamentRoutes.js`:

- **GROUP format:** Auto-derives results from standings, awards points with `awardGroupFn(..., offset=0)`, returns success. No `results` body required.
- **COMBINED format:** Builds advancing entity sets from bracket matches, filters group results to non-advancing players only, awards group points (offset=0) and knockout points (mainOffset/secondaryOffset) via `deriveKnockoutResults`.
- **KNOCKOUT format:** Unchanged — still requires `results` body.
- **UNRESOLVED_TIES:** Returns HTTP 400 with `{success: false, error: {code: 'UNRESOLVED_TIES', ...}}` when any group has tied positions.

**17 integration tests** covering: auth guard (401), GROUP derivation flow, UNRESOLVED_TIES blocking, COMBINED offset verification (PTS-02 — advancing player `pointsAwarded > maxGroupPoints`), doubles flow, and GROUP auto-completion lifecycle (D-08 verified).

## Deviations from Plan

None — plan executed exactly as written.

The GROUP auto-completion test (D-08) was implemented by directly testing `checkAndCompleteTournament` with a mock transaction (no code change needed to `tournamentLifecycleService.js`, as confirmed by the research phase). The plan allowed for this approach.

## Known Stubs

None. All new functions are fully implemented and wired. The integration tests mock services to avoid database dependencies, but this is the established project test pattern, not a stub.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `backend/src/services/pointCalculationService.js` | FOUND |
| `backend/src/api/routes/tournamentRoutes.js` | FOUND |
| `backend/__tests__/unit/groupPointCalculation.test.js` | FOUND |
| `backend/__tests__/integration/groupCalculatePoints.test.js` | FOUND |
| Commit 8712748 (task 1) | FOUND |
| Commit 345abbb (task 2) | FOUND |
| All 39 tests passing | VERIFIED |
