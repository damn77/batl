# Data Model: Tournament Seeding Placement

**Feature**: 010-seeding-placement
**Date**: 2026-01-13
**Purpose**: Entity definitions and relationships for seeding placement system

## Overview

This feature does NOT introduce new database entities. It operates on existing data from features 008 (tournament-rankings) and 009 (bracket-generation), applying placement logic to position seeded players in brackets.

## Existing Entities (from Feature 008)

### RankingEntry
**Source**: Feature 008 (tournament-rankings)
**Usage**: Provides ordered list of ranked players/pairs for seeding

**Relevant Fields**:
- `id`: Unique identifier
- `rankingId`: Foreign key to Ranking (category/year/type)
- `playerId`: Foreign key to Player (null for pair rankings)
- `pairId`: Foreign key to PlayerPair (null for singles rankings)
- `rank`: Position in rankings (1 = highest ranked)
- `totalPoints`: Total ranking points (for tiebreaker validation)
- `seedingScore`: Calculated score for seeding purposes (sum of best N tournaments)

**Relationships**:
- Belongs to one Ranking (category/year/type combination)
- References either Player OR PlayerPair (mutually exclusive)

**Validation Rules**:
- `rank` must be unique within a ranking
- Either `playerId` OR `pairId` must be set (not both, not neither)
- Ordered by `rank` ASC when querying for seeding

### Player
**Source**: Feature 001 (user-management)
**Usage**: Individual player entity for singles tournaments

**Relevant Fields**:
- `id`: Unique identifier
- `firstName`, `lastName`: Player name
- `birthYear`: Used for category eligibility
- `gender`: Used for category eligibility

### PlayerPair
**Source**: Feature 006 (doubles-pairs)
**Usage**: Player pair entity for doubles tournaments

**Relevant Fields**:
- `id`: Unique identifier
- `player1Id`, `player2Id`: Foreign keys to Players
- `pairType`: MEN, WOMEN, MIXED

## Existing Entities (from Feature 009)

### Bracket Structure (JSON)
**Source**: Feature 009 (bracket-generation)
**Usage**: Provides bracket template for position calculation

**Structure**:
```javascript
{
  playerCount: number,      // 4-128
  bracketSize: number,      // Next power of 2 >= playerCount
  structure: string,        // "0" and "1" pattern
  preliminaryMatches: number,  // Count of "0" / 2
  byes: number             // Count of "1"
}
```

## New Runtime Data Structures (In-Memory Only)

### SeededBracket
**Purpose**: Result of seeding placement algorithm (returned by API, not persisted)

```javascript
{
  tournamentId: string,           // Tournament identifier
  categoryId: string,             // Category identifier
  playerCount: number,            // Total participants (4-128)
  bracketSize: number,            // Power of 2 size (from feature 009)
  structure: string,              // Bracket structure pattern (from feature 009)
  seedCount: number,              // Number of seeded positions (2/4/8/16)
  positions: Array<Position>,     // Ordered bracket positions
  randomSeed: string,             // Seed used for randomization (for reproducibility)
  generatedAt: Date              // Timestamp
}
```

### Position
**Purpose**: Single bracket position with assigned player/pair

```javascript
{
  positionNumber: number,         // 1-based position in bracket (1=top, N=bottom)
  positionIndex: number,          // 0-based index in structure string
  seed: number | null,            // Seed number (1-16) or null if unseeded
  entityId: string | null,        // Player ID or PlayerPair ID
  entityType: 'PLAYER' | 'PAIR' | null,  // Entity type
  entityName: string | null,      // Player/pair name for display
  isBye: boolean,                 // True if position is bye ("1" in structure)
  isPreliminary: boolean          // True if position is preliminary match ("0")
}
```

### SeedingConfiguration
**Purpose**: Rules for seeding based on tournament size (computed, not stored)

```javascript
{
  playerCount: number,            // Tournament size (4-128)
  seedCount: number,              // Number of seeds (2/4/8/16)
  seedRange: {
    min: number,                  // Min players for this seed count
    max: number                   // Max players for this seed count
  }
}
```

## Data Flow

```
1. Get Tournament Info
   ├─> Tournament (tournamentId, categoryId, participantCount)
   └─> Category (categoryId, type, ageGroup, gender)

2. Get Ranked Players (Feature 008)
   ├─> Query RankingEntry WHERE rankingId = category.currentRankingId
   ├─> ORDER BY rank ASC
   ├─> LIMIT seedCount (2/4/8/16 based on participantCount)
   └─> JOIN Player or PlayerPair for names

3. Get Bracket Structure (Feature 009)
   ├─> Call bracketService.getBracketStructure(participantCount)
   └─> Returns { bracketSize, structure, byes, preliminaryMatches }

4. Apply Seeding Placement (This Feature)
   ├─> placeTwoSeeds() if seedCount = 2
   ├─> placeFourSeeds() if seedCount = 4 (calls placeTwoSeeds first)
   ├─> placeEightSeeds() if seedCount = 8 (calls placeFourSeeds first)
   ├─> placeSixteenSeeds() if seedCount = 16 (calls placeEightSeeds first)
   └─> Returns SeededBracket with positions array

5. Return API Response
   └─> SeededBracket JSON (in-memory structure, not persisted)
```

## Validation Rules

### Input Validation
- `participantCount`: Must be between 4 and 128 (inclusive)
- `categoryId`: Must exist in database
- `tournamentId`: Must exist and be in valid state for bracket generation
- `seedCount`: Must match tournament size rules (4-9→2, 10-19→4, 20-39→8, 40-128→16)

### Business Rules
- **FR-010**: Seeds ordered by category ranking rank (1 = highest)
- **FR-012**: Seed count determined automatically from player count
- **FR-019**: All seeded players must be eligible for tournament category
- **FR-020**: If fewer players than seed positions, adjust seed count down

### Constraints
- Position indices must be valid (0 to bracketSize-1)
- Seed numbers must be unique (1 to seedCount)
- Entity IDs must reference valid Player or PlayerPair records
- Recursive placement must respect established positions (no overwriting)

## State Transitions

**Note**: This feature deals with computed data (placement logic), not persistent state. Bracket generation is a **stateless operation** that produces a result based on:
- Current category rankings (from feature 008)
- Bracket structure template (from feature 009)
- Seeding placement rules (this feature)

No state machine or workflow required. Each API call independently:
1. Fetches current data
2. Computes seeded bracket
3. Returns result

## Database Queries

### Query 1: Get Top N Seeded Players
```sql
SELECT
  re.id, re.rank, re.totalPoints, re.seedingScore,
  re.playerId, re.pairId,
  COALESCE(p.firstName || ' ' || p.lastName, pp.pairName) AS entityName
FROM RankingEntry re
LEFT JOIN Player p ON re.playerId = p.id
LEFT JOIN PlayerPair pp ON re.pairId = pp.id
WHERE re.rankingId = ?
  AND re.rank <= ?
ORDER BY re.rank ASC
LIMIT ?;
```

**Performance Notes**:
- Index on (rankingId, rank) for fast retrieval
- Limit clause ensures only top N seeds fetched
- Typically 2-16 rows (very small result set)

### Query 2: Verify Player/Pair Eligibility (Optional)
```sql
-- For singles (playerId)
SELECT id FROM Player
WHERE id = ? AND /* eligibility criteria */

-- For doubles (pairId)
SELECT id FROM PlayerPair
WHERE id = ? AND /* eligibility criteria */
```

**Note**: Eligibility validation may be redundant if rankings already filtered by category eligibility (handled in feature 008).

## No New Migrations

This feature requires **zero database migrations** because:
- All required data exists in features 001, 006, 008, 009
- Seeding placement is a pure computation (stateless)
- Results returned via API (not persisted)

If future requirements demand bracket persistence (out of scope per spec), that would be a separate feature with new entities (Tournament, Bracket, Match, etc.).

## Integration Points Summary

| Feature | Entity/Service | Usage |
|---------|----------------|-------|
| 008 (Rankings) | RankingEntry | Source of seeded players (top N by rank) |
| 008 (Rankings) | Player / PlayerPair | Player/pair details and names |
| 009 (Brackets) | bracketService | Bracket structure template |
| 001 (Users) | Player | Player entity (via feature 008) |
| 006 (Pairs) | PlayerPair | Pair entity (via feature 008) |

**No direct database dependencies** - all data accessed via existing services.
