# API Endpoints: Doubles Pair Management

**Feature**: 006-doubles-pairs
**Base URL**: `/api/v1`
**Date**: 2025-11-18

## Overview

This document defines the REST API endpoints for doubles pair management. All endpoints follow existing BATL API conventions: JSON request/response bodies, standard HTTP status codes, authentication via session cookies, and consistent error formatting.

## Authentication

All endpoints except GET (public viewing) require authentication via session cookie. Authorization is enforced based on user role (PLAYER, ORGANIZER, ADMIN).

## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional additional context */ }
  }
}
```

## Endpoints

### 1. Create or Get Pair

Creates a new doubles pair or returns existing pair for the given players and category.

**Endpoint**: `POST /pairs`

**Authentication**: Required (PLAYER, ORGANIZER, ADMIN)

**Authorization**:
- PLAYER: Must be one of the two players in the pair
- ORGANIZER/ADMIN: Can create pair for any two players

**Request Body**:

```json
{
  "player1Id": "uuid",
  "player2Id": "uuid",
  "categoryId": "uuid",
  "allowIneligible": false
}
```

**Field Descriptions**:
- `allowIneligible` (optional, default: false): ORGANIZER/ADMIN only. Allows creating pairs that don't meet category eligibility requirements. Requires ORGANIZER or ADMIN role.

**Success Response** (201 Created or 200 OK if existing):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "player1Id": "uuid",
    "player2Id": "uuid",
    "categoryId": "uuid",
    "seedingScore": 1800.5,
    "player1": {
      "id": "uuid",
      "name": "John Doe",
      "categoryRanking": {
        "points": 1000,
        "rank": 5,
        "wins": 15,
        "losses": 3
      }
    },
    "player2": {
      "id": "uuid",
      "name": "Jane Smith",
      "categoryRanking": {
        "points": 800.5,
        "rank": 8,
        "wins": 12,
        "losses": 5
      }
    },
    "pairRanking": {
      "points": 500,
      "rank": 12,
      "wins": 5,
      "losses": 2
    },
    "createdAt": "2025-11-18T10:30:00Z",
    "updatedAt": "2025-11-18T10:30:00Z",
    "isNew": true
  }
}
```

**Error Responses**:

- `400 SAME_PLAYER`: `player1Id` and `player2Id` are identical
- `400 INVALID_CATEGORY`: Category does not exist or is not a doubles category
- `404 PLAYER_NOT_FOUND`: One or both players do not exist
- `403 FORBIDDEN`: Player trying to create pair they're not part of
- `401 UNAUTHORIZED`: Not authenticated

### 2. Get Pair by ID

Retrieves details of a specific doubles pair.

**Endpoint**: `GET /pairs/:id`

**Authentication**: Not required (public)

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "player1Id": "uuid",
    "player2Id": "uuid",
    "categoryId": "uuid",
    "seedingScore": 1800.5,
    "player1": {
      "id": "uuid",
      "name": "John Doe",
      "categoryRanking": { "points": 1000, "rank": 5, "wins": 15, "losses": 3 }
    },
    "player2": {
      "id": "uuid",
      "name": "Jane Smith",
      "categoryRanking": { "points": 800.5, "rank": 8, "wins": 12, "losses": 5 }
    },
    "pairRanking": {
      "points": 500,
      "rank": 12,
      "wins": 5,
      "losses": 2
    },
    "category": {
      "id": "uuid",
      "name": "Men's Doubles Open",
      "type": "DOUBLES",
      "ageGroup": "ALL_AGES",
      "gender": "MEN"
    },
    "activeRegistrations": [
      {
        "tournamentId": "uuid",
        "tournamentName": "Spring Doubles Championship",
        "status": "REGISTERED"
      }
    ],
    "createdAt": "2025-11-18T10:30:00Z",
    "updatedAt": "2025-11-18T10:30:00Z"
  }
}
```

**Error Responses**:

- `404 PAIR_NOT_FOUND`: Pair with given ID does not exist (or is deleted)

### 3. List Pairs

Retrieves a list of doubles pairs with optional filtering.

**Endpoint**: `GET /pairs`

**Authentication**: Not required (public)

**Query Parameters**:

- `categoryId` (optional): Filter by category UUID
- `playerId` (optional): Filter pairs containing this player
- `includeDeleted` (optional, default: false): Include soft-deleted pairs
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "pairs": [
      {
        "id": "uuid",
        "player1": { "id": "uuid", "name": "John Doe" },
        "player2": { "id": "uuid", "name": "Jane Smith" },
        "categoryId": "uuid",
        "categoryName": "Men's Doubles Open",
        "seedingScore": 1800.5,
        "pairRanking": { "points": 500, "rank": 12 },
        "createdAt": "2025-11-18T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### 4. Register Pair for Tournament

Registers a doubles pair for a tournament (creates PairRegistration).

**Endpoint**: `POST /registrations/pair`

**Authentication**: Required (PLAYER, ORGANIZER, ADMIN)

**Authorization**:
- PLAYER: Must be one of the pair members
- ORGANIZER/ADMIN: Can register any pair

**Request Body**:

```json
{
  "tournamentId": "uuid",
  "pairId": "uuid",
  "eligibilityOverride": false,
  "overrideReason": null
}
```

**Success Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tournamentId": "uuid",
    "pairId": "uuid",
    "status": "REGISTERED",
    "registrationTimestamp": "2025-11-18T10:30:00Z",
    "eligibilityOverride": false,
    "overrideReason": null,
    "pair": {
      "id": "uuid",
      "player1": { "id": "uuid", "name": "John Doe" },
      "player2": { "id": "uuid", "name": "Jane Smith" },
      "seedingScore": 1800.5
    },
    "tournament": {
      "id": "uuid",
      "name": "Spring Doubles Championship",
      "categoryId": "uuid",
      "capacity": 16,
      "registeredCount": 8
    }
  }
}
```

**Error Responses**:

- `400 INELIGIBLE_PAIR`: Pair does not meet category criteria (for PLAYER requests)
  ```json
  {
    "success": false,
    "error": {
      "code": "INELIGIBLE_PAIR",
      "message": "Pair does not meet tournament eligibility requirements",
      "details": {
        "violations": [
          "Player 1 (John Doe) does not meet age requirement (must be 35+)",
          "Player 2 (Jane Smith) is already registered with different partner"
        ]
      }
    }
  }
  ```
- `400 ALREADY_REGISTERED`: Pair already registered for this tournament
- `400 TOURNAMENT_FULL`: Tournament at capacity (should go to waitlist)
- `400 WRONG_CATEGORY_TYPE`: Tournament category is not DOUBLES type
- `404 TOURNAMENT_NOT_FOUND`: Tournament does not exist
- `404 PAIR_NOT_FOUND`: Pair does not exist
- `403 FORBIDDEN`: Player trying to register pair they're not part of

### 5. Register Pair with Eligibility Override

Same as registration endpoint but with override capability for organizers/admins.

**Endpoint**: `POST /registrations/pair`

**Request Body** (ORGANIZER/ADMIN only):

```json
{
  "tournamentId": "uuid",
  "pairId": "uuid",
  "eligibilityOverride": true,
  "overrideReason": "Injury replacement approved by tournament director"
}
```

**Success Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tournamentId": "uuid",
    "pairId": "uuid",
    "status": "REGISTERED",
    "eligibilityOverride": true,
    "overrideReason": "Injury replacement approved by tournament director",
    "registrationTimestamp": "2025-11-18T10:30:00Z",
    /* ... rest of registration data ... */
  }
}
```

**Error Responses**:

- `400 OVERRIDE_REASON_REQUIRED`: eligibilityOverride is true but overrideReason is missing
- `403 OVERRIDE_NOT_ALLOWED`: PLAYER role cannot use eligibility override

### 6. Withdraw Pair Registration

Withdraws a pair from a tournament.

**Endpoint**: `DELETE /registrations/pair/:registrationId`

**Authentication**: Required (PLAYER, ORGANIZER, ADMIN)

**Authorization**:
- PLAYER: Must be one of the pair members
- ORGANIZER/ADMIN: Can withdraw any registration

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "WITHDRAWN",
    "pairDeleted": false,
    "promotedPair": {
      "id": "uuid",
      "pairId": "uuid",
      "player1Name": "Alice Johnson",
      "player2Name": "Bob Williams",
      "status": "REGISTERED"
    },
    "message": "Pair withdrawn successfully. Alice Johnson & Bob Williams promoted from waitlist."
  }
}
```

**Notes**:
- If pair has no other active registrations and no current season participation, `pairDeleted` will be `true` and the pair will be soft-deleted.
- If a REGISTERED pair withdraws and there are WAITLISTED pairs, the oldest waitlisted pair is automatically promoted to REGISTERED status.
- Auto-promotion uses FIFO (First-In, First-Out) based on registration timestamp.
- Promotion occurs atomically with withdrawal in a database transaction.

### 7. Withdraw Tournament Registration (Organizer)

Allows organizers/admins to withdraw a specific player from a SINGLES tournament by registration ID.

**Endpoint**: `DELETE /tournaments/registrations/:registrationId`

**Authentication**: Required (ORGANIZER, ADMIN)

**Authorization**: ORGANIZER or ADMIN only

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "uuid",
      "playerId": "uuid",
      "tournamentId": "uuid",
      "status": "WITHDRAWN",
      "withdrawnAt": "2025-11-22T18:15:00Z"
    },
    "promotedPlayer": {
      "playerId": "uuid",
      "playerName": "Alice Johnson",
      "playerEmail": "alice@example.com"
    },
    "categoryCleanup": {
      "unregistered": false,
      "reason": "Player has other active tournaments in category"
    }
  },
  "message": "Player unregistered. Alice Johnson has been promoted from the waitlist."
}
```

**Notes**:
- This endpoint is for organizers to unregister players from SINGLES tournaments
- For DOUBLES tournaments, use the pair withdrawal endpoint (DELETE /registrations/pair/:id)
- Includes auto-promotion from waitlist if applicable
- Includes smart category cleanup (removes category registration if no other tournaments)

### 8. Get Pair Rankings for Category

Retrieves leaderboard of pair rankings in a category.

**Endpoint**: `GET /rankings/pairs/:categoryId`

**Authentication**: Not required (public)

**Query Parameters**:

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50): Items per page

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid",
      "name": "Men's Doubles Open",
      "type": "DOUBLES"
    },
    "rankings": [
      {
        "rank": 1,
        "pair": {
          "id": "uuid",
          "player1": { "id": "uuid", "name": "John Doe" },
          "player2": { "id": "uuid", "name": "Jane Smith" },
          "seedingScore": 1800.5
        },
        "points": 1200,
        "wins": 20,
        "losses": 2,
        "winRate": 0.909,
        "lastUpdated": "2025-11-15T18:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 45,
      "pages": 1
    }
  }
}
```

### 8. Recalculate Category Seeding Scores

Manually triggers recalculation of seeding scores for all pairs in a category.

**Endpoint**: `POST /pairs/recalculate-seeding/:categoryId`

**Authentication**: Required (ORGANIZER, ADMIN)

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "categoryId": "uuid",
    "pairsUpdated": 45,
    "message": "Seeding scores recalculated for all pairs in category"
  }
}
```

**Note**: This is automatically triggered when any tournament in the category closes, but organizers can manually trigger if needed (e.g., after manual ranking adjustments).

### 9. Get Pair Tournament History

Retrieves tournament participation history for a pair with stats and pagination.

**Endpoint**: `GET /pairs/:id/history`

**Authentication**: Not required (public)

**Query Parameters**:

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "pair": {
      "id": "uuid",
      "player1": { "id": "uuid", "name": "John Doe" },
      "player2": { "id": "uuid", "name": "Jane Smith" },
      "category": { "id": "uuid", "name": "Men's Doubles Open", "type": "DOUBLES" },
      "seedingScore": 1800.5
    },
    "stats": {
      "rank": 12,
      "points": 500,
      "wins": 5,
      "losses": 2,
      "winRate": 71
    },
    "history": [
      {
        "registrationId": "uuid",
        "tournament": {
          "id": "uuid",
          "name": "Spring Doubles Championship",
          "startDate": "2025-03-15T00:00:00Z",
          "endDate": "2025-03-17T00:00:00Z",
          "status": "COMPLETED",
          "clubName": "Main Club",
          "category": { "id": "uuid", "name": "Men's Doubles Open" }
        },
        "registration": {
          "status": "REGISTERED",
          "registrationTimestamp": "2025-03-01T10:30:00Z",
          "seedPosition": 3,
          "eligibilityOverride": false,
          "overrideReason": null
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 10,
      "totalPages": 1
    }
  }
}
```

**Note**: The `stats` field will be `null` if the pair has no ranking in their category yet.

## Modified Endpoints

### Existing Registration Endpoints

The existing `/api/v1/registrations` endpoints are modified to detect tournament category type:

**POST /registrations** - Modified to check category type:
- If category type is `SINGLES`: Uses `playerId` field (existing behavior)
- If category type is `DOUBLES`: Redirects to `/registrations/pair` endpoint

This ensures backward compatibility while supporting doubles registration.

## Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| SAME_PLAYER | player1Id and player2Id are identical | 400 |
| INVALID_CATEGORY | Category does not exist or wrong type | 400 |
| PLAYER_NOT_FOUND | One or both players do not exist | 404 |
| PAIR_NOT_FOUND | Pair does not exist | 404 |
| TOURNAMENT_NOT_FOUND | Tournament does not exist | 404 |
| INELIGIBLE_PAIR | Pair does not meet eligibility criteria | 400 |
| ALREADY_REGISTERED | Pair already registered for tournament | 400 |
| TOURNAMENT_FULL | Tournament at capacity | 400 |
| WRONG_CATEGORY_TYPE | Tournament is not doubles type | 400 |
| OVERRIDE_REASON_REQUIRED | Override reason missing when override = true | 400 |
| OVERRIDE_NOT_ALLOWED | Player role cannot override eligibility | 403 |
| FORBIDDEN | User lacks permission for action | 403 |
| UNAUTHORIZED | Not authenticated | 401 |

## Rate Limiting

All endpoints follow existing BATL rate limiting:
- 100 requests per 15 minutes per IP for anonymous requests
- 1000 requests per 15 minutes per IP for authenticated requests
- 10 requests per minute for pair creation (to prevent abuse)

## References

- Data model: [../data-model.md](../data-model.md)
- Data contracts: [data-contracts.md](data-contracts.md)
- Feature specification: [../spec.md](../spec.md)
