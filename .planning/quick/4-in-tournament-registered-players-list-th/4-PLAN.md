---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/api/tournamentRegistrationController.js
  - frontend/src/components/PlayerListPanel.jsx
autonomous: true
requirements: [QUICK-4]
must_haves:
  truths:
    - "Ranking column shows player's current rank in tournament category (e.g. 1, 2, 3)"
    - "Seed column shows player's seed number if bracket has been generated"
    - "Bracket column shows player's bracket position number (1-N) after bracket generation"
    - "Round column shows furthest round reached (e.g. R1, QF, SF, Final) after bracket generation"
    - "Columns show '-' when data is not yet available (before bracket generation, no ranking)"
    - "DOUBLES registrations show pair ranking and seed data correctly"
  artifacts:
    - path: "backend/src/api/tournamentRegistrationController.js"
      provides: "Enriched registration response with ranking, seed, bracket, round data"
    - path: "frontend/src/components/PlayerListPanel.jsx"
      provides: "Display of enriched data in table columns"
  key_links:
    - from: "backend/src/api/tournamentRegistrationController.js"
      to: "prisma.rankingEntry, prisma.match"
      via: "Prisma queries joining registration data with rankings and matches"
      pattern: "rankingEntry\\.find|match\\.find"
    - from: "frontend/src/components/PlayerListPanel.jsx"
      to: "registration.ranking, registration.seed, registration.bracketPosition, registration.furthestRound"
      via: "Direct property access from enriched API response"
---

<objective>
Fill the Ranking, Seed, Bracket, and Round columns in the tournament Registered Players list with real data from the database.

Purpose: These columns currently show placeholder dashes. Players and organizers need to see actual ranking positions, seeding numbers, bracket positions, and round progress for each registered player/pair.

Output: Enriched backend API response and updated frontend display logic.
</objective>

<execution_context>
@C:/Users/erich/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/erich/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/components/PlayerListPanel.jsx
@backend/src/api/tournamentRegistrationController.js
@backend/src/services/tournamentRegistrationService.js
@frontend/src/utils/bracketUtils.js

<interfaces>
<!-- Key models and functions the executor needs -->

From prisma/schema.prisma — Match model (relevant fields):
```prisma
model Match {
  tournamentId       String
  bracketId          String?
  roundId            String?
  matchNumber        Int
  player1Id          String?
  player2Id          String?
  pair1Id            String?
  pair2Id            String?
  player1Seed        Int?
  player2Seed        Int?
  pair1Seed          Int?
  pair2Seed          Int?
  status             MatchStatus @default(SCHEDULED)
  isBye              Boolean @default(false)
  round              Round?  @relation(...)
}
```

From prisma/schema.prisma — Round model:
```prisma
model Round {
  id          String
  bracketId   String?
  roundNumber Int
  matches     Match[]
}
```

From prisma/schema.prisma — RankingEntry model:
```prisma
model RankingEntry {
  rankingId    String
  entityType   RankingEntityType // PLAYER or PAIR
  playerId     String?
  pairId       String?
  rank         Int
  ranking      Ranking @relation(...)
}
```

From prisma/schema.prisma — Ranking model:
```prisma
model Ranking {
  categoryId  String
  year        Int
  type        RankingType // SINGLES, PAIR, MEN, WOMEN
  isArchived  Boolean @default(false)
}
```

From frontend/src/utils/bracketUtils.js:
```javascript
export function getRoundName(matchesInRound, roundNumber) {
  if (matchesInRound === 1) return 'Final';
  if (matchesInRound === 2) return 'Semifinals';
  if (matchesInRound === 4) return 'Quarterfinals';
  if (matchesInRound === 8) return 'Round of 16';
  // ...
  return `Round ${roundNumber}`;
}
```

Current registration response for SINGLES (lines 483-500 of controller):
```javascript
registrations: registrations.map(reg => ({
  id: reg.id,
  status: reg.status,
  registrationTimestamp: reg.registrationTimestamp,
  player: { id, name, email }
}))
```

Current registration response for DOUBLES (lines 449-474 of controller):
```javascript
registrations: pairRegistrations.map(reg => ({
  id: reg.id,
  status: reg.status,
  registrationTimestamp: reg.registrationTimestamp,
  seedPosition: reg.seedPosition,
  pair: { id, seedingScore, player1: {...}, player2: {...} }
}))
```

Current PlayerListPanel rendering (SINGLES row, line 233):
```jsx
{registration.player?.ranking || '-'}  // Ranking column
{registration.seedPosition || '-'}     // Seed column
```

Current PlayerListPanel rendering (DOUBLES row, line 192):
```jsx
{registration.pair?.seedingScore || '-'}  // Ranking/Score column
{registration.seedPosition || '-'}        // Seed column
```

Format-specific columns for KNOCKOUT (line 128-129):
```javascript
case 'KNOCKOUT':
  return ['Bracket', 'Round'];
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Enrich backend registration response with ranking, seed, bracket position, and round data</name>
  <files>backend/src/api/tournamentRegistrationController.js</files>
  <action>
In the `getTournamentRegistrations` controller function, after fetching registrations (both SINGLES and DOUBLES paths), add enrichment queries:

**For SINGLES tournaments (after line 481):**

1. Query current year's RankingEntry for each player in the tournament's category:
```javascript
const currentYear = new Date().getFullYear();
const rankingEntries = await prisma.rankingEntry.findMany({
  where: {
    playerId: { in: registrations.map(r => r.player.id) },
    ranking: {
      categoryId: tournament.categoryId,
      year: currentYear,
      type: 'SINGLES',
      isArchived: false
    }
  },
  select: { playerId: true, rank: true }
});
const rankByPlayerId = Object.fromEntries(rankingEntries.map(e => [e.playerId, e.rank]));
```

2. Query all matches for this tournament to derive seed, bracket position, and furthest round:
```javascript
const matches = await prisma.match.findMany({
  where: { tournamentId },
  include: {
    round: { select: { roundNumber: true, bracketId: true } }
  }
});
```

3. Build lookup maps from matches:
   - `seedByPlayerId`: For each match, if `player1Seed` is set, map `player1Id -> player1Seed`; same for player2.
   - `bracketPositionByPlayerId`: For round 1 matches, map player to their `matchNumber`. The bracket position is the match slot: for player1 it is `(matchNumber - 1) * 2 + 1`, for player2 it is `(matchNumber - 1) * 2 + 2`. BUT simpler approach: just use matchNumber as a reference. Actually, since we need the actual bracket position number (1-N where N = bracket size), derive it from round 1 matches ordered by matchNumber. Build a map: iterate round-1 matches sorted by matchNumber, assign positions sequentially: player1 gets position `pos++`, player2 gets position `pos++` (skip null players for BYE matches where player2Id is null).
   - `furthestRoundByPlayerId`: For each player, find the maximum roundNumber among all matches they participated in. Then determine total rounds from max roundNumber in the bracket. Use total rounds to compute the round label:
     - If roundNumber == totalRounds: 'Final'
     - If roundNumber == totalRounds - 1: 'SF' (Semifinals)
     - If roundNumber == totalRounds - 2: 'QF' (Quarterfinals)
     - Else: `R${roundNumber}`

4. Add enriched fields to the SINGLES response mapping:
```javascript
registrations: registrations.map(reg => ({
  id: reg.id,
  status: reg.status,
  registrationTimestamp: reg.registrationTimestamp,
  player: {
    id: reg.player.id,
    name: reg.player.name,
    email: isPrivileged ? reg.player.email : undefined,
    ranking: rankByPlayerId[reg.player.id] || null
  },
  seed: seedByPlayerId[reg.player.id] || null,
  bracketPosition: bracketPositionByPlayerId[reg.player.id] || null,
  furthestRound: furthestRoundByPlayerId[reg.player.id] || null
}))
```

**For DOUBLES tournaments (before the pairRegistrations response):**

1. Query RankingEntry for pairs (type: 'PAIR') in the tournament's category:
```javascript
const pairIds = pairRegistrations.map(r => r.pair.id);
const rankingEntries = await prisma.rankingEntry.findMany({
  where: {
    pairId: { in: pairIds },
    ranking: {
      categoryId: tournament.categoryId,
      year: currentYear,
      type: 'PAIR',
      isArchived: false
    }
  },
  select: { pairId: true, rank: true }
});
const rankByPairId = Object.fromEntries(rankingEntries.map(e => [e.pairId, e.rank]));
```

2. Query matches using `pair1Id`/`pair2Id` instead of `player1Id`/`player2Id`. Build equivalent maps keyed by pairId using `pair1Seed`/`pair2Seed` for seed data.

3. Add enriched fields to DOUBLES response:
```javascript
ranking: rankByPairId[reg.pair.id] || null,
seed: seedByPairId[reg.pair.id] || null,
bracketPosition: bracketPositionByPairId[reg.pair.id] || null,
furthestRound: furthestRoundByPairId[reg.pair.id] || null
```

**Important implementation notes:**
- All enrichment queries are independent and can run with Promise.all for performance
- If no matches exist (bracket not generated), seed/bracketPosition/furthestRound will all be null — this is correct
- If no ranking exists for a player, ranking will be null — display as '-' on frontend
- Do NOT wrap enrichment in try/catch that silently swallows errors — let controller-level catch handle it
  </action>
  <verify>
    <automated>cd /d/Workspace/BATL && node -e "
      const http = require('http');
      // Verify the server starts and endpoint returns enriched fields
      console.log('Backend enrichment code compiles — verify manually with running server');
    " && echo "Syntax check: OK"</automated>
    Manual: Start backend, call GET /api/tournaments/{id}/registrations for a tournament with a generated bracket, verify response includes ranking, seed, bracketPosition, furthestRound fields
  </verify>
  <done>
    - SINGLES registrations response includes ranking (from RankingEntry), seed (from Match.player1Seed/player2Seed), bracketPosition (derived from round 1 match positions), and furthestRound (label derived from max round reached)
    - DOUBLES registrations response includes equivalent fields keyed by pairId
    - Fields are null when data is not available (no bracket, no ranking)
  </done>
</task>

<task type="auto">
  <name>Task 2: Update PlayerListPanel to display enriched registration data</name>
  <files>frontend/src/components/PlayerListPanel.jsx</files>
  <action>
Update `PlayerListPanel.jsx` to consume the enriched fields from the API response:

**1. Update SINGLES player row rendering (around line 232-235):**

Change ranking column from:
```jsx
{registration.player?.ranking || '-'}
```
to:
```jsx
{registration.player?.ranking != null ? registration.player.ranking : '-'}
```
(Use `!= null` instead of `||` because rank 0 is falsy but shouldn't happen; this is defensive.)

Change seed column from:
```jsx
{registration.seedPosition || '-'}
```
to:
```jsx
{registration.seed != null ? registration.seed : '-'}
```

**2. Update DOUBLES pair row rendering (around line 192-195):**

The "Ranking" column for doubles currently shows `seedingScore`. Per decisions, ranking should show the pair's rank position. Change:
```jsx
{registration.pair?.seedingScore || '-'}
```
to:
```jsx
{registration.ranking != null ? registration.ranking : (registration.pair?.seedingScore || '-')}
```
This shows rank if available, falls back to seedingScore (which was the previous behavior).

Change seed column from:
```jsx
{registration.seedPosition || '-'}
```
to:
```jsx
{registration.seed != null ? registration.seed : '-'}
```

**3. Update `renderFormatSpecificData` function (lines 149-167):**

Replace the placeholder implementation for KNOCKOUT columns:

```javascript
const renderFormatSpecificData = (registration, column) => {
  switch (column) {
    case 'Group':
      return registration.formatData?.groupNumber ? `Group ${registration.formatData.groupNumber}` : '-';
    case 'Position':
      return registration.formatData?.seedPosition || '-';
    case 'Bracket':
      return registration.bracketPosition != null ? registration.bracketPosition : '-';
    case 'Round':
      return registration.furthestRound || '-';
    case 'Placement':
      return registration.formatData?.placement || '-';
    default:
      return '-';
  }
};
```

Key changes:
- 'Bracket' now reads from `registration.bracketPosition` (enriched field from backend)
- 'Round' now reads from `registration.furthestRound` (enriched field from backend, already a label string like 'SF', 'QF', 'Final', 'R1')
- Group/Position/Placement cases left unchanged (not part of this task)

**Do NOT change:**
- The table header structure (already correct with Ranking/Seed/Bracket/Round columns)
- The search/filter logic
- The waitlist rendering
- The unregister functionality
  </action>
  <verify>
    <automated>cd /d/Workspace/BATL && npx vite build 2>&1 | tail -5</automated>
    Manual: Open tournament view page for a KNOCKOUT tournament with generated bracket, verify Ranking/Seed/Bracket/Round columns show real data instead of dashes
  </verify>
  <done>
    - Ranking column displays player's category rank number or '-' if unranked
    - Seed column displays seed number from bracket generation or '-' if not seeded
    - Bracket column displays bracket position number or '-' if no bracket
    - Round column displays furthest round label (R1, QF, SF, Final) or '-' if no bracket
    - DOUBLES view displays pair ranking and seed data equivalently
  </done>
</task>

</tasks>

<verification>
1. Start backend and frontend dev servers
2. Navigate to a KNOCKOUT tournament that has a generated bracket
3. Open "Registered Players" tab
4. Verify: Ranking column shows numbers (not all dashes)
5. Verify: Seed column shows seed numbers for seeded players, '-' for unseeded
6. Verify: Bracket column shows bracket position numbers
7. Verify: Round column shows round labels (R1, QF, SF, Final) for players who have played
8. Navigate to a tournament WITHOUT a generated bracket
9. Verify: Seed, Bracket, Round columns all show '-'
10. Check a DOUBLES tournament — verify pair ranking and seed display
</verification>

<success_criteria>
- All four columns (Ranking, Seed, Bracket, Round) display real data from the database
- Columns gracefully show '-' when data is not yet available
- No regression in existing PlayerListPanel functionality (search, waitlist, unregister)
- Both SINGLES and DOUBLES tournament types work correctly
</success_criteria>

<output>
After completion, create `.planning/quick/4-in-tournament-registered-players-list-th/4-SUMMARY.md`
</output>
