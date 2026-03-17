# Phase 30: Combined Format Advancement - Research

**Researched:** 2026-03-18
**Domain:** Group-to-knockout advancement: spillover selection, bracket generation from group results, advancement configuration UI, revert
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Organizer configures advancement rules **at tournament creation** as part of COMBINED format setup (alongside group count, seeded rounds)
- Configuration editable until groups start (ADV-04) — locked once tournament is IN_PROGRESS
- **Simple top-N + remainder model**: organizer enters "Top N advance to main bracket" and optionally "Next M advance to secondary bracket"
- Maximum **2 knockout brackets** (main + secondary). No consolation brackets within combined format (COMB-D01 deferred)
- Advancement counts do NOT need to be powers of 2 — system handles byes via existing bracket generation infrastructure (Feature 009)
- Not all players need to advance — players not assigned to either bracket simply don't proceed
- **Position-based waterfall**: fill bracket slots by group position, starting from 1st place
- All players at a position advance if slots remain. When there are fewer remaining slots than groups at a position, **cross-group ranking** picks the best
- Cross-group ranking uses the **same 6-level tiebreaker chain** from Phase 29 (wins → H2H skipped for cross-group → set diff → game diff → fewer games → manual)
- **Group position determines seed order**: 1st-place finishers are top seeds, 2nd-place next, etc.
- Within same group position, cross-group ranking orders the seeds
- If more advancing players than seeded positions, top N by group standing get seeded positions, rest placed unseeded
- **Always SEEDED draw mode** — no manual draw option for group-advanced brackets
- Uses existing Feature 010 seeding placement algorithm with group-derived seed rankings
- "Advance to Knockout" button **blocked** until all group ties are resolved (Phase 29 manual override requirement)
- **Preview before confirming**: show which players advance to which bracket, highlight spillover picks, show bracket sizes with byes
- "Confirm & Generate Brackets" commits: creates Bracket/Round/Match records atomically
- **Group results locked** after advancement — match results become read-only. To edit, organizer reverts advancement first
- Revert only available if **no knockout matches have results yet**
- **Stacked layout**: group stage accordion collapsed by default (read-only), knockout bracket(s) shown prominently below
- Bracket labels: **"Main Bracket"** and **"Secondary Bracket"**
- **"My Match" auto-navigates** to the correct bracket for the logged-in player (extends Feature 011 BracketMyMatch)
- Tournament auto-completes only when **all knockout brackets** (main + secondary) are finished (COMB-08)
- Works for both singles and doubles (COMB-09) via existing pair/player duality patterns

### Claude's Discretion

- API endpoint paths and request/response shapes
- Prisma schema changes for advancement config storage (may use existing `advancementCriteria` JSON field on Group or `formatConfig` on Tournament)
- Advancement preview component design and layout
- Cross-group ranking implementation details (service structure)
- Error handling for edge cases (all groups same size vs uneven)
- SWR cache invalidation strategy after advancement
- Revert implementation details (which records to delete, order of operations)

### Deferred Ideas (OUT OF SCOPE)

- **COMB-D01**: Consolation brackets within combined format tournaments — explicitly not planned for this format
- Organizer-customizable bracket names (instead of fixed "Main"/"Secondary")
- Elimination messaging for non-advancing players (final placement display)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMB-01 | Organizer can configure a combined tournament (group stage → one or more knockout brackets) | `formatConfig` on Tournament stores top-N and secondary-M; `CombinedConfigPanel` extended with new number inputs |
| COMB-02 | Organizer can configure which group positions advance to which knockout bracket | Top-N to main, next-M to secondary: stored in `formatConfig`, displayed in `AdvancementConfigFields` |
| COMB-03 | System supports "best of N" spillover advancement for odd-group situations | Position-based waterfall with cross-group ranking selects best players when slot count < group count at a position |
| COMB-04 | Spillover advancement uses cross-group ranking (win rate, differential) to select best remaining players | `groupStandingsService` tiebreaker chain (minus H2H) reused for cross-group comparison |
| COMB-05 | System validates that advancement counts produce valid knockout bracket sizes (4-128, per Feature 009) | `bracketService.getBracketByPlayerCount()` validates 4-128 range with byes; NEW: N and M individually checked |
| COMB-06 | Knockout brackets are generated from group results using existing bracket generation and seeding infrastructure | `bracketPersistenceService.generateBracket()` adapted; `seedingPlacementService.generateSeededBracket()` called with group-derived seed list |
| COMB-07 | Combined tournament lifecycle transitions from group phase to knockout phase when all group matches are complete | Already implemented in `checkAndCompleteTournament()` — COMBINED guard at lines 328-342; Phase 30 triggers advancement |
| COMB-08 | Combined tournament completes only when all knockout brackets are finished | `checkAndCompleteTournament()` COMBINED guard already prevents premature completion when no bracket exists; Phase 30 must ensure both brackets finish before completing |
| COMB-09 | Combined format works for both singles and doubles tournaments | `pair1Id ?? player1Id` nullish coalescing pattern throughout; existing `bracketPersistenceService` already handles both |
| ADV-01 | Organizer can configure advancement rules via a dedicated configuration UI | `AdvancementConfigFields` inside `CombinedConfigPanel.jsx` — two number inputs for top-N and secondary-M |
| ADV-02 | Advancement UI shows how many players advance from each position and to which knockout bracket | Waterfall summary below config inputs; detailed in `AdvancementPreviewModal` |
| ADV-03 | Advancement UI validates total advancement count against valid bracket sizes | `bracketService.getBracketByPlayerCount()` for range check 4-128; byes allowed so not power-of-2 required |
| ADV-04 | Advancement configuration can be edited before groups start but not after | Inputs disabled when `tournament.status === 'IN_PROGRESS'`; backend guard on PATCH tournament endpoint |
</phase_requirements>

---

## Summary

Phase 30 implements the bridge between the group stage (Phase 28/29) and knockout bracket(s) (Phase 011) for COMBINED format tournaments. The work is split across three concerns: (1) advancement configuration UI added to tournament creation/setup, (2) a backend advancement service that computes the waterfall player assignment and generates brackets atomically, and (3) frontend wiring of the existing TODO in `CombinedFormatDisplay.jsx` to show a preview modal and commit advancement.

The most critical architectural insight is that **no new bracket generation logic is needed** — `bracketPersistenceService.generateBracket()` already does the heavy lifting but sources players from tournament registrations. Phase 30 introduces a parallel path that sources players from group standings instead. The seeding placement service (`seedingPlacementService.generateSeededBracket`) is called with a group-derived ranked list rather than fetching from the rankings database. This requires either extending `bracketPersistenceService` with a new function or a thin new service (`advancementService`) that handles group-qualified player sourcing and calls the persistence layer directly.

The spillover algorithm (position-based waterfall with cross-group ranking) is the only genuinely new logic. It consumes `groupStandingsService.computeGroupStandings()` per group, merges results by position, and applies the same 5-level tiebreaker chain (wins, set diff, game diff, fewest games, alphabetical — H2H is skipped cross-group since players haven't played each other) to pick the best N spillover slots. The multi-bracket completion guard needs a minor update: the existing guard checks for any bracket, but Phase 30 must ensure ALL brackets are complete before the tournament auto-completes.

**Primary recommendation:** Create a new `advancementService.js` that computes the waterfall, calls existing bracket persistence code, and handles revert. Wire via two new route files under `/api/v1/tournaments/:id/advancement`.

---

## Standard Stack

### Core (all verified against existing codebase — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | Existing | Atomic `$transaction` for bracket generation + revert | Already used throughout; transactions are critical for atomicity |
| Express 5.1.0 | Existing | New advancement routes | All other routes use Express 5.1.0 |
| Joi | Existing (`backend/src/api/validators/`) | Request body validation for advancement trigger | All validators use Joi; pattern is in `groupDrawValidator.js`, `bracketValidator.js` |
| React Bootstrap 2.10 | Existing | `Modal`, `Alert`, `Button`, `Spinner`, `Table`, `Badge`, `Form`, `Row`, `Col` | All UI uses React Bootstrap — no other UI library in project |
| SWR | Existing | Data fetching / cache invalidation post-advancement | Used in `tournamentViewService.js` for tournament data |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| seedrandom | 3.0.5+ | Deterministic randomization for unseeded slot assignment | Used in `bracketPersistenceService.js` line 231 — same pattern reused |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `advancementService.js` | Extending `bracketPersistenceService.js` | New service keeps concerns separate; persistence service is already complex (905 lines). Separate service is cleaner |
| New route file `advancementRoutes.js` | Adding to `tournamentRulesRoutes.js` | Route file separation matches existing pattern (groupDrawRoutes, groupStandingsRoutes) |
| `formatConfig` JSON on Tournament | New `AdvancementConfig` model | `formatConfig` already a JSON field on Tournament — minimal schema change needed |

**Installation:** No new packages required. All dependencies already in the project.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
backend/src/
├── services/
│   └── advancementService.js           # Waterfall algorithm + bracket generation from groups
├── api/
│   ├── advancementController.js        # Request handlers (preview, confirm, revert)
│   ├── routes/
│   │   └── advancementRoutes.js        # POST preview, POST confirm, DELETE revert
│   └── validators/
│       └── advancementValidator.js     # Joi schema for advancement trigger

frontend/src/
├── components/
│   └── AdvancementPreviewModal.jsx     # New: waterfall preview + confirm button
├── services/
│   └── advancementService.js           # Frontend API client for preview/confirm/revert
```

**Modified files:**
- `backend/src/index.js` — Register `advancementRoutes`
- `backend/src/services/tournamentLifecycleService.js` — Update COMBINED guard for multi-bracket completion
- `frontend/src/components/CombinedFormatDisplay.jsx` — Wire button, add revert panel, post-advancement layout
- `frontend/src/components/CombinedConfigPanel.jsx` — Add `AdvancementConfigFields` (top-N, secondary-M inputs)

### Pattern 1: Advancement Config Storage in `formatConfig`

**What:** `Tournament.formatConfig` is a JSON string field. Phase 30 extends it with `mainBracketSize` (top-N) and `secondaryBracketSize` (next-M, nullable).

**When to use:** Tournament creation/setup, tournament page read.

**Example (existing `formatConfig` structure + Phase 30 additions):**
```javascript
// Source: backend/src/services/bracketPersistenceService.js line 134
// Existing pattern: formatConfig parsed as JSON
const parsed = JSON.parse(tournament.formatConfig);
const matchGuarantee = parsed.matchGuarantee || 'MATCH_1';

// Phase 30 additions stored in same JSON:
// { groupSize: 4, advancePerGroup: 2, mainBracketSize: 8, secondaryBracketSize: 4 }
```

**Rationale:** The `advancementCriteria` field exists on `Group` model (unused, nullable String) but was intended for per-group rules. Tournament-level top-N/secondary-M config belongs on `Tournament.formatConfig` since it spans all groups.

### Pattern 2: Waterfall Spillover Algorithm

**What:** Position-based waterfall to assign advancing players to main and secondary brackets.

**When to use:** Called by `advancementService.computeAdvancementSlots(tournamentId)`.

**Algorithm:**
```javascript
// Pseudocode for waterfall (no external source — derived from CONTEXT.md decisions)
function computeWaterfall(groupStandings[], mainN, secondaryM) {
  const mainSlots = [];
  const secondarySlots = [];
  let mainRemaining = mainN;
  let secondaryRemaining = secondaryM;

  // groupStandings: array of sorted standings per group (from getGroupStandings)
  // Sort groups' entries by position (1st, 2nd, 3rd...)
  const byPosition = groupByPosition(groupStandings); // Map<position, entity[]>

  for (const [position, playersAtPosition] of byPosition) {
    if (mainRemaining > 0) {
      if (playersAtPosition.length <= mainRemaining) {
        // All advance to main
        mainSlots.push(...playersAtPosition.map(p => ({ ...p, isSpillover: false })));
        mainRemaining -= playersAtPosition.length;
      } else {
        // Cross-group ranking: sort by stats (wins → setDiff → gameDiff → totalGames → name)
        const ranked = crossGroupRank(playersAtPosition);
        mainSlots.push(...ranked.slice(0, mainRemaining).map((p, i) => ({
          ...p, isSpillover: i >= (playersAtPosition.length - mainRemaining) // last slots are spillover
        })));
        // Remaining go to secondary
        const spill = ranked.slice(mainRemaining);
        if (secondaryRemaining > 0) {
          const toSecondary = spill.slice(0, secondaryRemaining);
          secondarySlots.push(...toSecondary.map(p => ({ ...p, isSpillover: true })));
          secondaryRemaining -= toSecondary.length;
        }
        mainRemaining = 0;
      }
    } else if (secondaryRemaining > 0) {
      if (playersAtPosition.length <= secondaryRemaining) {
        secondarySlots.push(...playersAtPosition.map(p => ({ ...p, isSpillover: false })));
        secondaryRemaining -= playersAtPosition.length;
      } else {
        const ranked = crossGroupRank(playersAtPosition);
        secondarySlots.push(...ranked.slice(0, secondaryRemaining).map(p => ({ ...p, isSpillover: true })));
        secondaryRemaining = 0;
      }
    }
    // remaining players not assigned = eliminated
  }
  return { mainSlots, secondarySlots };
}

// Cross-group ranking: tiebreaker chain WITHOUT H2H (players from different groups)
// Source: groupStandingsService.js tiebreaker logic — levels 1,3,4,5,6 only (no level 2)
function crossGroupRank(players) {
  return players.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
    if (a.totalGames !== b.totalGames) return a.totalGames - b.totalGames;
    return a.entity.name.localeCompare(b.entity.name);
  });
}
```

### Pattern 3: Bracket Generation from Group Players (adapt existing `generateBracket`)

**What:** `bracketPersistenceService.generateBracket()` currently fetches players from tournament registrations. Phase 30 needs to call it with pre-computed group-qualified players instead.

**Approach:** Create `generateBracketFromGroupPlayers(tx, tournamentId, players, bracketLabel, options)` inside the new `advancementService.js`. This function directly calls the persistence layer (creates Bracket/Round/Match inside the outer transaction) using the player list from waterfall output.

Key signature insight from `bracketPersistenceService.js`:
```javascript
// Source: bracketPersistenceService.js lines 302-309
// Bracket.bracketType must be one of: MAIN, CONSOLATION, PLACEMENT
// For Phase 30: main bracket = 'MAIN', secondary bracket = 'CONSOLATION' (closest enum match)
// OR: consider adding 'SECONDARY' to BracketType enum in schema — see Schema Changes section
const bracket = await tx.bracket.create({
  data: {
    tournamentId,
    bracketType: 'MAIN',  // or new 'SECONDARY' enum value
    matchGuarantee: 'MATCH_1',
    drawMode: 'SEEDED'
  }
});
```

**Seeding from group standings:**
```javascript
// Group-derived seed ranking for generateSeededBracket adaptation:
// Instead of fetching from RankingEntry table, pass seed list directly
// 1st-place finishers ordered by cross-group rank = seeds 1..k
// 2nd-place finishers by cross-group rank = seeds k+1..m
// etc.
// Call seedingPlacementService placement functions directly (placeTwoSeeds, placeFourSeeds...)
// bypassing the getSeededPlayers() DB call
```

### Pattern 4: Atomic Advancement Transaction

**What:** All bracket/round/match creation and group locking happen in a single `prisma.$transaction`.

**When to use:** `POST /api/v1/tournaments/:id/advancement` (confirm).

```javascript
// Source: bracketPersistenceService.js lines 294-441 (transaction pattern)
await prisma.$transaction(async (tx) => {
  // 1. Verify no knockout matches have results (revert guard inverse)
  // 2. Lock groups — store advancement timestamp in formatConfig or new field
  // 3. Generate main bracket (Bracket + Rounds + Matches)
  // 4. Generate secondary bracket if secondaryM > 0
  // 5. Do NOT change tournament status — lifecycle guard handles auto-completion
});
```

### Pattern 5: Revert (Delete Brackets, Unlock Groups)

**What:** Delete all knockout Bracket/Round/Match records for tournament, clear group-locked state.

**When to use:** `DELETE /api/v1/tournaments/:id/advancement` (revert).

```javascript
// Source: bracketPersistenceService.js lines 297-299 (existing delete pattern)
// FK constraints: Match → Round → Bracket (cascade order)
await tx.match.deleteMany({ where: { tournamentId, bracketId: { not: null } } });
await tx.round.deleteMany({ where: { tournamentId, bracketId: { not: null } } });
await tx.bracket.deleteMany({ where: { tournamentId } });
// Then clear lock flag from formatConfig
```

**Guard:** Before deleting, check `match.count({ where: { tournamentId, bracketId: { not: null }, status: 'COMPLETED' } }) === 0`.

### Pattern 6: Auth Middleware

```javascript
// Source: groupDrawRoutes.js lines 31-36
router.post('/:id/advancement/preview', isAuthenticated, authorize('update', 'Tournament'), previewAdvancement);
router.post('/:id/advancement', isAuthenticated, authorize('update', 'Tournament'), confirmAdvancement);
router.delete('/:id/advancement', isAuthenticated, authorize('update', 'Tournament'), revertAdvancement);
```

### Pattern 7: Multi-Bracket Completion Guard Update

The existing COMBINED guard in `tournamentLifecycleService.js` (lines 335-343) only checks if ANY bracket exists. After Phase 30, it must also check that ALL brackets are complete (no incomplete non-BYE matches across all brackets). The current logic already works correctly — when ANY non-BYE match is incomplete, `incompleteCount > 0` and the tournament won't complete. The only scenario where the guard fails is if group matches are still present after advancement (they are, since group matches are COMPLETED). The `incompleteCount` query at line 319 counts ALL non-BYE incomplete matches — group matches are all COMPLETED by the time advancement happens, so they won't be counted. This means the existing guard is already correct for multi-bracket completion without changes, as long as the bracket existence check is updated to require at least one bracket (already there).

**Verify:** The COMBINED guard should be updated from `findFirst` to checking that bracket count matches expected count (1 or 2 depending on config) to prevent premature completion if only main bracket finishes while secondary is still in play. Since `incompleteCount` includes ALL non-BYE matches across all brackets, if any secondary bracket match is incomplete, `incompleteCount > 0` and the tournament won't complete. No change needed.

### Anti-Patterns to Avoid

- **Fetching seeded players from RankingEntry for group-advanced brackets:** Group standings ARE the ranking for this bracket — do not mix with category rankings from Feature 008.
- **Calling `generateBracket()` directly for combined advancement:** That function loads players from `TournamentRegistration` — not group qualifiers. Must use adapted function.
- **Storing bracket labels as a new DB field:** Use the existing `Bracket.placementRange` String field (nullable) for "Main Bracket"/"Secondary Bracket" label storage, OR use `bracketType`. Avoid schema changes if possible.
- **Making group lock a separate DB field:** Store lock state in `formatConfig` JSON to avoid a schema migration.
- **Checking power-of-2 for advancement counts:** The context explicitly states advancement counts do NOT need to be powers of 2 — byes are handled automatically. The old `CombinedConfigPanel` validation that enforced power-of-2 must be removed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bracket structure (byes, size) | Custom bracket template | `bracketService.getBracketByPlayerCount()` | Validated against 125 pre-computed templates, handles all 4-128 player counts |
| Seed placement in bracket positions | Custom recursive placement | `seedingPlacementService` placement functions (`placeTwoSeeds`, `placeFourSeeds`, etc.) | Chi-square validated fairness; handles 2/4/8/16 seed tiers |
| Atomic bracket DB creation | Custom insertion loop | `prisma.$transaction` + Bracket/Round/Match creation pattern from `bracketPersistenceService.js` | Existing pattern handles BYE pre-population, Round 2 advancement, correct match numbering |
| Tiebreaker for cross-group ranking | Custom comparator | `groupStandingsService.buildEntityStats()` + sorted by stats fields | Stats are already computed; reuse `wins`, `setDiff`, `gameDiff`, `totalGames` fields directly |
| Group completion check | Custom query | Existing `groupsComplete` prop passed to `CombinedFormatDisplay.jsx` | Already computed in `FormatVisualization.jsx` |
| Unresolved ties check (blocks advancement) | Custom query | `getGroupStandings()` — check `unresolvedTies.length > 0` | Already returned by standings service |

---

## Common Pitfalls

### Pitfall 1: BracketType Enum Mismatch for Secondary Bracket
**What goes wrong:** `Bracket.bracketType` is an enum with values `MAIN`, `CONSOLATION`, `PLACEMENT`. There is no `SECONDARY` value. If Phase 30 creates the secondary bracket as `CONSOLATION`, the lifecycle and display code may treat it as a consolation bracket.
**Why it happens:** The schema was designed before the COMBINED format needed two non-consolation brackets.
**How to avoid:** Add `SECONDARY` to the `BracketType` enum in `schema.prisma` and migrate. OR reuse `CONSOLATION` but ensure all display and lifecycle code keys off the actual bracket records (by ID lookup) rather than `bracketType` for label assignment. The `CombinedFormatDisplay` already renders all brackets by iterating `brackets` array — labels come from a prop or field, not from `bracketType`.
**Warning signs:** `KnockoutBracket.jsx` might render differently for `bracketType=CONSOLATION` than `MAIN` — check if bracketType is consumed anywhere in the frontend rendering path.

### Pitfall 2: Old `CombinedConfigPanel` Power-of-2 Validation Must Be Removed
**What goes wrong:** `CombinedConfigPanel.jsx` lines 43-49 enforce `isPowerOfTwo(knockoutPlayers)` and show a warning if not. The Phase 30 context explicitly says advancement counts do NOT need to be powers of 2. If this check remains, valid configurations (e.g., 3 groups × top-1 = 3 players, which gets byes) would be incorrectly blocked.
**Why it happens:** The original panel was written before bracket generation with byes was understood.
**How to avoid:** Replace the `isPowerOfTwo` check with a call to `bracketService.getBracketByPlayerCount(n)` — if it returns a template (any count 4-128), the config is valid. Show byes in the summary message.
**Warning signs:** The validation alert shows "not a power of 2" for a valid 6-player advancement config.

### Pitfall 3: `advancePerGroup` Field Still in `formatConfig` After Phase 30
**What goes wrong:** `CombinedConfigPanel` currently uses `advancePerGroup` which implies uniform per-group advancement. Phase 30 replaces this with `mainBracketSize` + `secondaryBracketSize` (total counts, not per-group). If the old field is kept alongside the new fields, there will be confusion about which field drives advancement.
**Why it happens:** Backward compatibility with existing COMBINED tournaments that already have `advancePerGroup` in their `formatConfig`.
**How to avoid:** During Phase 30, keep `advancePerGroup` in the config but make it read-only (existing tournaments) while the new fields drive the actual waterfall. New tournaments should have `mainBracketSize` + `secondaryBracketSize`. Backend advancement service should use `mainBracketSize` / `secondaryBracketSize` exclusively.
**Warning signs:** Advancement preview shows wrong player counts.

### Pitfall 4: Group Matches Counted in Incomplete Match Query After Advancement
**What goes wrong:** After advancement, group matches are still in the database with `status=COMPLETED`. The `checkAndCompleteTournament` query at line 319 counts ALL non-BYE incomplete matches. If somehow a group match is left in SCHEDULED state, the tournament will never auto-complete.
**Why it happens:** Group matches that weren't fully completed before advancement (edge case: cancellation scenarios).
**How to avoid:** Advancement service must verify ALL group matches are COMPLETED or CANCELLED before proceeding. This is already enforced by the "blocked until groups complete" UI requirement.
**Warning signs:** Tournament stays IN_PROGRESS indefinitely after both brackets complete.

### Pitfall 5: SWR Cache Stale After Advancement
**What goes wrong:** After calling the advancement API, the frontend's SWR cache still shows the old tournament structure (no brackets). The page doesn't update to show the brackets until manual refresh.
**Why it happens:** SWR doesn't know the tournament structure changed.
**How to avoid:** After `POST /advancement` succeeds, call SWR's `mutate()` on the tournament data key or use `window.location.reload()` (acceptable for this infrequent action). The existing `MatchResultModal` uses a similar pattern — find how it invalidates the bracket SWR cache.
**Warning signs:** Success modal closes but page still shows "Knockout bracket will appear after group stage completes."

### Pitfall 6: Doubles: Group Standings Return `pairId` Not `playerId`
**What goes wrong:** For doubles tournaments, `GroupParticipant` records have `pairId` set and `playerId` null. The advancement service must use `pairId` for doubles bracket slot assignment, not `playerId`. Using the wrong field causes FK constraint violations in Match creation.
**Why it happens:** The doubles duality pattern requires conditional field selection throughout.
**How to avoid:** Always check `category.type === 'DOUBLES'` and use `pairId ?? playerId` pattern. The `groupStandingsService.buildEntityStats` already uses `match.pair1Id || match.player1Id` — follow the same pattern in the advancement service.
**Warning signs:** Prisma throws a FK constraint error on Match creation for doubles tournaments.

---

## Code Examples

### Reading Advancement Config from formatConfig

```javascript
// Source: bracketPersistenceService.js lines 133-141 (existing pattern)
let parsedFormatConfig = {};
if (tournament.formatConfig) {
  try {
    parsedFormatConfig = JSON.parse(tournament.formatConfig);
  } catch (_) {
    // malformed JSON — treat as defaults
  }
}
const mainBracketSize = parsedFormatConfig.mainBracketSize || 0;
const secondaryBracketSize = parsedFormatConfig.secondaryBracketSize || 0;
```

### Getting All Group Standings (for waterfall input)

```javascript
// Source: groupStandingsService.js — getGroupStandings()
// For each group in the tournament:
const groups = await prisma.group.findMany({
  where: { tournamentId },
  orderBy: { groupNumber: 'asc' }
});

const allGroupStandings = await Promise.all(
  groups.map(async (group) => {
    const { standings } = await getGroupStandings(group.id);
    return { groupId: group.id, groupNumber: group.groupNumber, standings };
  })
);
```

### Checking for Unresolved Ties (blocks advancement)

```javascript
// Source: groupStandingsService.computeGroupStandings() — returns unresolvedTies
const hasUnresolvedTies = allGroupStandings.some(
  gs => gs.unresolvedTies && gs.unresolvedTies.length > 0
);
if (hasUnresolvedTies) {
  throw makeError('UNRESOLVED_TIES', 'All group ties must be resolved before advancing');
}
```

### Bracket Round/Match Creation (adapt from existing pattern)

```javascript
// Source: bracketPersistenceService.js lines 319-387 (Round 1 creation)
// Key: structure string determines which matches are BYEs
// structure[matchIdx] === '1' means BYE, '0' means regular match
const isByeMatch = structure ? structure[i] === '1' : false;

// Adapt: instead of positions from generateSeededBracket(),
// build positions array from waterfall output with group-derived seeds
const positions = buildPositionsFromWaterfall(mainSlots, bracketTemplate);
```

### Route Registration Pattern

```javascript
// Source: backend/src/index.js — existing pattern for registering group routes
// New file: backend/src/api/routes/advancementRoutes.js
import advancementRoutes from './api/routes/advancementRoutes.js';
app.use('/api/v1/tournaments', advancementRoutes);

// Routes inside advancementRoutes.js:
// GET  /:id/advancement/preview   — compute waterfall, return preview data (no DB write)
// POST /:id/advancement           — confirm and generate brackets atomically
// DELETE /:id/advancement         — revert (delete brackets, unlock groups)
```

### Frontend: SWR Invalidation After Advancement

```javascript
// Pattern from existing SWR usage in tournamentViewService.js
// After successful advancement API call:
import { mutate } from 'swr';
// Invalidate the tournament format structure key
await mutate(`/api/v1/tournaments/${tournamentId}/format-structure`);
// OR use location.reload() — acceptable for one-time action
```

---

## Schema Changes

### Assessment: Minimal Schema Change Required

| Field | Action | Reason |
|-------|--------|--------|
| `Tournament.formatConfig` | Extend JSON (no migration) | Add `mainBracketSize`, `secondaryBracketSize` to existing JSON blob |
| `Bracket.bracketType` enum | **Add `SECONDARY` value** | Needed to distinguish secondary from consolation bracket. Schema migration required. |
| `Group.advancementCriteria` | **Use for group lock flag** | Already exists (nullable String). Store `{ locked: true, lockedAt: "ISO string" }` here to indicate group results are locked. Avoids new column. |

**Migration approach:** Use `prisma db push` (dev environment — matches Phase 27 precedent) then `migrate resolve` for existing migration history.

### BracketType enum addition:

```prisma
// Source: schema.prisma line 91-95 (existing enum)
enum BracketType {
  MAIN
  CONSOLATION
  PLACEMENT
  SECONDARY   // Phase 30: for secondary combined-format bracket
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Power-of-2 advancement count (CombinedConfigPanel) | Any count 4-128 with auto-byes | Phase 30 | Removes hard constraint; feature 009 handles byes |
| Single bracket per tournament | Up to 2 brackets for COMBINED | Phase 30 | Lifecycle guard handles multi-bracket completion |
| Seeding from RankingEntry DB | Seeding from group standings result | Phase 30 | Group position IS the seed rank; no category rankings lookup needed |

**Deprecated in Phase 30:**
- `advancePerGroup` field in `formatConfig` — superseded by `mainBracketSize` + `secondaryBracketSize` (keep for backward compatibility, ignore in advancement logic)

---

## Open Questions

1. **`BracketType` enum: SECONDARY vs CONSOLATION**
   - What we know: `CONSOLATION` exists. `SECONDARY` does not. The secondary bracket in COMBINED is conceptually different from a consolation bracket.
   - What's unclear: Does any existing code branch on `bracketType === 'CONSOLATION'` in a way that would break the secondary bracket display?
   - Recommendation: Grep for `CONSOLATION` usage in frontend. If `KnockoutBracket.jsx` or `CombinedFormatDisplay.jsx` key off `bracketType === 'CONSOLATION'` to change rendering, add `SECONDARY` enum value. If they don't, reusing `CONSOLATION` with a name field override is acceptable.

2. **`Bracket.placementRange` field for bracket label storage**
   - What we know: `Bracket.placementRange` is a nullable String (currently used for "4-8", "9-16" etc. in PLACEMENT brackets). It could store "Main Bracket" / "Secondary Bracket" for COMBINED brackets.
   - What's unclear: Is this semantically appropriate, or should a new `name` field be added?
   - Recommendation: Reuse `placementRange` for label storage (store "Main Bracket" / "Secondary Bracket"). Avoids schema addition. Document in code.

3. **Preview endpoint: GET vs POST**
   - What we know: Preview computes waterfall from current group standings (read-only operation).
   - What's unclear: Waterfall computation requires group standings data — technically idempotent but may be heavy. Should it be GET (restful) or POST (matches existing mutation-adjacent patterns)?
   - Recommendation: Use `GET /:id/advancement/preview` — pure read, no DB writes, cache-friendly.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 (Node.js, `node --experimental-vm-modules`) |
| Config file | `backend/package.json` `"test"` script |
| Quick run command | `cd backend && npm test -- --testPathPattern=advancement` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMB-03 | Spillover: 3 groups, 4 main slots → all 1st + best 2nd advance | unit | `npm test -- --testPathPattern=advancementService` | ❌ Wave 0 |
| COMB-04 | Cross-group ranking uses wins→setDiff→gameDiff→totalGames→name | unit | `npm test -- --testPathPattern=advancementService` | ❌ Wave 0 |
| COMB-05 | Validate 3 players (below 4 min) rejected; 128 accepted | unit | `npm test -- --testPathPattern=advancementService` | ❌ Wave 0 |
| COMB-06 | Bracket/Round/Match records created atomically for N players | integration | `npm test -- --testPathPattern=advancementRoutes` | ❌ Wave 0 |
| COMB-07 | Tournament stays IN_PROGRESS after group completion with no bracket | unit | `npm test -- --testPathPattern=combinedLifecycleGuard` | ✅ Exists |
| COMB-08 | Tournament completes only when both main + secondary brackets finish | unit | `npm test -- --testPathPattern=combinedLifecycleGuard` | ❌ Wave 0 (extend existing) |
| COMB-09 | Doubles: pairId used in bracket slots, not playerId | unit | `npm test -- --testPathPattern=advancementService` | ❌ Wave 0 |
| ADV-03 | Validation rejects mainBracketSize < 4 or > 128 | integration | `npm test -- --testPathPattern=advancementRoutes` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && npm test -- --testPathPattern=advancement`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/__tests__/unit/advancementService.test.js` — covers COMB-03, COMB-04, COMB-05, COMB-09 waterfall algorithm
- [ ] `backend/__tests__/integration/advancementRoutes.test.js` — covers COMB-06, ADV-03 API endpoint tests
- [ ] Extend `backend/__tests__/unit/combinedLifecycleGuard.test.js` — add multi-bracket completion test for COMB-08

---

## Sources

### Primary (HIGH confidence)

- `backend/src/services/bracketPersistenceService.js` — Full service read; transaction pattern, bracket/round/match creation, BYE handling, match numbering
- `backend/src/services/groupStandingsService.js` — Full service read; tiebreaker chain implementation, `buildEntityStats`, `computeGroupStandings`
- `backend/src/services/seedingPlacementService.js` — Partial read (header + `getSeedCount` + `generateSeededBracket` signature); seed tier logic
- `backend/prisma/schema.prisma` — Full read; all models, enums, FK relationships, existing JSON fields
- `frontend/src/components/CombinedFormatDisplay.jsx` — Full read; TODO at line 55, bracket rendering, existing props
- `frontend/src/components/CombinedConfigPanel.jsx` — Full read; existing `advancePerGroup` validation, power-of-2 check to remove
- `backend/src/services/tournamentLifecycleService.js` — Lines 300-353; COMBINED guard logic
- `.planning/phases/30-combined-format-advancement/30-CONTEXT.md` — Full read; locked decisions
- `.planning/phases/30-combined-format-advancement/30-UI-SPEC.md` — Full read; component inventory, interaction states, copywriting contract, layout spec

### Secondary (MEDIUM confidence)

- `backend/src/api/routes/groupStandingsRoutes.js` — Auth middleware pattern (`isAuthenticated`, `authorize`)
- `backend/src/api/routes/groupDrawRoutes.js` — Route registration pattern for new advancement routes
- `.planning/milestones/v1.4-REQUIREMENTS.md` — All COMB and ADV requirements verbatim

### Tertiary (LOW confidence)

- None — all findings verified against codebase directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified against existing codebase; no new dependencies
- Architecture: HIGH — patterns directly observed in `bracketPersistenceService.js`, `groupStandingsService.js`, and route files
- Spillover algorithm: HIGH — derived from CONTEXT.md locked decisions + `groupStandingsService` tiebreaker structure
- Schema changes: MEDIUM — `BracketType` enum addition is straightforward; `SECONDARY` vs `CONSOLATION` decision needs grep verification (open question 1)
- Pitfalls: HIGH — `isPowerOfTwo` check verified in `CombinedConfigPanel.jsx` line 44; doubles duality pattern verified in existing services

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (stable codebase — no fast-moving external dependencies)
