# Phase 31: Points Integration and Group-Only Format - Research

**Researched:** 2026-03-29
**Domain:** Backend point calculation extension (GROUP/COMBINED formats), GROUP-only tournament lifecycle, frontend advancement badge display
**Confidence:** HIGH — All findings verified directly from codebase source files

## Summary

Phase 31 extends the existing `pointCalculationService.js` and `tournamentLifecycleService.js` to support GROUP and COMBINED format tournaments. The core challenge is that the existing `awardPointsSinglesTournament` / `awardPointsDoublesTournament` functions hardcode `participantCount` from `tournamentRegistrations.length` (total tournament participants), while group-placement points must use **group size** as the participant count (D-02). The solution is to add a new `awardPointsGroupTournament` path (or extend the existing flow) that builds results from `getGroupStandings()` per group, uses each group's own `groupSize` field from the `Group` model for participant count, and applies the same `calculatePlacementPoints` formula.

For COMBINED tournaments, a single post-tournament calculate-points call must partition all participants: non-advancing players receive group placement points (group size as participant count), advancing players receive knockout bracket points (bracket participant count as participant count). The offset hierarchy (D-07) ensures the worst main bracket result always exceeds the best secondary result, which always exceeds the best group-only result. The CONTEXT.md suggests: secondary offset = maxGroupPoints + 1, main offset = maxSecondaryPoints + 1 where maxGroupPoints uses the largest possible group as input.

GROUP-only auto-completion requires a small change to `checkAndCompleteTournament`: add a branch for `formatType === 'GROUP'` that skips the COMBINED bracket check and completes immediately when `incompleteCount === 0`.

The frontend work is limited to `GroupStandingsTable.jsx` (add `advancementMap` prop and render `AdvancementBadge` badge next to entity name) and `TournamentPointConfigPage.jsx` (add unresolved-ties guard before the calculate-points button). The UI-SPEC is already approved and fully specifies the badge design.

**Primary recommendation:** Implement in three backend layers (lifecycle → point calculation service → route handler) then two frontend layers (GroupStandingsTable badge → PointConfigPage guard), keeping each layer independently testable.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Reuse existing PLACEMENT formula: `(groupSize - placement + 1) × multiplicativeValue × (doublePoints ? 2 : 1)`
- **D-02:** Participant count = **group size** (not total tournament participants). Each group is its own mini-tournament for point purposes
- **D-03:** Same TournamentPointConfig (multiplicativeValue, doublePoints) applies to both group placement and knockout points — no separate group config
- **D-04:** Uneven groups are acceptable — 1st in a 4-player group earns more than 1st in a 3-player group. Larger groups are harder, formula naturally handles this
- **D-05:** Single point award at tournament end — points calculated once after all knockout brackets complete. Non-advancing players get group placement points. Advancing players get knockout points only (group points never created)
- **D-06:** Knockout points use **bracket participant count** (not total tournament participants) as the formula input
- **D-07:** **Offset-based tier hierarchy** guarantees: worst main bracket result > best secondary bracket result > best group-only placement. Offsets derived from group participant count ensure the hierarchy even when bracket sizes differ. Claude has discretion on the exact offset derivation formula
- **D-08:** Auto-complete when all group matches are in terminal state (COMPLETED/CANCELLED) — same pattern as knockout auto-complete via `checkAndCompleteTournament`
- **D-09:** GROUP-only tournament page reuses existing FormatVisualization GROUP path — groups in accordion, standings tables, progress bars. No bracket section at all
- **D-10:** Manual point trigger after completion — organizer goes to point config page, clicks 'Calculate Points'. Same UX as knockout tournaments
- **D-11:** Backend **auto-derives results from group standings positions** — organizer clicks calculate, backend reads computed standings and builds results array. Requires all ties resolved first (block calculate-points if unresolved ties exist)
- **D-12:** Small colored **badge/pill next to player name** in standings row: "Main" (primary color) or "Secondary" (secondary color). Non-advancing players have no badge — absence of badge is the signal
- **D-13:** No "eliminated" indicator or row grey-out for non-advancing players
- **D-14:** Badges appear **as soon as a group's matches are all complete** — based on projected advancement from current standings + tournament advancement config
- **D-15:** Same badge style always — no visual difference between projected and confirmed advancement

### Claude's Discretion

- Exact offset derivation formula for tier hierarchy (D-07) — ensure main > secondary > group mathematically
- API endpoint changes/additions for group-aware point calculation
- How to extend `calculatePoints` flow to handle GROUP and COMBINED formats (new service method vs branching in existing)
- Prisma query to derive results from group standings (may call `groupStandingsService.getGroupStandings` per group)
- Badge component implementation (React Bootstrap Badge or custom pill)
- How projected advancement badges are computed on the frontend (call advancement preview endpoint, or compute from standings + formatConfig)
- SWR cache invalidation after point calculation
- Error handling for calculate-points when ties are unresolved

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PTS-01 | Non-advancing players receive ranking points based on their final group placement | D-02 group-size participant count, `calculatePlacementPoints` formula, `getGroupStandings` for position data |
| PTS-02 | Advancing players receive ranking points based on their knockout bracket result (superseding group placement points) | D-05 single-call at tournament end, D-06 bracket participant count, D-07 offset hierarchy |
| PTS-03 | Group-only tournaments (no knockout) award points based on final group placement | D-08 auto-complete lifecycle extension, D-10/D-11 manual trigger with auto-derived results |
| PTS-04 | Points calculation works correctly for both singles and doubles tournaments | Existing `awardPointsSinglesTournament`/`awardPointsDoublesTournament` are reusable; group derivation path must respect doubles (pairId vs playerId) |
| GVIEW-05 | Advancement status is visible on group standings (which players have advanced to knockout) | D-12 badge, D-14 group-complete trigger, UI-SPEC AdvancementBadge spec, `advancementMap` prop on `GroupStandingsTable` |
</phase_requirements>

---

## Standard Stack

### Core (all existing — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | Existing | Database queries for groups, standings, brackets | Already used throughout backend |
| React Bootstrap | 2.10 | `<Badge>` for advancement pills | Already imported in `GroupStandingsTable` |
| React (SWR) | Existing | Cache invalidation after point calculation | `useGroupStandings`, `useMatches` hooks already exist |

**No new npm packages required.** This phase is purely an extension of existing infrastructure.

---

## Architecture Patterns

### Recommended Project Structure

No new files strictly required. Extensions to:
```
backend/
├── src/services/pointCalculationService.js   # Add deriveGroupResults(), awardGroupPoints()
├── src/services/tournamentLifecycleService.js # Add GROUP branch in checkAndCompleteTournament
├── src/api/routes/tournamentRoutes.js         # Extend POST /:id/calculate-points
frontend/
├── src/components/GroupStandingsTable.jsx     # Add advancementMap prop + AdvancementBadge
├── src/pages/TournamentPointConfigPage.jsx    # Add unresolved-ties guard + Calculate Points section
```

### Pattern 1: Group Result Derivation

**What:** Backend derives the `results` array by reading `getGroupStandings(groupId)` per group, extracting `entry.position` for each entity, and mapping to `{ playerId/pairId, placement: entry.position }`.

**When to use:** Both GROUP-only and COMBINED (non-advancing portion) point calculation.

**Key insight from source:**
```javascript
// groupStandingsService.getGroupStandings(groupId) returns:
// { standings: [{entity: {id, name}, position, tiedRange, ...}], unresolvedTies, ... }

// Block if unresolvedTies.length > 0 for ANY group

// Derive results:
const groupResults = standings
  .filter(entry => !entry.tiedRange)  // only fully resolved positions
  .map(entry => ({
    [isDoubles ? 'pairId' : 'playerId']: entry.entity.id,
    placement: entry.position
  }));
```

**Participant count:** Use `group.groupSize` (the `Int` field on the `Group` model), NOT `standings.length` (which could differ if matches have orphan participants). The `Group.groupSize` field is set at group formation time and is authoritative.

### Pattern 2: Offset Hierarchy for COMBINED

**What:** Ensure `worst main result > best secondary result > best group-only result` by adding an offset to knockout points.

**Recommended derivation (D-07 discretion):**
```javascript
// maxGroupPoints = max possible group placement points =
//   calculatePlacementPoints(largestGroupSize, 1, multiplicativeValue, doublePointsEnabled)
//   where largestGroupSize = max(group.groupSize) across all groups

// secondaryOffset = maxGroupPoints + 1
// mainOffset = secondaryOffset + maxSecondaryPoints + 1
//   where maxSecondaryPoints = max points any secondary bracket participant can earn
//   = calculatePlacementPoints(secondaryBracketSize, 1, multiplicativeValue, doublePointsEnabled)
//   + secondaryOffset

// For knockout results: pointsAwarded = baseKnockoutPoints + bracketOffset
// The 'placement' stored in TournamentResult is raw knockout placement
```

**Why this works:** A player who finishes last in the main bracket (placement = mainBracketSize) gets:
`(mainBracketSize - mainBracketSize + 1) × multiplicativeValue + mainOffset`
= `1 × multiplicativeValue + mainOffset`
= `multiplicativeValue + secondaryOffset + maxSecondaryPoints + 1`
> `secondaryOffset + maxSecondaryPoints` (best secondary result)
> `maxGroupPoints` (best group-only result)

### Pattern 3: GROUP Format Auto-Completion

**What:** In `checkAndCompleteTournament`, add GROUP-format branch parallel to the COMBINED guard.

**Current code (tournamentLifecycleService.js line 354-381):**
```javascript
if (incompleteCount === 0) {
  if (tournament?.formatType === 'COMBINED') {
    const bracketCount = await tx.bracket.count({ where: { tournamentId } });
    if (bracketCount === 0) {
      return; // Groups done, knockout not yet generated
    }
  }
  await tx.tournament.update({ where: { id: tournamentId }, data: { status: 'COMPLETED', ... } });
}
```

**Extension needed:**
```javascript
if (incompleteCount === 0) {
  const tournament = await tx.tournament.findUnique({
    where: { id: tournamentId },
    select: { formatType: true }
  });

  if (tournament?.formatType === 'COMBINED') {
    const bracketCount = await tx.bracket.count({ where: { tournamentId } });
    if (bracketCount === 0) return; // Stay IN_PROGRESS, waiting for knockout generation
  }
  // GROUP format: complete immediately when all group matches done (no brackets expected)
  // KNOCKOUT: already works, no change needed

  await tx.tournament.update({ ... status: 'COMPLETED' ... });
}
```

Note: The existing `tournament` fetch at line 355 is already inside the `incompleteCount === 0` block. The GROUP branch is a no-op — GROUP-only tournaments never have brackets, so the COMBINED guard doesn't fire. But the `tournament` query is already there for the COMBINED check, so no extra query cost for GROUP.

**CRITICAL:** `checkAndCompleteTournament` only fires when `isOrganizer === true`. GROUP-only auto-complete therefore only triggers when an organizer submits the final match result, which is correct per D-08.

### Pattern 4: Advancement Badge Frontend

**What:** `GroupStandingsTable` receives `advancementMap: Object.<entityId, 'MAIN'|'SECONDARY'|null>` computed by its parent (`FormatVisualization` GROUP path or `CombinedFormatDisplay`). Renders inline after entity name.

**Badge implementation (from UI-SPEC):**
```jsx
// In the player name <td> cell:
<strong>{stats.entity.name}</strong>
{advancementMap?.[stats.entity.id] === 'MAIN' && (
  <Badge bg="primary" className="ms-1" style={{ fontSize: '10px' }}>Main</Badge>
)}
{advancementMap?.[stats.entity.id] === 'SECONDARY' && (
  <Badge bg="secondary" className="ms-1" style={{ fontSize: '10px' }}>Secondary</Badge>
)}
```

**Projection logic (D-14 — client-side, no new API):**

The parent computes `advancementMap` from:
1. Check if the group's matches are ALL complete (all in 'COMPLETED' or 'CANCELLED')
2. If not all complete: return `{}` (no badges)
3. If all complete: read `standings.position` and `tournament.formatConfig` advancement config
4. `formatConfig.advancePerGroup` (or `mainBracketSize`/`secondaryBracketSize`) determines how many advance to which bracket
5. Map each entity to 'MAIN', 'SECONDARY', or null based on position

**For GROUP-only tournaments:** `advancementMap` is never passed (or passed as `{}`). No badges rendered.

**For COMBINED tournaments (CombinedFormatDisplay):** The advancement config is already in `tournament.formatConfig`. Compute per-group using `computeWaterfall` (already exported from `advancementService.js`) — but this is server-side. For a simpler client-side approach: use position thresholds from `parsedConfig.advancePerGroup` and `parsedConfig.advancePerGroupSecondary`.

### Pattern 5: Calculate Points — Blocked State

**What:** Before calling POST `/:id/calculate-points`, the frontend checks if any group has unresolved ties. If yes, disable the button and show the danger alert (UI-SPEC).

**Implementation approach:**
- On `TournamentPointConfigPage`, for GROUP or COMBINED tournaments: fetch group standings summaries (existing SWR hooks exist in `tournamentViewService.js`)
- Check if any group's `unresolvedTies.length > 0`
- If blocked: show disabled button with OverlayTrigger tooltip + danger Alert listing group names

**Alternative (backend-enforced):** Block at the `POST /:id/calculate-points` handler with error code `UNRESOLVED_TIES` if any group has unresolved ties. Frontend shows `err.message` per CLAUDE.md error handling pattern. Both layers of blocking are appropriate.

### Anti-Patterns to Avoid

- **Using `tournamentRegistrations.length` for group-point participant count:** The existing `awardPointsSinglesTournament` does this for KNOCKOUT — group points MUST use `group.groupSize`, not total registrations.
- **Re-using `deriveConsolationResults` for group results:** Consolation derivation reads from bracket matches; group derivation must read from `groupStandingsService.getGroupStandings`. These are different paths.
- **Separate TournamentPointConfig for groups:** D-03 explicitly forbids this. Same config for all.
- **Computing advancement badges server-side via new API:** D-14 specifies client-side projection from existing standings + formatConfig. No new API needed.
- **Calling calculate-points twice for COMBINED (once for groups, once for knockout):** D-05: single call at end after all brackets complete.
- **Treating GROUP completion the same as COMBINED:** COMBINED must wait for bracket generation AND completion; GROUP can complete immediately when all group matches are terminal.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Group standings with positions | Custom SQL | `getGroupStandings(groupId)` from `groupStandingsService.js` | Already handles full tiebreaker chain, override, stale detection |
| Points formula | Custom calculation | `calculatePlacementPoints(groupSize, position, multiplicativeValue, doublePoints)` | Already exists and tested in `pointCalculationService.js` |
| Awarding points to rankings | Custom upsert logic | `awardPointsSinglesTournament` / `awardPointsDoublesTournament` (extend, not replace) | Handles ranking upsert, RankingEntry update, rank recalculation atomically |
| Bracket participant count | Re-query registrations | `bracket.findMany({where: {tournamentId}})` + count matches in round 1 (or derive from `group.groupSize`) | Simpler: fetch the MAIN/SECONDARY bracket's match count in round 1 OR use `advancementService.computeWaterfall` output lengths |
| Advancement waterfall for badge projection | Reimplementing waterfall | `computeWaterfall` (already exported from `advancementService.js`) — or simpler threshold from `formatConfig.advancePerGroup` | Waterfall logic is complex with spillover; reuse it |

---

## Runtime State Inventory

Step 2.5: SKIPPED — this is not a rename/refactor/migration phase.

---

## Environment Availability

Step 2.6: SKIPPED — purely code extension, no new external tools or services.

---

## Common Pitfalls

### Pitfall 1: Participant Count Source Confusion

**What goes wrong:** Developer passes `tournament.tournamentRegistrations.length` to `calculatePlacementPoints` for group placements, producing wrong point values (all players in a 3-group tournament get points based on the total of 24 participants instead of their group's 8).

**Why it happens:** The existing `awardPointsSinglesTournament` function fetches `tournament.tournamentRegistrations` and uses `.length` as participant count. Copying this pattern for group points is wrong.

**How to avoid:** Always use `group.groupSize` (the `Int` field from the `Group` model, set at formation time) as the participant count for group placement points.

**Warning signs:** Point values seem too high for group placements — e.g., 1st place in a 4-player group getting 48 points (24 × 2) instead of 8 points (4 × 2).

### Pitfall 2: Forgetting the Unique TournamentResult Constraint

**What goes wrong:** Attempting to award group placement points AND knockout points to advancing players in a COMBINED tournament causes a unique constraint violation: `@@unique([tournamentId, rankingEntryId])` — only one result per tournament per ranking entry.

**Why it happens:** D-05 states advancing players get knockout points ONLY (group points never created). If code creates a group result for ALL players, then tries to overwrite with knockout results, the constraint fires.

**How to avoid:** Partition participants before awarding: advancing players go directly to knockout point calculation; non-advancing players go to group point calculation. Never create a group result for an advancing player.

### Pitfall 3: Unresolved Ties Block Point Calculation

**What goes wrong:** `getGroupStandings` returns entries with `tiedRange !== null`. Using those positions for `calculatePlacementPoints` with `placement = startPos` (the tied range start) gives the same placement to all tied players, producing equal points for equal positions — which is arguably acceptable but also means the caller cannot determine who placed where.

**Why it happens:** Ties that exhaust all tiebreaker criteria (including manual override) result in `tiedRange` being set on all tied entries and all getting `position = startPos`.

**How to avoid:** Before deriving group results, check `unresolvedTies.length > 0` for every group. If any group has unresolved ties, return error code `UNRESOLVED_TIES` and do NOT create any TournamentResult records. This is consistent with D-11 and the UI-SPEC blocked state.

### Pitfall 4: GROUP Format Not Completing

**What goes wrong:** A GROUP-only tournament with all matches completed stays `IN_PROGRESS` forever because `checkAndCompleteTournament` has no GROUP-specific handling (only COMBINED guard).

**Why it happens:** Reading the current code: when `formatType === 'GROUP'`, the COMBINED guard at line 360 is skipped (correct), so the tournament SHOULD complete via the existing `tx.tournament.update` at line 374. Actually this means GROUP completion already works — the COMBINED guard is the only blocker and it only fires for COMBINED.

**CRITICAL RE-CHECK:** Reading `tournamentLifecycleService.js` lines 353-382 carefully:
```
if (incompleteCount === 0) {
  tournament = findUnique(formatType)
  if formatType === 'COMBINED' && bracketCount === 0: return (do NOT complete)
  // Falls through to update for all other formats including GROUP
  update status = COMPLETED
}
```

**Conclusion:** GROUP format ALREADY auto-completes correctly today with no code change needed. The `checkAndCompleteTournament` function already handles GROUP because it only has a special guard for COMBINED. This is a HIGH confidence finding from reading the actual source.

**Implication for planning:** No change needed to `tournamentLifecycleService.js` for GROUP completion (D-08 is already satisfied by existing code). Planner should verify this before adding a task for it.

### Pitfall 5: TournamentPointConfigPage Doesn't Show Calculate Button for GROUP Format

**What goes wrong:** `TournamentPointConfigPage.jsx` currently only shows the save-configuration form. There is no "Calculate Points" button on this page — the existing flow in `tournamentRoutes.js` for `POST /:id/calculate-points` requires the caller to supply a `results` array in the request body. GROUP-only tournaments need the backend to auto-derive results (D-11), so a "Calculate Points" button on the point config page needs to trigger a backend-side derivation, not pass client-side results.

**Why it happens:** Original design expected organizer to provide results array; GROUP format auto-derives from standings.

**How to avoid:** Either:
1. Add a "Calculate Points" button to `TournamentPointConfigPage` that calls `POST /:id/calculate-points` with an empty body (backend detects GROUP/COMBINED format and auto-derives), OR
2. Change the route signature to accept an optional `results` body and auto-derive when absent for GROUP/COMBINED

The planner should make a concrete choice here (Claude's discretion area).

### Pitfall 6: Doubles Detection in Group Result Derivation

**What goes wrong:** When deriving group results for a doubles tournament, code mistakenly uses `playerId` instead of `pairId` in the result objects, causing `awardPointsDoublesTournament` to fail or produce empty results.

**Why it happens:** `getGroupStandings` returns `entity.id` which is a `pairId` for doubles tournaments and a `playerId` for singles. The caller must determine which field name to use.

**How to avoid:** Detect doubles by checking `tournament.category.type === 'DOUBLES'` (or checking if the group has `groupParticipants` with `pairId` set). Map accordingly:
- Singles: `{ playerId: entry.entity.id, placement: entry.position }`
- Doubles: `{ pairId: entry.entity.id, placement: entry.position }`

---

## Code Examples

Verified patterns from codebase source:

### Group Size Access

```javascript
// Source: backend/prisma/schema.prisma — Group model
// group.groupSize is an Int field (set at formation time)
const group = await prisma.group.findUnique({
  where: { id: groupId },
  select: { id: true, groupSize: true, tournamentId: true }
});
const participantCount = group.groupSize;
```

### Deriving Results from Standings

```javascript
// Source: backend/src/services/groupStandingsService.js
// getGroupStandings returns { standings, unresolvedTies, hasManualOverride, overrideIsStale }
const { standings, unresolvedTies } = await getGroupStandings(groupId);

if (unresolvedTies.length > 0) {
  const err = new Error('Group has unresolved tied positions');
  err.code = 'UNRESOLVED_TIES';
  throw err;
}

const results = standings.map(entry => ({
  [isDoubles ? 'pairId' : 'playerId']: entry.entity.id,
  placement: entry.position
}));
```

### Existing calculatePlacementPoints Signature

```javascript
// Source: backend/src/services/pointCalculationService.js lines 22-39
export function calculatePlacementPoints(
    participantCount,   // group.groupSize for group points, bracket slot count for knockout
    placement,          // entry.position from getGroupStandings (1-indexed)
    multiplicativeValue = 2,
    doublePoints = false
) {
    // Returns: (participantCount - placement + 1) * multiplicativeValue * (doublePoints ? 2 : 1)
}
```

### Existing awardPointsSinglesTournament Signature

```javascript
// Source: backend/src/services/pointCalculationService.js lines 81-175
// @param results - Array of {playerId, placement, finalRoundReached}
// pointConfig must have: { calculationMethod, multiplicativeValue, doublePointsEnabled }
await awardPointsSinglesTournament(tournamentId, results, pointConfig);
```

**CRITICAL:** The existing `awardPointsSinglesTournament` internally fetches `tournament.tournamentRegistrations.length` as `participantCount`. For group point awards, this is WRONG. The function must either be extended with an override parameter, or a new wrapper function must call `calculatePlacementPoints` directly with `group.groupSize` and build the RankingEntry/TournamentResult records manually.

**Recommended approach:** Add a new `awardGroupPoints(tournamentId, groupResults, pointConfig)` function that:
1. Accepts `groupResults: Array<{ groupId, results: [{playerId/pairId, placement}] }>`
2. Uses `group.groupSize` for each group as participant count
3. Calls `calculatePlacementPoints` directly (not via the existing award functions)
4. Reuses the existing `updateRankingEntry` and `recalculateRanks` helpers (these are private but can be extracted or duplicated)

### React Bootstrap Badge Pattern (from GroupStandingsTable)

```jsx
// Source: frontend/src/components/GroupStandingsTable.jsx lines 180-188
// Existing tiebreaker badge pattern — advancement badge follows same pattern:
<Badge
  bg="primary"          // 'primary' for Main, 'secondary' for Secondary
  className="ms-1"      // 4px left margin from player name
  style={{ fontSize: '10px' }}  // component-local override per UI-SPEC
>
  Main
</Badge>
```

### SWR Invalidation After Calculate Points

```javascript
// Pattern used in CombinedFormatDisplay after advancement:
// window.location.reload() — simplest, no SWR cache invalidation needed
// OR: call mutate() on relevant SWR hooks

// Relevant SWR hooks that change after point calculation:
// - None in the tournament view page (point calculation doesn't affect group standings display)
// For TournamentPointConfigPage: simple setSuccess() state + no reload needed
```

### FormatVisualization GROUP Path (existing, no changes needed)

```jsx
// Source: frontend/src/components/FormatVisualization.jsx lines 101-158
// Already renders groups in Accordion with GroupStandingsTable per group.
// To pass advancementMap, FormatVisualization needs to compute it before rendering.
// advancementMap derivation:
//   1. Parse tournament.formatConfig for advancePerGroup, advancePerGroupSecondary
//   2. For each group, check if all matches are complete (computeGroupsComplete logic)
//   3. If group complete: map position 1..advancePerGroup → 'MAIN',
//      (advancePerGroup+1)..(advancePerGroup+advancePerGroupSecondary) → 'SECONDARY'
//   4. Pass as advancementMap prop to GroupStandingsTable
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side standings computation | Backend-authoritative via SWR (`useGroupStandings`) | Phase 29-03 | Group standings derivation for points must go via `getGroupStandings`, not re-compute client-side |
| Single bracket format only | GROUP / COMBINED / KNOCKOUT formats | Phase 28-30 | Point calculation must be format-aware |
| Manual results array in calculate-points POST | Auto-derived for GROUP/COMBINED | Phase 31 (this phase) | Backend reads standings and builds results array |

---

## Open Questions

1. **Does GROUP format auto-complete today?**
   - What we know: `checkAndCompleteTournament` has a COMBINED guard (skip if no bracket). For GROUP format, that guard doesn't fire, so the function falls through to `status: COMPLETED` when `incompleteCount === 0`.
   - What's unclear: Needs a test to confirm no other guard blocks GROUP completion.
   - Recommendation: Planner should include a task to verify this with an integration test (or read test suite). If it already works, skip the lifecycle change task.

2. **How does TournamentPointConfigPage know to show "Calculate Points" for GROUP/COMBINED?**
   - What we know: Currently the page only has a config form. There is no calculate button. For KNOCKOUT tournaments, the flow is unclear from the page source alone.
   - What's unclear: Is the "Calculate Points" button on TournamentPointConfigPage, or on the tournament view page, or elsewhere?
   - Recommendation: Read `tournamentService.js` `calculateTournamentPoints` to find the frontend call site, or check if the button exists in a different component. Planner should determine the correct component to modify.

3. **Offset derivation for COMBINED: what if FINAL_ROUND method is used?**
   - What we know: FINAL_ROUND method uses point table lookup, not the placement formula. Group points always use PLACEMENT formula (only `calculatePlacementPoints` is suitable for group-size-based calculation).
   - What's unclear: If `pointConfig.calculationMethod === 'FINAL_ROUND'`, knockout points come from `calculateRoundPoints` (point table), which can be much larger. The offset derivation based on `maxGroupPoints` may not provide enough headroom.
   - Recommendation: For COMBINED tournaments, enforce PLACEMENT method for the point config (or derive offset based on maximum possible FINAL_ROUND knockout points). The planner should make an explicit decision here.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (frontend) + Jest (backend, per CLAUDE.md) |
| Config file | `frontend/vite.config.js` (Vitest integrated) |
| Quick run command | `cd backend && npx jest --testPathPattern=pointCalculation --no-coverage` |
| Full suite command | `cd backend && npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PTS-01 | Group non-advancing players get placement points based on group size | unit | `npx jest --testPathPattern=pointCalculation -t "group"` | ❌ Wave 0 |
| PTS-02 | Advancing players get knockout points with offset > best group points | unit | `npx jest --testPathPattern=pointCalculation -t "offset"` | ❌ Wave 0 |
| PTS-03 | GROUP-only tournament: calculate-points derives results from standings | integration | `npx jest --testPathPattern=tournamentRoutes -t "calculate-points"` | ❌ Wave 0 |
| PTS-04 | Singles and doubles both produce correct TournamentResult records | unit | `npx jest --testPathPattern=pointCalculation -t "doubles"` | ❌ Wave 0 |
| GVIEW-05 | AdvancementBadge renders for completing group entity per advancementMap | unit (Vitest/React Testing Library) | `cd frontend && npx vitest run --reporter=verbose src/components/GroupStandingsTable` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && npx jest --testPathPattern=pointCalculation --no-coverage`
- **Per wave merge:** `cd backend && npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/__tests__/unit/groupPointCalculation.test.js` — covers PTS-01, PTS-04 (group size as participant count, singles + doubles result shape)
- [ ] `backend/__tests__/unit/combinedPointOffset.test.js` — covers PTS-02 (offset math: worst main > best secondary > best group)
- [ ] `backend/__tests__/integration/groupCalculatePoints.test.js` — covers PTS-03 (POST /:id/calculate-points for GROUP format, blocked on unresolved ties)

*(Frontend badge test optional — badge is a simple conditional render; manual QA may suffice for GVIEW-05)*

---

## Sources

### Primary (HIGH confidence)

All findings verified directly from source files in the BATL codebase:

- `backend/src/services/pointCalculationService.js` — full service read; `calculatePlacementPoints` signature, `awardPointsSinglesTournament` participant count logic, `awardPointsDoublesTournament` structure
- `backend/src/services/tournamentLifecycleService.js` — full service read; `checkAndCompleteTournament` GROUP/COMBINED branching logic
- `backend/src/services/groupStandingsService.js` — full service read; `getGroupStandings` return shape, `standings.position`, `unresolvedTies` structure
- `backend/src/services/advancementService.js` — full service read; `computeWaterfall` signature, `computeAdvancementPreview` format config parsing
- `backend/src/api/routes/tournamentRoutes.js` (lines 260-334) — `POST /:id/calculate-points` handler; request body format, existing MATCH_2/consolation branching
- `backend/prisma/schema.prisma` — `Group.groupSize`, `TournamentResult` model, `TournamentPointConfig` model, `FormatType` enum, `BracketType` enum
- `frontend/src/components/GroupStandingsTable.jsx` — full read; existing Badge pattern, `standings` data shape consumed
- `frontend/src/components/CombinedFormatDisplay.jsx` — full read; advancement state, group completion logic, `advancementMap` integration point
- `frontend/src/components/FormatVisualization.jsx` (lines 1-200) — GROUP path rendering, `computeGroupsComplete` helper, `GroupStandingsTable` call site
- `frontend/src/pages/TournamentPointConfigPage.jsx` — full read; existing form-only structure, no calculate button found
- `.planning/phases/31-points-integration-and-group-only-format/31-CONTEXT.md` — all locked decisions and discretion areas
- `.planning/phases/31-points-integration-and-group-only-format/31-UI-SPEC.md` — AdvancementBadge spec, calculate-points blocked state, copywriting contract

### Secondary (MEDIUM confidence)

- `.planning/milestones/v1.4-REQUIREMENTS.md` — PTS-01 through PTS-04 and GVIEW-05 acceptance criteria
- `.planning/STATE.md` — phase decision log confirming Phase 30 SECONDARY bracket type, advancement waterfall, group standings backend-authoritative

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all extensions to existing patterns
- Architecture: HIGH — all patterns verified from source code reads
- Pitfalls: HIGH (most) / MEDIUM (Pitfall 3 re: FINAL_ROUND + offset) — directly derived from source logic

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable internal codebase, no external dependency changes)
