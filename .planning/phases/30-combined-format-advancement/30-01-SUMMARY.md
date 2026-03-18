---
phase: 30-combined-format-advancement
plan: 01
subsystem: api
tags: [prisma, jest, knockout-bracket, advancement, waterfall, seeding]

# Dependency graph
requires:
  - phase: 29-group-standings-and-tiebreakers
    provides: getGroupStandings() with standings, unresolvedTies, tiebreaker chain
  - phase: 009-bracket-generation
    provides: getBracketByPlayerCount() bracket structure templates
  - phase: 010-seeding-placement
    provides: placeTwoSeeds/placeFourSeeds/placeEightSeeds/placeSixteenSeeds, shuffle, getSeedCount
provides:
  - computeAdvancementPreview(tournamentId) - waterfall preview without DB writes
  - confirmAdvancement(tournamentId) - atomic bracket generation from group results
  - revertAdvancement(tournamentId) - delete brackets, unlock groups
  - computeWaterfall() + crossGroupRank() - pure algorithm functions for cross-group seeding
  - SECONDARY enum value in BracketType (schema migration applied)
  - Multi-bracket lifecycle guard in checkAndCompleteTournament
affects:
  - 30-02 (advancement API routes consume these service functions)
  - 30-03 (frontend wires to these endpoints)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Waterfall spillover algorithm with position-based advancement and cross-group ranking
    - Group-to-bracket generation reusing seedingPlacementService placement functions
    - Group lock state stored as JSON in Group.advancementCriteria field

key-files:
  created:
    - backend/src/services/advancementService.js
    - backend/__tests__/unit/advancementService.test.js
  modified:
    - backend/prisma/schema.prisma
    - backend/src/services/tournamentLifecycleService.js
    - backend/__tests__/unit/combinedLifecycleGuard.test.js

key-decisions:
  - "crossGroupRank uses 5-level tiebreaker (wins/setDiff/gameDiff/totalGames/name) — H2H skipped since players from different groups never played each other"
  - "computeWaterfall exported as named export so unit tests can import it directly without DB mocking"
  - "Bracket.placementRange reused for bracket label ('Main Bracket'/'Secondary Bracket') — avoids new schema field"
  - "SECONDARY added to BracketType enum (not CONSOLATION reuse) to prevent incorrect lifecycle/display branching"
  - "Multi-bracket lifecycle guard uses bracket.count instead of findFirst — semantically clearer for 0-2 bracket scenarios"
  - "combinedLifecycleGuard.test.js updated from findFirst mock to count mock (Rule 1 auto-fix)"

patterns-established:
  - "Pattern: Export pure algorithm functions alongside async DB functions for direct unit testing"
  - "Pattern: bracketType SECONDARY for second combined-format bracket (distinct from CONSOLATION)"

requirements-completed: [COMB-03, COMB-04, COMB-05, COMB-06, COMB-08, COMB-09]

# Metrics
duration: 11min
completed: 2026-03-18
---

# Phase 30 Plan 01: Schema Migration + Advancement Service Summary

**Waterfall advancement service with 5-level cross-group ranking, atomic bracket generation from group standings, and SECONDARY BracketType enum**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-18T00:01:20Z
- **Completed:** 2026-03-18T00:12:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Implemented `computeWaterfall` — position-based waterfall filling main then secondary slots; cross-group ranking uses wins/setDiff/gameDiff/totalGames/name tiebreaker chain
- Implemented `confirmAdvancement` — atomic transaction creating Bracket/Round/Match records from group standings using existing seeding placement infrastructure; supports singles and doubles
- Implemented `revertAdvancement` — cascade delete brackets and unlock groups, guarded by completed match check
- Added `SECONDARY` to `BracketType` enum; schema applied via `prisma db push`
- Updated lifecycle guard to use `bracket.count` for multi-bracket COMBINED tournament completion detection
- 15 unit tests verify crossGroupRank tiebreaker chain (all 5 levels) and computeWaterfall distribution (8 scenarios)

## Task Commits

1. **Task 1: Schema migration + advancementService.js waterfall and bracket generation** - `5e59681` (feat)
2. **Task 2: Update tournament lifecycle guard for multi-bracket completion** - `7a21da7` (feat)
3. **Auto-fix: combinedLifecycleGuard test mock update** - `6480e4e` (fix)

## Files Created/Modified
- `backend/src/services/advancementService.js` - Waterfall algorithm, bracket generation from group results, revert logic
- `backend/__tests__/unit/advancementService.test.js` - 15 unit tests for crossGroupRank and computeWaterfall
- `backend/prisma/schema.prisma` - Added SECONDARY to BracketType enum
- `backend/src/services/tournamentLifecycleService.js` - COMBINED guard updated from findFirst to count
- `backend/__tests__/unit/combinedLifecycleGuard.test.js` - Updated mock from findFirst to count

## Decisions Made
- crossGroupRank exports as named export alongside computeWaterfall so unit tests can test pure functions without Prisma mocking
- Group lock state stored in existing `Group.advancementCriteria` field as `{ locked: true, lockedAt: ISO }` JSON — no new column
- Secondary bracket uses matchNumber offset of 1000 (same pattern as consolation brackets)
- SECONDARY BracketType added rather than reusing CONSOLATION to prevent display/lifecycle code from misidentifying bracket type

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] combinedLifecycleGuard tests used bracket.findFirst but implementation uses bracket.count**
- **Found during:** Post-Task 2 full test suite run
- **Issue:** Existing unit tests in `combinedLifecycleGuard.test.js` had mock using `bracket.findFirst`. Task 2 changed to `bracket.count`, causing 2 test failures.
- **Fix:** Updated `buildTx` helper to use `bracket.count` mock; updated all 4 test assertions to match new interface
- **Files modified:** `backend/__tests__/unit/combinedLifecycleGuard.test.js`
- **Verification:** `npm test -- --testPathPatterns=combinedLifecycleGuard` passes (4/4); full suite passes (383/383)
- **Committed in:** `6480e4e`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Auto-fix necessary for test correctness after lifecycle guard API change. No scope creep.

## Issues Encountered
- Bash heredoc approach failed due to JavaScript single-quote content; used node script file pattern to write the service file

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `advancementService.js` exports three functions ready for route wiring in Plan 02
- Schema migration applied; SECONDARY enum available for Prisma queries
- Full test suite at 383 tests, all passing

## Self-Check: PASSED

- FOUND: `backend/src/services/advancementService.js`
- FOUND: `backend/__tests__/unit/advancementService.test.js`
- FOUND: `.planning/phases/30-combined-format-advancement/30-01-SUMMARY.md`
- FOUND: commit 5e59681 (Task 1)
- FOUND: commit 7a21da7 (Task 2)
- FOUND: commit 6480e4e (Auto-fix)
