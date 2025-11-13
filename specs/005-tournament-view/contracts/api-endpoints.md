# API Endpoints - Tournament View

## Overview

This document defines the API endpoints needed for the Tournament View feature. Most data can be retrieved using existing endpoints from features 001-004, with some enhancements needed.

## Existing Endpoints (To Be Enhanced)

### GET /api/v1/tournaments/:id

**Description**: Fetch tournament details with all related data.

**Current Behavior**: Returns tournament with basic fields.

**Required Enhancement**: Include related entities in response using Prisma `include`.

**Request**:
```
GET /api/v1/tournaments/:tournamentId
```

**Enhanced Response**:
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Summer Singles Championship",
      "description": "Annual summer tournament for men's singles",
      "categoryId": "category-uuid",
      "category": {
        "id": "category-uuid",
        "type": "SINGLES",
        "ageGroup": "AGE_40",
        "gender": "MEN",
        "name": "Men's Singles 40+"
      },
      "locationId": "location-uuid",
      "location": {
        "id": "location-uuid",
        "clubName": "Tennis Club Central",
        "address": "123 Main St, City, State"
      },
      "backupLocationId": "backup-location-uuid",
      "backupLocation": {
        "id": "backup-location-uuid",
        "clubName": "Indoor Tennis Center",
        "address": "456 Elm St, City, State"
      },
      "courts": 8,
      "capacity": 32,
      "organizerId": "organizer-uuid",
      "organizer": {
        "id": "organizer-uuid",
        "name": "John Organizer",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "deputyOrganizerId": "deputy-organizer-uuid",
      "deputyOrganizer": {
        "id": "deputy-organizer-uuid",
        "name": "Jane Deputy",
        "email": "jane@example.com",
        "phone": "+0987654321"
      },
      "entryFee": 50.00,
      "rulesUrl": "https://example.com/tournament-rules",
      "prizeDescription": "1st: $500, 2nd: $300, 3rd-4th: $150",
      "registrationOpenDate": "2025-11-01T00:00:00.000Z",
      "registrationCloseDate": "2025-11-20T23:59:59.000Z",
      "minParticipants": 8,
      "waitlistDisplayOrder": "REGISTRATION_TIME",
      "formatType": "KNOCKOUT",
      "formatConfig": {
        "matchGuarantee": "MATCH_2"
      },
      "defaultScoringRules": {
        "scoringFormat": "BEST_OF_3",
        "winningSets": 2,
        "winningGames": 6,
        "advantageRule": "ADVANTAGE",
        "tiebreakTrigger": "6_6",
        "matchTiebreakPoints": null
      },
      "startDate": "2025-11-25T09:00:00.000Z",
      "endDate": "2025-11-26T18:00:00.000Z",
      "status": "IN_PROGRESS",
      "lastStatusChange": "2025-11-25T08:30:00.000Z",
      "createdAt": "2025-10-15T10:00:00.000Z",
      "updatedAt": "2025-11-25T08:30:00.000Z",
      "registrationCount": 28,
      "waitlistCount": 4,
      "ruleComplexity": "MODIFIED"
    }
  }
}
```

**Computed Fields to Add**:
- `registrationCount`: Count of REGISTERED players
- `waitlistCount`: Count of WAITLISTED players
- `ruleComplexity`: Calculated based on overrides (DEFAULT, MODIFIED, SPECIFIC)

**Implementation Notes**:
- Use Prisma `include` to fetch related data in a single query
- Calculate `registrationCount` and `waitlistCount` from TournamentRegistration
- Calculate `ruleComplexity` by checking for non-null `ruleOverrides` in groups, brackets, rounds, matches

---

## New Endpoints Required

### GET /api/v1/tournaments/:id/format-structure

**Description**: Fetch tournament format structure (groups, brackets, rounds) based on format type.

**Request**:
```
GET /api/v1/tournaments/:tournamentId/format-structure
```

**Response** (for KNOCKOUT format):
```json
{
  "success": true,
  "data": {
    "formatType": "KNOCKOUT",
    "brackets": [
      {
        "id": "bracket-uuid",
        "tournamentId": "tournament-uuid",
        "bracketType": "MAIN",
        "matchGuarantee": "MATCH_2",
        "ruleOverrides": null,
        "placementRange": null,
        "roundCount": 5
      },
      {
        "id": "bracket-uuid-2",
        "tournamentId": "tournament-uuid",
        "bracketType": "CONSOLATION",
        "matchGuarantee": "MATCH_2",
        "ruleOverrides": null,
        "placementRange": null,
        "roundCount": 4
      }
    ],
    "rounds": [
      {
        "id": "round-uuid-1",
        "tournamentId": "tournament-uuid",
        "bracketId": "bracket-uuid",
        "roundNumber": 1,
        "ruleOverrides": null,
        "earlyTiebreakEnabled": false,
        "matchCount": 16
      },
      // ... more rounds
    ]
  }
}
```

**Response** (for GROUP format):
```json
{
  "success": true,
  "data": {
    "formatType": "GROUP",
    "groups": [
      {
        "id": "group-uuid-1",
        "tournamentId": "tournament-uuid",
        "groupNumber": 1,
        "groupSize": 4,
        "ruleOverrides": null,
        "advancementCriteria": null,
        "participants": [
          {
            "id": "participant-uuid-1",
            "playerId": "player-uuid-1",
            "seedPosition": 1,
            "player": {
              "id": "player-uuid-1",
              "name": "John Doe"
            }
          },
          // ... more participants
        ]
      },
      // ... more groups
    ]
  }
}
```

**Response** (for SWISS format):
```json
{
  "success": true,
  "data": {
    "formatType": "SWISS",
    "rounds": [
      {
        "id": "round-uuid-1",
        "tournamentId": "tournament-uuid",
        "bracketId": null,
        "roundNumber": 1,
        "ruleOverrides": null,
        "earlyTiebreakEnabled": false,
        "matchCount": 16
      },
      // ... more rounds
    ]
  }
}
```

**Response** (for COMBINED format):
```json
{
  "success": true,
  "data": {
    "formatType": "COMBINED",
    "groups": [
      // ... group data (same as GROUP format)
    ],
    "brackets": [
      // ... bracket data (same as KNOCKOUT format)
    ],
    "rounds": [
      // ... round data for knockout phase
    ]
  }
}
```

**Error Responses**:
```json
{
  "success": false,
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found"
  }
}
```

**Implementation Notes**:
- Query based on `tournament.formatType`
- For KNOCKOUT/COMBINED: fetch brackets and rounds
- For GROUP/COMBINED: fetch groups with participants (include player names)
- For SWISS: fetch rounds only
- Add `matchCount` for each round/group (count of matches)
- Add `roundCount` for each bracket

---

### GET /api/v1/tournaments/:id/matches

**Description**: Fetch all matches for a tournament with player names and results.

**Request**:
```
GET /api/v1/tournaments/:tournamentId/matches
```

**Optional Query Parameters**:
- `groupId`: Filter by specific group
- `bracketId`: Filter by specific bracket
- `roundId`: Filter by specific round
- `status`: Filter by match status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)

**Example**:
```
GET /api/v1/tournaments/:tournamentId/matches?bracketId=bracket-uuid&status=COMPLETED
```

**Response**:
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "match-uuid-1",
        "tournamentId": "tournament-uuid",
        "groupId": null,
        "bracketId": "bracket-uuid",
        "roundId": "round-uuid",
        "matchNumber": 1,
        "player1Id": "player-uuid-1",
        "player1": {
          "id": "player-uuid-1",
          "name": "John Doe"
        },
        "player2Id": "player-uuid-2",
        "player2": {
          "id": "player-uuid-2",
          "name": "Jane Smith"
        },
        "status": "COMPLETED",
        "result": {
          "winnerId": "player-uuid-1",
          "sets": [
            { "player1Games": 6, "player2Games": 4 },
            { "player1Games": 6, "player2Games": 3 }
          ],
          "finalScore": "6-4, 6-3"
        },
        "ruleOverrides": null,
        "completedWithRules": {
          "scoringFormat": "BEST_OF_3",
          "winningSets": 2,
          "winningGames": 6,
          "advantageRule": "ADVANTAGE",
          "tiebreakTrigger": "6_6"
        },
        "completedAt": "2025-11-25T14:30:00.000Z",
        "createdAt": "2025-11-25T09:00:00.000Z",
        "updatedAt": "2025-11-25T14:30:00.000Z"
      },
      // ... more matches
    ]
  }
}
```

**Error Responses**:
```json
{
  "success": false,
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found"
  }
}
```

**Implementation Notes**:
- Use Prisma `include` to fetch player1 and player2 with name
- Support filtering by groupId, bracketId, roundId, status
- Order by matchNumber ascending
- Parse `result` JSON if match is COMPLETED
- Include `completedWithRules` for historical accuracy

---

### GET /api/v1/tournaments/:id/standings

**Description**: Fetch current tournament standings based on format type.

**Request**:
```
GET /api/v1/tournaments/:tournamentId/standings
```

**Response** (for GROUP format):
```json
{
  "success": true,
  "data": {
    "formatType": "GROUP",
    "groupStandings": [
      {
        "groupId": "group-uuid-1",
        "groupNumber": 1,
        "standings": [
          {
            "playerId": "player-uuid-1",
            "playerName": "John Doe",
            "matchesPlayed": 3,
            "wins": 3,
            "losses": 0,
            "gamesWon": 18,
            "gamesLost": 6,
            "points": 9,
            "position": 1
          },
          {
            "playerId": "player-uuid-2",
            "playerName": "Jane Smith",
            "matchesPlayed": 3,
            "wins": 2,
            "losses": 1,
            "gamesWon": 15,
            "gamesLost": 9,
            "points": 6,
            "position": 2
          },
          // ... more players
        ]
      },
      // ... more groups
    ]
  }
}
```

**Response** (for SWISS format):
```json
{
  "success": true,
  "data": {
    "formatType": "SWISS",
    "currentRound": 3,
    "standings": [
      {
        "playerId": "player-uuid-1",
        "playerName": "John Doe",
        "matchesPlayed": 3,
        "wins": 3,
        "losses": 0,
        "buchholz": 7.5,
        "position": 1
      },
      {
        "playerId": "player-uuid-2",
        "playerName": "Jane Smith",
        "matchesPlayed": 3,
        "wins": 2,
        "losses": 1,
        "buchholz": 6.0,
        "position": 2
      },
      // ... more players
    ]
  }
}
```

**Response** (for KNOCKOUT format):
```json
{
  "success": true,
  "data": {
    "formatType": "KNOCKOUT",
    "brackets": [
      {
        "bracketId": "bracket-uuid",
        "bracketType": "MAIN",
        "currentRound": 3,
        "remainingPlayers": 8,
        "eliminatedPlayers": 24
      },
      {
        "bracketId": "bracket-uuid-2",
        "bracketType": "CONSOLATION",
        "currentRound": 2,
        "remainingPlayers": 16,
        "eliminatedPlayers": 8
      }
    ]
  }
}
```

**Error Responses**:
```json
{
  "success": false,
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found"
  }
}
```

**Implementation Notes**:
- Calculate standings based on completed matches
- For GROUP: Calculate wins, losses, points, games won/lost, sort by points → head-to-head → games won
- For SWISS: Calculate wins, losses, Buchholz tiebreaker, sort by wins → Buchholz
- For KNOCKOUT: Return bracket progression status (current round, remaining players)
- Cache standings for 60 seconds (invalidate on match completion)

---

## Endpoint Summary

| Endpoint | Method | Purpose | New/Enhanced |
|----------|--------|---------|--------------|
| `/api/v1/tournaments/:id` | GET | Fetch tournament with all related data | Enhanced |
| `/api/v1/tournaments/:id/format-structure` | GET | Fetch format structure (groups/brackets/rounds) | **New** |
| `/api/v1/tournaments/:id/matches` | GET | Fetch all matches with results | **New** |
| `/api/v1/tournaments/:id/standings` | GET | Fetch current standings | **New** |
| `/api/v1/registrations?tournamentId=:id` | GET | Fetch registered players | Existing |
| `/api/v1/rankings?categoryId=:id` | GET | Fetch player rankings | Existing |

## Error Codes

All endpoints use the existing error code system from `backend/src/types/errorCodes.js`.

Common error codes:
- `TOURNAMENT_NOT_FOUND`: Tournament with given ID not found
- `UNAUTHORIZED`: User not authenticated (if endpoint requires auth)
- `FORBIDDEN`: User not authorized to access this tournament (if endpoint requires auth)
- `VALIDATION_FAILED`: Invalid query parameters
- `INTERNAL_SERVER_ERROR`: Unexpected server error

## Rate Limiting

All endpoints use the existing rate limiting middleware:
- Read endpoints: 100 requests per 15 minutes per IP
- No rate limiting for public tournament view (read-only)

## Caching Strategy

- `GET /api/v1/tournaments/:id`: Cache for 30 seconds
- `GET /api/v1/tournaments/:id/format-structure`: Cache for 5 minutes (structure rarely changes)
- `GET /api/v1/tournaments/:id/matches`: Cache for 30 seconds (invalidate on match update)
- `GET /api/v1/tournaments/:id/standings`: Cache for 60 seconds (invalidate on match completion)

## Authentication

All endpoints are publicly accessible (no authentication required).

Rationale: Tournament view is a public page, all data is read-only and non-sensitive.

## Testing

Each endpoint requires:
- Unit tests for business logic (standings calculation, etc.)
- Integration tests for API responses
- E2E tests for full user flow

## Versioning

All endpoints use API version `/api/v1/` to maintain backward compatibility.
