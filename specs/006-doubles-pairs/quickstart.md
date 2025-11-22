# Quickstart Guide: Doubles Pair Management

**Feature**: 006-doubles-pairs
**Branch**: `006-doubles-pairs`
**Prerequisites**: Running BATL backend and frontend, authenticated user accounts

## Overview

This guide demonstrates the doubles pair management workflow from API perspective. Use these examples to understand the feature flow before implementing frontend components.

## Setup

All examples use `curl` with JSON responses. Replace `<SESSION_COOKIE>` with your authenticated session cookie.

**Base URL**: `http://localhost:3000/api/v1`

## Workflow 1: Player Registers Doubles Pair for Tournament

### Step 1: Check if Pair Already Exists

```bash
# List pairs containing a specific player in a category
curl -X GET "http://localhost:3000/api/v1/pairs?playerId=<PLAYER1_ID>&categoryId=<CATEGORY_ID>" \
  -H "Cookie: connect.sid=<SESSION_COOKIE>"
```

**Response** (if no pair exists):
```json
{
  "success": true,
  "data": {
    "pairs": [],
    "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 }
  }
}
```

### Step 2: Create Doubles Pair

```bash
# Create new pair (or get existing)
curl -X POST http://localhost:3000/api/v1/pairs \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<SESSION_COOKIE>" \
  -d '{
    "player1Id": "<PLAYER1_ID>",
    "player2Id": "<PLAYER2_ID>",
    "categoryId": "<CATEGORY_ID>"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-pair-123",
    "player1Id": "uuid-player-1",
    "player2Id": "uuid-player-2",
    "categoryId": "uuid-category",
    "seedingScore": 1500.0,
    "player1": {
      "id": "uuid-player-1",
      "name": "John Doe",
      "gender": "MEN",
      "categoryRanking": {
        "points": 800,
        "rank": 5,
        "wins": 12,
        "losses": 3
      }
    },
    "player2": {
      "id": "uuid-player-2",
      "name": "Jane Smith",
      "gender": "MEN",
      "categoryRanking": {
        "points": 700,
        "rank": 8,
        "wins": 10,
        "losses": 5
      }
    },
    "pairRanking": null,
    "isNew": true,
    "createdAt": "2025-11-18T10:00:00.000Z",
    "updatedAt": "2025-11-18T10:00:00.000Z"
  }
}
```

**Notes**:
- `seedingScore` = 800 + 700 = 1500 (sum of individual player rankings in this category)
- `pairRanking` is `null` because new pairs start with 0 points
- `isNew: true` indicates this is a newly created pair
- Player IDs are automatically sorted (lower ID first)

### Step 3: Check Eligibility for Tournament

```bash
# Optional: Check eligibility before registration
curl -X POST http://localhost:3000/api/v1/registrations/pair/check \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<SESSION_COOKIE>" \
  -d '{
    "tournamentId": "<TOURNAMENT_ID>",
    "pairId": "uuid-pair-123"
  }'
```

**Response** (eligible):
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "violations": []
  }
}
```

**Response** (ineligible):
```json
{
  "success": true,
  "data": {
    "eligible": false,
    "violations": [
      "Player 1 (John Doe) does not meet age requirement (must be 35+)",
      "Player 2 (Jane Smith) is already registered with different partner"
    ],
    "canOverride": false
  }
}
```

### Step 4: Register Pair for Tournament

```bash
curl -X POST http://localhost:3000/api/v1/registrations/pair \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<SESSION_COOKIE>" \
  -d '{
    "tournamentId": "<TOURNAMENT_ID>",
    "pairId": "uuid-pair-123"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-registration-456",
    "tournamentId": "uuid-tournament",
    "pairId": "uuid-pair-123",
    "status": "REGISTERED",
    "registrationTimestamp": "2025-11-18T10:05:00.000Z",
    "eligibilityOverride": false,
    "overrideReason": null,
    "pair": {
      "id": "uuid-pair-123",
      "player1": { "id": "uuid-player-1", "name": "John Doe" },
      "player2": { "id": "uuid-player-2", "name": "Jane Smith" },
      "categoryId": "uuid-category",
      "categoryName": "Men's Doubles Open",
      "seedingScore": 1500.0,
      "pairRanking": null
    },
    "createdAt": "2025-11-18T10:05:00.000Z"
  }
}
```

## Workflow 2: View Pair Rankings in Category

```bash
# Get pair rankings leaderboard for a category
curl -X GET "http://localhost:3000/api/v1/rankings/pairs/<CATEGORY_ID>?page=1&limit=10" \
  -H "Cookie: connect.sid=<SESSION_COOKIE>"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid-category",
      "name": "Men's Doubles Open",
      "type": "DOUBLES",
      "ageGroup": "ALL_AGES",
      "gender": "MEN"
    },
    "rankings": [
      {
        "rank": 1,
        "pair": {
          "id": "uuid-pair-top",
          "player1": { "id": "uuid-p1", "name": "Alice Williams" },
          "player2": { "id": "uuid-p2", "name": "Bob Johnson" },
          "seedingScore": 2200.0
        },
        "points": 1500,
        "wins": 25,
        "losses": 3,
        "winRate": 0.893,
        "lastUpdated": "2025-11-15T18:00:00.000Z"
      },
      {
        "rank": 2,
        "pair": {
          "id": "uuid-pair-123",
          "player1": { "id": "uuid-player-1", "name": "John Doe" },
          "player2": { "id": "uuid-player-2", "name": "Jane Smith" },
          "seedingScore": 1500.0
        },
        "points": 1200,
        "wins": 20,
        "losses": 5,
        "winRate": 0.800,
        "lastUpdated": "2025-11-16T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
  }
}
```

**Notes**:
- Rankings sorted by `points` (descending)
- `seedingScore` vs `points`: seeding uses player rankings, points earned by this specific pair
- `winRate` = wins / (wins + losses)

## Workflow 3: Withdraw Pair from Tournament

```bash
curl -X DELETE http://localhost:3000/api/v1/registrations/pair/<REGISTRATION_ID> \
  -H "Cookie: connect.sid=<SESSION_COOKIE>"
```

**Response** (pair has other registrations):
```json
{
  "success": true,
  "data": {
    "id": "uuid-registration-456",
    "status": "WITHDRAWN",
    "pairDeleted": false,
    "message": "Pair withdrawn from tournament successfully"
  }
}
```

**Response** (pair has no other registrations or history):
```json
{
  "success": true,
  "data": {
    "id": "uuid-registration-456",
    "status": "WITHDRAWN",
    "pairDeleted": true,
    "message": "Pair withdrawn and deleted (no active registrations or season history)"
  }
}
```

## Workflow 4: Organizer Override for Ineligible Pair

### Step 1: Attempt Normal Registration (will fail)

```bash
curl -X POST http://localhost:3000/api/v1/registrations/pair \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<ORGANIZER_SESSION>" \
  -d '{
    "tournamentId": "<TOURNAMENT_ID>",
    "pairId": "uuid-ineligible-pair"
  }'
```

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "INELIGIBLE_PAIR",
    "message": "Pair does not meet tournament eligibility requirements",
    "details": {
      "violations": [
        "Player 1 (John Junior) does not meet age requirement (must be 35+)"
      ]
    }
  }
}
```

### Step 2: Register with Override (organizer/admin only)

```bash
curl -X POST http://localhost:3000/api/v1/registrations/pair \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<ORGANIZER_SESSION>" \
  -d '{
    "tournamentId": "<TOURNAMENT_ID>",
    "pairId": "uuid-ineligible-pair",
    "eligibilityOverride": true,
    "overrideReason": "Approved exception for injury replacement player"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-registration-override",
    "tournamentId": "uuid-tournament",
    "pairId": "uuid-ineligible-pair",
    "status": "REGISTERED",
    "eligibilityOverride": true,
    "overrideReason": "Approved exception for injury replacement player",
    "pair": {
      "id": "uuid-ineligible-pair",
      "player1": { "id": "uuid-young", "name": "John Junior" },
      "player2": { "id": "uuid-old", "name": "Bob Senior" },
      "categoryId": "uuid-35plus",
      "categoryName": "Men's Doubles 35+",
      "seedingScore": 1100.0
    },
    "createdAt": "2025-11-18T11:00:00.000Z"
  }
}
```

## Workflow 5: View Pair Tournament History

```bash
curl -X GET "http://localhost:3000/api/v1/pairs/<PAIR_ID>/history?page=1&limit=10" \
  -H "Cookie: connect.sid=<SESSION_COOKIE>"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "pair": {
      "id": "uuid-pair-123",
      "player1": { "id": "uuid-player-1", "name": "John Doe" },
      "player2": { "id": "uuid-player-2", "name": "Jane Smith" },
      "category": { "id": "uuid-category", "name": "Men's Doubles Open", "type": "DOUBLES" },
      "seedingScore": 1500.0
    },
    "stats": {
      "rank": 5,
      "points": 1200,
      "wins": 20,
      "losses": 5,
      "winRate": 80
    },
    "history": [
      {
        "registrationId": "uuid-reg-1",
        "tournament": {
          "id": "uuid-tournament-1",
          "name": "Spring Championship 2025",
          "startDate": "2025-03-15T00:00:00.000Z",
          "endDate": "2025-03-17T00:00:00.000Z",
          "status": "COMPLETED",
          "clubName": "Downtown Club",
          "category": { "id": "uuid-category", "name": "Men's Doubles Open" }
        },
        "registration": {
          "status": "REGISTERED",
          "registrationTimestamp": "2025-03-01T10:00:00.000Z",
          "seedPosition": 3,
          "eligibilityOverride": false,
          "overrideReason": null
        }
      },
      {
        "registrationId": "uuid-reg-2",
        "tournament": {
          "id": "uuid-tournament-2",
          "name": "Summer Open 2025",
          "startDate": "2025-11-15T00:00:00.000Z",
          "endDate": "2025-11-20T00:00:00.000Z",
          "status": "IN_PROGRESS",
          "clubName": "Sports Arena",
          "category": { "id": "uuid-category", "name": "Men's Doubles Open" }
        },
        "registration": {
          "status": "REGISTERED",
          "registrationTimestamp": "2025-11-10T14:30:00.000Z",
          "seedPosition": 2,
          "eligibilityOverride": false,
          "overrideReason": null
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalCount": 2,
      "totalPages": 1
    }
  }
}
```

**Notes**:
- `stats` contains pair's overall ranking data (null if no ranking exists yet)
- `history` is sorted by registrationTimestamp (newest first)
- Supports pagination with `page` and `limit` query parameters

## Workflow 6: Recalculate Seeding Scores (Admin/Organizer)

```bash
# Manually trigger seeding recalculation for a category
curl -X POST http://localhost:3000/api/v1/pairs/recalculate-seeding/<CATEGORY_ID> \
  -H "Cookie: connect.sid=<ORGANIZER_SESSION>"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "categoryId": "uuid-category",
    "pairsUpdated": 23,
    "message": "Seeding scores recalculated successfully for 23 pairs"
  }
}
```

**When to use**:
- After manual ranking adjustments
- If seeding scores appear stale
- Automatically triggered when tournaments in the category close

## Common Error Responses

### Duplicate Registration
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_REGISTERED",
    "message": "This pair is already registered for this tournament"
  }
}
```

### Same Player Twice
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAIR",
    "message": "Player 1 and Player 2 must be different players"
  }
}
```

### Player Already Registered with Different Partner
```json
{
  "success": false,
  "error": {
    "code": "PLAYER_ALREADY_REGISTERED",
    "message": "Player 1 (John Doe) is already registered in this tournament with a different partner"
  }
}
```

### Singles Category Specified
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CATEGORY_TYPE",
    "message": "Category must be DOUBLES type for pair registration"
  }
}
```

### Unauthorized Override Attempt
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED_OVERRIDE",
    "message": "Only organizers and admins can use eligibility override"
  }
}
```

## Testing Data Setup

Use the seed script to populate test data:

```bash
# Backend directory
cd backend
npm run seed
```

**Test Data Created**:
- 6 player profiles with varying rankings
- 10 categories (including doubles categories)
- 3-5 pre-created doubles pairs per doubles category
- Sample tournaments with some pair registrations

## Frontend Integration Notes

### PairSelector Component Usage

```jsx
import PairSelector from './components/PairSelector';

function DoublesRegistrationPage() {
  const [selectedPair, setSelectedPair] = useState(null);

  return (
    <PairSelector
      categoryId={categoryId}
      onPairSelected={setSelectedPair}
      currentUserId={userId} // Pre-select current user as player 1
    />
  );
}
```

### API Client Service

```javascript
// frontend/src/services/pairService.js
import axios from 'axios';

export const pairService = {
  async createPair(player1Id, player2Id, categoryId) {
    const response = await axios.post('/api/v1/pairs', {
      player1Id, player2Id, categoryId
    });
    return response.data;
  },

  async registerPair(tournamentId, pairId, overrideOptions = {}) {
    const response = await axios.post('/api/v1/registrations/pair', {
      tournamentId,
      pairId,
      ...overrideOptions
    });
    return response.data;
  }
};
```

## Next Steps

1. Review [data-model.md](data-model.md) for database schema details
2. Review [api-endpoints.md](contracts/api-endpoints.md) for complete API reference
3. Review [data-contracts.md](contracts/data-contracts.md) for TypeScript schemas
4. Run `/speckit.tasks` to generate implementation task list
5. Implement backend services and controllers first
6. Implement frontend components once backend is stable
7. Test with seed data before production deployment

## Performance Expectations

Based on Phase 0 research:

- **Pair Lookup**: <50ms (indexed queries)
- **Pair Creation**: <100ms (includes ranking fetches)
- **Registration**: <200ms (includes eligibility validation)
- **Seeding Calculation**: <500ms for 32 pairs (pre-calculated scores)
- **Rankings Page**: <300ms for 50 pairs with pagination

## Support

- Specification: [spec.md](spec.md)
- Implementation Plan: [plan.md](plan.md)
- Technical Research: [research.md](research.md)
