# Quickstart: Tournament Rules and Formats

**Feature**: 004-tournament-rules | **Date**: 2025-01-07

## Overview

This guide demonstrates end-to-end usage of the tournament rules and formats system, covering format configuration, cascading rule overrides, and rule viewing for all tournament types.

## Prerequisites

- User account with ORGANIZER or ADMIN role
- Existing tournament created via 003-tournament-registration
- Players registered for the tournament

## Scenario 1: Configure Knockout Tournament with 2-Match Guarantee (P1)

**Goal**: Set up a knockout tournament where every player is guaranteed at least 2 matches

### Step 1: Set Tournament Format

```bash
# Login as organizer
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@example.com",
    "password": "password123"
  }' \
  -c cookies.txt

# Set knockout format with 2-match guarantee
curl -X PATCH http://localhost:3000/api/v1/tournaments/tour_001/format \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
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
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "tour_001",
    "name": "Summer Singles Championship",
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
    }
  }
}
```

### Step 2: View Tournament Format (as player)

```bash
# Login as player
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "password123"
  }' \
  -c player_cookies.txt

# Get tournament format and rules
curl -X GET http://localhost:3000/api/v1/tournaments/tour_001/format \
  -H "Content-Type: application/json" \
  -b player_cookies.txt
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "tour_001",
    "name": "Summer Singles Championship",
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

---

## Scenario 2: Configure Group Tournament with Dynamic Groups (P2)

**Goal**: Set up a group tournament with groups of 4 players, with groups of 3 as needed

### Step 1: Validate Group Size Configuration

```bash
# Check if 10 players can be divided into groups of 4
curl -X POST http://localhost:3000/api/v1/tournaments/validate-groups \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "totalPlayers": 10,
    "groupSize": 4
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "groupsOfSize": 1,
    "groupsOfSizeMinus1": 2,
    "distribution": "1 group of 4, 2 groups of 3"
  }
}
```

### Step 2: Set Tournament Format

```bash
curl -X PATCH http://localhost:3000/api/v1/tournaments/tour_002/format \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "formatType": "GROUP",
    "formatConfig": {
      "formatType": "GROUP",
      "groupSize": 4,
      "singleGroup": false
    },
    "defaultScoringRules": {
      "formatType": "BIG_TIEBREAK",
      "winningTiebreaks": 1
    }
  }'
```

### Step 3: Override Rules for Larger Group

```bash
# Set early tiebreak for group with 4 players (more matches = tighter schedule)
curl -X PATCH http://localhost:3000/api/v1/groups/group_001/rules \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "ruleOverrides": {
      "tiebreakTrigger": "5-5"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "group_001",
    "groupNumber": 1,
    "groupSize": 4,
    "ruleOverrides": {
      "tiebreakTrigger": "5-5"
    }
  }
}
```

---

## Scenario 3: Configure Combined Tournament (P2)

**Goal**: Set up a tournament with group stage followed by knockout brackets

### Step 1: Set Tournament Format

```bash
curl -X PATCH http://localhost:3000/api/v1/tournaments/tour_003/format \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "formatType": "COMBINED",
    "formatConfig": {
      "formatType": "COMBINED",
      "groupSize": 4,
      "advancementRules": [
        { "position": 1, "bracket": "MAIN" },
        { "position": 2, "bracket": "MAIN" },
        { "position": 3, "bracket": "CONSOLATION" },
        { "position": 4, "bracket": "NONE" }
      ]
    },
    "defaultScoringRules": {
      "formatType": "SETS",
      "winningSets": 2,
      "advantageRule": "NO_ADVANTAGE",
      "tiebreakTrigger": "6-6"
    }
  }'
```

### Step 2: Set Different Rules for Knockout Stage

```bash
# Use advantage rule for knockout stage (more important matches)
curl -X PATCH http://localhost:3000/api/v1/brackets/bracket_main/rules \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "ruleOverrides": {
      "advantageRule": "ADVANTAGE"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "bracket_main",
    "bracketType": "MAIN",
    "matchGuarantee": "1_MATCH",
    "ruleOverrides": {
      "advantageRule": "ADVANTAGE"
    }
  }
}
```

---

## Scenario 4: Adjust Rules During Active Tournament (P2)

**Goal**: Change rules mid-tournament to save time

### Step 1: Update Default Rules for Remaining Matches

```bash
# Tournament is running late - switch to no-advantage for remaining matches
curl -X PATCH http://localhost:3000/api/v1/tournaments/tour_001/default-rules \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "formatType": "SETS",
    "winningSets": 2,
    "advantageRule": "NO_ADVANTAGE",
    "tiebreakTrigger": "6-6"
  }'
```

### Step 2: Enable Early Tiebreak for Specific Round

```bash
# For "until placement" tournament: enable early tiebreak for remaining matches in round 2
curl -X PATCH http://localhost:3000/api/v1/rounds/round_2/rules \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "earlyTiebreakEnabled": true,
    "ruleOverrides": {
      "tiebreakTrigger": "5-5"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "round_2",
    "roundNumber": 2,
    "ruleOverrides": {
      "tiebreakTrigger": "5-5"
    },
    "earlyTiebreakEnabled": true
  }
}
```

### Step 3: Override Rule for Specific Match

```bash
# Special accommodation: use early tiebreak for one specific match
curl -X PATCH http://localhost:3000/api/v1/matches/match_042/rules \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "ruleOverrides": {
      "tiebreakTrigger": "4-4"
    }
  }'
```

---

## Scenario 5: View Effective Rules for Match (P1)

**Goal**: See exactly which rules apply to a specific match after cascade resolution

### Get Effective Rules with Cascade Breakdown

```bash
curl -X GET http://localhost:3000/api/v1/matches/match_042/effective-rules \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Response**:
```json
{
  "success": true,
  "data": {
    "matchId": "match_042",
    "effectiveRules": {
      "formatType": "SETS",
      "winningSets": 2,
      "advantageRule": "NO_ADVANTAGE",
      "tiebreakTrigger": "4-4"
    },
    "ruleSource": {
      "tournament": {
        "formatType": "SETS",
        "winningSets": 2,
        "advantageRule": "NO_ADVANTAGE",
        "tiebreakTrigger": "6-6"
      },
      "group": null,
      "round": {
        "tiebreakTrigger": "5-5"
      },
      "match": {
        "tiebreakTrigger": "4-4"
      }
    }
  }
}
```

**Interpretation**:
- Tournament default: 2 sets, no advantage, tiebreak at 6-6
- Round override: tiebreak at 5-5 (early tiebreak enabled)
- Match override: tiebreak at 4-4 (special accommodation)
- **Final effective rule**: 2 sets, no advantage, tiebreak at 4-4

---

## Scenario 6: View All Rule Overrides (P1)

**Goal**: Get comprehensive view of all rule customizations in tournament

```bash
curl -X GET http://localhost:3000/api/v1/tournaments/tour_003/all-rules \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Response**:
```json
{
  "success": true,
  "data": {
    "tournamentId": "tour_003",
    "defaultRules": {
      "formatType": "SETS",
      "winningSets": 2,
      "advantageRule": "NO_ADVANTAGE",
      "tiebreakTrigger": "6-6"
    },
    "overrides": {
      "groups": [
        {
          "id": "group_001",
          "groupNumber": 1,
          "ruleOverrides": null
        },
        {
          "id": "group_002",
          "groupNumber": 2,
          "ruleOverrides": {
            "tiebreakTrigger": "5-5"
          }
        }
      ],
      "brackets": [
        {
          "id": "bracket_main",
          "bracketType": "MAIN",
          "ruleOverrides": {
            "advantageRule": "ADVANTAGE"
          }
        },
        {
          "id": "bracket_consolation",
          "bracketType": "CONSOLATION",
          "ruleOverrides": null
        }
      ],
      "rounds": [
        {
          "id": "round_1",
          "roundNumber": 1,
          "ruleOverrides": null
        },
        {
          "id": "round_2",
          "roundNumber": 2,
          "ruleOverrides": {
            "tiebreakTrigger": "4-4"
          }
        }
      ],
      "matches": [
        {
          "id": "match_042",
          "matchNumber": 42,
          "ruleOverrides": {
            "formatType": "BIG_TIEBREAK",
            "winningTiebreaks": 1
          }
        }
      ]
    }
  }
}
```

---

## Scenario 7: Historical Rule Preservation (P2)

**Goal**: Verify that completed matches preserve their original rules

### Step 1: Complete a Match

```bash
# Match is completed (this would be done by match execution system)
# completedWithRules is automatically set to effective rules at time of completion
```

### Step 2: Change Tournament Rules

```bash
# Change default rules after match is completed
curl -X PATCH http://localhost:3000/api/v1/tournaments/tour_001/default-rules \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "formatType": "BIG_TIEBREAK",
    "winningTiebreaks": 1
  }'
```

### Step 3: View Completed Match Rules

```bash
# Get match details showing historical rules
curl -X GET http://localhost:3000/api/v1/matches/match_001 \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "match_001",
    "matchNumber": 1,
    "status": "COMPLETED",
    "result": { "winner": "player_john", "score": "6-4 6-2" },
    "completedAt": "2025-01-05T15:30:00Z",
    "completedWithRules": {
      "formatType": "SETS",
      "winningSets": 2,
      "advantageRule": "ADVANTAGE",
      "tiebreakTrigger": "6-6"
    },
    "currentTournamentRules": {
      "formatType": "BIG_TIEBREAK",
      "winningTiebreaks": 1
    }
  }
}
```

**Note**: Match was played under "2 sets, advantage" rules, which are preserved in `completedWithRules` even though tournament default has changed to "big tiebreak"

---

## Scenario 8: Get Format and Scoring Type Metadata (T106-T107)

**Goal**: Display format options and descriptions in UI dropdowns

### Get Format Types (T106)

```bash
# No authentication required - public endpoint
curl -X GET http://localhost:3000/api/v1/tournament-rules/format-types \
  -H "Content-Type: application/json"
```

**Response**:
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

### Get Scoring Formats (T107)

```bash
# No authentication required - public endpoint
curl -X GET http://localhost:3000/api/v1/tournament-rules/scoring-formats \
  -H "Content-Type: application/json"
```

**Response**:
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

## Frontend Usage Examples

### React Component: Format Selector

```jsx
import React, { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import { getFormatTypes } from '../services/tournamentRulesService';

function TournamentFormatSelector({ value, onChange }) {
  const [formatTypes, setFormatTypes] = useState([]);

  useEffect(() => {
    async function loadFormats() {
      const types = await getFormatTypes();
      setFormatTypes(types);
    }
    loadFormats();
  }, []);

  return (
    <Form.Group>
      <Form.Label>Tournament Format</Form.Label>
      <Form.Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select format...</option>
        {formatTypes.map(format => (
          <option key={format.value} value={format.value}>
            {format.label} - {format.description}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
}
```

### React Component: Rule Cascade Viewer

```jsx
import React from 'react';
import { Card, Badge } from 'react-bootstrap';

function RuleCascadeViewer({ ruleSource, effectiveRules }) {
  return (
    <Card>
      <Card.Header>Effective Match Rules</Card.Header>
      <Card.Body>
        <div className="mb-3">
          <strong>Final Rules:</strong>
          <pre>{JSON.stringify(effectiveRules, null, 2)}</pre>
        </div>

        <div>
          <strong>Rule Sources:</strong>
          <div className="ms-3">
            <div>
              <Badge bg="secondary">Tournament Default</Badge>
              <pre>{JSON.stringify(ruleSource.tournament, null, 2)}</pre>
            </div>

            {ruleSource.group && (
              <div>
                <Badge bg="info">Group Override</Badge>
                <pre>{JSON.stringify(ruleSource.group, null, 2)}</pre>
              </div>
            )}

            {ruleSource.round && (
              <div>
                <Badge bg="warning">Round Override</Badge>
                <pre>{JSON.stringify(ruleSource.round, null, 2)}</pre>
              </div>
            )}

            {ruleSource.match && (
              <div>
                <Badge bg="danger">Match Override</Badge>
                <pre>{JSON.stringify(ruleSource.match, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
```

---

## Common Error Scenarios

### Attempt to Change Format After Matches Completed

```bash
curl -X PATCH http://localhost:3000/api/v1/tournaments/tour_001/format \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{ "formatType": "GROUP", ... }'
```

**Error Response** (409):
```json
{
  "success": false,
  "error": {
    "code": "MATCHES_ALREADY_PLAYED",
    "message": "Cannot change tournament format after matches have been completed"
  }
}
```

### Invalid Group Size Distribution

```bash
curl -X POST http://localhost:3000/api/v1/tournaments/validate-groups \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "totalPlayers": 11,
    "groupSize": 4
  }'
```

**Response** (200 - validation failed):
```json
{
  "success": true,
  "data": {
    "valid": false,
    "message": "Cannot divide 11 players into groups of 4 and 3"
  }
}
```

### Attempt to Set Rule Override on Completed Match

```bash
curl -X PATCH http://localhost:3000/api/v1/matches/match_001/rules \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{ "ruleOverrides": { "advantageRule": "NO_ADVANTAGE" } }'
```

**Error Response** (409):
```json
{
  "success": false,
  "error": {
    "code": "MATCH_ALREADY_COMPLETED",
    "message": "Cannot change rules for completed matches"
  }
}
```

---

## Summary

This quickstart covered:

✅ **P1 Features**:
- Setting tournament format and basic rules (knockout example)
- Viewing tournament format and rules as player
- Getting effective rules for match with cascade breakdown

✅ **P2 Features**:
- Configuring format-specific settings (group size, advancement rules)
- Setting cascading rule overrides at group, bracket, round, and match levels
- Adjusting rules during active tournament
- Historical rule preservation for completed matches

✅ **Utility Features**:
- Validating group size configurations
- Getting format and scoring type metadata for UI

The system successfully demonstrates cascading rule resolution, dynamic rule adjustment, and historical preservation while maintaining clear transparency for all participants.
