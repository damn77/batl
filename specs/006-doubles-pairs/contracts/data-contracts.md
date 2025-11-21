# Data Contracts: Doubles Pair Management

**Feature**: 006-doubles-pairs
**Date**: 2025-11-18

## Overview

This document defines the request and response data schemas for the doubles pair management API. All schemas are defined using TypeScript-style notation for clarity, but the actual implementation uses JavaScript with Prisma ORM types.

## Type Definitions

### Common Types

```typescript
type UUID = string; // UUID v4 format
type DateTime = string; // ISO 8601 format (e.g., "2025-11-18T10:30:00Z")

type RegistrationStatus = 'REGISTERED' | 'WAITLISTED' | 'WITHDRAWN' | 'CANCELLED';
type CategoryType = 'SINGLES' | 'DOUBLES';
type Gender = 'MEN' | 'WOMEN' | 'MIXED';
type AgeGroup = 'ALL_AGES' | 'AGE_20' | 'AGE_25' | 'AGE_30' | 'AGE_35' | 'AGE_40' | 'AGE_45' | 'AGE_50' | 'AGE_55' | 'AGE_60' | 'AGE_65' | 'AGE_70' | 'AGE_75' | 'AGE_80';
```

### Entity Schemas

#### PlayerSummary

Minimal player information for display in pair contexts.

```typescript
interface PlayerSummary {
  id: UUID;
  name: string;
}
```

#### PlayerWithRanking

Player information including their individual category ranking.

```typescript
interface PlayerWithRanking {
  id: UUID;
  name: string;
  birthDate?: DateTime; // Optional, for age display
  gender: Gender;
  categoryRanking: {
    points: number;
    rank: number;
    wins: number;
    losses: number;
  } | null; // null if no ranking exists yet
}
```

#### CategorySummary

Minimal category information.

```typescript
interface CategorySummary {
  id: UUID;
  name: string;
  type: CategoryType;
  ageGroup: AgeGroup;
  gender: Gender;
}
```

#### PairRankingSummary

Pair's competitive standing in a category.

```typescript
interface PairRankingSummary {
  points: number;
  rank: number;
  wins: number;
  losses: number;
  winRate?: number; // Calculated: wins / (wins + losses)
  lastUpdated: DateTime;
}
```

#### DoublesPair

Complete doubles pair entity.

```typescript
interface DoublesPair {
  id: UUID;
  player1Id: UUID;
  player2Id: UUID;
  categoryId: UUID;
  seedingScore: number;
  player1: PlayerWithRanking;
  player2: PlayerWithRanking;
  pairRanking: PairRankingSummary | null; // null if no matches played yet
  category?: CategorySummary; // Optional, included in detail views
  activeRegistrations?: TournamentRegistrationSummary[]; // Optional, included in detail views
  createdAt: DateTime;
  updatedAt: DateTime;
  deletedAt?: DateTime | null; // Only included when includeDeleted=true
}
```

#### DoublesPairSummary

Simplified pair for list views.

```typescript
interface DoublesPairSummary {
  id: UUID;
  player1: PlayerSummary;
  player2: PlayerSummary;
  categoryId: UUID;
  categoryName: string;
  seedingScore: number;
  pairRanking: {
    points: number;
    rank: number;
  } | null;
  createdAt: DateTime;
}
```

#### PairRegistration

Tournament registration for a doubles pair.

```typescript
interface PairRegistration {
  id: UUID;
  tournamentId: UUID;
  pairId: UUID;
  status: RegistrationStatus;
  registrationTimestamp: DateTime;
  eligibilityOverride: boolean;
  overrideReason: string | null;
  promotedAt: DateTime | null;
  demotedAt: DateTime | null;
  pair: DoublesPairSummary;
  tournament?: TournamentSummary; // Optional, included in detail views
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### TournamentRegistrationSummary

Minimal tournament registration info for display.

```typescript
interface TournamentRegistrationSummary {
  tournamentId: UUID;
  tournamentName: string;
  status: RegistrationStatus;
  startDate?: DateTime;
}
```

#### TournamentSummary

Minimal tournament information.

```typescript
interface TournamentSummary {
  id: UUID;
  name: string;
  categoryId: UUID;
  capacity: number | null;
  registeredCount: number;
  status: string;
  startDate: DateTime;
  endDate: DateTime;
}
```

#### TournamentHistory

Historical tournament participation for a pair.

```typescript
interface TournamentHistory {
  tournamentId: UUID;
  tournamentName: string;
  status: string; // Tournament status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
  registrationStatus: RegistrationStatus;
  placement: number | null; // Final placement (1 = champion, 2 = runner-up, etc.)
  pointsEarned: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  startDate: DateTime;
  endDate: DateTime;
}
```

## Request Schemas

### CreatePairRequest

```typescript
interface CreatePairRequest {
  player1Id: UUID; // Required
  player2Id: UUID; // Required (must be different from player1Id)
  categoryId: UUID; // Required (must be DOUBLES type category)
}
```

**Validation**:
- All fields required
- `player1Id !== player2Id`
- Both players must exist
- Category must exist and have `type = 'DOUBLES'`

### RegisterPairRequest

```typescript
interface RegisterPairRequest {
  tournamentId: UUID; // Required
  pairId: UUID; // Required
  eligibilityOverride?: boolean; // Optional, default: false
  overrideReason?: string | null; // Required if eligibilityOverride = true
}
```

**Validation**:
- `tournamentId` and `pairId` required
- Tournament must exist
- Pair must exist
- Tournament's category must be DOUBLES type
- If `eligibilityOverride = true`:
  - `overrideReason` must be non-null
  - User must have ORGANIZER or ADMIN role
- If `eligibilityOverride = false`:
  - Both players must meet category eligibility criteria

### ListPairsQuery

```typescript
interface ListPairsQuery {
  categoryId?: UUID; // Optional filter
  playerId?: UUID; // Optional filter (returns pairs containing this player)
  includeDeleted?: boolean; // Optional, default: false
  page?: number; // Optional, default: 1
  limit?: number; // Optional, default: 20, max: 100
}
```

### RankingsQuery

```typescript
interface RankingsQuery {
  page?: number; // Optional, default: 1
  limit?: number; // Optional, default: 50, max: 100
}
```

## Response Schemas

### CreatePairResponse

```typescript
interface CreatePairResponse {
  success: true;
  data: DoublesPair & {
    isNew: boolean; // true if newly created, false if existing pair returned
  };
}
```

### GetPairResponse

```typescript
interface GetPairResponse {
  success: true;
  data: DoublesPair;
}
```

### ListPairsResponse

```typescript
interface ListPairsResponse {
  success: true;
  data: {
    pairs: DoublesPairSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}
```

### RegisterPairResponse

```typescript
interface RegisterPairResponse {
  success: true;
  data: PairRegistration;
}
```

### WithdrawPairResponse

```typescript
interface WithdrawPairResponse {
  success: true;
  data: {
    id: UUID;
    status: 'WITHDRAWN';
    pairDeleted: boolean; // true if pair was soft-deleted due to lifecycle rules
    message: string;
  };
}
```

### PairRankingsResponse

```typescript
interface PairRankingsResponse {
  success: true;
  data: {
    category: CategorySummary;
    rankings: Array<{
      rank: number;
      pair: {
        id: UUID;
        player1: PlayerSummary;
        player2: PlayerSummary;
        seedingScore: number;
      };
      points: number;
      wins: number;
      losses: number;
      winRate: number;
      lastUpdated: DateTime;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}
```

### RecalculateSeedingResponse

```typescript
interface RecalculateSeedingResponse {
  success: true;
  data: {
    categoryId: UUID;
    pairsUpdated: number;
    message: string;
  };
}
```

### PairHistoryResponse

```typescript
interface PairHistoryResponse {
  success: true;
  data: {
    pairId: UUID;
    player1: PlayerSummary;
    player2: PlayerSummary;
    tournaments: TournamentHistory[];
  };
}
```

### ErrorResponse

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string; // Error code (see API endpoints doc for full list)
    message: string; // Human-readable error message
    details?: any; // Optional additional context
  };
}
```

## Validation Schemas

### Eligibility Check Result

Internal schema used during pair registration validation.

```typescript
interface EligibilityCheckResult {
  eligible: boolean;
  violations?: string[]; // Array of eligibility violation messages
  canOverride?: boolean; // true if user has override permission (ORGANIZER/ADMIN)
  warnings?: string[]; // Same as violations, shown to organizers before override
}
```

Example violation messages:
- `"Player 1 (John Doe) does not meet age requirement (must be 35+)"`
- `"Player 2 (Jane Smith) does not meet gender requirement (must be MEN)"`
- `"Player 1 (John Doe) is already registered with different partner"`

## Computed Fields

Several response fields are computed on-the-fly and not stored in the database:

### Win Rate

```typescript
winRate = wins / (wins + losses)
```

Returns `0` if `wins + losses === 0`.

### Seeding Score

Stored in `DoublesPair.seedingScore` but recalculated periodically:

```typescript
seedingScore = player1CategoryRanking.points + player2CategoryRanking.points
```

Returns `0` if either player has no ranking in the category.

### Registered Count

For tournaments:

```typescript
registeredCount = COUNT(PairRegistration WHERE tournamentId = X AND status IN ['REGISTERED', 'WAITLISTED'])
```

## Null Handling

Fields that can be null are explicitly marked in the schemas. Common null cases:

- `pairRanking`: null when pair has not played any matches yet
- `categoryRanking`: null when player has not competed in that category
- `overrideReason`: null when eligibilityOverride is false
- `placement`: null for tournaments that haven't completed or pairs that didn't place
- `capacity`: null for tournaments with unlimited capacity

## Data Transformations

### Player ID Ordering

When creating or looking up pairs, player IDs are always sorted before database operations:

```typescript
if (player1Id > player2Id) {
  [player1Id, player2Id] = [player2Id, player1Id];
}
```

This ensures consistent storage and eliminates duplicate pairs (A,B) vs (B,A).

### Timestamp Formatting

All timestamps are returned in ISO 8601 format with UTC timezone:

```typescript
createdAt: "2025-11-18T10:30:00.000Z"
```

### Pagination

Pagination follows standard offset-based pagination:

```typescript
const offset = (page - 1) * limit;
const total = await countQuery();
const pages = Math.ceil(total / limit);
const results = await query().skip(offset).take(limit);
```

## Example Workflows

### Complete Pair Registration Flow

1. **Check if pair exists**:
   ```
   GET /pairs?playerId=player1Id&categoryId=categoryId
   ```

2. **Create pair if doesn't exist**:
   ```
   POST /pairs
   {
     "player1Id": "uuid1",
     "player2Id": "uuid2",
     "categoryId": "uuid-category"
   }
   ```

3. **Register pair for tournament**:
   ```
   POST /registrations/pair
   {
     "tournamentId": "uuid-tournament",
     "pairId": "uuid-pair"
   }
   ```

### Organizer Override Flow

1. **Attempt normal registration** (will fail eligibility):
   ```
   POST /registrations/pair
   {
     "tournamentId": "uuid-tournament",
     "pairId": "uuid-pair"
   }
   ```
   Response: `400 INELIGIBLE_PAIR` with violation details

2. **Register with override**:
   ```
   POST /registrations/pair
   {
     "tournamentId": "uuid-tournament",
     "pairId": "uuid-pair",
     "eligibilityOverride": true,
     "overrideReason": "Approved exception for injury replacement"
   }
   ```
   Response: `201 Created` with eligibilityOverride=true

## References

- API endpoints: [api-endpoints.md](api-endpoints.md)
- Data model: [../data-model.md](../data-model.md)
- Feature specification: [../spec.md](../spec.md)
