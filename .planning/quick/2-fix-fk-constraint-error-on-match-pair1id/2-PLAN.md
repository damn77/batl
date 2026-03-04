---
phase: quick-fix
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/services/seedingPlacementService.js
  - backend/src/services/bracketPersistenceService.js
autonomous: true
requirements: []
must_haves:
  truths:
    - "Draw generation for DOUBLES tournaments uses DoublesPair IDs (not PlayerProfile IDs) in match pair1Id/pair2Id fields"
    - "Seeding for DOUBLES tournaments selects only PAIR ranking entries, not MEN/WOMEN individual player entries"
    - "Draw generation for SINGLES tournaments continues to work unchanged"
  artifacts:
    - path: "backend/src/services/seedingPlacementService.js"
      provides: "Filtered ranking type selection for seeding"
      contains: "PAIR"
    - path: "backend/src/services/bracketPersistenceService.js"
      provides: "Bracket persistence with correct doubles entity handling"
  key_links:
    - from: "bracketPersistenceService.js"
      to: "seedingPlacementService.js"
      via: "generateSeededBracket()"
      pattern: "generateSeededBracket"
---

<objective>
Fix foreign key constraint error (`Match_pair1Id_fkey`) when generating a draw for DOUBLES (e.g., Mixed Doubles) tournaments.

Purpose: The error occurs because `getSeededPlayers()` in seedingPlacementService.js aggregates ranking entries across ALL ranking types (PAIR, MEN, WOMEN) for a doubles category. MEN/WOMEN ranking entries contain PlayerProfile IDs as `entityId`, but bracketPersistenceService.js assigns these to `pair1Id`/`pair2Id` Match fields, which have a FK constraint to the DoublesPair table. PlayerProfile IDs are not valid DoublesPair IDs, causing the FK violation.

Output: Fixed seeding placement that filters to PAIR-only rankings for doubles categories, so only DoublesPair IDs flow into match pair fields.
</objective>

<execution_context>
@C:/Users/erich/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/erich/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@backend/src/services/seedingPlacementService.js
@backend/src/services/bracketPersistenceService.js
@backend/prisma/schema.prisma

Root cause analysis:

1. `bracketPersistenceService.js` line 147-152: For DOUBLES, loads PairRegistration records and extracts `r.pair.id` (DoublesPair IDs) as `allEntities[].entityId` -- this is CORRECT.

2. `bracketPersistenceService.js` line 173: Calls `generateSeededBracket(categoryId, playerCount, randomSeed)`.

3. `seedingPlacementService.js` line 387-440 (`getSeededPlayers`): Calls `getRankingsForCategory(categoryId, currentYear)` which returns ALL ranking types for the category. For a Mixed Doubles category, this returns PAIR, MEN, and WOMEN rankings. Line 400 flatMaps ALL entries across all types. MEN/WOMEN entries have `entityId = entry.playerId` (a PlayerProfile UUID). PAIR entries have `entityId = entry.pairId` (a DoublesPair UUID).

4. The seeding algorithm places these mixed entity IDs into `positions[].entityId`.

5. `bracketPersistenceService.js` lines 277-289: For DOUBLES, assigns `pair1Id: pos1?.entityId`. When `entityId` is a PlayerProfile ID (from MEN/WOMEN ranking), this violates the `Match_pair1Id_fkey` FK constraint to DoublesPair.

Fix: Filter `getSeededPlayers` to only use PAIR ranking entries for doubles categories, and SINGLES ranking entries for singles categories.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Filter ranking entries by entity type in getSeededPlayers</name>
  <files>backend/src/services/seedingPlacementService.js</files>
  <action>
In `getSeededPlayers()` (around line 387), after retrieving rankings via `getRankingsForCategory()`:

1. Determine the category type from the returned rankings data. The rankings include `category: true` in their query, so each ranking object has a `.category.type` field (either 'SINGLES' or 'DOUBLES').

2. Filter the rankings array to only include the appropriate ranking type BEFORE flatMapping entries:
   - For SINGLES categories: only include rankings where `ranking.type === 'SINGLES'`
   - For DOUBLES categories: only include rankings where `ranking.type === 'PAIR'`

3. This ensures that `allEntries` only contains entries with the correct entity type:
   - SINGLES -> entries with `playerId` (PlayerProfile IDs)
   - DOUBLES/PAIR -> entries with `pairId` (DoublesPair IDs)

The change should look approximately like:

```javascript
// Determine category type from rankings data
const categoryType = rankings[0]?.category?.type;

// Filter to appropriate ranking type for seeding
// SINGLES categories use SINGLES rankings
// DOUBLES categories use PAIR rankings (not MEN/WOMEN individual rankings)
const relevantRankings = rankings.filter(ranking => {
  if (categoryType === 'DOUBLES') return ranking.type === 'PAIR';
  return ranking.type === 'SINGLES';
});

const allEntries = relevantRankings.flatMap(ranking => ranking.entries || []);
```

Also update the error message at lines 394 and 402 to indicate the filtered context if no relevant rankings are found. E.g., "No PAIR rankings found for doubles category {categoryId}".

Do NOT change the function signature -- no new parameters needed since the category type is available from the rankings query result.
  </action>
  <verify>
    <automated>cd D:/Workspace/BATL && npx vitest run backend/__tests__/unit/seedingPlacement2Seed.test.js backend/__tests__/unit/seedingPlacement4Seed.test.js --reporter=verbose 2>&1 | tail -20</automated>
  </verify>
  <done>getSeededPlayers() filters ranking entries by PAIR type for DOUBLES categories and SINGLES type for SINGLES categories, preventing PlayerProfile IDs from being returned as entityId for doubles seeding</done>
</task>

<task type="auto">
  <name>Task 2: Add defensive guard in bracketPersistenceService for doubles entity type</name>
  <files>backend/src/services/bracketPersistenceService.js</files>
  <action>
Add a defensive validation in the `generateBracket()` function AFTER step 7b (around line 226, after unseeded players are filled in) and BEFORE step 8 (the persistence transaction).

When `categoryType === 'DOUBLES'`, validate that all non-null entityId values in the positions array actually exist as DoublesPair records. This prevents the FK violation from reaching Prisma and provides a clear, actionable error message.

Add this validation:

```javascript
// Step 7c: Defensive guard — validate entity IDs match expected table
// For DOUBLES, all entityIds must be valid DoublesPair IDs
// For SINGLES, all entityIds must be valid PlayerProfile IDs
if (categoryType === 'DOUBLES') {
  const entityIds = positions
    .map(p => p.entityId)
    .filter(id => id != null);
  if (entityIds.length > 0) {
    const pairCount = await prisma.doublesPair.count({
      where: { id: { in: entityIds } }
    });
    if (pairCount !== entityIds.length) {
      throw makeError(
        'INVALID_ENTITY_IDS',
        `Seeding returned ${entityIds.length - pairCount} entity IDs that are not valid DoublesPair records. This typically means ranking entries of the wrong type (MEN/WOMEN instead of PAIR) were used for seeding.`
      );
    }
  }
}
```

This is a belt-and-suspenders guard. Task 1 fixes the root cause; this task ensures a clear error if the issue recurs from a different code path.
  </action>
  <verify>
    <automated>cd D:/Workspace/BATL && npx vitest run backend/__tests__/unit/bracketPersistenceService.test.js --reporter=verbose 2>&1 | tail -20</automated>
  </verify>
  <done>bracketPersistenceService validates entity IDs against the correct table before creating matches, providing a clear error message instead of a raw FK constraint violation</done>
</task>

</tasks>

<verification>
1. Existing seeding placement tests still pass (unit tests for 2/4/8/16 seed placement)
2. Existing bracket persistence tests still pass
3. Manual verification: generate a draw for a DOUBLES tournament -- should succeed without FK constraint error
</verification>

<success_criteria>
- No `Match_pair1Id_fkey` foreign key constraint error when generating draws for DOUBLES tournaments
- Seeded positions for DOUBLES tournaments contain only DoublesPair IDs (from PAIR rankings), not PlayerProfile IDs
- SINGLES tournament draw generation continues to work unchanged
- All existing tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-fk-constraint-error-on-match-pair1id/2-SUMMARY.md`
</output>
