---
phase: 29-group-standings-and-tiebreakers
plan: 01
subsystem: api
tags: [prisma, jest, tiebreaker, standings, group-stage, cycle-detection]

requires:
  - phase: 28-group-match-play-and-visualization
    provides: GroupParticipant model, match result JSON format (winner/sets/outcome), Group model

provides:
  - GroupTieResolution Prisma model (manual override persistence)
  - groupStandingsService.js pure functions: buildEntityStats, detectH2HCycle, sortWithTiebreakers, computeGroupStandings
  - getGroupStandings DB-backed wrapper for Phase 29 API layer
  - 28 unit tests verifying all 6 tiebreaker levels + cycle detection + partial resolution

affects:
  - 29-02 (API controller/routes will import getGroupStandings)
  - 29-03 (frontend GroupStandingsTable will consume API response shape)

tech-stack:
  added: []
  patterns:
    - "Pure function tiebreaker service: DB fetch wrapper calls pure computeGroupStandings for testability"
    - "Kahn's algorithm for H2H cycle detection in directed win-graph (in-degree check)"
    - "Recursive tiebreaker chain: resolveTiedGroup → resolveTiedGroupFromLevel with partial resolution support"
    - "groupByKey utility: groups sorted array by key function, preserving order within each group"

key-files:
  created:
    - backend/src/services/groupStandingsService.js
    - backend/__tests__/unit/groupStandingsService.test.js
  modified:
    - backend/prisma/schema.prisma

key-decisions:
  - "GroupTieResolution model uses groupId @unique — one override per group, upserted on save"
  - "resultSnapshotAt stored on override; stale detection uses strict > comparison (not >=) to avoid false positives at same-second saves"
  - "H2H cycle detection uses Kahn's: if all entities in subset have in-degree >= 1, it is cyclic"
  - "Partial H2H resolution: if H2H produces different win counts for some entities but not all, the resolvable sub-groups advance and the remaining tied sub-groups recurse"
  - "Alphabetical name fallback at level 6 as deterministic stable sort — entities remain in tiedRange, just stably ordered for display"
  - "sortWithTiebreakers passes empty matches array (no H2H available); computeGroupStandings passes full matches array — callers should use computeGroupStandings for H2H to work"

patterns-established:
  - "Pattern 1: TDD RED-GREEN — failing tests committed before implementation, all 28 tests pass in GREEN"
  - "Pattern 2: Entity abstraction — pair entities (pair1Id/pair2Id) treated identically to player entities (player1Id/player2Id) in match result parsing"
  - "Pattern 3: Pure function chain — each tiebreaker level is a pure comparison, no IO, independently verifiable"

requirements-completed: [GSTAND-01, GSTAND-02, GSTAND-03, GSTAND-06]

duration: 6min
completed: 2026-03-17
---

# Phase 29 Plan 01: Group Standings & Tiebreakers Schema + Service Summary

**Pure 6-level tiebreaker service with Kahn's cycle detection, partial resolution, and GroupTieResolution Prisma model — 28 unit tests all passing**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-17T18:40:47Z
- **Completed:** 2026-03-17T18:46:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- GroupTieResolution model added to Prisma schema with groupId @unique, positions JSON, resultSnapshotAt for stale detection; db push applied to PostgreSQL
- groupStandingsService.js implements all 5 exported pure functions: buildEntityStats, detectH2HCycle, sortWithTiebreakers, computeGroupStandings, getGroupStandings
- Full tiebreaker chain: wins → H2H (with Kahn's cycle detection) → set diff → game diff → fewest total games → manual override → alphabetical fallback
- Partial resolution: when a tiebreaker level separates some but not all tied entities, the resolved entities advance and the remaining recursively continue the chain
- 28 unit tests covering all 6 levels, 3-way cycle fall-through, 4-player partial cycle, doubles pairs, manual override stale detection, and edge cases

## Task Commits

1. **Task 1: Add GroupTieResolution model to Prisma schema** - `1147910` (feat)
2. **Task 2 RED: Failing unit tests for groupStandingsService** - `46f4c6b` (test)
3. **Task 2 GREEN: Implementation + all 28 tests passing** - `7770f05` (feat)

## Files Created/Modified
- `backend/prisma/schema.prisma` - Added GroupTieResolution model + tieResolution relation on Group
- `backend/src/services/groupStandingsService.js` - Pure tiebreaker functions + DB-backed getGroupStandings
- `backend/__tests__/unit/groupStandingsService.test.js` - 28 unit tests (all passing)

## Decisions Made
- Used `resultSnapshotAt` (DateTime) on GroupTieResolution instead of a hash — comparing timestamps against `max(match.completedAt)` is sufficient and avoids hashing complexity
- Stale check uses strict `>` (not `>=`) — override saved at time T is always after any match that triggered it, since the override is created after the organizer sees the result
- H2H is skipped when all entities in a subset have in-degree >= 1 (full cycle); partial cycles (where some entity has in-degree=0) are naturally resolved by H2H partial resolution
- The `sortWithTiebreakers` export passes empty matches for H2H (designed for callers without match access); `computeGroupStandings` passes full matches — documented in key-decisions

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed H2H test scenario (not implementation)**
- **Found during:** Task 2 GREEN (first test run)
- **Issue:** Test "resolves 2-player tie via H2H when direct result available" used a 2-player group where A beats B — A gets 1W, B gets 0W, so they're not tied on wins and H2H never runs
- **Fix:** Replaced with a 4-player scenario where A and B each have 2 wins (vs different opponents) with A also having beaten B in their H2H
- **Files modified:** `backend/__tests__/unit/groupStandingsService.test.js`
- **Verification:** All 28 tests now pass
- **Committed in:** 7770f05 (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test logic bug)
**Impact on plan:** Test scenario correction only — implementation was correct. No scope creep.

## Issues Encountered
- Jest CLI flag changed: `--testPathPattern` was replaced by `--testPathPatterns` (Jest 30.x). Discovered on first run, corrected immediately.

## Next Phase Readiness
- groupStandingsService.js exports are ready for the API controller (29-02)
- GroupTieResolution model is in the DB and available via Prisma client
- computeGroupStandings response shape matches the API response pattern documented in RESEARCH.md (standings[], unresolvedTies[], hasManualOverride, overrideIsStale)

---
*Phase: 29-group-standings-and-tiebreakers*
*Completed: 2026-03-17*
