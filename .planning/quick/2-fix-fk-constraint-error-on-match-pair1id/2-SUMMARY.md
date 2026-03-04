---
phase: quick-fix
plan: 2
subsystem: bracket-generation
tags: [bug-fix, seeding, doubles, fk-constraint]
dependency_graph:
  requires: [010-seeding-placement, phase-01.1-bracket-persistence]
  provides: [correct-doubles-seeding]
  affects: [draw-generation-for-doubles-tournaments]
tech_stack:
  added: []
  patterns: [entity-type-filtering, defensive-validation]
key_files:
  modified:
    - backend/src/services/seedingPlacementService.js
    - backend/src/services/bracketPersistenceService.js
decisions:
  - "Filter PAIR-only rankings in getSeededPlayers for doubles categories rather than adding a category type parameter — category type is available from the rankings data itself"
  - "Add defensive guard in bracketPersistenceService as belt-and-suspenders validation, not relying solely on the seeding service fix"
metrics:
  duration: ~10 minutes
  completed: 2026-03-04
  tasks_completed: 2
  files_modified: 2
---

# Quick Fix 2: Fix FK Constraint Error on Match pair1Id Summary

**One-liner:** Filter PAIR-only rankings for doubles seeding to prevent PlayerProfile IDs from being written to Match.pair1Id/pair2Id FK fields.

## What Was Done

Fixed a `Match_pair1Id_fkey` foreign key constraint violation that occurred when generating draws for DOUBLES (e.g., Mixed Doubles) tournaments.

### Root Cause

`getSeededPlayers()` in `seedingPlacementService.js` was aggregating ranking entries across ALL ranking types (PAIR, MEN, WOMEN) for a doubles category. MEN/WOMEN ranking entries contain PlayerProfile IDs as `entityId`, but `bracketPersistenceService.js` assigns these to `pair1Id`/`pair2Id` Match fields, which have a FK constraint to the DoublesPair table. PlayerProfile IDs are not valid DoublesPair IDs, causing the FK violation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Filter ranking entries by entity type in getSeededPlayers | 0853c24 | backend/src/services/seedingPlacementService.js |
| 2 | Add defensive guard in bracketPersistenceService for doubles entity type | dca5d38 | backend/src/services/bracketPersistenceService.js |

## Changes Made

### Task 1: seedingPlacementService.js

Added category type detection and filtering in `getSeededPlayers()`:

```javascript
// Determine category type from the rankings data
const categoryType = rankings[0]?.category?.type;

// Filter to the appropriate ranking type before flatMapping entries
const relevantRankings = rankings.filter(ranking => {
  if (categoryType === 'DOUBLES') return ranking.type === 'PAIR';
  return ranking.type === 'SINGLES';
});

const allEntries = relevantRankings.flatMap(ranking => ranking.entries || []);
```

- SINGLES categories: only SINGLES ranking entries (PlayerProfile IDs) are selected
- DOUBLES categories: only PAIR ranking entries (DoublesPair IDs) are selected
- Improved error message for doubles categories: "No PAIR rankings found for doubles category {id}"
- No function signature change needed — category type is available from the rankings data

### Task 2: bracketPersistenceService.js

Added Step 7c defensive guard after unseeded player fill-in and before the Prisma transaction:

```javascript
if (categoryType === 'DOUBLES') {
  const entityIds = positions.map(p => p.entityId).filter(id => id != null);
  if (entityIds.length > 0) {
    const pairCount = await prisma.doublesPair.count({ where: { id: { in: entityIds } } });
    if (pairCount !== entityIds.length) {
      throw makeError('INVALID_ENTITY_IDS', `Seeding returned ${entityIds.length - pairCount} entity IDs that are not valid DoublesPair records...`);
    }
  }
}
```

- Validates all non-null entityIds in positions array are valid DoublesPair records
- Throws `INVALID_ENTITY_IDS` with clear, actionable message instead of raw FK violation
- Belt-and-suspenders guard: Task 1 fixes the root cause; this ensures clear errors from any future code paths

## Verification

- All 22 seeding placement unit tests pass (seedingPlacement2Seed, seedingPlacement4Seed)
- All 16 bracket persistence service unit tests pass
- Full unit test suite: 102 tests across 10 test files — all passing

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `backend/src/services/seedingPlacementService.js` modified and committed (0853c24)
- [x] `backend/src/services/bracketPersistenceService.js` modified and committed (dca5d38)
- [x] All 102 unit tests pass

## Self-Check: PASSED
