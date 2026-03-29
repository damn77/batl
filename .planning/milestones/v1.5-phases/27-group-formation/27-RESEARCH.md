# Phase 27: Group Formation - Research

**Researched:** 2026-03-17
**Domain:** Group draw generation, snake draft seeding, round-robin scheduling, doubles support
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Draw generation UX:**
- Extend existing `BracketGenerationSection` component to handle GROUP and COMBINED formats — same Close Registration → Configure → Generate flow as knockout
- Organizer specifies **group count** directly (not group size); system calculates and previews group sizes (e.g., "4 groups: 2 of 4, 2 of 3")
- After generating, display **full GroupStandingsTable** views immediately (empty standings with player lists)
- Regenerate button with confirmation modal ("This will erase all groups and matches") — same pattern as knockout bracket regenerate

**Snake draft & seeding:**
- Organizer configures number of **seeded rounds** for snake draft placement
- Snake order: Round 1 fills groups 1→N, Round 2 fills groups N→1, etc. (standard snake)
- Ranking data comes from **Feature 008 seeding scores** via `getRankingsForCategory()` — same source as knockout seeding
- Remaining unseeded players distributed randomly across groups after seeded rounds complete
- **Deterministic randomization** using `seedrandom` library (same pattern as knockout draws in Feature 010) for audit trail reproducibility
- Uneven group sizes: **first groups get the extra players** (natural snake draft fill order)
- Balanced group validation: no group more than 1 player smaller than the largest (GFORM-02)

**Manual override flow:**
- **Swap two players** between groups — select player from group A, select player from group B, swap. Keeps group sizes balanced automatically
- Round-robin schedule **auto-regenerates** for affected groups after each swap
- Overrides **locked at tournament start** (status → IN_PROGRESS). Use Revert to undo draw entirely (existing revert pattern)
- Swap UI shows **seed position numbers** next to player names so organizer understands ranking impact

**Round-robin schedule generation:**
- Use **standard circle method** (rotate players) to generate balanced rounds — each player plays once per round
- For a group of N players: N-1 rounds (or N rounds if N is odd, with BYE rotation)
- Matches stored using **existing Match model** with `groupId` FK set — existing result submission and score entry infrastructure works
- Match numbers use **group offset pattern**: Group 1 starts at 100, Group 2 at 200, etc. (analogous to consolation bracket's 1000+ offset)
- Fixtures generated atomically inside a Prisma transaction alongside Group and GroupParticipant records

**Doubles support (GFORM-07):**
- **Add `pairId` FK** to `GroupParticipant` model (nullable) — singles uses `playerId`, doubles uses `pairId`. Schema migration required
- Matches for doubles groups use existing `pair1Id`/`pair2Id` fields on Match model
- Snake draft for doubles uses pair seeding scores from rankings (same as knockout doubles)

### Claude's Discretion
- Exact group offset numbering scheme (100/200/300 vs 1000/2000/3000)
- Circle method implementation details
- Error state UI for generation failures
- API endpoint naming and route structure
- Whether to add a `roundNumber` field to group matches or reuse existing Round model

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GFORM-01 | Organizer can configure the number of groups and group sizes at registration close | GroupDrawGenerationSection (extended BracketGenerationSection) with group count input and size preview |
| GFORM-02 | System validates that group sizes are balanced (no group more than 1 player smaller than the largest) | `groupPersistenceService.generateGroupDraw()` guard: `Math.ceil(N/G) - Math.floor(N/G) <= 1` |
| GFORM-03 | Organizer can configure the number of seeded rounds for snake draft placement | Config UI input: "Seeded rounds" spinner (0 to groupCount), passed to service as `seededRounds` |
| GFORM-04 | System distributes seeded players across groups using snake draft based on ranking | Snake draft algorithm: fetch top N via `getSeededPlayers()`, place in snake order, tier-random within each tier |
| GFORM-05 | System randomly distributes remaining unseeded players across groups after seeded rounds | After seeded rounds: Fisher-Yates shuffle unseeded pool, snake-fill remaining slots deterministically |
| GFORM-06 | Organizer can manually override player-to-group assignments after automated formation | Swap UI: select player A (group X) + player B (group Y) → server-side swap + fixture regeneration for both groups |
| GFORM-07 | Group formation works for both singles (players) and doubles (pairs) | `pairId` FK migration on `GroupParticipant`; service branches on `category.type === 'DOUBLES'` |

</phase_requirements>

---

## Summary

Phase 27 implements group formation for GROUP and COMBINED format tournaments. All the hard parts — registration lifecycle, seeding data retrieval, deterministic randomization, atomic Prisma persistence, and the organizer draw workflow UI — are already solved and can be directly reused from the knockout pipeline. The new work is: (1) a `groupPersistenceService` that implements snake draft and circle-method round-robin generation, (2) extending `BracketGenerationSection` to handle GROUP/COMBINED format types, (3) a schema migration to add `pairId` to `GroupParticipant`, and (4) a server-side swap endpoint for manual overrides.

The circle method for round-robin scheduling is a well-known O(N²) algorithm and requires no external libraries. Group formation is entirely backend-driven; the frontend only needs to render configuration inputs, trigger the API, and display the resulting GroupStandingsTable entries.

**Primary recommendation:** Model `groupPersistenceService.js` directly on `bracketPersistenceService.js` — same three exports (`closeRegistration` already exists, `generateGroupDraw`, `swapGroupParticipants`), same atomic `$transaction` pattern, same `makeError(code, message)` helper.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | Existing | Group/GroupParticipant/Match persistence | Already integrated; `$transaction` for atomicity |
| seedrandom | 3.0.5+ (existing) | Deterministic random seed for unseeded fill | Already used in Feature 010; audit reproducibility |
| Zod | Existing | Request body validation (groupCount, seededRounds) | Already used for format config validation |
| React Bootstrap | 2.10 (existing) | Config UI (Form, Modal, Card, Badge) | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Express 5.1 | Existing | Route handlers for group draw endpoints | New route file for group draw |
| SWR | Existing | Frontend data fetching/cache invalidation | Reuse `mutateFormatStructure` and `mutateMatches` pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Circle method (manual impl) | external round-robin library | No suitable small library; circle method is 15 lines |
| Group offset (100/200/300) | Group offset (1000/2000/3000) | 100-per-group allows 99 matches per group; safe for up to 8-player groups (28 max matches); use 100 |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
```
backend/src/services/
  groupPersistenceService.js    # NEW: generateGroupDraw, swapGroupParticipants
backend/src/api/
  groupDrawController.js        # NEW: request handlers
  routes/groupDrawRoutes.js     # NEW: Express router
frontend/src/components/
  GroupDrawGenerationSection.jsx # NEW: GROUP/COMBINED draw workflow (or extend BracketGenerationSection)
frontend/src/services/
  groupDrawService.js            # NEW: axios calls to group draw API
```

### Pattern 1: Atomic Group Draw Generation (Backend Service)

Mirror of `bracketPersistenceService.generateBracket()`:

```javascript
// groupPersistenceService.js
export async function generateGroupDraw(tournamentId, options = {}) {
  const { groupCount, seededRounds = 0, randomSeed } = options;

  // 1. Load tournament + validate guards (same as bracket service)
  // 2. Load registered players/pairs (same DOUBLES branch logic)
  // 3. Validate balance: Math.ceil(N/groupCount) - Math.floor(N/groupCount) <= 1
  // 4. Fetch seeded players via getSeededPlayers() if seededRounds > 0
  // 5. Snake-draft seeded tiers across groups
  // 6. Fisher-Yates shuffle unseeded remainder → fill remaining slots
  // 7. Atomic $transaction:
  //    a. deleteMany Group, GroupParticipant, Match where tournamentId + groupId in Groups
  //    b. createMany Groups (1..groupCount)
  //    c. createMany GroupParticipants per group
  //    d. generateCircleRoundRobin() per group → createMany Matches
  // 8. Return { groups, participantCount, matchCount }
}
```

### Pattern 2: Circle Method Round-Robin Scheduler

The circle method generates N-1 rounds for N even, N rounds for N odd (with a BYE sentinel):

```javascript
function generateCircleRoundRobin(participants, groupNumber) {
  // For odd N, add a BYE sentinel
  const slots = participants.length % 2 === 0
    ? [...participants]
    : [...participants, null];  // null = BYE
  const N = slots.length;
  const rounds = N - 1;
  const fixtures = [];

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < N / 2; i++) {
      const p1 = slots[i];
      const p2 = slots[N - 1 - i];
      if (p1 !== null && p2 !== null) {  // skip BYE matches
        fixtures.push({ round: round + 1, p1, p2 });
      }
    }
    // Rotate: fix position 0, rotate positions 1..N-1
    const last = slots.pop();
    slots.splice(1, 0, last);
  }
  return fixtures;
}
```

Match numbering: `baseOffset + matchIndex` where `baseOffset = groupNumber * 100` (Group 1 = 101+, Group 2 = 201+, etc.).

### Pattern 3: Snake Draft Distribution

```javascript
function snakeDraft(players, groupCount, seededRounds) {
  // players already sorted by seedingScore DESC
  const groups = Array.from({ length: groupCount }, () => []);
  let forward = true;

  for (let round = 0; round < seededRounds; round++) {
    const indices = forward
      ? Array.from({ length: groupCount }, (_, i) => i)
      : Array.from({ length: groupCount }, (_, i) => groupCount - 1 - i);
    for (const idx of indices) {
      const player = players.shift();
      if (player) groups[idx].push(player);
    }
    forward = !forward;
  }
  // remaining players: shuffle then snake-fill
  // ...
  return groups;
}
```

### Pattern 4: GroupParticipant Doubles Migration

```prisma
model GroupParticipant {
  id           String @id @default(uuid())
  groupId      String
  playerId     String?   // nullable for doubles (was non-nullable)
  pairId       String?   // NEW: FK to DoublesPair for doubles tournaments
  seedPosition Int?

  group  Group          @relation(...)
  player PlayerProfile? @relation(...)  // nullable now
  pair   DoublesPair?   @relation(...)  // NEW

  @@unique([groupId, playerId])  // keep existing
  @@unique([groupId, pairId])    // NEW: one pair per group
  @@index([groupId])
  @@index([playerId])
  @@index([pairId])              // NEW
}
```

**Important:** `playerId` must become nullable in the migration (currently `String` non-nullable). The Prisma migration will be `ALTER TABLE "GroupParticipant" ALTER COLUMN "playerId" DROP NOT NULL, ADD COLUMN "pairId" TEXT REFERENCES "DoublesPair"("id") ON DELETE CASCADE`.

### Pattern 5: Frontend Extension of BracketGenerationSection

`BracketGenerationSection` currently guards on `formatType !== 'KNOCKOUT'` (line 195) and returns null. Extend by:

1. Remove or relax the knockout-only guard.
2. Add a `GROUP`/`COMBINED` branch in State B (registration closed, no draw) that renders group count + seeded rounds inputs instead of draw mode radio buttons.
3. In State C (draw generated), render `GroupStandingsTable` per group instead of `KnockoutBracket`.

Alternative: create a separate `GroupDrawGenerationSection` component and wire it in `FormatVisualization.jsx` for GROUP/COMBINED (analogous to how `BracketGenerationSection` is wired for KNOCKOUT). This is cleaner if the two flows diverge significantly.

Given the CONTEXT decision to "extend" rather than create, extending is the locked approach — but the implementation can extract shared logic into helpers to keep the component readable.

### Anti-Patterns to Avoid

- **Non-atomic generation:** Creating Groups, then GroupParticipants, then Matches in separate transactions. A failure mid-way leaves orphaned records. Always use a single `$transaction`.
- **Hardcoding groupId on Match:** Group matches use `groupId` FK (not `bracketId`). Do NOT set `bracketId` on group matches — the existing Match model supports this via nullable FKs.
- **Making `playerId` required for doubles:** The existing `GroupParticipant.playerId` is non-nullable; after migration it must be nullable. Forgetting this causes FK constraint errors for doubles draws.
- **Using `roundId` FK on group matches:** The `Round` model links to `Bracket` via `bracketId`; group matches have no bracket. Store `roundNumber` directly on the Match record as an ad-hoc field, OR create Group-scoped Round records with `bracketId = null` (Round.bracketId is already nullable per schema). Either approach works — creating Round records is cleaner for future querying.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ranked player retrieval | Custom DB query for top-N players | `getSeededPlayers(categoryId, N)` from `seedingPlacementService.js` | Already handles SINGLES vs PAIR ranking type filtering, FK type safety |
| Deterministic shuffle | Custom PRNG | `shuffle(array, seed)` from `seedingPlacementService.js` | Already uses seedrandom + Fisher-Yates; chi-square validated |
| Registration lifecycle | Re-implement close/revert | `closeRegistration(tournamentId)` + `revertTournament()` | Already implemented and tested |
| Doubles entity loading | Custom query | Pattern from `bracketPersistenceService.js` lines 147-160 | Handles PairRegistration vs TournamentRegistration branching |
| VALID_ENTITY_IDS check | Skip the check | Copy the `pairCount !== entityIds.length` defensive guard | Prevents silent FK violations that surface as cryptic DB errors |

**Key insight:** The seeding infrastructure (ranking retrieval, shuffle, deterministic seed) is fully reusable. The only net-new algorithm is the circle method and snake draft, which are both simple loops.

---

## Common Pitfalls

### Pitfall 1: `playerId` Non-Nullable Migration
**What goes wrong:** `prisma migrate dev` fails or Prisma Client throws a TypeScript/runtime error when creating a `GroupParticipant` record for doubles without `playerId`.
**Why it happens:** `GroupParticipant.playerId` is currently `String` (non-nullable) in schema.prisma. Doubles participants have no playerId.
**How to avoid:** Migration must include `ALTER COLUMN "playerId" DROP NOT NULL` and add `pairId` column. In schema.prisma, change `playerId String` to `playerId String?` and add `pairId String?`.
**Warning signs:** `prisma generate` succeeds but runtime `create` calls fail with NOT NULL constraint violations.

### Pitfall 2: Match `groupId` vs `bracketId` Confusion
**What goes wrong:** Group matches accidentally get `bracketId` set, or get excluded from group queries because the query filters on `bracketId IS NOT NULL`.
**Why it happens:** Developer copies bracket generation code verbatim without removing bracket-specific fields.
**How to avoid:** Group Match records must have `groupId` set and `bracketId = null`. The Match model supports this via nullable FKs (both are `String?`).
**Warning signs:** `GroupStandingsTable` receives zero matches because the `useMatches` filter queries `{ groupId: group.id }` but matches were stored with groupId null.

### Pitfall 3: Round-Robin Match Count Expectation
**What goes wrong:** Organizer sees fewer matches than expected, or duplicate matchups appear.
**Why it happens:** N*(N-1)/2 is the correct unique match count per group. Circle method with odd N requires a BYE sentinel; without it, some matchups are duplicated.
**How to avoid:** Always add a null sentinel when N is odd before running the circle algorithm. Skip any fixture where either participant is null.
**Warning signs:** A group of 5 generates 10 matches (correct) vs 8 or 12.

### Pitfall 4: Match Number Collision Between Groups
**What goes wrong:** Multiple groups produce matches with the same `matchNumber`, violating any uniqueness expectations and confusing match display.
**Why it happens:** If the offset is not large enough, Group 1 matches (1–28) and Group 2 matches (1–28) collide.
**How to avoid:** Use `groupNumber * 100` as offset (Group 1: 101-128, Group 2: 201-228, etc.). With max 8-player groups (28 matches per group), 100-per-group is safe.
**Warning signs:** Only one group's matches appear in results queries because of DB uniqueness constraints or sort ordering.

### Pitfall 5: Frontend FormatVisualization GROUP State Shows Empty
**What goes wrong:** After generating the draw, the tournament page still shows "No groups" alert.
**Why it happens:** `useFormatStructure` returns the current `structure.groups` array; but the API that serves `useFormatStructure` may not include newly created groups if the endpoint only returns brackets.
**How to avoid:** Verify that `GET /api/v1/tournaments/:id/format-structure` (or equivalent) loads `Group` and `GroupParticipant` records and includes them in the response. Call `mutateFormatStructure()` after generation.
**Warning signs:** `structure.groups` is empty after generation even though DB has records.

### Pitfall 6: Doubles Seeded Players Using Wrong Ranking Type
**What goes wrong:** FK constraint error: `GroupParticipant_pairId_fkey` violation because `getSeededPlayers` returned PlayerProfile IDs instead of DoublesPair IDs.
**Why it happens:** `getSeededPlayers` already handles this (filters to PAIR rankings for DOUBLES categories), but if called incorrectly or if rankings don't exist yet, it may fall back to player entries.
**How to avoid:** Add a defensive check after seeded player retrieval: verify all entityIds are valid DoublesPair records (copy the pattern from `bracketPersistenceService.js` lines 272-287).
**Warning signs:** `prisma.groupParticipant.create` throws FK constraint error.

---

## Code Examples

### Existing: Atomic Transaction Pattern (bracketPersistenceService.js)
```javascript
// Source: backend/src/services/bracketPersistenceService.js lines 294-441
const result = await prisma.$transaction(async (tx) => {
  // Step 8a: Delete existing records in cascade order
  await tx.match.deleteMany({ where: { tournamentId } });
  await tx.round.deleteMany({ where: { tournamentId } });
  await tx.bracket.deleteMany({ where: { tournamentId } });

  // Step 8b-c: Create records atomically
  const bracket = await tx.bracket.create({ data: { tournamentId, ... } });
  // ... rounds and matches
  return { bracket, totalRounds, matchCount };
});
```

For group draw, the cascade delete order is: Match (where groupId IN groupIds) → GroupParticipant → Group.

### Existing: Doubles Entity Loading (bracketPersistenceService.js)
```javascript
// Source: backend/src/services/bracketPersistenceService.js lines 147-160
if (categoryType === 'DOUBLES') {
  const pairRegs = await prisma.pairRegistration.findMany({
    where: { tournamentId, status: 'REGISTERED' },
    include: { pair: { select: { id: true } } }
  });
  allEntities = pairRegs.map(r => ({ entityId: r.pair.id }));
} else {
  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId, status: 'REGISTERED' },
    include: { player: { select: { id: true } } }
  });
  allEntities = registrations.map(r => ({ entityId: r.player.id }));
}
```

### Existing: Defensive FK Validation (bracketPersistenceService.js)
```javascript
// Source: backend/src/services/bracketPersistenceService.js lines 272-287
if (categoryType === 'DOUBLES') {
  const entityIds = positions.map(p => p.entityId).filter(id => id != null);
  if (entityIds.length > 0) {
    const pairCount = await prisma.doublesPair.count({
      where: { id: { in: entityIds } }
    });
    if (pairCount !== entityIds.length) {
      throw makeError('INVALID_ENTITY_IDS', `...`);
    }
  }
}
```

### Existing: Seeded Players Retrieval (seedingPlacementService.js)
```javascript
// Source: backend/src/services/seedingPlacementService.js lines 414-474
export async function getSeededPlayers(categoryId, seedCount) {
  const { getRankingsForCategory } = await import('./rankingService.js');
  const currentYear = new Date().getFullYear();
  const rankings = await getRankingsForCategory(categoryId, currentYear);
  // Filters to SINGLES or PAIR ranking type, returns top N entries
}
```

### Existing: Deterministic Shuffle (seedingPlacementService.js)
```javascript
// Source: backend/src/services/seedingPlacementService.js lines 85-96
export function shuffle(array, seed) {
  const rng = seedrandom(seed);
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### Existing: FormatVisualization GROUP Branch (FormatVisualization.jsx)
```javascript
// Source: frontend/src/components/FormatVisualization.jsx lines 77-98
{formatType === 'GROUP' && (
  <div className="d-flex flex-column gap-4">
    {structure.groups?.map(group => (
      <ExpandableSection key={group.id} title={...}>
        <GroupStandingsTable tournamentId={tournament.id} group={group} />
      </ExpandableSection>
    ))}
    {(!structure.groups || structure.groups.length === 0) && (
      <Alert variant="info">...</Alert>
    )}
  </div>
)}
```

The GROUP branch must be extended: when `isOrganizerOrAdmin && !structure.groups?.length` (no groups yet), render `GroupDrawGenerationSection` before the standings list.

### Existing: BracketGenerationSection Guard to Override
```javascript
// Source: frontend/src/components/BracketGenerationSection.jsx line 195
if (tournament.formatType !== 'KNOCKOUT') return null;  // REMOVE THIS LINE
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GroupConfigPanel uses `groupSize` input | Phase 27 replaces with `groupCount` input | Phase 27 | Schema/UI change; GroupConfigPanel needs adaptation |
| GroupParticipant.playerId non-nullable | playerId nullable + pairId added | Phase 27 migration | Doubles support; backward compatible for existing singles records |
| GROUP format shows empty state | GROUP format shows draw generation section | Phase 27 | FormatVisualization extension |

**Deprecated/outdated:**
- `GroupConfigPanel` `groupSize` prop interface: this component uses groupSize as the config value, but Phase 27 uses groupCount. The component will need adaptation or replacement.
- `GroupFormatConfigSchema` in `formatConfigSchemas.js`: currently validates `groupSize` as the primary config field. Phase 27 may need to add `groupCount` to this schema (or leave formatConfig as-is and pass groupCount only to the draw generation API).

---

## Open Questions

1. **Should `groupCount` be persisted in `formatConfig` or only passed at draw generation time?**
   - What we know: `formatConfig` is a JSON string on Tournament. Currently stores `groupSize` for GROUP format (Zod schema validates it). Draw generation will receive `groupCount` as a body param.
   - What's unclear: Whether downstream phases (28, 29) need to query the configured groupCount from the tournament record.
   - Recommendation: Pass groupCount as a body param to the draw generation API only. If Phase 28/29 need it, derive from `Group.count({ where: { tournamentId } })` at runtime. Avoids schema/Zod migration for the format config.

2. **Should group matches use Round records or store `roundNumber` inline on Match?**
   - What we know: `Round` model has `bracketId String?` (nullable), so group rounds could use `bracketId = null`. The `Match.roundId` FK is also nullable.
   - What's unclear: Whether `GroupStandingsTable` (Phase 28) and score entry (Phase 28) will query by roundId or by groupId.
   - Recommendation: Create `Round` records with `bracketId = null` and `tournamentId` only. Gives clean round-by-round querying. Match `roundId` will be set. This reuses the existing Round model and avoids adding a `roundNumber` denormalization to Match.

3. **`formatConfigSchemas.js` has `GroupFormatConfigSchema.groupSize` — does Phase 27 break validation?**
   - What we know: The schema expects `groupSize: number`. Phase 27 organizer flow passes `groupCount` instead.
   - Recommendation: The formatConfig stored on Tournament can remain as-is (with whatever groupSize was set at tournament creation). The draw generation endpoint takes its own separate body params. No schema change needed.

---

## Validation Architecture

> config.json has `workflow.nyquist_validation` absent — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 (backend, ES modules via `--experimental-vm-modules`) |
| Config file | `backend/package.json` scripts |
| Quick run command | `cd backend && npm test -- --testPathPattern=groupPersistence` |
| Full suite command | `cd backend && npm test` |

**Frontend:** No test framework configured (no vitest.config.*, no test script in package.json). Frontend tests are manual only for this phase.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GFORM-01 | groupCount input → group sizes calculated correctly (e.g., 11 players, 3 groups → [4,4,3]) | unit | `npm test -- groupPersistence` | ❌ Wave 0 |
| GFORM-02 | Unbalanced groupCount rejected (e.g., 10 players, 3 groups = sizes [4,3,3] → valid; 10 players, 4 groups = [3,3,2,2] → valid; 3 groups of 2 from 7 → invalid [3,2,2] IS valid per rule) | unit | `npm test -- groupPersistence` | ❌ Wave 0 |
| GFORM-03 | seededRounds config accepted 0..groupCount range | unit | `npm test -- groupPersistence` | ❌ Wave 0 |
| GFORM-04 | Snake draft places top players correctly: 3 groups, 2 seeded rounds → seeds 1,2,3 go to groups 1,2,3 (round 1 fwd); seeds 4,5,6 go to groups 3,2,1 (round 2 rev) | unit | `npm test -- groupPersistence` | ❌ Wave 0 |
| GFORM-05 | Unseeded players randomly distributed; same randomSeed always produces same assignment | unit | `npm test -- groupPersistence` | ❌ Wave 0 |
| GFORM-06 | Swap two players between groups: groups stay same size, affected groups' fixtures regenerated | integration | `npm test -- groupDrawRoutes` | ❌ Wave 0 |
| GFORM-07 | Doubles draw: pairId used instead of playerId in GroupParticipant; no FK errors | integration | `npm test -- groupDrawRoutes` | ❌ Wave 0 |
| Round-robin | Circle method generates N*(N-1)/2 unique fixtures for N-player group | unit | `npm test -- circleMethod` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && npm test -- --testPathPattern="groupPersistence|circleMethod"`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/__tests__/unit/groupPersistenceService.test.js` — covers GFORM-01 through GFORM-05, round-robin generation
- [ ] `backend/__tests__/integration/groupDrawRoutes.test.js` — covers GFORM-06, GFORM-07, full API flow
- [ ] `backend/src/services/groupPersistenceService.js` — service module (production code, not test infra, but must exist before tests pass)

*(No new frontend test infrastructure needed — no frontend test framework configured in this project.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `backend/src/services/bracketPersistenceService.js` — atomic transaction pattern, doubles entity loading, defensive FK guard
- Direct code reading: `backend/src/services/seedingPlacementService.js` — `getSeededPlayers`, `shuffle`, deterministic seed
- Direct code reading: `backend/prisma/schema.prisma` — Group, GroupParticipant, Match, Round model definitions
- Direct code reading: `frontend/src/components/BracketGenerationSection.jsx` — draw workflow states (A/B/C)
- Direct code reading: `frontend/src/components/FormatVisualization.jsx` — GROUP branch integration point
- Direct code reading: `frontend/src/components/GroupStandingsTable.jsx` — post-generation display target
- Direct code reading: `frontend/src/components/GroupConfigPanel.jsx` — existing groupSize UI (to be adapted)
- Direct code reading: `backend/src/validation/formatConfigSchemas.js` — GroupFormatConfigSchema with groupSize

### Secondary (MEDIUM confidence)
- Circle method algorithm: well-known combinatorics (round-robin tournament scheduling) — standard reference material

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all reuses existing project stack
- Architecture: HIGH — direct analysis of canonical reference files confirms patterns
- Pitfalls: HIGH — identified from direct code inspection of schema constraints and existing guard patterns

**Research date:** 2026-03-17
**Valid until:** 2026-06-17 (stable stack; architecture won't change before this phase executes)
