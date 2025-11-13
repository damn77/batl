# API Endpoints: Tournament Rules and Formats

**Feature**: 004-tournament-rules | **Date**: 2025-01-07

## Base URL

All endpoints are prefixed with `/api/v1`

## Authentication

All endpoints require authentication. Authorization rules:
- **ORGANIZER, ADMIN**: Can modify tournament rules
- **PLAYER, ORGANIZER, ADMIN**: Can view tournament rules

## Response Format

All responses follow the standard format from 002-category-system:

**Success Response**:
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "field": "fieldName"  // Optional, for validation errors
  }
}
```

## Endpoints

### 1. Set Tournament Format and Default Rules

**Purpose**: Set or update tournament format type, format config, and default scoring rules (US1 P1)

**Endpoint**: `PATCH /tournaments/:id/format`

**Authorization**: ORGANIZER, ADMIN (must be tournament organizer or admin)

**Request Body**:
```json
{
  "formatType": "KNOCKOUT",  // Required: KNOCKOUT | GROUP | SWISS | COMBINED
  "formatConfig": {  // Required: must match formatType
    "formatType": "KNOCKOUT",
    "matchGuarantee": "2_MATCH"  // For knockout
  },
  "defaultScoringRules": {  // Required
    "formatType": "SETS",
    "winningSets": 2,
    "advantageRule": "ADVANTAGE",
    "tiebreakTrigger": "6-6"
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "tour_001",
    "name": "Summer Championship",
    "formatType": "KNOCKOUT",
    "formatConfig": { /* as sent */ },
    "defaultScoringRules": { /* as sent */ }
  }
}
```

**Error Responses**:
- **404 NOT_FOUND**: Tournament not found
- **403 FORBIDDEN**: User is not organizer or admin
- **400 INVALID_FORMAT_TYPE**: formatType not valid enum value
- **400 FORMAT_CONFIG_MISMATCH**: formatConfig doesn't match formatType
- **400 INVALID_SCORING_RULES**: defaultScoringRules validation failed
- **409 MATCHES_ALREADY_PLAYED**: Cannot change format after matches completed

---

### 2. Update Tournament Default Scoring Rules Only

**Purpose**: Update default scoring rules without changing format type or config (US1 P1, US4 P2)

**Endpoint**: `PATCH /tournaments/:id/default-rules`

**Authorization**: ORGANIZER, ADMIN

**Request Body**:
```json
{
  "formatType": "MIXED",
  "winningSets": 1,
  "advantageRule": "NO_ADVANTAGE",
  "tiebreakTrigger": "5-5",
  "finalSetTiebreak": "BIG"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "tour_001",
    "defaultScoringRules": { /* updated rules */ }
  }
}
```

**Error Responses**:
- **404 NOT_FOUND**: Tournament not found
- **403 FORBIDDEN**: User is not organizer or admin
- **400 INVALID_SCORING_RULES**: Validation failed

---

### 3. Set Group Rule Overrides

**Purpose**: Override scoring rules for a specific group (US3 P2, US4 P2)

**Endpoint**: `PATCH /groups/:id/rules`

**Authorization**: ORGANIZER, ADMIN

**Request Body**:
```json
{
  "ruleOverrides": {
    "tiebreakTrigger": "5-5"  // Override early tiebreak for this group
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "group_001",
    "groupNumber": 1,
    "groupSize": 4,
    "ruleOverrides": { /* as sent */ }
  }
}
```

**Error Responses**:
- **404 NOT_FOUND**: Group not found
- **403 FORBIDDEN**: User is not organizer or admin
- **400 INVALID_SCORING_RULES**: Validation failed

**Note**: To remove overrides, send `{ "ruleOverrides": null }`

---

### 4. Set Bracket Rule Overrides

**Purpose**: Override scoring rules for a specific bracket (US3 P2, US4 P2)

**Endpoint**: `PATCH /brackets/:id/rules`

**Authorization**: ORGANIZER, ADMIN

**Request Body**:
```json
{
  "ruleOverrides": {
    "formatType": "BIG_TIEBREAK",
    "winningTiebreaks": 1
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "bracket_main",
    "bracketType": "MAIN",
    "matchGuarantee": "2_MATCH",
    "ruleOverrides": { /* as sent */ }
  }
}
```

**Error Responses**:
- **404 NOT_FOUND**: Bracket not found
- **403 FORBIDDEN**: User is not organizer or admin
- **400 INVALID_SCORING_RULES**: Validation failed

---

### 5. Set Round Rule Overrides

**Purpose**: Override scoring rules for a specific round (US3 P2, US4 P2)

**Endpoint**: `PATCH /rounds/:id/rules`

**Authorization**: ORGANIZER, ADMIN

**Request Body**:
```json
{
  "ruleOverrides": {
    "advantageRule": "NO_ADVANTAGE"
  },
  "earlyTiebreakEnabled": true  // Optional: for "until placement" tournaments
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "round_1",
    "roundNumber": 1,
    "ruleOverrides": { /* as sent */ },
    "earlyTiebreakEnabled": true
  }
}
```

**Error Responses**:
- **404 NOT_FOUND**: Round not found
- **403 FORBIDDEN**: User is not organizer or admin
- **400 INVALID_SCORING_RULES**: Validation failed
- **400 EARLY_TIEBREAK_NOT_APPLICABLE**: earlyTiebreakEnabled set on non-"until placement" tournament

---

### 6. Set Match Rule Overrides

**Purpose**: Override scoring rules for a specific match (US3 P2, US4 P2)

**Endpoint**: `PATCH /matches/:id/rules`

**Authorization**: ORGANIZER, ADMIN

**Request Body**:
```json
{
  "ruleOverrides": {
    "tiebreakTrigger": "4-4"
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "match_001",
    "matchNumber": 1,
    "status": "SCHEDULED",
    "ruleOverrides": { /* as sent */ }
  }
}
```

**Error Responses**:
- **404 NOT_FOUND**: Match not found
- **403 FORBIDDEN**: User is not organizer or admin
- **400 INVALID_SCORING_RULES**: Validation failed
- **409 MATCH_ALREADY_COMPLETED**: Cannot change rules for completed matches

---

### 7. Get Effective Rules for Match

**Purpose**: Retrieve the resolved effective rules for a match after cascade resolution (US5 P1)

**Endpoint**: `GET /matches/:id/effective-rules`

**Authorization**: PLAYER, ORGANIZER, ADMIN

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "matchId": "match_001",
    "effectiveRules": {
      "formatType": "SETS",
      "winningSets": 2,
      "advantageRule": "ADVANTAGE",
      "tiebreakTrigger": "5-5"  // Overridden at group level
    },
    "ruleSource": {
      "tournament": {
        "formatType": "SETS",
        "winningSets": 2,
        "advantageRule": "ADVANTAGE",
        "tiebreakTrigger": "6-6"
      },
      "group": {
        "tiebreakTrigger": "5-5"  // Override
      },
      "round": null,
      "match": null
    }
  }
}
```

**Error Responses**:
- **404 NOT_FOUND**: Match not found

**Note**: This endpoint shows the cascade at all levels for transparency

---

### 8. Get Tournament Format and Rules

**Purpose**: Retrieve tournament format, format config, and all default rules (US5 P1)

**Endpoint**: `GET /tournaments/:id/format`

**Authorization**: PLAYER, ORGANIZER, ADMIN

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "tour_001",
    "name": "Summer Championship",
    "formatType": "KNOCKOUT",
    "formatConfig": {
      "formatType": "KNOCKOUT",
      "matchGuarantee": "2_MATCH"
    },
    "defaultScoringRules": {
      "formatType": "SETS",
      "winningSets": 2,
      "advantageRule": "ADVANTAGE",
      "tiebreakTrigger": "6-6"
    },
    "formatDescription": "Knockout tournament with 2-match guarantee"
  }
}
```

**Error Responses**:
- **404 NOT_FOUND**: Tournament not found

---

### 9. Validate Group Size Configuration

**Purpose**: Validate if a number of players can be divided into groups of specified size (US2 P2)

**Endpoint**: `POST /tournaments/validate-groups`

**Authorization**: ORGANIZER, ADMIN

**Request Body**:
```json
{
  "totalPlayers": 10,
  "groupSize": 4
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "valid": true,
    "groupsOfSize": 1,  // 1 group of 4
    "groupsOfSizeMinus1": 2,  // 2 groups of 3
    "distribution": "1 group of 4, 2 groups of 3"
  }
}
```

**Invalid Configuration** (200):
```json
{
  "success": true,
  "data": {
    "valid": false,
    "message": "Cannot divide 11 players into groups of 4 and 3"
  }
}
```

**Error Responses**:
- **400 INVALID_GROUP_SIZE**: groupSize not between 2 and 8

**Note**: This endpoint doesn't modify data - it's a validation utility

---

### 10. Get All Rule Overrides for Tournament

**Purpose**: Retrieve all rule overrides at all levels for organizer management (US5 P1)

**Endpoint**: `GET /tournaments/:id/all-rules`

**Authorization**: ORGANIZER, ADMIN

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "tournamentId": "tour_001",
    "defaultRules": { /* tournament defaults */ },
    "overrides": {
      "groups": [
        {
          "id": "group_001",
          "groupNumber": 1,
          "ruleOverrides": { "tiebreakTrigger": "5-5" }
        }
      ],
      "brackets": [
        {
          "id": "bracket_main",
          "bracketType": "MAIN",
          "ruleOverrides": null
        }
      ],
      "rounds": [
        {
          "id": "round_1",
          "roundNumber": 1,
          "ruleOverrides": { "advantageRule": "NO_ADVANTAGE" }
        }
      ],
      "matches": [
        {
          "id": "match_001",
          "matchNumber": 1,
          "ruleOverrides": { "tiebreakTrigger": "4-4" }
        }
      ]
    }
  }
}
```

**Error Responses**:
- **404 NOT_FOUND**: Tournament not found
- **403 FORBIDDEN**: User is not organizer or admin

---

## Format Type Descriptions (T106)

**Endpoint**: `GET /tournament-rules/format-types`

**Purpose**: Get human-readable descriptions of all format types for populating dropdowns

**Authorization**: None (public - no auth required)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "formatTypes": [
      {
        "value": "KNOCKOUT",
        "label": "Knockout",
        "description": "Single or double elimination bracket format"
      },
      {
        "value": "GROUP",
        "label": "Group Stage",
        "description": "Round-robin groups where all players face each other"
      },
      {
        "value": "SWISS",
        "label": "Swiss System",
        "description": "Swiss system pairing where players are matched based on current standings"
      },
      {
        "value": "COMBINED",
        "label": "Combined (Group + Knockout)",
        "description": "Group stage followed by knockout bracket for top finishers"
      }
    ]
  }
}
```

---

## Scoring Rule Format Descriptions (T107)

**Endpoint**: `GET /tournament-rules/scoring-formats`

**Purpose**: Get human-readable descriptions of all scoring formats, advantage rules, and tiebreak triggers for populating dropdowns

**Authorization**: None (public - no auth required)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "scoringFormats": [
      {
        "value": "SETS",
        "label": "Traditional Sets"
      },
      {
        "value": "STANDARD_TIEBREAK",
        "label": "Standard Tiebreak"
      },
      {
        "value": "BIG_TIEBREAK",
        "label": "Big Tiebreak (to 10)"
      },
      {
        "value": "MIXED",
        "label": "Mixed (Sets + Final Set Tiebreak)"
      }
    ],
    "advantageRules": [
      {
        "value": "ADVANTAGE",
        "label": "Advantage"
      },
      {
        "value": "NO_ADVANTAGE",
        "label": "No Advantage"
      }
    ],
    "tiebreakTriggers": [
      {
        "value": "6-6",
        "label": "At 6-6"
      },
      {
        "value": "5-5",
        "label": "At 5-5"
      },
      {
        "value": "4-4",
        "label": "At 4-4"
      },
      {
        "value": "3-3",
        "label": "At 3-3"
      }
    ]
  }
}
```

---

## Error Codes Reference (T111)

All error codes defined in `backend/src/types/errorCodes.js`:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| **Entity Not Found (404)** |||
| TOURNAMENT_NOT_FOUND | 404 | Tournament ID not found |
| GROUP_NOT_FOUND | 404 | Group ID not found |
| BRACKET_NOT_FOUND | 404 | Bracket ID not found |
| ROUND_NOT_FOUND | 404 | Round ID not found |
| MATCH_NOT_FOUND | 404 | Match ID not found |
| **Authorization (401/403)** |||
| UNAUTHORIZED | 401 | User not authenticated |
| FORBIDDEN | 403 | User lacks permission |
| **Format Validation (400)** |||
| INVALID_FORMAT_TYPE | 400 | formatType not in enum |
| FORMAT_CONFIG_MISMATCH | 400 | formatConfig doesn't match formatType |
| INVALID_FORMAT_CONFIG | 400 | Invalid format configuration |
| INVALID_MATCH_GUARANTEE | 400 | Invalid match guarantee option |
| INVALID_GROUP_SIZE | 400 | groupSize not in range 2-8 |
| INVALID_SWISS_ROUNDS | 400 | Swiss tournaments require at least 3 rounds |
| **Scoring Rules Validation (400)** |||
| INVALID_SCORING_FORMAT | 400 | Invalid scoring format type |
| INVALID_WINNING_SETS | 400 | Winning sets must be 1, 2, or 3 |
| INVALID_WINNING_GAMES | 400 | Winning games must be 1-10 |
| INVALID_ADVANTAGE_RULE | 400 | Invalid advantage rule option |
| INVALID_TIEBREAK_TRIGGER | 400 | Invalid tiebreak trigger value |
| INVALID_MATCH_TIEBREAK_POINTS | 400 | Match tiebreak points must be at least 7 |
| **Active Tournament Errors (409/400)** |||
| FORMAT_CHANGE_NOT_ALLOWED | 409 | Cannot change format after matches started |
| RULE_CHANGE_ON_COMPLETED_MATCH | 409 | Cannot change rules for completed match |
| TOURNAMENT_HAS_ACTIVE_MATCHES | 409 | Operation blocked due to active matches |
| **General Errors** |||
| VALIDATION_FAILED | 400 | General validation failure |
| MISSING_PARAMETERS | 400 | Required parameters missing |
| INTERNAL_SERVER_ERROR | 500 | Unexpected server error |

## Notes

- All PATCH endpoints support partial updates (only send fields to change)
- Setting ruleOverrides to `null` removes overrides and falls back to parent level
- Format and format config can only be changed if no matches have status = COMPLETED
- Default scoring rules can be changed at any time (applies only to future matches)
- Rule overrides at group/bracket/round/match can be changed only for SCHEDULED matches
- When match is completed, effective rules are snapshotted to completedWithRules field
- All timestamps use ISO 8601 format (UTC)
- All IDs are UUIDs
