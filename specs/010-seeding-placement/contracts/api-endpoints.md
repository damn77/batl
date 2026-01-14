# API Endpoints: Tournament Seeding Placement

**Feature**: 010-seeding-placement
**Date**: 2026-01-13
**Base URL**: `/api/v1`
**Authentication**: Required (ORGANIZER or ADMIN role)

## Overview

This feature provides a single API endpoint for generating seeded tournament brackets. The endpoint combines data from features 008 (rankings) and 009 (bracket structure) to produce a complete bracket with players/pairs positioned according to seeding rules.

---

## Endpoint: Generate Seeded Bracket

**POST** `/api/v1/seeding/generate-bracket`

Generate a tournament bracket with seeded players positioned according to recursive placement rules and fair randomization.

### Request

#### Headers
```http
Content-Type: application/json
Authorization: Bearer <token>
```

#### Body
```json
{
  "tournamentId": "string (optional)",
  "categoryId": "string (required)",
  "playerCount": "number (required, 4-128)",
  "randomSeed": "string (optional)",
  "unseededPlayers": "array<object> (optional)"
}
```

**Field Descriptions**:
- `tournamentId`: Optional tournament identifier for context (not used for seeding logic)
- `categoryId`: Required - determines which category rankings to use for seeding
- `playerCount`: Required - total number of participants (4-128), determines seed count and bracket size
- `randomSeed`: Optional - deterministic seed for randomization (for testing reproducibility). If omitted, system generates random seed.
- `unseededPlayers`: Optional - array of unseeded player/pair objects to fill remaining positions (implementation future work, out of scope for MVP)

**Validation Rules**:
- `categoryId`: Must exist in database and have valid rankings
- `playerCount`: Must be integer between 4 and 128 (inclusive)
- `randomSeed`: If provided, must be non-empty string
- If `playerCount` < 4 or > 128, return 400 error

#### Example Request
```json
{
  "categoryId": "cat_01HXYZ123ABC",
  "playerCount": 15,
  "randomSeed": "test-seed-123"
}
```

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "data": {
    "bracket": {
      "tournamentId": "string | null",
      "categoryId": "string",
      "playerCount": 15,
      "bracketSize": 16,
      "structure": "string",
      "seedCount": 4,
      "positions": [
        {
          "positionNumber": 1,
          "positionIndex": 0,
          "seed": 1,
          "entityId": "player_01ABC",
          "entityType": "PLAYER",
          "entityName": "John Doe",
          "isBye": true,
          "isPreliminary": false
        },
        {
          "positionNumber": 2,
          "positionIndex": 1,
          "seed": null,
          "entityId": null,
          "entityType": null,
          "entityName": null,
          "isBye": false,
          "isPreliminary": true
        }
        // ... 14 more positions
      ],
      "randomSeed": "test-seed-123",
      "generatedAt": "2026-01-13T10:30:00Z"
    },
    "seedingInfo": {
      "seedCount": 4,
      "seedRange": {
        "min": 10,
        "max": 19
      },
      "note": "Seeding positions are determined by category rankings. Positions 3 and 4 are randomized for fairness."
    }
  }
}
```

**Response Field Descriptions**:
- `bracket`: Complete bracket structure with positioned players
  - `playerCount`: Requested participant count
  - `bracketSize`: Next power of 2 >= playerCount (from feature 009)
  - `structure`: Bracket structure string from feature 009 ("0"=match, "1"=bye)
  - `seedCount`: Number of seeded positions (2/4/8/16 based on playerCount)
  - `positions`: Array of all bracket positions (length = bracketSize)
  - `randomSeed`: Seed used for randomization (for reproducibility)
  - `generatedAt`: Timestamp of generation
- `seedingInfo`: Metadata about seeding configuration
  - `seedCount`: Number of seeds applied
  - `seedRange`: Player count range for this seed count
  - `note`: Explanation of seeding rules applied

**Position Object**:
- `positionNumber`: 1-based position (1=top of bracket)
- `positionIndex`: 0-based index in structure string
- `seed`: Seed number (1-N) or null if unseeded
- `entityId`: Player or PlayerPair ID, or null if position unfilled
- `entityType`: "PLAYER" | "PAIR" | null
- `entityName`: Display name for player/pair
- `isBye`: True if this position is a bye ("1" in structure)
- `isPreliminary`: True if this position requires preliminary match ("0")

#### Error Responses

**400 Bad Request - Invalid Player Count**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PLAYER_COUNT",
    "message": "Player count must be between 4 and 128",
    "details": {
      "playerCount": 3,
      "validRange": { "min": 4, "max": 128 }
    }
  }
}
```

**400 Bad Request - Validation Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "violations": [
        {
          "field": "categoryId",
          "message": "categoryId is required"
        }
      ]
    }
  }
}
```

**404 Not Found - Category Not Found**
```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Category with ID 'cat_invalid' not found",
    "details": {
      "categoryId": "cat_invalid"
    }
  }
}
```

**404 Not Found - Insufficient Rankings**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_RANKINGS",
    "message": "Not enough ranked players for seeding",
    "details": {
      "categoryId": "cat_01HXYZ123ABC",
      "requiredSeeds": 4,
      "availableRankings": 2
    }
  }
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to generate seeded bracket",
    "details": {
      "reason": "Database connection error"
    }
  }
}
```

### Business Logic

#### Seed Count Determination (from FR-012)
```
playerCount  → seedCount
  4-9        → 2
 10-19       → 4
 20-39       → 8
 40-128      → 16
```

#### Seeding Placement Rules

**2 Seeds**:
1. Seed 1 → Position 1 (top)
2. Seed 2 → Position N (bottom)

**4 Seeds** (recursive: 2-seed + randomized 3rd/4th):
1. Apply 2-seed rules for seeds 1-2
2. Randomize order of seeds 3-4
3. Place at bottom of first half & top of second half

**8 Seeds** (recursive: 4-seed + randomized 5th-8th):
1. Apply 4-seed rules for seeds 1-4
2. Divide bracket into quarters
3. Randomize and place seeds 5-8 in free quarter positions

**16 Seeds** (recursive: 8-seed + randomized 9th-16th):
1. Apply 8-seed rules for seeds 1-8
2. Divide bracket into eighths
3. Randomize and place seeds 9-16 in free eighth positions

### Security & Authorization

- **Authentication**: Required (Bearer token)
- **Authorization**: ORGANIZER or ADMIN role required
- **Rate Limiting**: Standard API rate limits apply (100 requests/minute)
- **Audit Logging**: Generate bracket actions logged for ADMIN review

### Performance

- **Target**: < 2 seconds for 128 players with 16 seeds (per SC-004)
- **Typical**: < 500ms for tournaments up to 32 players
- **Database Queries**: 1 query for rankings (2-16 rows), 0 queries for bracket structure (in-memory cache)

### Testing

#### Test Scenarios
1. **Valid Request** (15 players, 4 seeds): Verify correct placement and randomization
2. **Minimum Size** (4 players, 2 seeds): Verify 2-seed logic
3. **Maximum Size** (128 players, 16 seeds): Verify performance < 2s
4. **Power-of-2 Size** (16 players, 4 seeds): Verify no byes
5. **Invalid Player Count** (3 players): Verify 400 error
6. **Missing Category**: Verify 404 error
7. **Insufficient Rankings** (2 ranked, 4 required): Verify 404 error
8. **Deterministic Randomization** (same randomSeed): Verify identical results
9. **Randomization Fairness** (1000 iterations): Verify ~50/50 distribution

---

## Future Endpoints (Out of Scope)

The following endpoints are NOT part of this feature but may be added in future:

1. **GET /api/v1/seeding/preview/:tournamentId**
   - Preview seeding for existing tournament
   - Requires tournament with finalized registrations

2. **POST /api/v1/seeding/apply/:tournamentId**
   - Apply seeding to tournament and persist bracket
   - Requires bracket persistence feature (out of scope)

3. **PATCH /api/v1/seeding/override/:tournamentId**
   - Manual seeding position overrides by organizer
   - Out of scope per spec (FR-013: manual seeding positions determined by organizers outside system)

---

## Integration Examples

### Example 1: Generate Bracket for 7-Player Tournament
```bash
curl -X POST https://api.batl.com/api/v1/seeding/generate-bracket \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "categoryId": "cat_men_open",
    "playerCount": 7
  }'
```

**Response**: Bracket with 2 seeds, bracket size 8, 3 preliminary matches, 1 bye

### Example 2: Generate Bracket with Deterministic Seed (Testing)
```bash
curl -X POST https://api.batl.com/api/v1/seeding/generate-bracket \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "categoryId": "cat_women_senior",
    "playerCount": 25,
    "randomSeed": "test-seed-reproducible"
  }'
```

**Response**: Bracket with 8 seeds, bracket size 32, deterministic randomization for seeds 3-8

---

## Dependency APIs (from Other Features)

### Feature 008: Get Category Rankings
**Internal Service Call**: `rankingService.getRankingEntries(categoryId, { limit, orderBy })`
- Returns top N ranked players/pairs for seeding
- Ordered by rank ASC

### Feature 009: Get Bracket Structure
**Internal Service Call**: `bracketService.getBracketStructure(playerCount)`
- Returns bracket size, structure pattern, byes, preliminary matches
- Used to determine valid bracket positions

---

## Versioning

**API Version**: v1
**Feature Version**: 010-seeding-placement
**Specification Version**: 1.0 (2026-01-13)

**Backward Compatibility**: This is the initial API version. Future changes will follow semantic versioning:
- Breaking changes → v2 endpoint
- Additions → v1 with optional fields
- Deprecations → 6-month notice

---

## Notes

- This endpoint is **stateless** - it computes and returns seeded bracket without persisting
- Bracket persistence is out of scope (requires future feature for Tournament/Match entities)
- Unseeded player placement is out of scope for MVP (manual draw or future feature)
- Multiple calls with same inputs produce different results (randomization) unless `randomSeed` provided
- Performance target (< 2s) validated in automated tests with 128-player bracket generation
