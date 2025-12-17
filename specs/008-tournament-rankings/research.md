# Technical Research: Tournament Rankings and Points System

**Feature Branch**: `008-tournament-rankings`
**Created**: 2025-12-16
**Status**: Complete

## Executive Summary

This document provides technical research and decisions for implementing a comprehensive tournament rankings system with automatic point calculation, multiple ranking types per category, seeding score optimization, and annual rollover. The system must achieve 100% mathematical accuracy for point calculations while supporting efficient queries on large datasets (1000+ players per category).

**Key Technical Decisions**:
1. **Point Calculation**: In-memory JavaScript calculation with BigDecimal precision for placement method; database-driven point table lookup for round-based method
2. **Ranking Tiebreakers**: Multi-column composite index with PostgreSQL native ordering
3. **Annual Rollover**: Soft delete with `year` column approach (deferred partitioning to future feature)
4. **Seeding Score**: Prisma subquery with `ORDER BY points DESC LIMIT N` per tournament
5. **Multiple Rankings**: Shared `Ranking` table with `type` enum (PAIR/MEN/WOMEN/SINGLES)
6. **Point Tables**: Database storage with in-memory cache for fast lookup

---

## 1. Point Calculation Algorithms

### Research Question
How to implement placement-based formula `Points = (Participants - Placement + 1) × Multiplier` and round-based point allocation with 100% mathematical accuracy?

### Decision: Hybrid Approach

**Placement-Based**: In-memory JavaScript calculation with validation
**Round-Based**: Database-driven point table lookup with multiplier

### Rationale

**Placement Method**:
- Formula is simple: `(N - P + 1) × M` where N=participants, P=placement, M=multiplier
- No floating-point issues since inputs are integers and multiplier is typically small (1-4)
- JavaScript `Number` type supports integers up to 2^53 - 1 (9 quadrillion), far exceeding tournament scale
- Real-time calculation is faster than database lookup for this simple formula
- Example: 32 participants, 1st place, multiplier 2 = `(32 - 1 + 1) × 2 = 64 points`

**Round-Based Method**:
- Point values are predefined in tables based on participant count ranges
- Point tables are admin-configurable, requiring database storage
- Lookup is more efficient than recalculating from formulas
- Double points multiplier is applied post-lookup: `tablePoints × (doublePoints ? 2 : 1)`

### Implementation Notes

```javascript
// Placement-based calculation (pointCalculationService.js)
export function calculatePlacementPoints(participantCount, placement, multiplicativeValue = 2) {
  // Input validation
  if (participantCount < 2) {
    throw new Error('Participant count must be at least 2');
  }
  if (placement < 1 || placement > participantCount) {
    throw new Error(`Placement must be between 1 and ${participantCount}`);
  }
  if (multiplicativeValue <= 0) {
    throw new Error('Multiplicative value must be positive');
  }

  // Calculate points: (N - P + 1) × M
  const points = (participantCount - placement + 1) * multiplicativeValue;

  // Return as integer (no rounding needed)
  return points;
}

// Round-based calculation (pointCalculationService.js)
export async function calculateRoundPoints(participantCount, finalRoundReached, isConsolation, doublePoints = false) {
  // Determine participant range (2-4, 5-8, 9-16, 17-32)
  const participantRange = getParticipantRange(participantCount);

  // Lookup point value from database
  const pointTable = await prisma.pointTable.findUnique({
    where: {
      participantRange_roundName_isConsolation: {
        participantRange,
        roundName: finalRoundReached,
        isConsolation
      }
    }
  });

  if (!pointTable) {
    throw new Error(`No point table found for range ${participantRange}, round ${finalRoundReached}`);
  }

  // Apply double points multiplier if enabled
  const points = pointTable.points * (doublePoints ? 2 : 1);

  return points;
}

function getParticipantRange(count) {
  if (count <= 4) return '2-4';
  if (count <= 8) return '5-8';
  if (count <= 16) return '9-16';
  if (count <= 32) return '17-32';
  throw new Error('Participant count exceeds maximum supported (32)');
}
```

### Alternatives Considered

**Alternative 1: Database Stored Procedures**
- **Rejected**: Less maintainable than JavaScript for simple arithmetic
- **Rejected**: Harder to test in isolation
- **Rejected**: Platform-specific (PostgreSQL vs. other databases)

**Alternative 2: BigDecimal Library (e.g., decimal.js)**
- **Rejected**: Overkill for integer arithmetic
- **Rejected**: Performance overhead for simple calculations
- **Considered Future**: If fractional points are introduced (e.g., 3.5 points for tie)

**Alternative 3: Pre-calculated Point Tables for Both Methods**
- **Rejected**: Placement method would require tables for every possible participant count (2-1000+)
- **Rejected**: Storage waste for simple formula calculation

### Test Cases for 100% Accuracy

```javascript
// Placement method test cases
describe('Placement Point Calculation', () => {
  test('First place in 10-participant tournament with multiplier 2', () => {
    expect(calculatePlacementPoints(10, 1, 2)).toBe(20); // (10-1+1)*2 = 20
  });

  test('Last place in 10-participant tournament with multiplier 2', () => {
    expect(calculatePlacementPoints(10, 10, 2)).toBe(2); // (10-10+1)*2 = 2
  });

  test('Edge case: 2-participant tournament', () => {
    expect(calculatePlacementPoints(2, 1, 2)).toBe(4); // (2-1+1)*2 = 4
    expect(calculatePlacementPoints(2, 2, 2)).toBe(2); // (2-2+1)*2 = 2
  });

  test('Large tournament: 128 participants, 1st place, multiplier 3', () => {
    expect(calculatePlacementPoints(128, 1, 3)).toBe(384); // (128-1+1)*3 = 384
  });
});

// Round-based method test cases
describe('Round Point Calculation', () => {
  test('9-16 participants, Quarterfinal, main bracket', async () => {
    const points = await calculateRoundPoints(12, 'Quarterfinal', false, false);
    expect(points).toBe(10); // Per spec table
  });

  test('Double points multiplier applied correctly', async () => {
    const normalPoints = await calculateRoundPoints(12, 'Final', false, false);
    const doublePoints = await calculateRoundPoints(12, 'Final', false, true);
    expect(doublePoints).toBe(normalPoints * 2);
  });

  test('Consolation bracket has different points than main', async () => {
    const mainPoints = await calculateRoundPoints(12, 'Final', false, false);
    const consolationPoints = await calculateRoundPoints(12, 'Final', true, false);
    expect(consolationPoints).toBeLessThan(mainPoints);
  });
});
```

---

## 2. Ranking Tiebreaker Implementation

### Research Question
How to efficiently implement multi-level tiebreakers: total points → recent tournament date → fewest tournaments → alphabetical?

### Decision: Composite Index with Native PostgreSQL Ordering

**Database Schema**:
```prisma
model RankingEntry {
  id                   String    @id @default(uuid())
  rankingId            String    // FK to Ranking
  entityId             String    // PlayerProfile.id or DoublesPair.id
  entityType           RankingEntityType // PLAYER or PAIR

  rank                 Int       // Calculated rank position
  totalPoints          Float     @default(0)
  tournamentCount      Int       @default(0)
  lastTournamentDate   DateTime? // Most recent tournament completion date

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  // Relationships
  ranking              Ranking   @relation(fields: [rankingId], references: [id], onDelete: Cascade)

  // Composite index for efficient tiebreaker sorting
  @@unique([rankingId, entityId, entityType])
  @@index([rankingId, totalPoints, lastTournamentDate, tournamentCount]) // Tiebreaker index
}
```

**Ranking Calculation Query**:
```javascript
export async function recalculateRankings(rankingId) {
  // Get all entries for this ranking, sorted by tiebreaker rules
  const entries = await prisma.rankingEntry.findMany({
    where: { rankingId },
    orderBy: [
      { totalPoints: 'desc' },           // Primary: highest points first
      { lastTournamentDate: 'desc' },    // Tiebreaker 1: most recent tournament
      { tournamentCount: 'asc' },        // Tiebreaker 2: fewest tournaments
      // Tiebreaker 3 (alphabetical) requires join to player/pair name
    ],
    include: {
      ranking: {
        select: {
          categoryId: true,
          type: true
        }
      }
    }
  });

  // Fetch entity names for alphabetical tiebreaker
  const entriesWithNames = await Promise.all(
    entries.map(async (entry) => {
      let name;
      if (entry.entityType === 'PLAYER') {
        const player = await prisma.playerProfile.findUnique({
          where: { id: entry.entityId },
          select: { name: true }
        });
        name = player?.name || '';
      } else {
        const pair = await prisma.doublesPair.findUnique({
          where: { id: entry.entityId },
          include: {
            player1: { select: { name: true } },
            player2: { select: { name: true } }
          }
        });
        name = pair ? `${pair.player1.name} / ${pair.player2.name}` : '';
      }
      return { ...entry, name };
    })
  );

  // Apply final alphabetical sort for remaining ties
  entriesWithNames.sort((a, b) => {
    // Primary: total points (descending)
    if (a.totalPoints !== b.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }

    // Tiebreaker 1: most recent tournament (descending)
    const aDate = a.lastTournamentDate?.getTime() || 0;
    const bDate = b.lastTournamentDate?.getTime() || 0;
    if (aDate !== bDate) {
      return bDate - aDate;
    }

    // Tiebreaker 2: fewest tournaments (ascending)
    if (a.tournamentCount !== b.tournamentCount) {
      return a.tournamentCount - b.tournamentCount;
    }

    // Tiebreaker 3: alphabetical (ascending)
    return a.name.localeCompare(b.name);
  });

  // Update rank values in database
  const updates = entriesWithNames.map((entry, index) => {
    return prisma.rankingEntry.update({
      where: { id: entry.id },
      data: { rank: index + 1 } // 1-indexed ranks
    });
  });

  await prisma.$transaction(updates);

  return entriesWithNames.length;
}
```

### Rationale

**Why Composite Index**:
- PostgreSQL can use multi-column indexes for `ORDER BY` clauses matching index column order
- Index covers first 3 tiebreaker levels (points, date, tournament count)
- Alphabetical tiebreaker requires name join, handled in application layer
- Index enables index-only scans for ranking queries (no table heap access)

**Why Application-Level Alphabetical Sort**:
- Player/pair names are in separate tables (PlayerProfile, DoublesPair)
- Database join for name sorting would prevent index usage on RankingEntry
- Alphabetical ties are extremely rare (identical points, date, and tournament count)
- Application-level sort only processes entries with all other tiebreakers equal
- Acceptable performance trade-off for simplicity and index efficiency

**Performance Characteristics**:
- **Ranking calculation**: O(N log N) where N = entries in ranking
- **Ranking retrieval**: O(log N + K) where K = limit (uses index for ORDER BY)
- **Index size**: Minimal overhead (~32 bytes per entry: UUID + 3 sort columns)

### Implementation Notes

**Edge Case Handling**:

```javascript
// Edge case: Tournament end date ties (multiple tournaments finish same day)
// Spec clarifies: Use earliest tournament based on tournament ID as final determinant
export async function updateRankingEntryAfterTournament(
  rankingId,
  entityId,
  entityType,
  pointsAwarded,
  tournamentEndDate
) {
  const entry = await prisma.rankingEntry.findUnique({
    where: {
      rankingId_entityId_entityType: {
        rankingId,
        entityId,
        entityType
      }
    }
  });

  if (!entry) {
    // Create new entry
    return await prisma.rankingEntry.create({
      data: {
        rankingId,
        entityId,
        entityType,
        totalPoints: pointsAwarded,
        tournamentCount: 1,
        lastTournamentDate: tournamentEndDate
      }
    });
  }

  // Update existing entry
  const newLastTournamentDate = entry.lastTournamentDate && entry.lastTournamentDate > tournamentEndDate
    ? entry.lastTournamentDate  // Keep more recent date
    : tournamentEndDate;        // Update to new tournament date

  return await prisma.rankingEntry.update({
    where: { id: entry.id },
    data: {
      totalPoints: { increment: pointsAwarded },
      tournamentCount: { increment: 1 },
      lastTournamentDate: newLastTournamentDate
    }
  });
}
```

### Alternatives Considered

**Alternative 1: Denormalize Player/Pair Names into RankingEntry**
- **Rejected**: Data duplication violates normalization
- **Rejected**: Name updates require propagation to all ranking entries
- **Rejected**: Minimal performance gain (alphabetical ties are rare)

**Alternative 2: PostgreSQL Generated Column for Name**
- **Rejected**: Cannot reference other tables in generated columns
- **Rejected**: Would require triggers to maintain, increasing complexity

**Alternative 3: Database View with Pre-Joined Names**
- **Considered**: Could work for read-only ranking queries
- **Rejected**: Adds complexity; application-level sort is simpler
- **Future Enhancement**: May revisit if alphabetical tiebreaker becomes performance bottleneck

**Alternative 4: Store Composite Tiebreaker Score**
- **Rejected**: Complex to calculate and maintain as single numeric value
- **Rejected**: Loses semantic meaning of individual tiebreaker components
- **Rejected**: Harder to debug and explain to users

### Test Cases

```javascript
describe('Ranking Tiebreakers', () => {
  test('Players sorted by points descending', async () => {
    // Create ranking entries with different points
    const rankings = await recalculateRankings(rankingId);
    expect(rankings[0].totalPoints).toBeGreaterThan(rankings[1].totalPoints);
  });

  test('Identical points: most recent tournament wins', async () => {
    // Two players with 50 points, one played yesterday, one last month
    const entries = await prisma.rankingEntry.findMany({
      where: { rankingId, totalPoints: 50 },
      orderBy: [{ lastTournamentDate: 'desc' }]
    });
    expect(entries[0].lastTournamentDate).toBeAfter(entries[1].lastTournamentDate);
  });

  test('Identical points and date: fewest tournaments wins', async () => {
    // Two players with 50 points, same last tournament date
    const entries = await prisma.rankingEntry.findMany({
      where: {
        rankingId,
        totalPoints: 50,
        lastTournamentDate: specificDate
      },
      orderBy: [{ tournamentCount: 'asc' }]
    });
    expect(entries[0].tournamentCount).toBeLessThan(entries[1].tournamentCount);
  });

  test('All tiebreakers equal: alphabetical order', async () => {
    // Create entries with identical points, date, and tournament count
    const rankings = await recalculateRankings(rankingId);
    const tiedEntries = rankings.filter(r =>
      r.totalPoints === 50 &&
      r.tournamentCount === 3 &&
      r.lastTournamentDate.getTime() === specificDate.getTime()
    );
    expect(tiedEntries[0].name).toBeLessThan(tiedEntries[1].name); // Alphabetical
  });
});
```

---

## 3. Annual Rollover Strategy

### Research Question
How to archive previous year rankings while resetting current year (soft delete vs. year partitioning vs. archive table)?

### Decision: Soft Delete with `year` Column (Deferred Partitioning)

**Schema Design**:
```prisma
model Ranking {
  id                      String             @id @default(uuid())
  categoryId              String
  year                    Int                // Calendar year (e.g., 2025)
  type                    RankingType        // PAIR, MEN, WOMEN, SINGLES
  countedTournamentsLimit Int                @default(7) // For seeding score calculation
  isArchived              Boolean            @default(false) // Soft delete flag

  createdAt               DateTime           @default(now())
  updatedAt               DateTime           @updatedAt

  // Relationships
  category                Category           @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  entries                 RankingEntry[]

  // Unique constraint: one ranking per category+year+type
  @@unique([categoryId, year, type])
  @@index([year, isArchived]) // Fast queries for current/archived years
  @@index([categoryId, year, type, isArchived]) // Fast category ranking lookup
}

model RankingEntry {
  // ... (fields from section 2)

  @@index([rankingId, totalPoints, lastTournamentDate, tournamentCount])
}

model TournamentResult {
  id                String    @id @default(uuid())
  rankingId         String    // FK to Ranking (includes year context)
  tournamentId      String    // FK to Tournament
  entityId          String    // PlayerProfile.id or DoublesPair.id
  entityType        RankingEntityType // PLAYER or PAIR

  placement         Int?      // Final placement (for PLACEMENT method)
  finalRoundReached String?   // Round name (for FINAL_ROUND method)
  isConsolation     Boolean   @default(false)
  pointsAwarded     Float     // Points earned in this tournament
  awardDate         DateTime  @default(now()) // When points were awarded

  createdAt         DateTime  @default(now())

  // Relationships
  ranking           Ranking   @relation(fields: [rankingId], references: [id], onDelete: Cascade)
  tournament        Tournament @relation(fields: [tournamentId], references: [id], onDelete: Restrict)

  // Constraints
  @@unique([rankingId, tournamentId, entityId, entityType])
  @@index([rankingId, entityId, entityType]) // Fast lookup of entity's tournament results
  @@index([tournamentId]) // Fast lookup of all results for a tournament
  @@index([awardDate]) // For year rollover queries
}

enum RankingType {
  SINGLES  // For singles categories
  PAIR     // For doubles categories - pair ranking
  MEN      // For doubles categories - men's individual ranking
  WOMEN    // For doubles categories - women's individual ranking
}

enum RankingEntityType {
  PLAYER   // References PlayerProfile
  PAIR     // References DoublesPair
}
```

**Annual Rollover Service**:
```javascript
// yearRolloverService.js

/**
 * Archive previous year rankings and create new year rankings
 * Called automatically on January 1st or manually by admin
 */
export async function executeYearRollover(yearToArchive = null) {
  const currentYear = new Date().getFullYear();
  const archiveYear = yearToArchive || currentYear - 1;

  console.log(`Starting year rollover: archiving ${archiveYear}, creating ${currentYear}`);

  // Step 1: Mark all rankings from archive year as archived
  const archivedCount = await prisma.ranking.updateMany({
    where: {
      year: archiveYear,
      isArchived: false
    },
    data: {
      isArchived: true
    }
  });

  console.log(`Archived ${archivedCount.count} rankings from ${archiveYear}`);

  // Step 2: Create new rankings for current year
  // Get all unique category+type combinations from previous year
  const previousRankings = await prisma.ranking.findMany({
    where: { year: archiveYear },
    select: {
      categoryId: true,
      type: true,
      countedTournamentsLimit: true
    },
    distinct: ['categoryId', 'type']
  });

  const newRankings = [];
  for (const prevRanking of previousRankings) {
    // Check if current year ranking already exists
    const existing = await prisma.ranking.findUnique({
      where: {
        categoryId_year_type: {
          categoryId: prevRanking.categoryId,
          year: currentYear,
          type: prevRanking.type
        }
      }
    });

    if (!existing) {
      const newRanking = await prisma.ranking.create({
        data: {
          categoryId: prevRanking.categoryId,
          year: currentYear,
          type: prevRanking.type,
          countedTournamentsLimit: prevRanking.countedTournamentsLimit, // Carry over limit
          isArchived: false
        }
      });
      newRankings.push(newRanking);
    }
  }

  console.log(`Created ${newRankings.length} new rankings for ${currentYear}`);

  return {
    archivedYear: archiveYear,
    archivedCount: archivedCount.count,
    currentYear,
    newRankingsCount: newRankings.length
  };
}

/**
 * Get archived rankings for a specific year
 */
export async function getArchivedRankings(categoryId, year) {
  return await prisma.ranking.findMany({
    where: {
      categoryId,
      year,
      isArchived: true
    },
    include: {
      entries: {
        orderBy: { rank: 'asc' }
      }
    }
  });
}

/**
 * Delete archived rankings older than retention period
 * @param {number} retentionYears - How many years to keep (default: 5)
 */
export async function purgeOldArchives(retentionYears = 5) {
  const currentYear = new Date().getFullYear();
  const cutoffYear = currentYear - retentionYears;

  const deleteResult = await prisma.ranking.deleteMany({
    where: {
      year: { lt: cutoffYear },
      isArchived: true
    }
  });

  console.log(`Purged ${deleteResult.count} archived rankings older than ${cutoffYear}`);

  return deleteResult.count;
}
```

### Rationale

**Why Soft Delete with `year` Column**:
1. **Simplicity**: No complex partition management or separate tables
2. **Query Flexibility**: Easy to query current year: `WHERE year = 2025 AND isArchived = false`
3. **Historical Access**: Previous years accessible: `WHERE year = 2024 AND isArchived = true`
4. **Data Integrity**: Foreign key relationships preserved across years
5. **Migration Path**: Can migrate to partitioning later without schema changes
6. **Prisma Compatible**: Prisma has limited support for table partitioning (manual SQL required)

**Why Deferred Partitioning**:
- PostgreSQL partitioning is powerful but adds complexity
- Prisma doesn't natively support declarative partitioning (requires raw SQL)
- Current scale (1000 players × 10 categories × 5 years = 50,000 ranking entries) doesn't justify partitioning overhead
- Future enhancement: If database grows to millions of entries, migrate to range partitioning by year

**Query Performance**:
- `@@index([categoryId, year, type, isArchived])` enables fast current ranking lookups
- `@@index([year, isArchived])` supports year-based queries and rollover operations
- Expected query time: < 10ms for single category ranking retrieval (with index)

### Implementation Notes

**Automatic Rollover Trigger** (Future Enhancement):
```javascript
// Option 1: Cron job (e.g., node-cron)
import cron from 'node-cron';

// Run at midnight on January 1st every year
cron.schedule('0 0 1 1 *', async () => {
  console.log('Executing annual ranking rollover...');
  await executeYearRollover();
});

// Option 2: Manual admin endpoint
// POST /api/v1/admin/rankings/year-rollover
// Body: { yearToArchive: 2024 }
```

**Rollback Support**:
```javascript
export async function rollbackYearRollover(year) {
  // Un-archive the specified year
  await prisma.ranking.updateMany({
    where: { year, isArchived: true },
    data: { isArchived: false }
  });

  // Delete the next year's empty rankings
  await prisma.ranking.deleteMany({
    where: {
      year: year + 1,
      entries: { none: {} } // Only delete if no entries yet
    }
  });
}
```

### Alternatives Considered

**Alternative 1: PostgreSQL Table Partitioning (Range by Year)**
```sql
-- Example (would require raw SQL, not Prisma schema)
CREATE TABLE ranking_entries (
  id UUID PRIMARY KEY,
  ranking_id UUID,
  year INT,
  -- ... other columns
) PARTITION BY RANGE (year);

CREATE TABLE ranking_entries_2024 PARTITION OF ranking_entries
  FOR VALUES FROM (2024) TO (2025);

CREATE TABLE ranking_entries_2025 PARTITION OF ranking_entries
  FOR VALUES FROM (2025) TO (2026);
```

**Rejected Reasons**:
- Prisma doesn't support declarative partitioning in schema.prisma
- Requires manual SQL migrations for each new year
- Adds operational complexity (partition management)
- Overkill for current scale (< 100K entries expected)
- **Future Consideration**: Revisit if dataset exceeds 1 million ranking entries

**Alternative 2: Separate Archive Table**
```prisma
model Ranking { /* current year only */ }
model ArchivedRanking { /* previous years */ }
```

**Rejected Reasons**:
- Schema duplication (DRY violation)
- Requires data migration on rollover (move records between tables)
- Complicates queries spanning multiple years
- More complex than soft delete approach

**Alternative 3: Rolling 12-Month Window (No Annual Reset)**
```prisma
model RankingEntry {
  // ... existing fields
  // Points expire 365 days after tournament
}
```

**Rejected Reasons**:
- Violates spec requirement for calendar year basis (FR-002)
- More complex to query "current standings"
- Doesn't align with typical sports season patterns

### Test Cases

```javascript
describe('Annual Year Rollover', () => {
  test('Archives previous year rankings', async () => {
    const result = await executeYearRollover(2024);
    expect(result.archivedCount).toBeGreaterThan(0);

    const archivedRankings = await prisma.ranking.count({
      where: { year: 2024, isArchived: true }
    });
    expect(archivedRankings).toBe(result.archivedCount);
  });

  test('Creates new year rankings for all categories', async () => {
    const result = await executeYearRollover(2024);
    const currentRankings = await prisma.ranking.count({
      where: { year: 2025, isArchived: false }
    });
    expect(currentRankings).toBe(result.newRankingsCount);
  });

  test('Archived rankings remain queryable', async () => {
    await executeYearRollover(2024);
    const archived = await getArchivedRankings(categoryId, 2024);
    expect(archived.length).toBeGreaterThan(0);
    expect(archived[0].year).toBe(2024);
    expect(archived[0].isArchived).toBe(true);
  });

  test('Purges archives older than retention period', async () => {
    const purgedCount = await purgeOldArchives(5); // Keep last 5 years
    const oldRankings = await prisma.ranking.count({
      where: { year: { lt: 2020 }, isArchived: true }
    });
    expect(oldRankings).toBe(0);
  });
});
```

---

## 4. Seeding Score Optimization

### Research Question
How to efficiently select top N tournaments from player's history when N < total tournaments for seeding score calculation?

### Decision: Prisma Subquery with `ORDER BY points DESC LIMIT N`

**Schema Design**:
```prisma
model TournamentResult {
  id                String    @id @default(uuid())
  rankingId         String    // FK to Ranking (includes year context)
  tournamentId      String    // FK to Tournament
  entityId          String    // PlayerProfile.id or DoublesPair.id
  entityType        RankingEntityType // PLAYER or PAIR

  pointsAwarded     Float     // Points earned in this tournament
  awardDate         DateTime  @default(now())

  // ... other fields

  @@index([rankingId, entityId, entityType, pointsAwarded]) // Seeding score index
}
```

**Seeding Score Calculation**:
```javascript
// seedingService.js

/**
 * Calculate seeding score for entity (player or pair) in a category
 * Seeding score = sum of top N tournament results
 *
 * @param {string} categoryId - Category ID
 * @param {string} entityId - PlayerProfile.id or DoublesPair.id
 * @param {string} entityType - 'PLAYER' or 'PAIR'
 * @param {number} year - Calendar year (default: current year)
 * @returns {Promise<number>} Seeding score
 */
export async function calculateSeedingScore(categoryId, entityId, entityType, year = null) {
  const currentYear = year || new Date().getFullYear();

  // Get ranking configuration (contains countedTournamentsLimit)
  const ranking = await prisma.ranking.findUnique({
    where: {
      categoryId_year_type: {
        categoryId,
        year: currentYear,
        type: getRankingTypeForEntity(categoryId, entityType)
      }
    }
  });

  if (!ranking) {
    // No ranking exists for this year yet (before first tournament)
    return 0;
  }

  const topN = ranking.countedTournamentsLimit; // Default: 7

  // Get top N tournament results for this entity
  const topTournaments = await prisma.tournamentResult.findMany({
    where: {
      rankingId: ranking.id,
      entityId,
      entityType
    },
    orderBy: {
      pointsAwarded: 'desc' // Highest points first
    },
    take: topN, // Limit to top N results
    select: {
      pointsAwarded: true
    }
  });

  // Sum points from top N tournaments
  const seedingScore = topTournaments.reduce(
    (sum, result) => sum + result.pointsAwarded,
    0
  );

  return seedingScore;
}

/**
 * Bulk calculate seeding scores for tournament registration
 * Used when generating brackets/seeding order
 *
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Array>} Array of { entityId, entityType, seedingScore }
 */
export async function bulkCalculateSeedingScores(tournamentId) {
  // Get tournament details
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      categoryId: true,
      endDate: true,
      category: {
        select: { type: true }
      }
    }
  });

  const year = tournament.endDate.getFullYear();
  const isDoubles = tournament.category.type === 'DOUBLES';

  // Get all registrations for this tournament
  const registrations = isDoubles
    ? await prisma.pairRegistration.findMany({
        where: { tournamentId, status: 'REGISTERED' },
        select: { pairId: true }
      })
    : await prisma.tournamentRegistration.findMany({
        where: { tournamentId, status: 'REGISTERED' },
        select: { playerId: true }
      });

  // Calculate seeding scores for all participants
  const seedingScores = await Promise.all(
    registrations.map(async (reg) => {
      const entityId = isDoubles ? reg.pairId : reg.playerId;
      const entityType = isDoubles ? 'PAIR' : 'PLAYER';

      const score = await calculateSeedingScore(
        tournament.categoryId,
        entityId,
        entityType,
        year
      );

      return { entityId, entityType, seedingScore: score };
    })
  );

  // Sort by seeding score descending (highest seeded first)
  seedingScores.sort((a, b) => b.seedingScore - a.seedingScore);

  return seedingScores;
}

/**
 * Helper: Determine ranking type based on entity type and category
 */
function getRankingTypeForEntity(categoryId, entityType) {
  // For PLAYER entity in doubles category, need to determine gender
  // For PAIR entity, return 'PAIR'
  // For PLAYER entity in singles category, return 'SINGLES'

  if (entityType === 'PAIR') {
    return 'PAIR';
  }

  // Query category to determine if singles or doubles
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { type: true }
  });

  if (category.type === 'SINGLES') {
    return 'SINGLES';
  }

  // For doubles, need player's gender to determine MEN or WOMEN ranking
  // This is handled when creating individual rankings (FR-024)
  // For now, assume caller provides correct ranking type
  throw new Error('Individual player seeding in doubles requires gender context');
}
```

### Rationale

**Why Prisma Subquery with LIMIT**:
1. **Database Efficiency**: `LIMIT N` prevents fetching unnecessary data
2. **Index Utilization**: `@@index([rankingId, entityId, entityType, pointsAwarded])` enables index-only scan
3. **Simplicity**: No need for complex window functions or subqueries
4. **Prisma Support**: `take` parameter maps directly to SQL `LIMIT`

**Performance Characteristics**:
- **Query Complexity**: O(log N + K) where N = total results, K = limit (index seek + limit scan)
- **Network Transfer**: Minimal (only top N results transferred)
- **Expected Time**: < 100ms for player with 50+ tournament results, fetching top 7

**Edge Case Handling**:

```javascript
// Edge case: Player has fewer than N tournaments
// Example: Player has 3 tournaments, limit is 7
const topTournaments = await prisma.tournamentResult.findMany({
  where: { rankingId, entityId, entityType },
  orderBy: { pointsAwarded: 'desc' },
  take: 7 // Will return only 3 results
});
// seedingScore = sum of all 3 tournaments

// Edge case: Multiple tournaments with same points (tied for Nth place)
// Spec clarifies: Only earliest tournament by end date is included
const topTournaments = await prisma.tournamentResult.findMany({
  where: { rankingId, entityId, entityType },
  orderBy: [
    { pointsAwarded: 'desc' },  // Primary: highest points
    { awardDate: 'asc' }        // Tiebreaker: earliest tournament
  ],
  take: topN
});
```

### Implementation Notes

**Caching Strategy** (Future Optimization):
```javascript
// Cache seeding scores for duration of tournament registration
// Invalidate on tournament result changes

const CACHE_TTL = 3600; // 1 hour in seconds

export async function getCachedSeedingScore(categoryId, entityId, entityType, year) {
  const cacheKey = `seeding:${categoryId}:${entityId}:${entityType}:${year}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return parseFloat(cached);
  }

  // Calculate and cache
  const score = await calculateSeedingScore(categoryId, entityId, entityType, year);
  await redis.setex(cacheKey, CACHE_TTL, score.toString());

  return score;
}

// Invalidate cache when tournament completes
export async function invalidateSeedingScoreCache(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { categoryId: true }
  });

  // Delete all seeding scores for this category
  await redis.del(`seeding:${tournament.categoryId}:*`);
}
```

### Alternatives Considered

**Alternative 1: PostgreSQL Window Function**
```sql
WITH ranked_results AS (
  SELECT
    entity_id,
    points_awarded,
    ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY points_awarded DESC) as rank
  FROM tournament_results
  WHERE ranking_id = $1
)
SELECT entity_id, SUM(points_awarded) as seeding_score
FROM ranked_results
WHERE rank <= $2
GROUP BY entity_id;
```

**Rejected Reasons**:
- More complex than simple `ORDER BY + LIMIT`
- Prisma doesn't support window functions in query builder (requires raw SQL)
- No performance benefit over indexed `LIMIT` query for single entity lookup
- **Future Consideration**: May be useful for bulk seeding score calculation (all players at once)

**Alternative 2: Pre-calculated Seeding Score Column**
```prisma
model RankingEntry {
  // ... existing fields
  seedingScore Float @default(0) // Pre-calculated
}
```

**Rejected Reasons**:
- Seeding score depends on `countedTournamentsLimit` which can change
- Requires recalculation on every tournament result (overhead)
- Stale data if limit changes and scores aren't recalculated
- **Chosen Approach**: Calculate on-demand, cache if needed

**Alternative 3: In-Memory Calculation (Fetch All, Sort in JavaScript)**
```javascript
const allResults = await prisma.tournamentResult.findMany({
  where: { rankingId, entityId, entityType }
});
allResults.sort((a, b) => b.pointsAwarded - a.pointsAwarded);
const topN = allResults.slice(0, countedTournamentsLimit);
const seedingScore = topN.reduce((sum, r) => sum + r.pointsAwarded, 0);
```

**Rejected Reasons**:
- Transfers more data than necessary (all results, not just top N)
- Inefficient for players with 50+ tournament history
- Database can sort faster using indexes
- No benefit over database `LIMIT`

### Test Cases

```javascript
describe('Seeding Score Calculation', () => {
  test('Player with 10 tournaments, limit 7: uses top 7', async () => {
    // Create 10 tournament results with varying points
    const results = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
    for (const points of results) {
      await createTournamentResult(rankingId, playerId, points);
    }

    const score = await calculateSeedingScore(categoryId, playerId, 'PLAYER', 2025);
    const expectedScore = 100 + 90 + 80 + 70 + 60 + 50 + 40; // Top 7
    expect(score).toBe(expectedScore);
  });

  test('Player with 3 tournaments, limit 7: uses all 3', async () => {
    const results = [100, 80, 60];
    for (const points of results) {
      await createTournamentResult(rankingId, playerId, points);
    }

    const score = await calculateSeedingScore(categoryId, playerId, 'PLAYER', 2025);
    expect(score).toBe(240); // Sum of all 3
  });

  test('Tied points: earliest tournament by date is selected', async () => {
    // Create 8 tournaments, 7th and 8th both have 40 points
    await createTournamentResult(rankingId, playerId, 100, new Date('2025-01-01'));
    await createTournamentResult(rankingId, playerId, 90, new Date('2025-02-01'));
    await createTournamentResult(rankingId, playerId, 80, new Date('2025-03-01'));
    await createTournamentResult(rankingId, playerId, 70, new Date('2025-04-01'));
    await createTournamentResult(rankingId, playerId, 60, new Date('2025-05-01'));
    await createTournamentResult(rankingId, playerId, 50, new Date('2025-06-01'));
    await createTournamentResult(rankingId, playerId, 40, new Date('2025-07-01')); // Earlier
    await createTournamentResult(rankingId, playerId, 40, new Date('2025-08-01')); // Later - excluded

    const topResults = await prisma.tournamentResult.findMany({
      where: { rankingId, entityId: playerId, entityType: 'PLAYER' },
      orderBy: [
        { pointsAwarded: 'desc' },
        { awardDate: 'asc' }
      ],
      take: 7
    });

    expect(topResults).toHaveLength(7);
    expect(topResults[6].awardDate).toEqual(new Date('2025-07-01')); // Earlier tied tournament
  });

  test('Player with no tournaments: seeding score is 0', async () => {
    const score = await calculateSeedingScore(categoryId, newPlayerId, 'PLAYER', 2025);
    expect(score).toBe(0);
  });

  test('Bulk calculation for tournament registration', async () => {
    const seedingScores = await bulkCalculateSeedingScores(tournamentId);
    expect(seedingScores).toHaveLength(16); // 16 registered players
    expect(seedingScores[0].seedingScore).toBeGreaterThan(seedingScores[1].seedingScore); // Sorted descending
  });
});
```

---

## 5. Multiple Rankings Per Category

### Research Question
How to manage pair + individual rankings in doubles categories (shared vs. separate tables, denormalization)?

### Decision: Shared `Ranking` Table with `type` Enum

**Schema Design** (from Section 3):
```prisma
model Ranking {
  id                      String             @id @default(uuid())
  categoryId              String
  year                    Int
  type                    RankingType        // PAIR, MEN, WOMEN, SINGLES
  countedTournamentsLimit Int                @default(7)
  isArchived              Boolean            @default(false)

  // Relationships
  category                Category           @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  entries                 RankingEntry[]

  @@unique([categoryId, year, type])
  @@index([categoryId, year, type, isArchived])
}

model RankingEntry {
  id                   String              @id @default(uuid())
  rankingId            String
  entityId             String              // PlayerProfile.id or DoublesPair.id
  entityType           RankingEntityType   // PLAYER or PAIR

  rank                 Int
  totalPoints          Float               @default(0)
  tournamentCount      Int                 @default(0)
  lastTournamentDate   DateTime?

  // Relationships
  ranking              Ranking             @relation(fields: [rankingId], references: [id], onDelete: Cascade)

  @@unique([rankingId, entityId, entityType])
  @@index([rankingId, totalPoints, lastTournamentDate, tournamentCount])
}

enum RankingType {
  SINGLES  // Singles categories have 1 ranking
  PAIR     // Doubles pair ranking
  MEN      // Doubles men's individual ranking
  WOMEN    // Doubles women's individual ranking
}

enum RankingEntityType {
  PLAYER   // Entry references PlayerProfile
  PAIR     // Entry references DoublesPair
}
```

**Automatic Ranking Creation**:
```javascript
// rankingService.js

/**
 * Create rankings for a new category
 * Automatically creates multiple rankings for doubles categories
 *
 * @param {string} categoryId - Category ID
 * @param {number} year - Calendar year
 * @returns {Promise<Array>} Created rankings
 */
export async function createCategoryRankings(categoryId, year = null) {
  const currentYear = year || new Date().getFullYear();

  // Get category details
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { type: true, gender: true }
  });

  if (!category) {
    throw new Error('Category not found');
  }

  const rankingTypes = getRankingTypesForCategory(category.type, category.gender);

  const createdRankings = [];
  for (const type of rankingTypes) {
    // Check if ranking already exists
    const existing = await prisma.ranking.findUnique({
      where: {
        categoryId_year_type: {
          categoryId,
          year: currentYear,
          type
        }
      }
    });

    if (!existing) {
      const ranking = await prisma.ranking.create({
        data: {
          categoryId,
          year: currentYear,
          type,
          countedTournamentsLimit: 7, // Default
          isArchived: false
        }
      });
      createdRankings.push(ranking);
    }
  }

  return createdRankings;
}

/**
 * Determine which ranking types are needed for a category
 *
 * @param {string} categoryType - 'SINGLES' or 'DOUBLES'
 * @param {string} categoryGender - 'MEN', 'WOMEN', or 'MIXED'
 * @returns {Array<string>} Array of RankingType values
 */
function getRankingTypesForCategory(categoryType, categoryGender) {
  if (categoryType === 'SINGLES') {
    // Singles categories have only one ranking
    return ['SINGLES'];
  }

  // Doubles categories have multiple rankings
  if (categoryGender === 'MIXED') {
    // FR-024-1: Mixed doubles has 3 rankings
    return ['PAIR', 'MEN', 'WOMEN'];
  } else if (categoryGender === 'MEN') {
    // FR-024-2: Men's doubles has 2 rankings
    return ['PAIR', 'MEN'];
  } else if (categoryGender === 'WOMEN') {
    // FR-024-3: Women's doubles has 2 rankings
    return ['PAIR', 'WOMEN'];
  }

  throw new Error(`Unknown category gender: ${categoryGender}`);
}
```

**Point Award Distribution** (Doubles Tournament):
```javascript
// pointCalculationService.js

/**
 * Award points from completed doubles tournament
 * Updates pair ranking AND both individual player rankings
 *
 * @param {string} tournamentId - Completed tournament ID
 */
export async function awardPointsDoublesTournament(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      category: {
        select: { id: true, type: true, gender: true }
      },
      pairRegistrations: {
        where: { status: 'REGISTERED' },
        include: {
          pair: {
            include: {
              player1: { select: { id: true, gender: true } },
              player2: { select: { id: true, gender: true } }
            }
          }
        }
      }
    }
  });

  if (tournament.category.type !== 'DOUBLES') {
    throw new Error('Tournament is not a doubles tournament');
  }

  const year = tournament.endDate.getFullYear();

  // Get or create rankings for this category+year
  const pairRanking = await getOrCreateRanking(tournament.category.id, year, 'PAIR');
  const menRanking = await getOrCreateRanking(tournament.category.id, year, 'MEN');
  const womenRanking = tournament.category.gender === 'MIXED'
    ? await getOrCreateRanking(tournament.category.id, year, 'WOMEN')
    : null;

  // Calculate points for each pair based on placement/round
  const results = await calculateTournamentPoints(tournamentId);

  for (const result of results) {
    const { pairId, pointsAwarded, placement, finalRoundReached } = result;

    // Get pair details
    const pair = tournament.pairRegistrations.find(pr => pr.pairId === pairId).pair;

    // 1. Award points to pair ranking
    await createTournamentResult({
      rankingId: pairRanking.id,
      tournamentId,
      entityId: pairId,
      entityType: 'PAIR',
      placement,
      finalRoundReached,
      pointsAwarded
    });

    // 2. Award points to player1 individual ranking
    const player1Gender = pair.player1.gender;
    const player1RankingId = player1Gender === 'MEN' ? menRanking.id : womenRanking.id;
    await createTournamentResult({
      rankingId: player1RankingId,
      tournamentId,
      entityId: pair.player1.id,
      entityType: 'PLAYER',
      placement,
      finalRoundReached,
      pointsAwarded
    });

    // 3. Award points to player2 individual ranking
    const player2Gender = pair.player2.gender;
    const player2RankingId = player2Gender === 'MEN' ? menRanking.id : womenRanking.id;
    await createTournamentResult({
      rankingId: player2RankingId,
      tournamentId,
      entityId: pair.player2.id,
      entityType: 'PLAYER',
      placement,
      finalRoundReached,
      pointsAwarded
    });
  }

  // Recalculate all ranking entries
  await recalculateRankingEntries(pairRanking.id);
  await recalculateRankingEntries(menRanking.id);
  if (womenRanking) {
    await recalculateRankingEntries(womenRanking.id);
  }
}

/**
 * Create tournament result and update ranking entry
 */
async function createTournamentResult(data) {
  // Create the result record
  const result = await prisma.tournamentResult.create({ data });

  // Update or create ranking entry
  const entry = await prisma.rankingEntry.findUnique({
    where: {
      rankingId_entityId_entityType: {
        rankingId: data.rankingId,
        entityId: data.entityId,
        entityType: data.entityType
      }
    }
  });

  if (entry) {
    // Update existing entry
    await prisma.rankingEntry.update({
      where: { id: entry.id },
      data: {
        totalPoints: { increment: data.pointsAwarded },
        tournamentCount: { increment: 1 },
        lastTournamentDate: new Date() // Tournament end date
      }
    });
  } else {
    // Create new entry
    await prisma.rankingEntry.create({
      data: {
        rankingId: data.rankingId,
        entityId: data.entityId,
        entityType: data.entityType,
        rank: 0, // Will be recalculated
        totalPoints: data.pointsAwarded,
        tournamentCount: 1,
        lastTournamentDate: new Date()
      }
    });
  }

  return result;
}
```

### Rationale

**Why Shared Table with `type` Enum**:

1. **Schema Simplicity**: Single `Ranking` table instead of `PairRanking`, `MenRanking`, `WomenRanking` tables
2. **Code Reusability**: Same recalculation logic works for all ranking types
3. **Flexible Queries**: Easy to fetch all rankings for a category: `WHERE categoryId = X AND year = Y`
4. **Type Safety**: `RankingType` enum prevents invalid ranking types
5. **Polymorphic Entries**: `RankingEntry.entityType` distinguishes PLAYER vs. PAIR entries

**Why Separate `RankingEntry.entityType`**:
- Player entries reference `PlayerProfile` table
- Pair entries reference `DoublesPair` table
- Allows mixed entity types in same ranking (though not used currently)
- Enables future flexibility (e.g., team rankings)

**Data Integrity**:
```javascript
// Constraint: entityType must match ranking type
// Enforced in application layer (could use CHECK constraint in raw SQL)

async function validateRankingEntry(rankingId, entityId, entityType) {
  const ranking = await prisma.ranking.findUnique({
    where: { id: rankingId },
    select: { type: true }
  });

  if (ranking.type === 'PAIR' && entityType !== 'PAIR') {
    throw new Error('PAIR ranking requires PAIR entityType');
  }

  if ((ranking.type === 'MEN' || ranking.type === 'WOMEN' || ranking.type === 'SINGLES')
      && entityType !== 'PLAYER') {
    throw new Error(`${ranking.type} ranking requires PLAYER entityType`);
  }
}
```

### Implementation Notes

**Querying Specific Ranking Types**:
```javascript
// Get pair rankings for a doubles category
const pairRankings = await prisma.ranking.findUnique({
  where: {
    categoryId_year_type: {
      categoryId,
      year: 2025,
      type: 'PAIR'
    }
  },
  include: {
    entries: {
      where: { entityType: 'PAIR' },
      orderBy: { rank: 'asc' },
      include: {
        // Fetch pair details via entityId
      }
    }
  }
});

// Get men's individual rankings for mixed doubles category
const menRankings = await prisma.ranking.findUnique({
  where: {
    categoryId_year_type: {
      categoryId,
      year: 2025,
      type: 'MEN'
    }
  },
  include: {
    entries: {
      where: { entityType: 'PLAYER' },
      orderBy: { rank: 'asc' },
      include: {
        // Fetch player details via entityId
      }
    }
  }
});
```

**Displaying Multiple Rankings**:
```jsx
// Frontend: CategoryRankingsPage.jsx
function CategoryRankingsPage({ categoryId }) {
  const [activeTab, setActiveTab] = useState('pair'); // 'pair', 'men', 'women'
  const category = useCategoryDetails(categoryId);

  const rankingTypes = category.type === 'SINGLES'
    ? ['singles']
    : category.gender === 'MIXED'
      ? ['pair', 'men', 'women']
      : category.gender === 'MEN'
        ? ['pair', 'men']
        : ['pair', 'women'];

  return (
    <div>
      <Tabs activeKey={activeTab} onSelect={setActiveTab}>
        {rankingTypes.includes('pair') && (
          <Tab eventKey="pair" title="Pair Rankings">
            <RankingsTable rankingType="PAIR" categoryId={categoryId} />
          </Tab>
        )}
        {rankingTypes.includes('men') && (
          <Tab eventKey="men" title="Men's Individual">
            <RankingsTable rankingType="MEN" categoryId={categoryId} />
          </Tab>
        )}
        {rankingTypes.includes('women') && (
          <Tab eventKey="women" title="Women's Individual">
            <RankingsTable rankingType="WOMEN" categoryId={categoryId} />
          </Tab>
        )}
      </Tabs>
    </div>
  );
}
```

### Alternatives Considered

**Alternative 1: Separate Tables**
```prisma
model PairRanking { /* ... */ }
model IndividualRanking { /* ... */ }
```

**Rejected Reasons**:
- Schema duplication (DRY violation)
- Separate recalculation logic for each table
- Harder to query "all rankings for category"
- More complex migration when adding new ranking types

**Alternative 2: Single Table with Denormalized Pair/Player Data**
```prisma
model RankingEntry {
  pairId     String?
  playerId   String?
  // ... other fields
}
```

**Rejected Reasons**:
- Violates normalization (nullable FKs)
- Harder to enforce constraints (exactly one of pairId/playerId must be set)
- Complicates joins and queries
- `entityType` discriminator is cleaner

**Alternative 3: Generic `entityId` with Lookup Service**
```javascript
// Runtime lookup of entity details
const entity = await lookupEntity(entry.entityId, entry.entityType);
```

**Chosen Approach**: This is actually what we're using! See implementation above.

### Test Cases

```javascript
describe('Multiple Rankings Per Category', () => {
  test('Mixed doubles category creates 3 rankings', async () => {
    const rankings = await createCategoryRankings(mixedDoublesCategoryId, 2025);
    expect(rankings).toHaveLength(3);
    expect(rankings.map(r => r.type)).toEqual(
      expect.arrayContaining(['PAIR', 'MEN', 'WOMEN'])
    );
  });

  test('Men\'s doubles category creates 2 rankings', async () => {
    const rankings = await createCategoryRankings(menDoublesCategoryId, 2025);
    expect(rankings).toHaveLength(2);
    expect(rankings.map(r => r.type)).toEqual(
      expect.arrayContaining(['PAIR', 'MEN'])
    );
  });

  test('Singles category creates 1 ranking', async () => {
    const rankings = await createCategoryRankings(singlesCategoryId, 2025);
    expect(rankings).toHaveLength(1);
    expect(rankings[0].type).toBe('SINGLES');
  });

  test('Doubles tournament awards points to pair and both players', async () => {
    await awardPointsDoublesTournament(tournamentId);

    // Check pair ranking updated
    const pairEntry = await prisma.rankingEntry.findFirst({
      where: {
        ranking: { categoryId, year: 2025, type: 'PAIR' },
        entityId: pairId,
        entityType: 'PAIR'
      }
    });
    expect(pairEntry.totalPoints).toBeGreaterThan(0);

    // Check player1 ranking updated
    const player1Entry = await prisma.rankingEntry.findFirst({
      where: {
        ranking: { categoryId, year: 2025, type: 'MEN' },
        entityId: player1Id,
        entityType: 'PLAYER'
      }
    });
    expect(player1Entry.totalPoints).toEqual(pairEntry.totalPoints);

    // Check player2 ranking updated
    const player2Entry = await prisma.rankingEntry.findFirst({
      where: {
        ranking: { categoryId, year: 2025, type: 'WOMEN' },
        entityId: player2Id,
        entityType: 'PLAYER'
      }
    });
    expect(player2Entry.totalPoints).toEqual(pairEntry.totalPoints);
  });
});
```

---

## 6. Point Table Lookup Optimization

### Research Question
How to efficiently map participant count → point table (database lookup vs. in-memory cache vs. configuration file)?

### Decision: Database Storage with In-Memory Cache

**Schema Design**:
```prisma
model PointTable {
  id                String   @id @default(uuid())
  participantRange  String   // '2-4', '5-8', '9-16', '17-32'
  roundName         String   // 'Final', 'Semifinal', 'Quarterfinal', etc.
  isConsolation     Boolean  @default(false)
  points            Int      // Point value for this round

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([participantRange, roundName, isConsolation])
  @@index([participantRange]) // Fast range lookup
}
```

**In-Memory Cache Implementation**:
```javascript
// pointTableService.js

// In-memory cache for point tables
let pointTableCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Load all point tables into memory
 * Called on server startup and when cache expires
 */
async function loadPointTableCache() {
  const tables = await prisma.pointTable.findMany({
    orderBy: [
      { participantRange: 'asc' },
      { isConsolation: 'asc' },
      { roundName: 'asc' }
    ]
  });

  // Structure: { 'range:round:consolation': points }
  // Example: { '9-16:Quarterfinal:false': 10 }
  const cache = {};
  for (const table of tables) {
    const key = `${table.participantRange}:${table.roundName}:${table.isConsolation}`;
    cache[key] = table.points;
  }

  pointTableCache = cache;
  cacheTimestamp = Date.now();

  console.log(`Loaded ${tables.length} point table entries into cache`);

  return cache;
}

/**
 * Get point value from cache (with auto-refresh)
 *
 * @param {string} participantRange - '2-4', '5-8', '9-16', '17-32'
 * @param {string} roundName - Round name (e.g., 'Quarterfinal')
 * @param {boolean} isConsolation - Whether consolation bracket
 * @returns {Promise<number>} Point value
 */
export async function getPointValue(participantRange, roundName, isConsolation = false) {
  // Refresh cache if expired or not loaded
  if (!pointTableCache || (Date.now() - cacheTimestamp > CACHE_TTL)) {
    await loadPointTableCache();
  }

  const key = `${participantRange}:${roundName}:${isConsolation}`;
  const points = pointTableCache[key];

  if (points === undefined) {
    throw new Error(
      `No point table found for range=${participantRange}, round=${roundName}, consolation=${isConsolation}`
    );
  }

  return points;
}

/**
 * Update point table value (admin function)
 * Invalidates cache on update
 */
export async function updatePointTableValue(participantRange, roundName, isConsolation, newPoints) {
  const updated = await prisma.pointTable.update({
    where: {
      participantRange_roundName_isConsolation: {
        participantRange,
        roundName,
        isConsolation
      }
    },
    data: { points: newPoints }
  });

  // Invalidate cache to force reload
  pointTableCache = null;
  cacheTimestamp = null;

  return updated;
}

/**
 * Initialize server with point table cache
 * Call this on application startup
 */
export async function initializePointTableCache() {
  await loadPointTableCache();
}

/**
 * Get participant range for a given participant count
 *
 * @param {number} count - Number of participants
 * @returns {string} Range string ('2-4', '5-8', etc.)
 */
export function getParticipantRange(count) {
  if (count >= 2 && count <= 4) return '2-4';
  if (count >= 5 && count <= 8) return '5-8';
  if (count >= 9 && count <= 16) return '9-16';
  if (count >= 17 && count <= 32) return '17-32';
  throw new Error(`Participant count ${count} is outside supported range (2-32)`);
}
```

**Server Startup Integration**:
```javascript
// backend/src/server.js

import express from 'express';
import * as pointTableService from './services/pointTableService.js';

const app = express();

async function startServer() {
  // Initialize point table cache on startup
  await pointTableService.initializePointTableCache();
  console.log('Point table cache initialized');

  // Start HTTP server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
```

**Point Calculation Usage**:
```javascript
// pointCalculationService.js

import * as pointTableService from './pointTableService.js';

export async function calculateRoundPoints(
  participantCount,
  finalRoundReached,
  isConsolation = false,
  doublePoints = false
) {
  const range = pointTableService.getParticipantRange(participantCount);
  const basePoints = await pointTableService.getPointValue(range, finalRoundReached, isConsolation);
  const points = basePoints * (doublePoints ? 2 : 1);

  return points;
}
```

### Rationale

**Why Database Storage**:
1. **Admin Configurability**: Point tables can be edited via admin UI (FR-014)
2. **Audit Trail**: `updatedAt` tracks when point values changed
3. **Data Integrity**: Unique constraint prevents duplicate entries
4. **Migration-Friendly**: Seed script can populate default values
5. **Future-Proof**: Easy to add new participant ranges or rounds

**Why In-Memory Cache**:
1. **Performance**: Sub-millisecond lookup vs. ~10ms database query
2. **Reduced DB Load**: Point lookups happen for every tournament result calculation
3. **Small Dataset**: ~40 entries total (4 ranges × ~10 rounds × 2 bracket types)
4. **Cache Size**: < 10KB in memory (negligible overhead)
5. **Auto-Refresh**: Expires after 1 hour, ensuring eventual consistency

**Cache Invalidation Strategy**:
- **On Update**: Immediate invalidation when admin edits point table
- **On Read**: Auto-refresh if cache expired (1 hour TTL)
- **On Startup**: Load cache during server initialization
- **No Complex Invalidation**: Simple time-based expiration is sufficient

**Performance Characteristics**:
- **Cache Hit**: O(1) dictionary lookup, < 1ms
- **Cache Miss**: O(N) database query + O(N) cache rebuild where N ≈ 40 entries, ~50ms total
- **Expected Hit Rate**: > 99% (cache refreshes every hour, point lookups happen constantly)

### Implementation Notes

**Seed Script for Default Point Tables**:
```javascript
// backend/prisma/seed.js

async function seedPointTables() {
  console.log('Seeding point tables...');

  // Point table data from spec (notes/007-rankings.md)
  const pointTables = [
    // 2-4 participants
    { participantRange: '2-4', roundName: 'Final', isConsolation: false, points: 10 },
    { participantRange: '2-4', roundName: 'Semifinal', isConsolation: false, points: 7 },
    { participantRange: '2-4', roundName: 'Final', isConsolation: true, points: 5 },

    // 5-8 participants
    { participantRange: '5-8', roundName: 'Final', isConsolation: false, points: 13 },
    { participantRange: '5-8', roundName: 'Semifinal', isConsolation: false, points: 10 },
    { participantRange: '5-8', roundName: 'Quarterfinal', isConsolation: false, points: 7 },
    { participantRange: '5-8', roundName: 'Final', isConsolation: true, points: 5 },
    { participantRange: '5-8', roundName: 'Semifinal', isConsolation: true, points: 4 },

    // 9-16 participants
    { participantRange: '9-16', roundName: 'Final', isConsolation: false, points: 16 },
    { participantRange: '9-16', roundName: 'Semifinal', isConsolation: false, points: 13 },
    { participantRange: '9-16', roundName: 'Quarterfinal', isConsolation: false, points: 10 },
    { participantRange: '9-16', roundName: '1st round', isConsolation: false, points: 7 },
    { participantRange: '9-16', roundName: 'Final', isConsolation: true, points: 6 },
    { participantRange: '9-16', roundName: 'Semifinal', isConsolation: true, points: 5 },
    { participantRange: '9-16', roundName: 'Quarterfinal', isConsolation: true, points: 4 },

    // 17-32 participants
    { participantRange: '17-32', roundName: 'Final', isConsolation: false, points: 19 },
    { participantRange: '17-32', roundName: 'Semifinal', isConsolation: false, points: 16 },
    { participantRange: '17-32', roundName: 'Quarterfinal', isConsolation: false, points: 13 },
    { participantRange: '17-32', roundName: '2nd round', isConsolation: false, points: 10 },
    { participantRange: '17-32', roundName: '1st round', isConsolation: false, points: 7 },
    { participantRange: '17-32', roundName: 'Final', isConsolation: true, points: 6 },
    { participantRange: '17-32', roundName: 'Semifinal', isConsolation: true, points: 5 },
    { participantRange: '17-32', roundName: 'Quarterfinal', isConsolation: true, points: 4 },
    { participantRange: '17-32', roundName: '1st round', isConsolation: true, points: 3 },
  ];

  for (const table of pointTables) {
    await prisma.pointTable.upsert({
      where: {
        participantRange_roundName_isConsolation: {
          participantRange: table.participantRange,
          roundName: table.roundName,
          isConsolation: table.isConsolation
        }
      },
      update: { points: table.points },
      create: table
    });
  }

  console.log(`✅ Seeded ${pointTables.length} point table entries`);
}
```

### Alternatives Considered

**Alternative 1: Configuration File (JSON/YAML)**
```json
{
  "pointTables": {
    "2-4": {
      "Final": { "main": 10, "consolation": 5 },
      "Semifinal": { "main": 7 }
    }
  }
}
```

**Rejected Reasons**:
- Not admin-editable without server restart
- No audit trail for changes
- Harder to validate (schema enforcement)
- Requires file system access (deployment complexity)
- **Database approach is more flexible**

**Alternative 2: No Cache (Direct Database Queries)**
```javascript
export async function getPointValue(participantRange, roundName, isConsolation) {
  const table = await prisma.pointTable.findUnique({
    where: { participantRange_roundName_isConsolation: { participantRange, roundName, isConsolation } }
  });
  return table.points;
}
```

**Rejected Reasons**:
- 10-20ms latency per lookup vs. < 1ms with cache
- Unnecessary database load (point tables rarely change)
- Degrades performance when calculating points for 32-participant tournament (32 database queries)
- **Cache provides 10-20x speedup**

**Alternative 3: Redis Cache**
```javascript
const cached = await redis.get(`point:${range}:${round}:${consolation}`);
if (!cached) {
  const value = await prisma.pointTable.findUnique(...);
  await redis.set(`point:${range}:${round}:${consolation}`, value, 'EX', 3600);
}
```

**Rejected Reasons**:
- Adds external dependency (Redis server)
- Overkill for small dataset (< 10KB)
- In-memory cache is simpler and equally fast
- **In-memory approach is sufficient for this use case**

**Alternative 4: Hardcoded Constants**
```javascript
const POINT_TABLES = {
  '2-4': { Final: 10, Semifinal: 7, ConsolationFinal: 5 },
  // ...
};
```

**Rejected Reasons**:
- Not admin-configurable (violates FR-014)
- Requires code deployment to change point values
- No audit trail
- **Database approach enables admin UI**

### Test Cases

```javascript
describe('Point Table Lookup', () => {
  test('Cache loads on first access', async () => {
    const points = await pointTableService.getPointValue('9-16', 'Quarterfinal', false);
    expect(points).toBe(10); // Per spec
  });

  test('Cache hit on subsequent access', async () => {
    // First call: loads cache
    await pointTableService.getPointValue('9-16', 'Final', false);

    // Second call: uses cache (should be < 1ms)
    const start = Date.now();
    const points = await pointTableService.getPointValue('9-16', 'Final', false);
    const duration = Date.now() - start;

    expect(points).toBe(16);
    expect(duration).toBeLessThan(5); // Sub-millisecond cache hit
  });

  test('Cache invalidates on point table update', async () => {
    await pointTableService.updatePointTableValue('9-16', 'Quarterfinal', false, 12);

    // Cache should be invalidated, next lookup reloads
    const points = await pointTableService.getPointValue('9-16', 'Quarterfinal', false);
    expect(points).toBe(12); // Updated value
  });

  test('Participant count maps to correct range', () => {
    expect(pointTableService.getParticipantRange(3)).toBe('2-4');
    expect(pointTableService.getParticipantRange(7)).toBe('5-8');
    expect(pointTableService.getParticipantRange(12)).toBe('9-16');
    expect(pointTableService.getParticipantRange(25)).toBe('17-32');
  });

  test('Invalid participant count throws error', () => {
    expect(() => pointTableService.getParticipantRange(1)).toThrow();
    expect(() => pointTableService.getParticipantRange(50)).toThrow();
  });

  test('Missing point table entry throws error', async () => {
    await expect(
      pointTableService.getPointValue('9-16', 'NonexistentRound', false)
    ).rejects.toThrow('No point table found');
  });
});
```

---

## Summary of Technical Decisions

| Research Area | Decision | Key Rationale |
|---------------|----------|---------------|
| **Point Calculation** | Hybrid: In-memory JS for placement, DB lookup for round-based | Simple formula doesn't need DB; round tables are admin-configurable |
| **Ranking Tiebreakers** | Composite index + app-level alphabetical sort | PostgreSQL index handles 3 levels; alphabetical ties are rare |
| **Annual Rollover** | Soft delete with `year` column | Simple, Prisma-compatible, future migration path to partitioning |
| **Seeding Score** | Prisma `ORDER BY + LIMIT N` | Index-optimized, simple query, sub-100ms performance |
| **Multiple Rankings** | Shared `Ranking` table with `type` enum | DRY, code reuse, flexible queries, type-safe |
| **Point Table Lookup** | Database storage with in-memory cache | Admin-editable, < 1ms lookup, auto-refresh, small dataset |

---

## Performance Benchmarks (Expected)

| Operation | Expected Performance | Rationale |
|-----------|---------------------|-----------|
| Calculate placement points | < 1ms | Simple integer arithmetic |
| Lookup round-based points | < 1ms (cache hit) | In-memory dictionary lookup |
| Recalculate ranking (100 entries) | < 500ms | O(N log N) sort + 100 database updates in transaction |
| Seeding score (player with 50 tournaments) | < 100ms | Indexed query: `ORDER BY points DESC LIMIT 7` |
| Annual rollover (1000 rankings) | < 5 seconds | Bulk update + create operations |
| Rankings page load (1000 players) | < 2 seconds | Indexed query with pagination |

---

## Migration and Deployment Notes

**Database Migration Order**:
1. Create `Ranking`, `RankingEntry`, `TournamentResult`, `PointTable` models
2. Add enums: `RankingType`, `RankingEntityType`
3. Run seed script to populate default point tables
4. (Optional) Backfill rankings from existing `CategoryRanking` and `PairRanking` tables

**Backward Compatibility**:
- Existing `CategoryRanking` and `PairRanking` tables can coexist during migration
- Gradual migration: deprecate old tables after new system is validated
- Data migration script to convert old rankings to new schema

**Monitoring and Alerts**:
- Track point calculation errors (invalid participant counts, missing point tables)
- Monitor ranking recalculation duration (should be < 1 second for most categories)
- Alert on cache miss rate (should be < 1% during normal operation)

---

## Open Questions and Future Enhancements

**Open Questions** (to be clarified in spec):
1. What happens to in-progress tournaments during year rollover? (Proposal: Award points to previous year)
2. Should archived rankings be read-only or can admin manually edit historical data?
3. Is there a maximum participant count beyond 32? (Proposal: Extend point tables dynamically)

**Future Enhancements** (out of scope for this feature):
1. **PostgreSQL Partitioning**: Migrate to table partitioning when dataset exceeds 1M entries
2. **Redis Caching**: Add Redis for seeding score cache if high-traffic tournaments (100+ concurrent registrations)
3. **Real-Time Updates**: WebSocket notifications when rankings change
4. **Historical Trending**: Charts showing player rank progression over multiple years
5. **Custom Point Formulas**: Allow admins to define custom point calculation formulas per category

---

## References

- **Specification**: [spec.md](spec.md)
- **Original Requirements**: [notes/007-rankings.md](../../notes/007-rankings.md)
- **Existing Schema**: `backend/prisma/schema.prisma`
- **Existing Services**: `backend/src/services/rankingService.js`, `backend/src/services/pairRankingService.js`
- **PostgreSQL Documentation**: [Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html), [Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- **Prisma Documentation**: [Composite Indexes](https://www.prisma.io/docs/concepts/components/prisma-schema/indexes), [Unique Constraints](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-a-unique-field)

---

**Document Status**: ✅ Complete - Ready for Phase 1 (Data Modeling and API Contracts)

**Next Steps**:
1. Review research decisions with stakeholders
2. Proceed to `data-model.md` generation (Phase 1)
3. Define API contracts in `contracts/` directory
4. Generate quickstart guide showing end-to-end workflow
