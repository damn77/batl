---
phase: "05-loser-routing-and-consolation-progression"
plan: "02"
subsystem: "services"
tags: [consolation, loser-routing, bracket-lifecycle, match-result, prisma]
dependency_graph:
  requires: ["05-01"]
  provides: [DRAW-02, LIFE-01, LIFE-02, LIFE-03, LIFE-04]
  affects: [matchResultService, tournamentLifecycleService, consolationEligibilityService]
tech_stack:
  added: []
  patterns:
    - "routeLoserToConsolation called inside Prisma transaction after advanceBracketSlot"
    - "mirror-draw rule: posInRound (0-indexed) → consolationMatchIndex = Math.floor(posInRound / 2)"
    - "auto-BYE detection: check paired main match isBye before advancing lone consolation player"
    - "RETIRED auto-opt-out: ConsolationOptOut created with recordedBy='AUTO' inside transaction"
    - "checkAndCompleteTournament uses notIn ['COMPLETED','CANCELLED'] across ALL brackets"
key_files:
  created:
    - backend/src/services/consolationEligibilityService.js
  modified:
    - backend/src/services/matchResultService.js
    - backend/src/services/tournamentLifecycleService.js
decisions:
  - "routeLoserToConsolation is a no-op for non-MAIN brackets and non-R1 matches — no guard needed in matchResultService caller"
  - "RETIRED auto-opt-out uses try/catch around consolationOptOut.create to handle idempotent re-runs gracefully"
  - "checkAndCompleteTournament now uses notIn instead of not to allow both COMPLETED and CANCELLED as terminal states"
  - "doubles consolation routing updates both pair slot (pair1Id/pair2Id) AND representative player slot (player1Id/player2Id) in same update"
metrics:
  duration: "2 min"
  completed_date: "2026-03-01"
  tasks_completed: 2
  files_changed: 3
---

# Phase 05 Plan 02: Consolation Bracket Lifecycle — Loser Routing Summary

New consolationEligibilityService.js with real-match counting and mirror-draw loser routing; matchResultService calls routing after each result; tournamentLifecycleService blocks COMPLETED until all brackets (MAIN + CONSOLATION) are fully played.

## What Was Built

**Task 1: consolationEligibilityService.js (e3a62ac)**

Created new service at `backend/src/services/consolationEligibilityService.js` with three exports:

- `getRealMatchCount(tx, tournamentId, playerId, pairId)`: Fetches all terminal-state matches for a player/pair in the tournament. Excludes BYE (isBye=true), CANCELLED status, FORFEIT/NO_SHOW/WALKOVER outcomes. Counts RETIRED and COMPLETED as 1 real match each.

- `isConsolationEligible(tx, tournamentId, playerId, pairId)`: Returns true when real-match count < 2.

- `routeLoserToConsolation(tx, completedMatch, winnerId, isOrganizer)`: Full routing pipeline with 11 steps:
  1. Guard: only MAIN bracket matches proceed
  2. Guard: only Round 1 matches proceed (R2+ losers have ≥2 real matches)
  3. Find consolation bracket — return early for MATCH_1 tournaments
  4. Determine loserId from parsed result JSON
  5. RETIRED outcome: create ConsolationOptOut with recordedBy='AUTO', skip placement
  6. Check existing ConsolationOptOut — skip if opted out
  7. Check real-match count — skip if ≥2
  8. Mirror-draw: posInRound → Math.floor(posInRound/2) = consolation match index; posInRound%2===0 = player1 slot
  9. Throw CONSOLATION_SLOT_CONFLICT if slot already occupied
  10. Fill consolation slot with loserId (handles both singles and doubles)
  11. Auto-BYE: if paired main match is isBye=true, mark consolation match BYE and call advanceBracketSlot for the lone player

**Task 2: matchResultService + tournamentLifecycleService (626b4b7)**

`matchResultService.js`:
- Added import of `routeLoserToConsolation` from consolationEligibilityService
- Added `await routeLoserToConsolation(tx, updated, winnerId, isOrganizer)` call after `advanceBracketSlot` and before `checkAndCompleteTournament` inside the Prisma transaction

`tournamentLifecycleService.js`:
- Updated `checkAndCompleteTournament` JSDoc: "all brackets (MAIN + CONSOLATION)"
- Removed `bracket: { bracketType: 'MAIN' }` filter from the incomplete-match count query
- Changed `status: { not: 'COMPLETED' }` to `status: { notIn: ['COMPLETED', 'CANCELLED'] }` so CANCELLED matches (forfeit/no-show) are treated as terminal and don't block tournament completion

## Verification

- All 166 existing tests pass (16 test suites)
- Module loads cleanly: exports getRealMatchCount, isConsolationEligible, routeLoserToConsolation
- matchResultService contains routeLoserToConsolation call after advanceBracketSlot
- checkAndCompleteTournament uses notIn and no longer has bracketType MAIN filter

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- backend/src/services/consolationEligibilityService.js: FOUND
- backend/src/services/matchResultService.js: FOUND
- backend/src/services/tournamentLifecycleService.js: FOUND

Commits exist:
- e3a62ac: FOUND (feat(05-02): create consolationEligibilityService)
- 626b4b7: FOUND (feat(05-02): integrate loser routing and fix tournament completion check)
