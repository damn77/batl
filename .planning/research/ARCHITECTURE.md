# Architecture Research

**Domain:** Amateur tennis league tournament management — match results, state machines, group/Swiss pairing
**Researched:** 2026-02-26
**Confidence:** HIGH (based on direct codebase analysis of 11 delivered features)

---

## Standard Architecture

This is a subsequent-milestone research document. The architecture is not being designed from scratch — it integrates into an established three-tier system with specific conventions and constraints.

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React 19 Frontend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Result Entry │  │ Group Stage  │  │ Swiss Pairing│               │
│  │   Page/Form  │  │ Visualization│  │    View      │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│  ┌──────▼─────────────────▼─────────────────▼───────────────────┐   │
│  │              Frontend Service Layer (axios wrappers)          │   │
│  │  matchResultService  groupService  swissService  statsService │   │
│  └──────────────────────────────┬────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │ HTTP (REST)
┌─────────────────────────────────▼───────────────────────────────────┐
│                       Express 5.1 API Server                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │          Middleware Pipeline (auth → authz → validate)         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ matchResult  │  │    group     │  │    swiss     │               │
│  │ Controller   │  │  Controller  │  │  Controller  │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│  ┌──────▼─────────────────▼─────────────────▼───────────────────┐   │
│  │                    Service Layer                               │   │
│  │  matchResultService  groupStandingsService  swissPairingService│   │
│  │  tournamentLifecycleService  bracketProgressionService        │   │
│  │  playerStatsService                                           │   │
│  └──────────────────────────────┬────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │ Prisma ORM
┌─────────────────────────────────▼───────────────────────────────────┐
│                         PostgreSQL Database                           │
│  Match  MatchResultSubmission  GroupStanding  SwissMatchHistory      │
│  Tournament  TournamentRegistration  PlayerProfile  RankingEntry     │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| matchResultService | Result submission, dispute detection, confirmation, immutability enforcement | New service: `backend/src/services/matchResultService.js` |
| tournamentLifecycleService | SCHEDULED → IN_PROGRESS → COMPLETED state machine, trigger conditions | Extends `backend/src/services/tournamentService.js` or new service |
| bracketProgressionService | On confirmed result: determine next match, advance winner to next slot | New service: `backend/src/services/bracketProgressionService.js` |
| groupStandingsService | Round-robin match scheduling, standings calculation, tiebreaker resolution | New service: `backend/src/services/groupStandingsService.js` |
| swissPairingService | Round pairing (avoid rematches, pair by score), N-round management | New service: `backend/src/services/swissPairingService.js` |
| playerStatsService | Match history aggregation, win rate, head-to-head computation | New service: `backend/src/services/playerStatsService.js` |
| matchResultController | HTTP handlers for submit/confirm/dispute endpoints | New: `backend/src/api/matchResultController.js` |
| groupController | HTTP handlers for group standings, schedule endpoints | New or extends existing |
| swissController | HTTP handlers for Swiss pairing, round endpoints | New: `backend/src/api/swissController.js` |

---

## Recommended Project Structure

The new code slots into the existing directory layout without restructuring.

```
backend/src/
├── api/
│   ├── routes/
│   │   ├── matchResultRoutes.js       # POST /api/v1/matches/:id/submit-result
│   │   │                              # POST /api/v1/matches/:id/confirm-result
│   │   │                              # POST /api/v1/matches/:id/dispute-result
│   │   ├── groupRoutes.js             # GET /api/v1/tournaments/:id/group-standings
│   │   │                              # POST /api/v1/tournaments/:id/generate-schedule
│   │   └── swissRoutes.js             # POST /api/v1/tournaments/:id/generate-round
│   │                                  # GET /api/v1/tournaments/:id/swiss-standings
│   ├── validators/
│   │   ├── matchResultValidator.js    # Joi: score format, winner field
│   │   └── swissPairingValidator.js   # Joi: roundNumber, randomSeed
│   ├── matchResultController.js
│   ├── groupController.js
│   └── swissController.js
│
├── services/
│   ├── matchResultService.js          # Core result submission state machine
│   ├── tournamentLifecycleService.js  # Tournament status transitions
│   ├── bracketProgressionService.js   # Advance winner to next bracket slot
│   ├── groupStandingsService.js       # Group stage scheduling + standings
│   ├── swissPairingService.js         # Swiss round pairing algorithm
│   └── playerStatsService.js          # Aggregated statistics
│
├── types/
│   └── resultStatus.js               # PENDING_CONFIRMATION, CONFIRMED, DISPUTED
│
└── utils/
    └── standingsCalculator.js         # Shared tiebreaker logic (sets/games won)

frontend/src/
├── pages/
│   ├── MatchResultPage.jsx            # Score entry form (touch-optimized)
│   ├── OrganizerPendingResultsPage.jsx # Pending confirmation dashboard
│   ├── GroupStagePage.jsx             # Group schedule + standings table
│   └── SwissStandingsPage.jsx         # Swiss rounds + standings
├── components/
│   ├── ScoreEntryForm.jsx             # Format-aware score entry
│   ├── GroupStandingsTable.jsx        # Round-robin standings display
│   └── SwissPairingTable.jsx          # Swiss round pairings display
└── services/
    ├── matchResultService.js          # API calls for result submission
    └── playerStatsService.js          # API calls for statistics
```

---

## Architectural Patterns

### Pattern 1: Result Submission as a Separate State Object

**What:** The match result submission is not stored in the `Match.result` field directly. Instead a separate `MatchResultSubmission` table holds the pending submission alongside its dispute state. The `Match.result` field is written — and becomes immutable — only when an organizer confirms.

**When to use:** When you need to distinguish "player submitted" from "organizer confirmed" and preserve the submission audit trail.

**Trade-offs:**
- Pro: Clear separation of the submission workflow from the match record. Match.result stays immutable after confirmation.
- Pro: Dispute state lives in the submission, not the match, keeping the Match model clean.
- Con: Two tables to read when rendering a match. Acceptable since match reads always include submission via join.

**Example schema addition:**
```javascript
// New Prisma model
model MatchResultSubmission {
  id            String               @id @default(uuid())
  matchId       String               @unique // One pending submission per match
  submittedById String               // PlayerProfile.id of submitter
  scores        String               // JSON: [{ set: 1, player1: 6, player2: 4 }, ...]
  winnerId      String               // PlayerProfile.id declared as winner
  status        ResultSubmissionStatus @default(PENDING_CONFIRMATION)
  disputedById  String?              // PlayerProfile.id of disputing player
  disputeReason String?
  confirmedById String?              // User.id of confirming organizer
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  match         Match                @relation(fields: [matchId], references: [id], onDelete: Cascade)
  submitter     PlayerProfile        @relation("SubmissionSubmitter", fields: [submittedById], references: [id])
  winner        PlayerProfile        @relation("SubmissionWinner", fields: [winnerId], references: [id])
}

enum ResultSubmissionStatus {
  PENDING_CONFIRMATION  // First player submitted, waiting for organizer
  DISPUTED              // Opposing player flagged a conflict
  CONFIRMED             // Organizer confirmed — triggers bracket progression
  REJECTED              // Organizer rejected — match back to SCHEDULED
}
```

### Pattern 2: Tournament Lifecycle as Explicit Transition Functions

**What:** Tournament status changes (SCHEDULED → IN_PROGRESS → COMPLETED) are handled by dedicated service functions with guard conditions, not by allowing direct status updates from the controller.

**When to use:** When lifecycle transitions have business rules (e.g., can't complete a tournament with unconfirmed matches).

**Trade-offs:**
- Pro: Guard conditions are co-located with the transition. Prevents impossible states.
- Con: Slightly more code than a simple field update. Worth it for data integrity.

**Example:**
```javascript
// backend/src/services/tournamentLifecycleService.js

export async function startTournament(tournamentId, actingUserId) {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (t.status !== 'SCHEDULED') {
    throw createHttpError(409, 'Tournament must be SCHEDULED to start', { code: 'INVALID_STATUS_TRANSITION' });
  }
  // Guard: must have at least minParticipants registered
  const count = await getRegisteredCount(tournamentId);
  if (t.minParticipants && count < t.minParticipants) {
    throw createHttpError(409, 'Insufficient participants to start', { code: 'INSUFFICIENT_PARTICIPANTS' });
  }
  return prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: 'IN_PROGRESS', lastStatusChange: new Date() }
  });
}

export async function completeTournament(tournamentId, actingUserId) {
  // Guard: all matches must be COMPLETED or CANCELLED (no pending results)
  const unfinished = await prisma.match.count({
    where: { tournamentId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }
  });
  if (unfinished > 0) {
    throw createHttpError(409, 'Cannot complete: unfinished matches remain', { code: 'UNFINISHED_MATCHES' });
  }
  return prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: 'COMPLETED', lastStatusChange: new Date() }
  });
}
```

### Pattern 3: Bracket Progression as a Post-Confirmation Side Effect

**What:** When `matchResultService.confirmResult()` runs, it calls `bracketProgressionService.advanceWinner()` as the final step. This keeps the progression logic separate from result storage but tightly coupled to the confirmation event.

**When to use:** Whenever a confirmed result should automatically drive the next state.

**Trade-offs:**
- Pro: Result confirmation and progression happen atomically in one service call. Easier to test.
- Con: `matchResultService` must know about `bracketProgressionService`. Acceptable — they are tightly related domain concerns.

**Example data flow:**
```
POST /api/v1/matches/:id/confirm-result
  → matchResultController.confirmResult()
  → matchResultService.confirmResult(matchId, organizerId)
      → UPDATE MatchResultSubmission.status = CONFIRMED
      → UPDATE Match.status = COMPLETED, Match.result = scores (immutable snapshot)
      → bracketProgressionService.advanceWinner(matchId, winnerId)
          → Find next match slot for this bracket position
          → UPDATE next Match: set player1Id or player2Id = winnerId
      → tournamentLifecycleService.checkAutoComplete(tournamentId)
          → If all matches COMPLETED → UPDATE Tournament.status = COMPLETED
```

### Pattern 4: Group Standings as Computed-then-Cached

**What:** Group standings (sets won, games won, head-to-head) are not stored in a separate row updated after every match. They are computed from the `Match` table on read and cached in a `GroupStanding` table only when a round is fully complete (all matches in the group played).

**When to use:** When standings have complex tiebreakers that are easier to recalculate than to keep incrementally correct.

**Trade-offs:**
- Pro: No risk of stale standing data from incremental update bugs.
- Con: Slightly slower reads for large groups. Acceptable at amateur league scale (groups of 4-8).

**Recommended approach:** Compute on every GET request for in-progress groups. Write to `GroupStanding` on round completion. This eliminates a separate cache invalidation problem.

**GroupStanding schema addition:**
```javascript
model GroupStanding {
  id              String  @id @default(uuid())
  groupId         String
  playerId        String
  matchesPlayed   Int     @default(0)
  wins            Int     @default(0)
  losses          Int     @default(0)
  setsWon         Int     @default(0)
  setsLost        Int     @default(0)
  gamesWon        Int     @default(0)
  gamesLost       Int     @default(0)
  points          Int     @default(0)  // 2 for win, 1 for loss, 0 for absent
  position        Int?    // Final standing position (set when group is complete)
  updatedAt       DateTime @updatedAt

  group  Group         @relation(fields: [groupId], references: [id], onDelete: Cascade)
  player PlayerProfile @relation(fields: [playerId], references: [id])

  @@unique([groupId, playerId])
  @@index([groupId, points])
}
```

### Pattern 5: Swiss Pairing as a Stateless Algorithm Over Match History

**What:** Swiss pairing for round N is determined by reading completed match results from previous rounds and running a pairing algorithm. The algorithm output (pairs for the new round) is persisted as scheduled `Match` rows. No separate "Swiss state" table is needed.

**When to use:** When the pairing algorithm is deterministic given the history and you don't need to resume mid-algorithm.

**Trade-offs:**
- Pro: No additional state table. The existing `Match` and `Round` models are sufficient.
- Con: Regenerating pairings is a full re-read of match history. Acceptable at amateur scale (max 128 players, max 20 rounds per spec).

**Pairing logic summary:**
1. Read all `Match` rows for the tournament with status COMPLETED
2. Build a player-vs-player history map (rematch prevention)
3. Sort players by current Swiss score (wins × 2 + byes × 1)
4. Pair by adjacent score using a stable matching algorithm that respects rematch constraint
5. Persist new `Match` rows with the new `Round.roundNumber`

---

## Data Flow

### Result Submission Flow

```
Player (mobile browser)
    ↓ POST /api/v1/matches/:id/submit-result
    │  Body: { scores: [{set:1,p1:6,p2:4},...], winnerId }
    ↓
matchResultController.submitResult()
    ↓ validates: player is participant in match, match status SCHEDULED/IN_PROGRESS
    ↓
matchResultService.submitResult(matchId, playerId, { scores, winnerId })
    ↓ validates score format against tournament scoring rules (JSON in Tournament.defaultScoringRules)
    ↓ INSERT MatchResultSubmission { status: PENDING_CONFIRMATION }
    ↓ UPDATE Match.status = IN_PROGRESS (first submission triggers in-progress)
    ↓ (optional) INSERT Notification for organizer
    ↓
Response: { success: true, data: { submissionId, status: 'PENDING_CONFIRMATION' } }
```

```
Opposing player (if they dispute)
    ↓ POST /api/v1/matches/:id/dispute-result
    │  Body: { reason }
    ↓
matchResultService.disputeResult(matchId, playerId, reason)
    ↓ validates: player is participant, submission exists in PENDING state
    ↓ UPDATE MatchResultSubmission { status: DISPUTED, disputedById, disputeReason }
    ↓
Response: { success: true, data: { status: 'DISPUTED' } }
```

```
Organizer (confirms or rejects)
    ↓ POST /api/v1/matches/:id/confirm-result   OR   reject-result
    ↓
matchResultService.confirmResult(matchId, organizerId)
    ↓ validates: submission exists, organizer role
    ↓ UPDATE MatchResultSubmission { status: CONFIRMED, confirmedById }
    ↓ UPDATE Match { status: COMPLETED, result: scores (immutable), completedAt, completedWithRules }
    ↓ bracketProgressionService.advanceWinner(matchId, winnerId)
    │     ↓ find next match in bracket tree
    │     ↓ UPDATE next Match.player1Id or player2Id = winnerId
    ↓ tournamentLifecycleService.checkAutoComplete(tournamentId)
    ↓
Response: { success: true, data: { match: {...} } }
```

### Tournament Lifecycle Flow

```
SCHEDULED
    │
    ├── Organizer calls startTournament() → guard: minParticipants met
    │
    ▼
IN_PROGRESS
    │   [Matches are played and confirmed one by one]
    │
    ├── After each match confirmation:
    │   tournamentLifecycleService.checkAutoComplete()
    │   → count SCHEDULED/IN_PROGRESS matches
    │   → if 0 remain: auto-transition to COMPLETED
    │
    ├── OR organizer explicitly calls completeTournament()
    │
    ▼
COMPLETED
    │   [Immutable. Point calculation endpoint can now be called]
    │
    └── POST /api/v1/tournaments/:id/calculate-points (Feature 008)
```

### Group Stage Flow

```
Organizer action: "Generate Group Schedule"
    ↓ POST /api/v1/tournaments/:id/generate-schedule
    ↓
groupStandingsService.generateSchedule(tournamentId)
    ↓ reads GroupParticipant rows for each Group
    ↓ generates round-robin pairs (N*(N-1)/2 matches per group)
    ↓ INSERT Match rows for each pair (status: SCHEDULED)
    ↓
Player submits + organizer confirms each match
    ↓
GET /api/v1/tournaments/:id/group-standings
    ↓
groupStandingsService.calculateStandings(tournamentId)
    ↓ reads all COMPLETED Match rows in each group
    ↓ aggregates: wins, sets won, games won per player
    ↓ applies tiebreaker chain: points → sets ratio → games ratio → head-to-head
    ↓ returns sorted standings per group
```

### Swiss Round Flow

```
POST /api/v1/tournaments/:id/generate-round
    Body: { roundNumber, randomSeed? }
    ↓
swissPairingService.generateRound(tournamentId, roundNumber, randomSeed)
    ↓ reads all COMPLETED Match rows for previous rounds
    ↓ builds score table: playerId → currentScore
    ↓ builds rematch map: Set of played player-pairs
    ↓ runs pairing algorithm: sort by score, pair adjacent, avoid rematches
    ↓ INSERT Round row + INSERT Match rows for new round
    ↓
Response: { success: true, data: { roundNumber, matches: [...] } }
```

### Player Statistics Flow

```
GET /api/v1/players/:id/stats?categoryId=...&year=...
    ↓
playerStatsService.getStats(playerId, { categoryId, year })
    ↓ reads Match rows where player1Id or player2Id = playerId
    │   + joins to Tournament (for categoryId filter + dates)
    │   + filters to COMPLETED status only
    ↓ computes: matchesPlayed, wins, losses, winRate
    ↓ computes: set win rate, game win rate
    ↓ computes: head-to-head vs specific opponents (from Match pairs)
    ↓ reads TournamentResult rows for points history (from Feature 008)
    ↓
Response: { success: true, data: { stats, matchHistory, headToHead } }
```

---

## Database Model Additions Needed

### New Enum

```prisma
enum ResultSubmissionStatus {
  PENDING_CONFIRMATION
  DISPUTED
  CONFIRMED
  REJECTED
}
```

### New Model: MatchResultSubmission

```prisma
model MatchResultSubmission {
  id            String                 @id @default(uuid())
  matchId       String                 @unique  // One submission per match at a time
  submittedById String                 // PlayerProfile.id
  scores        String                 // JSON array of set scores
  winnerId      String                 // PlayerProfile.id or DoublesPair.id
  winnerType    String                 // "PLAYER" or "PAIR"
  status        ResultSubmissionStatus @default(PENDING_CONFIRMATION)
  disputedById  String?                // PlayerProfile.id of disputing player
  disputeReason String?
  confirmedById String?                // User.id of confirming organizer
  rejectedById  String?                // User.id of rejecting organizer
  rejectionReason String?
  submittedAt   DateTime               @default(now())
  resolvedAt    DateTime?              // When confirmed/rejected
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt

  match         Match                  @relation(fields: [matchId], references: [id], onDelete: Cascade)

  @@index([matchId])
  @@index([submittedById])
  @@index([status])
}
```

### New Model: GroupStanding

```prisma
model GroupStanding {
  id            String  @id @default(uuid())
  groupId       String
  playerId      String
  matchesPlayed Int     @default(0)
  wins          Int     @default(0)
  losses        Int     @default(0)
  setsWon       Int     @default(0)
  setsLost      Int     @default(0)
  gamesWon      Int     @default(0)
  gamesLost     Int     @default(0)
  points        Int     @default(0)  // 2 = win, 1 = loss, 0 = walkover/absent
  position      Int?                 // Set when group is complete
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  group  Group         @relation(fields: [groupId], references: [id], onDelete: Cascade)
  player PlayerProfile @relation(fields: [playerId], references: [id])

  @@unique([groupId, playerId])
  @@index([groupId])
  @@index([groupId, points])
}
```

### Match Model Modifications (No new table, extend existing)

The existing `Match` model already has:
- `result String?` — JSON for confirmed result
- `completedWithRules String?` — immutable rules snapshot
- `completedAt DateTime?`
- `status MatchStatus` — SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, BYE

No changes to `Match` itself are required. `MatchResultSubmission` handles the submission workflow as a separate concern.

### SwissMatchHistory — Not Needed

Swiss pairing history is derived from the existing `Match` table filtered by `tournamentId` and `status: COMPLETED`. No additional model required.

---

## Component Boundaries

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| `matchResultService` ↔ `bracketProgressionService` | Direct function call | matchResult calls bracket | Called only on CONFIRMED result |
| `matchResultService` ↔ `tournamentLifecycleService` | Direct function call | matchResult calls lifecycle | Auto-complete check after each confirmation |
| `bracketProgressionService` ↔ Prisma `Match` | Prisma queries | bracket writes Match | Finds next bracket slot, updates player assignment |
| `groupStandingsService` ↔ Prisma `Match` + `GroupStanding` | Prisma queries | service reads Match, writes GroupStanding | Reads completed matches, writes computed standings |
| `swissPairingService` ↔ Prisma `Match` + `Round` | Prisma queries | service reads history, writes new Round+Match | Stateless pairing over match history |
| `playerStatsService` ↔ Prisma `Match` + `TournamentResult` | Prisma queries | stats reads both | Aggregates from existing Feature 008 data |
| Frontend `matchResultService` ↔ Backend `/api/v1/matches` | REST HTTP | frontend calls backend | Score submission, dispute, confirmation |
| `tournamentLifecycleService` ↔ `pointCalculationService` (Feature 008) | Manual trigger via API | organizer triggers | Point calculation stays as explicit POST after COMPLETED |

---

## Suggested Build Order (Dependencies)

Build in this sequence to minimize blocked work:

### Phase 1: Match Result Submission (Foundation)

Must come first. All other features (bracket progression, stats) depend on confirmed match results.

1. `MatchResultSubmission` Prisma model + migration
2. `matchResultService.js` — submit, dispute, confirm, reject
3. `matchResultController.js` + `matchResultRoutes.js`
4. `matchResultValidator.js` (Joi: score format validation against tournament rules)
5. Frontend `ScoreEntryForm.jsx` + `MatchResultPage.jsx`
6. Frontend `OrganizerPendingResultsPage.jsx`

### Phase 2: Tournament State Machine + Bracket Progression

Depends on Phase 1 (needs confirmed match results to drive transitions).

1. `tournamentLifecycleService.js` — startTournament, completeTournament, checkAutoComplete
2. `bracketProgressionService.js` — advanceWinner, findNextBracketSlot
3. Integrate progression into `matchResultService.confirmResult()`
4. Add lifecycle endpoints to `tournamentRoutes.js`

### Phase 3: Group Stage

Depends on Phase 1 (group matches use same result submission flow) and Phase 2 (tournament lifecycle).

1. `GroupStanding` Prisma model + migration
2. `groupStandingsService.js` — generateSchedule, calculateStandings
3. `groupController.js` + `groupRoutes.js`
4. `standingsCalculator.js` utility (tiebreaker logic, reused by Swiss)
5. Frontend `GroupStagePage.jsx` + `GroupStandingsTable.jsx`

### Phase 4: Swiss System

Depends on Phase 1 (Swiss match results) and the `standingsCalculator` utility from Phase 3.

1. `swissPairingService.js` — generateRound, calculateStandings
2. `swissController.js` + `swissRoutes.js`
3. `swissPairingValidator.js`
4. Frontend `SwissStandingsPage.jsx` + `SwissPairingTable.jsx`

### Phase 5: Player Statistics

Depends on Phase 1 (needs completed matches). Can start in parallel with Phase 3 if needed.

1. `playerStatsService.js` — getStats, getMatchHistory, getHeadToHead
2. Add `/api/v1/players/:id/stats` endpoint
3. Frontend `PlayerStatsPage.jsx`

### Phase 6: Combined Format

Depends on Phase 3 (group stage) and Phase 2 (bracket progression). Group → Knockout advancement.

1. `combinedFormatService.js` — advanceFromGroups, buildAdvancementBracket
2. Integrate with existing COMBINED formatType handling in `tournamentService.js`

---

## Anti-Patterns

### Anti-Pattern 1: Storing Score Strings Directly in Match.result Before Confirmation

**What people do:** Write the player's submitted score directly to `Match.result` when the player submits it.

**Why it's wrong:** `Match.result` is documented as the immutable confirmed result. Writing a pre-confirmation score creates ambiguity — is this a confirmed or pending result? The existing `completedWithRules` field assumes finality. Overwriting before confirmation breaks the "results are immutable after confirmation" constraint.

**Do this instead:** Use `MatchResultSubmission.scores` for the pending submission. Only write to `Match.result` during `confirmResult()`.

### Anti-Pattern 2: Inline Standings Calculation in the Controller

**What people do:** Calculate group standings or Swiss scores inside the controller handler with a long function.

**Why it's wrong:** The existing codebase places all business logic in services, controllers only orchestrate. Tiebreaker logic for standings is complex (sets won → games won → head-to-head chain). It needs to be independently testable, and it is shared between group stage and potentially Swiss.

**Do this instead:** `standingsCalculator.js` utility function, called from `groupStandingsService` and `swissPairingService`. Test the calculator independently.

### Anti-Pattern 3: Checking "Is Tournament Complete?" in Every Match Update

**What people do:** After each match result, run a query counting all matches to check if the tournament is done, inline in the match update transaction.

**Why it's wrong:** For large bracket tournaments (128 players = 127 matches), this count runs on every single match confirmation. As a side-effect in the service, it causes latency spikes near the end of the tournament when the court is busy.

**Do this instead:** `tournamentLifecycleService.checkAutoComplete()` runs the count asynchronously after the match confirmation response is sent (similar to how Feature 006's `recalculateCategorySeedingScores` is called with `.catch()` as a fire-and-forget). Return the match confirmation immediately; auto-complete happens asynchronously.

### Anti-Pattern 4: Single MatchResult Table for Both Singles and Doubles

**What people do:** Assume `winnerId` is always a `PlayerProfile.id` and use a foreign key directly.

**Why it's wrong:** The existing `Match` model has both `player1Id/player2Id` (singles) and `pair1Id/pair2Id` (doubles). The winner in a doubles match is a `DoublesPair`, not a `PlayerProfile`. The existing schema handles this via `isBye`, `pair1Id`, `pair2Id`.

**Do this instead:** In `MatchResultSubmission`, use `winnerId String` + `winnerType String` ("PLAYER" or "PAIR") to keep the same polymorphic pattern the existing codebase uses. Do not add a foreign key constraint — mirror the pattern in `TournamentResult.entityType`.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 users (current target) | Monolith is correct. All services in same Express process. Synchronous service calls. PostgreSQL direct connection via Prisma. |
| 500-5k users | First bottleneck: standings recalculation on every GET. Cache `GroupStanding` writes per round completion. Add database index on `Match(tournamentId, status)`. |
| 5k+ users | Extract result confirmation notifications to a job queue (Bull/BullMQ) if notifications are added. Swiss pairing becomes CPU-bound; extract to worker thread at scale. |

### Scaling Priorities

1. **First bottleneck:** Group standings computed on every GET request. Fix: cache computed standings in `GroupStanding` table after each match confirmation. Already included in Pattern 4.
2. **Second bottleneck:** `checkAutoComplete()` count query on every match confirmation. Fix: fire-and-forget async pattern (already established in codebase with seeding score recalculation).

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Result submission → Feature 008 points | Manual trigger via `POST /calculate-points` | Organizer triggers after COMPLETED. No automatic coupling. |
| Result submission → Feature 011 knockout view | Match.result field update | KnockoutBracket reads Match.result; confirmation writes it. Works automatically. |
| Group standings → Combined format advancement | Service-to-service call | `combinedFormatService` reads final group standings to build advancement bracket. |
| Swiss pairing → Tournament.formatConfig | Config read | `swissPairingService` reads `SwissFormatConfig.rounds` to know when tournament is done. |

### External Services

None required. Result submission is self-contained within the BATL backend. No email or push notifications in scope for this milestone.

---

## Sources

- Direct analysis of `backend/prisma/schema.prisma` (30+ models, existing Match/Tournament/Group/Bracket structure)
- Direct analysis of `backend/src/services/tournamentService.js` (existing status management patterns, fire-and-forget async side effects)
- Direct analysis of `backend/src/types/matchStatus.js` (existing transition guard pattern via `canTransitionTo()`)
- Direct analysis of `backend/src/validation/formatConfigSchemas.js` (SwissFormatConfig: rounds 3-20, GroupFormatConfig: groupSize 2-8)
- `.planning/codebase/ARCHITECTURE.md` (layer definitions, error handling, auth patterns)
- `.planning/codebase/STRUCTURE.md` (file naming conventions, where to add new code)
- `.planning/PROJECT.md` (constraints: immutable confirmed results, backward compatibility, touch-friendly UX)

---

*Architecture research for: BATL amateur tennis league — match results, state machines, group/Swiss pairing*
*Researched: 2026-02-26*
