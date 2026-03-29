# Phase 29: Group Standings and Tiebreakers - Research

**Researched:** 2026-03-17
**Domain:** Backend tiebreaker service, cycle detection, manual override persistence, standings API, frontend standings consumption
**Confidence:** HIGH

## Summary

Phase 29 replaces the 4-level client-side sort in `GroupStandingsTable`'s `useMemo` block with a backend-computed standings response. The backend introduces one new service (`groupStandingsService.js`), one new controller, and one new route pair (GET standings + POST manual override). The frontend consumes the new endpoint via a `useGroupStandings` SWR hook and renders pre-sorted standings with tiebreaker metadata.

The tiebreaker algorithm is deterministic and pure: it takes the group's match data, applies the 6-level chain (wins → head-to-head → set diff → game diff → fewest total games → manual), detects cycles in the H2H mini-table, and emits a structured standings array with per-position `tiebreakerCriterion` and `tiedRange` metadata. All data needed is already in the DB — no new match fields required. The only schema addition is a new `GroupTieResolution` model (or equivalent) to persist manual override positions.

The biggest design decision is already made in CONTEXT.md: persist the override in DB until explicitly cleared, show a stale-warning when a match result changes after an override is saved. Detecting staleness means storing a `resultSnapshotHash` (or similar timestamp) on the override record and comparing against the latest match completion timestamps.

**Primary recommendation:** Build the tiebreaker as a pure function that is easy to unit-test, wire it into a service that fetches match data from Prisma, and expose it via two thin routes. The frontend change is mostly a swap: replace the `useMemo` standings block with the SWR hook result.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Remove the "Points" column entirely from group standings — current 2-for-win, 0-for-loss is meaningless without draws or participation points
- Sort by wins directly as the first criterion — "Points" column replaced by "W" column already present
- Update `GroupStandingsTable.jsx` to stop computing and displaying the `points` field
- Tiebreaker chain is NOT configurable per tournament — same chain applies to every GROUP/COMBINED tournament
- Chain order (6 levels): 1. Wins, 2. Head-to-head (mini-table), 3. Set differential, 4. Game differential, 5. Fewer total games played, 6. Manual organizer resolution
- When 2 players tied: simple — who won their direct match
- When 3+ players tied: build mini-table from only matches between the tied players, re-apply chain (wins within mini-table first)
- If mini-table produces a cycle (A>B, B>C, C>A): H2H level is inconclusive — fall through to set diff among the tied group
- Detect cycles on standings computation only — not on result submission
- Fall through to next level automatically — only flag for manual resolution when the entire chain exhausts without fully separating all tied players
- Partial resolution supported — if set diff separates player A from {B, C} but B=C remain tied, resolve A's position and continue chain for just B vs C
- Manual resolution inline in standings table — Alert banner above the tied group's standings with a "Resolve tie" button
- Resolution UI: dropdown position picker recommended for mobile simplicity
- Persisted in DB until cleared — manual override survives recalculation
- If a match result changes, show a warning that the override may be stale but do not auto-clear
- 'Manual' label visible to all users (players, spectators) next to manually-resolved positions
- Non-blocking during group stage, but blocks "Advance to Knockout" in COMBINED tournaments until all ties are resolved
- Backend service computes standings with full tiebreaker chain — new service, new API endpoint
- Frontend `GroupStandingsTable` stops computing standings client-side — receives pre-sorted standings from API with tiebreaker metadata
- On-demand per request — compute fresh each time standings are fetched. No caching/precomputation needed
- API response includes: sorted standings array, tiebreaker criterion per position, unresolved ties list, manual override indicators
- Tooltip on hover/tap showing tiebreaker criterion — position shows as "2nd", hovering/tapping shows "Resolved by: Head-to-head" (or "Set diff", etc.)
- Criterion label only for H2H — no mini-table display
- Doubles pairs treated identically to singles for tiebreaker display — "Player A / Player B" is just a longer name string
- Tied positions shown as range — e.g., "2-3" for both tied players until resolved

### Claude's Discretion
- Exact manual resolution UI component (dropdown vs other mobile-friendly pattern)
- API endpoint path and response shape
- Database model for manual override storage (new model vs field on GroupParticipant)
- Schema migration details
- SWR integration — how frontend fetches and caches the new standings endpoint
- Warning UX when manual override may be stale after result change
- Tooltip implementation (React Bootstrap OverlayTrigger or custom)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GSTAND-01 | System calculates group standings based on win/loss record | Pure computation over completed matches in group; all match data (winner, sets, games) is in `match.result` JSON already read in GroupStandingsTable |
| GSTAND-02 | System applies tiebreaker chain: set/point differential → fewer games/points played → head-to-head result | 6-level chain as a recursive "sort tied subset" function; pure JS, no new DB fields needed; pattern mirrors `rankingCalculator.js` chain |
| GSTAND-03 | System detects three-way circular tiebreaker locks (A>B, B>C, C>A) and flags them for manual resolution | Cycle detection in directed graph of H2H results; O(n²) for groups of 3-8 players — trivial; fall-through to set diff when detected |
| GSTAND-04 | Organizer can manually resolve three-way tiebreaker locks by setting final positions | New DB model for override storage; POST endpoint protected by isAuthenticated + authorize('update', 'Tournament'); frontend Modal with Form.Select per tied position |
| GSTAND-05 | Group standings display shows current positions, W/L record, differential, and head-to-head indicators | Frontend: remove `useMemo` standings block, add `useGroupStandings` SWR hook, render tiebreaker criterion badges, tied-position ranges, and organizer-only tie banner |
| GSTAND-06 | Group standings work correctly for both singles and doubles tournaments | Service reads `group.players` vs `group.pairs` same way existing `GroupStandingsTable` does; entity abstraction already established in Phase 28 |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | 6.19.x (project) | Fetch group matches and participants; write/read manual override | Already project ORM; `prisma.$transaction` pattern established |
| Express 5.1.0 | 5.1.0 (project) | New route for GET standings + POST/DELETE manual override | Already project web framework |
| Joi 18.0.1 | 18.0.1 (project) | Validate manual override POST body (groupId, positions array) | Already project validator; `validateBody` middleware exists |
| SWR (project version) | project | `useGroupStandings` hook — fetch standings, revalidate after match entry | Already project data-fetching; established in `useMatches` hook in `tournamentViewService.js` |
| React Bootstrap OverlayTrigger + Tooltip | 2.10.x (project) | Tiebreaker criterion tooltip on position cell | Already in project dependencies; identified in CONTEXT.md code context |
| React Bootstrap Modal + Form.Select | 2.10.x (project) | Manual tie resolution dialog | Established `fullscreen="sm-down"` pattern from MatchResultModal |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Bootstrap Alert + Badge | 2.10.x | Tie warning banner, tiebreaker criterion badge on position cell, stale-override warning | Already used throughout project for contextual alerts and labels |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New DB model for override | JSON field on `Group.advancementCriteria` | JSON field avoids migration but loses relational clarity and makes the stale-detection hash hard to store cleanly; new model is cleaner |
| On-demand computation | Cache computation in DB | Groups are 3-8 players — computation takes < 1ms; caching adds invalidation complexity with no benefit |

**Installation:** No new packages needed — all libraries already in project.

---

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
├── services/
│   └── groupStandingsService.js     # Pure tiebreaker logic + DB fetch
├── api/
│   ├── groupStandingsController.js  # HTTP handlers
│   ├── routes/
│   │   └── groupStandingsRoutes.js  # Route definitions
│   └── validators/
│       └── groupStandingsValidator.js  # Joi schemas
backend/prisma/
│   └── schema.prisma               # Add GroupTieResolution model
backend/__tests__/
│   ├── unit/
│   │   └── groupStandingsService.test.js  # Pure tiebreaker unit tests
│   └── integration/
│       └── groupStandingsRoutes.test.js   # API integration tests
frontend/src/
├── services/
│   └── tournamentViewService.js    # Add useGroupStandings SWR hook
└── components/
    └── GroupStandingsTable.jsx     # Remove useMemo, add SWR, render tiebreaker metadata
```

### Pattern 1: Tiebreaker Service — Pure Function Chain

The service entry point fetches data then delegates to a pure function. The pure function is independently unit-testable.

```javascript
// Source: pattern mirrors rankingCalculator.js

/**
 * Compute standings for a single group.
 * @param {Array} entities  - [{id, name}] (players or pairs)
 * @param {Array} matches   - completed Match records with matchResult
 * @param {Object|null} override - GroupTieResolution record or null
 * @returns {Array} standings entries with position, tiebreakerCriterion, tiedRange, isManual
 */
export function computeGroupStandings(entities, matches, override) {
  const stats = buildEntityStats(entities, matches);
  return sortWithTiebreakers(stats, override);
}
```

The `sortWithTiebreakers` function processes groups of tied entities recursively:
1. Sort by wins (descending)
2. For each tied subset: apply head-to-head mini-table
3. Cycle detection in mini-table: if win graph is cyclic for the entire subset, skip H2H level
4. Continue with set diff, game diff, fewest total games
5. If still tied after level 5: mark as unresolved; check for manual override

### Pattern 2: Cycle Detection via Win-Graph Traversal

For a tied subset `[A, B, C, ...]`, build a directed graph where A→B means A beat B in their head-to-head. A cycle exists if there is no entity with 0 in-degree (i.e., every entity lost at least one match to someone in the subset). Topological sort (Kahn's algorithm) detects this in O(n²) for small n.

```javascript
// Source: established algorithm for H2H cycle detection in round-robin tournaments
function detectH2HCycle(subset, h2hWins) {
  // h2hWins: Map<id, Set<id>> — ids beaten by each entity within subset
  const inDegree = new Map(subset.map(e => [e.id, 0]));
  for (const [winner, beaten] of h2hWins) {
    for (const loserId of beaten) {
      inDegree.set(loserId, (inDegree.get(loserId) || 0) + 1);
    }
  }
  // If everyone has in-degree >= 1, the sub-graph is cyclic
  return [...inDegree.values()].every(d => d >= 1);
}
```

### Pattern 3: API Response Shape

GET `/api/v1/tournaments/:tournamentId/groups/:groupId/standings`

```json
{
  "success": true,
  "data": {
    "standings": [
      {
        "position": 1,
        "tiedRange": null,
        "tiebreakerCriterion": null,
        "isManual": false,
        "entity": { "id": "...", "name": "Alice" },
        "played": 3,
        "wins": 3,
        "losses": 0,
        "setsWon": 6, "setsLost": 2, "setDiff": 4,
        "gamesWon": 42, "gamesLost": 28, "gameDiff": 14,
        "totalGames": 70
      },
      {
        "position": 2,
        "tiedRange": "2-3",
        "tiebreakerCriterion": "H2H",
        "isManual": false,
        "entity": { "id": "...", "name": "Bob" },
        ...
      }
    ],
    "unresolvedTies": [
      { "range": "2-3", "entityIds": ["...bob", "...carol"] }
    ],
    "hasManualOverride": false,
    "overrideIsStale": false
  }
}
```

### Pattern 4: Manual Override Storage — New DB Model

```prisma
// Source: CONTEXT.md "Database model for manual override storage (Claude's discretion)"
model GroupTieResolution {
  id              String   @id @default(uuid())
  groupId         String   @unique  // One override per group at a time
  positions       String   // JSON: [{ entityId, position }]
  resultSnapshotAt DateTime // Latest match completedAt when override was saved
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@index([groupId])
}
```

Stale detection: when computing standings, compare `max(match.completedAt)` for the group against `override.resultSnapshotAt`. If any match was completed after `resultSnapshotAt`, flag `overrideIsStale: true` in response.

### Pattern 5: SWR Hook in tournamentViewService.js

```javascript
// Source: mirrors existing useMatches() hook pattern
export const useGroupStandings = (tournamentId, groupId, shouldFetch = true) => {
  const { data, error, mutate } = useSWR(
    tournamentId && groupId && shouldFetch
      ? `/tournaments/${tournamentId}/groups/${groupId}/standings`
      : null,
    () => getGroupStandings(tournamentId, groupId),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000 // short — standings change frequently during group stage
    }
  );
  return {
    standings: data?.standings ?? [],
    unresolvedTies: data?.unresolvedTies ?? [],
    hasManualOverride: data?.hasManualOverride ?? false,
    overrideIsStale: data?.overrideIsStale ?? false,
    isLoading: !error && !data && shouldFetch,
    isError: error,
    mutate
  };
};
```

### Anti-Patterns to Avoid

- **Storing tiebreaker chain results in the DB**: Standings are derived from match data. Storing them creates sync problems when a result is corrected. Compute on-demand instead.
- **Running cycle detection on result submission**: The CONTEXT.md decision is to detect on standings computation only. Adding it to result submission adds latency with no benefit.
- **Auto-clearing the manual override on result change**: CONTEXT.md locked decision — show stale warning but do not auto-clear. Let the organizer decide.
- **Resetting override when the same players are still tied**: The stale flag is informational. The positions may still be valid even if a match changed (e.g., only a score correction, same winner).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cycle detection in H2H directed graph | Custom DFS | Kahn's algorithm (topological sort with in-degree check) | Kahn's handles partial cycles and is O(V+E); for 3-8 nodes it's trivial to implement correctly |
| SWR cache invalidation after match result | Custom event bus | Call `mutate()` from `useGroupStandings` hook after match modal closes (same pattern as `useMatches` in Phase 28) | Already established — `MatchResultModal` receives a `mutate` prop and calls it on success |
| Auth middleware for new routes | Custom role check | `isAuthenticated` + `authorize('update', 'Tournament')` for override routes; GET standings is public | Already established — see `groupDrawRoutes.js` pattern |

---

## Common Pitfalls

### Pitfall 1: Partial Cycle in 3+ Player H2H Mini-Table

**What goes wrong:** With 4 tied players, A beats B, B beats C, C beats A, but D lost to all three. The D vs {A,B,C} portion is not a cycle — D is correctly ranked last among the 4. Only the {A,B,C} sub-subset needs to fall through.

**Why it happens:** Implementing cycle detection at the full-subset level misses partial resolvability.

**How to avoid:** Apply tiebreaker recursively on subsets. After H2H, if the full subset of 4 still can't be resolved by H2H, check if any sub-grouping can be. The CONTEXT.md decision supports this: "Partial resolution supported — if set diff separates player A from {B, C}..."

**Warning signs:** A 4-player group where one player clearly dominates but the standings shows a 4-way tie range.

### Pitfall 2: Match Result JSON Parsing Inconsistency

**What goes wrong:** Group matches use the same `match.result` JSON field as knockout matches, but the field contains `"winner": "PLAYER1"` (not an entity ID). The service must use `pair1Id / player1Id` from the match record to resolve which entity won.

**Why it happens:** The result JSON stores `PLAYER1`/`PLAYER2` slot identifiers, not entity IDs. This is correct for knockout but requires the service to correlate slot → entity.

**How to avoid:** Parse `result.winner === 'PLAYER1'` → entity ID from `match.player1Id || match.pair1Id`. This pattern is already used in `matchResultService.js` lines 433-436.

**Warning signs:** Wrong winner credited in standings, or entity stats not updating.

### Pitfall 3: Stale Override Detection Off-by-One

**What goes wrong:** Override saved at T=10:00. Match result corrected at T=10:00 (same second). `completedAt === resultSnapshotAt` — is it stale?

**Why it happens:** Timestamp precision (seconds vs milliseconds) can cause boundary issues.

**How to avoid:** Use `>` (strictly after) not `>=` for stale comparison: `anyMatchCompletedAt > override.resultSnapshotAt`. Record `resultSnapshotAt = new Date()` at the moment of override creation, which will always be after the last `match.completedAt`.

**Warning signs:** Stale warning appears immediately after saving an override.

### Pitfall 4: useMemo Standings and SWR Standings Both Running

**What goes wrong:** During the migration, if the `useMemo` standings block is not fully removed but the SWR hook is added, React renders from both sources causing flicker or incorrect state.

**Why it happens:** Incremental migration leaves old code paths active.

**How to avoid:** Remove the entire `useMemo` standings block in the same commit that adds the SWR hook. The two systems are mutually exclusive.

**Warning signs:** Standings briefly flash to a different order on page load.

### Pitfall 5: Group Without Completed Matches Returns Wrong Position Order

**What goes wrong:** When no matches are completed, all entities have 0 wins, 0 set diff, 0 game diff — the tiebreaker chain resolves nothing. The service must return a stable default order (e.g., insertion order from `group.players`/`group.pairs`) rather than an arbitrary sort.

**Why it happens:** `Array.sort()` is not stable across all JS engines (though Node 20 V8 is stable). Without a final deterministic tiebreaker at level 5, sort order is undefined.

**How to avoid:** Add alphabetical name sort as the final fallback at level 6 (before manual). Use `entity.name.localeCompare(other.name)`. Emit `tiedRange` for the entire group when no games are played.

---

## Code Examples

Verified patterns from existing codebase:

### Match Result JSON Shape (from matchResultService.js lines 376-398)
```javascript
// Source: backend/src/services/matchResultService.js
resultJson = {
  winner: body.winner,          // 'PLAYER1' | 'PLAYER2'
  submittedBy: 'ORGANIZER',     // or 'PLAYER'
  sets: mappedSets,             // [{ setNumber, player1Score, player2Score, tiebreakScore }]
  outcome: null                 // or 'WALKOVER' | 'FORFEIT' | 'NO_SHOW'
};
```

### Existing Entity Stats Build (from GroupStandingsTable.jsx lines 86-158)
```javascript
// Source: frontend/src/components/GroupStandingsTable.jsx
const entityStats = new Map();
entities.forEach(entity => {
  entityStats.set(entity.id, { entity, played: 0, wins: 0, losses: 0,
    setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 });
});
matches.forEach(match => {
  if (match.status !== 'COMPLETED' || !match.matchResult) return;
  const id1 = isDoubles ? match.pair1?.id : match.player1?.id;
  const id2 = isDoubles ? match.pair2?.id : match.player2?.id;
  // ... accumulate stats
});
```
This logic moves to the backend service unchanged (adapted to use `match.result` JSON directly).

### Auth Middleware Pattern (from groupDrawRoutes.js)
```javascript
// Source: backend/src/api/routes/groupDrawRoutes.js
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

router.post('/:id/group-draw',
  isAuthenticated,
  authorize('create', 'Tournament'),
  validateBody(schema),
  handler
);
```
GET standings endpoint is public (no auth). POST manual override uses `authorize('update', 'Tournament')`.

### SWR Hook Pattern (from tournamentViewService.js lines 223-241)
```javascript
// Source: frontend/src/services/tournamentViewService.js
export const useMatches = (id, filters = {}, shouldFetch = false, refreshKey = 0) => {
  const filterKey = JSON.stringify(filters);
  const { data, error, mutate } = useSWR(
    id && shouldFetch ? `/tournaments/${id}/matches?${filterKey}&_r=${refreshKey}` : null,
    () => getMatches(id, filters),
    { revalidateOnFocus: true, revalidateOnReconnect: true, dedupingInterval: 30000 }
  );
  return { matches: data, isLoading: !error && !data && shouldFetch, isError: error, mutate };
};
```

### OverlayTrigger + Tooltip Pattern (React Bootstrap 2.10)
```jsx
// Source: React Bootstrap 2.10 docs — confirmed available in project (package.json react-bootstrap ^2.10.x)
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

<OverlayTrigger
  placement="right"
  trigger={['hover', 'focus', 'click']}
  overlay={<Tooltip>Resolved by: Head-to-head</Tooltip>}
>
  <span style={{ cursor: 'help' }}>
    <Badge bg="secondary" style={{ fontSize: '10px' }}>H2H</Badge>
  </span>
</OverlayTrigger>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side 4-level sort in GroupStandingsTable `useMemo` (wins → setDiff → gameDiff) | Backend 6-level service with H2H, cycle detection, manual override | Phase 29 (this phase) | Frontend becomes a pure renderer; standings are authoritative from server |
| Points column (2-for-win, 0-for-loss) | No Points column — sort by wins directly | Phase 29 (this phase) | Remove confusing metric; simplify rendering |
| No H2H tiebreaker | H2H mini-table for tied subsets | Phase 29 (this phase) | Correct tennis/padel group tournament behavior |

**Deprecated/outdated:**
- `useMemo` standings computation in `GroupStandingsTable.jsx` lines 67-184: replaced by `useGroupStandings` SWR hook in this phase
- `Pts` column in standings table (lines 201, 217, 222): removed in this phase

---

## Open Questions

1. **Route nesting under `/tournaments/:id/groups/:groupId/standings` vs `/groups/:groupId/standings`**
   - What we know: all current group-related endpoints are nested under `/tournaments/:id/` (e.g., `/tournaments/:id/group-draw`)
   - What's unclear: whether groupId is globally unique (UUID, probably yes) making deep nesting optional
   - Recommendation: Use `/api/v1/tournaments/:tournamentId/groups/:groupId/standings` — consistent with project convention; groupId alone is sufficient to fetch but the tournament context makes auth and error messages cleaner

2. **`GroupTieResolution` as new model vs JSON field on `Group`**
   - What we know: `Group.advancementCriteria` is already a String JSON field; manual override could be stored there
   - What's unclear: whether `advancementCriteria` is reserved for Phase 30 (advancement configuration)
   - Recommendation: New `GroupTieResolution` model — keeps Phase 30's `advancementCriteria` field uncontested; cleaner schema; `@unique` on groupId prevents multiple conflicting overrides

3. **Stale override: what constitutes a "match result change" for detection purposes**
   - What we know: A match re-submission updates `completedAt` (line 404 in matchResultService.js `completedAt: new Date()`)
   - Recommendation: Compare `MAX(match.completedAt) for group WHERE status = COMPLETED` against `override.resultSnapshotAt`. If any match completed after the override, flag stale.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 (ES Modules via `--experimental-vm-modules`) |
| Config file | `backend/package.json` scripts.test |
| Quick run command | `node --experimental-vm-modules node_modules/jest/bin/jest.js --testPathPattern="groupStandings" --no-coverage` |
| Full suite command | `node --experimental-vm-modules node_modules/jest/bin/jest.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GSTAND-01 | Stats accumulation (wins, losses, sets, games) from match data | unit | `jest --testPathPattern="groupStandingsService"` | ❌ Wave 0 |
| GSTAND-02 | 6-level tiebreaker chain resolves ties correctly (all levels) | unit | `jest --testPathPattern="groupStandingsService"` | ❌ Wave 0 |
| GSTAND-03 | Cycle detection: A>B, B>C, C>A returns inconclusive + falls through | unit | `jest --testPathPattern="groupStandingsService"` | ❌ Wave 0 |
| GSTAND-04 | POST override persists; GET standings reflects override; stale detection works | integration | `jest --testPathPattern="groupStandingsRoutes"` | ❌ Wave 0 |
| GSTAND-05 | API response shape includes tiedRange, tiebreakerCriterion, unresolvedTies | integration | `jest --testPathPattern="groupStandingsRoutes"` | ❌ Wave 0 |
| GSTAND-06 | Service handles doubles (pair entities) identically to singles | unit | `jest --testPathPattern="groupStandingsService"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --experimental-vm-modules node_modules/jest/bin/jest.js --testPathPattern="groupStandings" --no-coverage`
- **Per wave merge:** `node --experimental-vm-modules node_modules/jest/bin/jest.js --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/__tests__/unit/groupStandingsService.test.js` — covers GSTAND-01, GSTAND-02, GSTAND-03, GSTAND-06
- [ ] `backend/__tests__/integration/groupStandingsRoutes.test.js` — covers GSTAND-04, GSTAND-05
- [ ] Schema migration: `GroupTieResolution` model → `prisma db push` or `prisma migrate dev`

*(No new test framework install needed — Jest 30.2.0 already configured)*

---

## Sources

### Primary (HIGH confidence)
- `frontend/src/components/GroupStandingsTable.jsx` — exact existing standings computation (lines 67-184); entity abstraction pattern; match result parsing
- `backend/src/services/matchResultService.js` — result JSON shape, winner field semantics, `PLAYER1`/`PLAYER2` convention
- `backend/prisma/schema.prisma` — Match, Group, GroupParticipant models; no existing tie resolution model confirmed
- `frontend/src/services/tournamentViewService.js` — SWR hook pattern (`useMatches`); API URL convention
- `backend/src/api/routes/groupDrawRoutes.js` — route registration pattern, auth middleware usage
- `.planning/phases/29-group-standings-and-tiebreakers/29-CONTEXT.md` — all locked decisions, tiebreaker chain order, manual override behavior
- `.planning/phases/29-group-standings-and-tiebreakers/29-UI-SPEC.md` — component inventory, interaction contract, copywriting contract, responsive rules
- `backend/src/utils/rankingCalculator.js` — multi-level tiebreaker sort pattern (different chain, same structure)
- `backend/package.json` — Jest 30.2.0, ES Modules test setup confirmed

### Secondary (MEDIUM confidence)
- Kahn's topological sort algorithm for cycle detection — well-established algorithm for directed graph cycle detection, applicable directly to H2H win graphs
- React Bootstrap 2.10 OverlayTrigger + Tooltip pattern — confirmed in project dependencies; usage confirmed in UI-SPEC

### Tertiary (LOW confidence)
- None — all critical claims verified against project source files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json; no new dependencies
- Architecture: HIGH — patterns directly derived from existing codebase services and routes
- Pitfalls: HIGH — identified from reading existing matchResultService.js, GroupStandingsTable.jsx, and CONTEXT.md decisions
- Tiebreaker algorithm: HIGH — pure function, well-understood round-robin group stage math

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain — no external dependencies that could change)
