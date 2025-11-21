# Data Model: Doubles Pair Management

**Feature**: 006-doubles-pairs
**Date**: 2025-11-18

## Overview

This document defines the data entities, relationships, and validation rules for the doubles pair management feature. The model extends the existing BATL database schema to support player partnerships in doubles tournaments.

## Entity Definitions

### DoublesPair

Represents a partnership of two players competing together in doubles tournaments within a specific category.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique pair identifier |
| player1Id | UUID | NOT NULL, FOREIGN KEY → PlayerProfile | First player (lower ID) |
| player2Id | UUID | NOT NULL, FOREIGN KEY → PlayerProfile | Second player (higher ID) |
| categoryId | UUID | NOT NULL, FOREIGN KEY → Category | Doubles category this pair competes in |
| seedingScore | Float | NOT NULL, DEFAULT 0 | Combined ranking points of both players for seeding |
| deletedAt | DateTime | NULLABLE | Soft delete timestamp (null = active) |
| createdAt | DateTime | NOT NULL, DEFAULT now() | Pair creation timestamp |
| updatedAt | DateTime | NOT NULL, auto-update | Last modification timestamp |

**Unique Constraints**:
- `@@unique([player1Id, player2Id, categoryId])` - Prevents duplicate pairs in same category

**Check Constraints**:
- `player1Id < player2Id` - Ensures consistent ordering (application-enforced)
- `player1Id != player2Id` - Prevents same player twice

**Indexes**:
- `player1Id, deletedAt` - Fast lookup of pairs containing player1
- `player2Id, deletedAt` - Fast lookup of pairs containing player2
- `categoryId, deletedAt` - Fast lookup of active pairs in category
- `categoryId, seedingScore DESC, deletedAt` - Tournament bracket generation

**Relationships**:
- `player1 → PlayerProfile` (many-to-one)
- `player2 → PlayerProfile` (many-to-one)
- `category → Category` (many-to-one)
- `pairRankings → PairRanking[]` (one-to-many)
- `pairRegistrations → PairRegistration[]` (one-to-many)

**Business Rules**:
- Same two players in different categories create different pair entities
- Pairs are reused across multiple tournaments in the same category
- Pairs are soft-deleted when no active registrations and no current season participation
- Seeding score is recalculated after every tournament in the category closes

### PairRanking

Tracks competitive standing of a doubles pair within a category, based only on points earned by that specific pair.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique ranking identifier |
| pairId | UUID | NOT NULL, FOREIGN KEY → DoublesPair | The ranked pair |
| categoryId | UUID | NOT NULL, FOREIGN KEY → Category | Category for this ranking |
| rank | Integer | NOT NULL | Current rank position (1 = first place) |
| points | Float | NOT NULL, DEFAULT 0 | Total points earned by this pair |
| wins | Integer | NOT NULL, DEFAULT 0 | Total wins by this pair |
| losses | Integer | NOT NULL, DEFAULT 0 | Total losses by this pair |
| lastUpdated | DateTime | NOT NULL, auto-update | When ranking was last recalculated |
| createdAt | DateTime | NOT NULL, DEFAULT now() | Ranking creation timestamp |

**Unique Constraints**:
- `@@unique([pairId, categoryId])` - One ranking per pair per category

**Indexes**:
- `categoryId, rank` - Fast leaderboard queries
- `pairId` - Fast lookup of pair's ranking

**Relationships**:
- `pair → DoublesPair` (many-to-one)
- `category → Category` (many-to-one)

**Business Rules**:
- Only points earned by this specific pair count (not individual player points from other pairs)
- New pairs start with 0 points even if both players are highly ranked individually
- Points are awarded to both pair ranking AND each player's individual category ranking
- Rankings are recalculated after each tournament closes

### PairRegistration

Links a doubles pair to a specific doubles tournament, analogous to TournamentRegistration for singles.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique registration identifier |
| tournamentId | UUID | NOT NULL, FOREIGN KEY → Tournament | The tournament |
| pairId | UUID | NOT NULL, FOREIGN KEY → DoublesPair | The registered pair |
| status | Enum | NOT NULL, DEFAULT 'REGISTERED' | REGISTERED, WAITLISTED, WITHDRAWN, CANCELLED |
| registrationTimestamp | DateTime | NOT NULL, DEFAULT now() | When pair registered (used for tie-breaking) |
| eligibilityOverride | Boolean | NOT NULL, DEFAULT false | True if organizer bypassed eligibility checks |
| overrideReason | Text | NULLABLE | Required if eligibilityOverride = true |
| promotedAt | DateTime | NULLABLE | When promoted from waitlist |
| demotedAt | DateTime | NULLABLE | When demoted to waitlist |
| createdAt | DateTime | NOT NULL, DEFAULT now() | Registration creation timestamp |
| updatedAt | DateTime | NOT NULL, auto-update | Last modification timestamp |

**Unique Constraints**:
- `@@unique([tournamentId, pairId])` - Pair can only register once per tournament

**Indexes**:
- `tournamentId, status` - Fast lookup of registrations by tournament and status
- `tournamentId, registrationTimestamp` - Tie-breaking for seeding
- `pairId, status` - Fast lookup of pair's active registrations

**Relationships**:
- `tournament → Tournament` (many-to-one)
- `pair → DoublesPair` (many-to-one)

**Business Rules**:
- Status transitions: REGISTERED ↔ WAITLISTED → WITHDRAWN/CANCELLED
- Withdrawal triggers pair lifecycle check (delete if no other active registrations and no current season participation)
- Eligibility override only allowed for organizers/admins
- Override reason is required when eligibilityOverride = true
- Seeding order: seedingScore DESC, registrationTimestamp ASC, pairName ASC

### Modified: Category (existing)

**New Fields**: None

**New Validation**:
- Category `type` enum extended to support `DOUBLES` value (in addition to existing `SINGLES`)
- Category with `type = DOUBLES` can only have doubles tournaments
- Category with `type = SINGLES` can only have singles tournaments

**No schema changes required** - validation logic added to application layer

### Modified: CategoryRanking (existing)

**New Fields**: None

**New Behavior**:
- For doubles categories: Player's individual ranking aggregates points from all pairs they competed with
- Points awarded to player when their pair wins are added to their individual category ranking
- Player can appear in multiple pair rankings (as part of different pairs) but only once in individual ranking per category

**No schema changes required** - points distribution logic added to application layer

### Modified: Tournament (existing)

**New Fields**: None

**New Validation**:
- Tournament's category type determines registration behavior
- Doubles category tournaments use PairRegistration instead of TournamentRegistration
- Frontend conditional rendering based on category type

**No schema changes required** - registration routing logic added to application layer

## Entity Relationships Diagram

```text
PlayerProfile ──┐
                ├──> DoublesPair ──> PairRanking
PlayerProfile ──┘         │
                          │
                          v
Category ────────> PairRegistration
                          │
                          v
                    Tournament
```

**Key Relationships**:
- Two `PlayerProfile` entities combine to form one `DoublesPair`
- `DoublesPair` has one `PairRanking` per category
- `DoublesPair` has many `PairRegistration` entries (one per tournament)
- `Category` determines whether tournament uses pair or player registration
- `Tournament` in doubles category accepts pair registrations only

## Validation Rules

### Pair Creation (FR-001, FR-002, FR-003)

```javascript
validatePairCreation(player1Id, player2Id, categoryId):
  // Prevent same player twice
  IF player1Id == player2Id:
    THROW "Cannot create pair with same player twice"

  // Sort player IDs for consistent storage
  IF player1Id > player2Id:
    SWAP player1Id, player2Id

  // Check for existing pair (including soft-deleted)
  existingPair = findOne({
    player1Id, player2Id, categoryId
  })

  IF existingPair AND existingPair.deletedAt IS NULL:
    RETURN existingPair  // Reuse existing active pair

  IF existingPair AND existingPair.deletedAt IS NOT NULL:
    // Un-delete existing pair
    UPDATE existingPair SET deletedAt = NULL, updatedAt = NOW()
    RETURN existingPair

  // Create new pair
  RETURN createPair({
    player1Id, player2Id, categoryId,
    seedingScore: calculateInitialSeedingScore(player1Id, player2Id, categoryId)
  })
```

### Eligibility Validation (FR-006, FR-008, FR-009)

```javascript
validatePairEligibility(pairId, tournamentId, userRole):
  pair = findPairById(pairId)
  tournament = findTournamentById(tournamentId)
  category = tournament.category

  errors = []

  // Check player 1 eligibility
  IF NOT meetsAgeCriteria(pair.player1, category.ageGroup):
    errors.push("Player 1 does not meet age requirement")

  IF NOT meetsGenderCriteria(pair.player1, category.gender):
    errors.push("Player 1 does not meet gender requirement")

  // Check player 2 eligibility
  IF NOT meetsAgeCriteria(pair.player2, category.ageGroup):
    errors.push("Player 2 does not meet age requirement")

  IF NOT meetsGenderCriteria(pair.player2, category.gender):
    errors.push("Player 2 does not meet gender requirement")

  // Check partner conflict (FR-009)
  existingReg1 = findRegistration(tournament, pair.player1)
  existingReg2 = findRegistration(tournament, pair.player2)

  IF existingReg1 AND existingReg1.pairId != pairId:
    errors.push("Player 1 already registered with different partner")

  IF existingReg2 AND existingReg2.pairId != pairId:
    errors.push("Player 2 already registered with different partner")

  // For players, reject if errors
  IF errors.length > 0 AND userRole == 'PLAYER':
    THROW errors

  // For organizers/admins, return errors as warnings (can override)
  IF errors.length > 0 AND (userRole == 'ORGANIZER' OR userRole == 'ADMIN'):
    RETURN { eligible: false, warnings: errors, canOverride: true }

  RETURN { eligible: true }
```

### Pair Lifecycle (FR-012, FR-013, FR-015)

```javascript
checkPairLifecycle(pairId):
  pair = findPairById(pairId)

  // Count active registrations
  activeRegistrations = countWhere({
    pairId: pairId,
    status: IN ['REGISTERED', 'WAITLISTED']
  })

  // Check current season participation
  currentYear = YEAR(NOW())
  seasonParticipation = countWhere({
    pairId: pairId,
    tournament.status: 'COMPLETED',
    tournament.endDate: YEAR(endDate) == currentYear
  })

  // Delete if no active registrations and no current season participation
  IF activeRegistrations == 0 AND seasonParticipation == 0:
    softDeletePair(pairId)  // Sets deletedAt = NOW()
    preserveHistoricalData(pairId)  // Ensure match/ranking history remains
```

### Seeding Score Calculation (FR-020, FR-021)

```javascript
calculateSeedingScore(pairId):
  pair = findPairById(pairId)

  // Get individual player rankings in this category
  player1Ranking = findCategoryRanking(pair.player1Id, pair.categoryId)
  player2Ranking = findCategoryRanking(pair.player2Id, pair.categoryId)

  player1Points = player1Ranking?.points || 0
  player2Points = player2Ranking?.points || 0

  RETURN player1Points + player2Points

recalculateCategorySeedingScores(categoryId):
  // Called after any tournament in this category closes
  pairs = findAll({ categoryId, deletedAt: NULL })

  FOR EACH pair IN pairs:
    newScore = calculateSeedingScore(pair.id)
    UPDATE pair SET seedingScore = newScore
```

### Points Distribution (FR-016, FR-018)

```javascript
awardPointsToPair(pairId, pointsEarned):
  pair = findPairById(pairId)

  // Update pair ranking
  pairRanking = findPairRanking(pairId, pair.categoryId)
  UPDATE pairRanking SET
    points = points + pointsEarned,
    wins = wins + (IF won THEN 1 ELSE 0),
    losses = losses + (IF lost THEN 1 ELSE 0)

  // Update both players' individual rankings in this category
  player1Ranking = findCategoryRanking(pair.player1Id, pair.categoryId)
  UPDATE player1Ranking SET points = points + pointsEarned

  player2Ranking = findCategoryRanking(pair.player2Id, pair.categoryId)
  UPDATE player2Ranking SET points = points + pointsEarned

  // Trigger seeding score recalculation for all pairs in this category
  recalculateCategorySeedingScores(pair.categoryId)
```

## State Transitions

### PairRegistration Status

```text
          ┌──────────────┐
  ┌───────┤   REGISTERED  ├────────┐
  │       └──────┬───────┘        │
  │              │                │
  v              v                v
┌─────────┐  ┌─────────┐     ┌──────────┐
│WITHDRAWN│  │WAITLISTED├────>│CANCELLED │
└─────────┘  └────┬────┘      └──────────┘
                  │
                  v
             [Promoted to REGISTERED]
```

**Transitions**:
- `REGISTERED → WAITLISTED`: When tournament reaches capacity
- `WAITLISTED → REGISTERED`: When spot opens (another pair withdraws)
- `REGISTERED → WITHDRAWN`: Player voluntarily withdraws
- `WAITLISTED → WITHDRAWN`: Player voluntarily withdraws from waitlist
- `REGISTERED → CANCELLED`: Organizer cancels registration
- `WAITLISTED → CANCELLED`: Organizer cancels waitlist entry

### DoublesPair Lifecycle

```text
┌──────────┐   Registration    ┌──────────┐
│          ├──────────────────>│          │
│ NOT      │                   │  ACTIVE  │
│ EXISTING │   Reuse existing  │  PAIR    │
│          │<──────────────────┤          │
└──────────┘                   └────┬─────┘
                                    │
                         No active registrations
                         No current season participation
                                    │
                                    v
                             ┌─────────────┐
                             │   DELETED   │
                             │ (deletedAt) │
                             │             │
                             │ History     │
                             │ Preserved   │
                             └─────────────┘
```

## Data Integrity Rules

1. **Player Ordering**: Application always stores player IDs in sorted order (player1Id < player2Id)
2. **Soft Delete**: Never hard delete pairs; use deletedAt timestamp to preserve historical data
3. **Seeding Score Consistency**: Recalculate all category seeding scores after any tournament closes
4. **Points Distribution**: Always update 3 entities when pair wins: PairRanking + 2× CategoryRanking
5. **Registration Uniqueness**: Pair can only register once per tournament (enforced by unique constraint)
6. **Eligibility Override Reason**: If eligibilityOverride = true, overrideReason must not be null

## Performance Considerations

### Expected Data Volume

- **DoublesPair**: ~500 pairs per category (10 categories) = ~5,000 pairs total
- **PairRanking**: 1 ranking per pair per category = ~5,000 rankings
- **PairRegistration**: ~20 registrations per pair per season = ~100,000 registrations/year

### Query Patterns

**Most Frequent**:
1. Find pair by players + category (pair creation/lookup)
2. List active pairs in category (tournament setup, rankings display)
3. Get pair seeding score (bracket generation)
4. Update pair/player rankings (after each match)

**Optimization**:
- Composite unique index on (player1Id, player2Id, categoryId) handles lookups
- Index on (categoryId, seedingScore DESC, deletedAt) handles tournament bracket generation
- Seeding score stored in DoublesPair for instant access (no joins required)

## References

- Feature specification: [spec.md](spec.md)
- Research decisions: [research.md](research.md)
- Implementation plan: [plan.md](plan.md)
