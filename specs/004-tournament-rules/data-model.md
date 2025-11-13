# Data Model: Tournament Rules and Formats

**Feature**: 004-tournament-rules | **Date**: 2025-01-07

## Overview

This document defines the data models for tournament rules and formats system, extending the existing Tournament model with format configuration, match scoring rules, and cascading rule overrides at group, bracket, round, and match levels.

## Entity Definitions

### Tournament (Extended)

**Purpose**: Stores tournament format type, format-specific configuration, and default match scoring rules

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Existing field |
| name | String | Required | Existing field |
| categoryId | String | FK → Category | Existing field |
| formatType | String | Enum, Required | KNOCKOUT, GROUP, SWISS, COMBINED |
| formatConfig | JSON | Required | Format-specific configuration (see Format Config Types) |
| defaultScoringRules | JSON | Required | Default match scoring rules for all matches (see Scoring Rules Structure) |
| ...existing fields | ... | ... | From 002, 003 features |

**Relationships**:
- One-to-many with Group (groups for group/combined tournaments)
- One-to-many with Bracket (brackets for knockout/combined tournaments)
- One-to-many with Round (rounds for swiss system)
- One-to-many with Match (all matches in tournament)

**Validation**:
- formatType must be one of: KNOCKOUT, GROUP, SWISS, COMBINED
- formatConfig structure must match formatType (see Format Config Types)
- defaultScoringRules must be valid scoring rules JSON (see Scoring Rules Structure)

**Indexes**:
- id (primary key)
- categoryId (foreign key index)

---

### Group

**Purpose**: Represents a group in group-stage or combined tournament

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| tournamentId | String | FK → Tournament, Required | Parent tournament |
| groupNumber | Integer | Required | Group number (1-indexed) |
| groupSize | Integer | Required | Actual size of this group (may be X or X-1) |
| ruleOverrides | JSON | Nullable | Group-specific rule overrides (see Scoring Rules Structure) |
| advancementCriteria | JSON | Nullable | For combined: who advances and to which bracket |

**Relationships**:
- Many-to-one with Tournament
- One-to-many with Match (matches within this group)
- One-to-many with GroupParticipant (players in this group)

**Validation**:
- groupSize must be between 2 and 8
- If ruleOverrides present, must be valid scoring rules JSON
- advancementCriteria required only for combined tournaments

**Indexes**:
- id (primary key)
- tournamentId (foreign key index)
- (tournamentId, groupNumber) (unique constraint)

---

### Bracket

**Purpose**: Represents a knockout bracket (main, consolation, losers)

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| tournamentId | String | FK → Tournament, Required | Parent tournament |
| bracketType | String | Enum, Required | MAIN, CONSOLATION, LOSERS |
| matchGuarantee | String | Enum, Required | 1_MATCH, 2_MATCH, UNTIL_PLACEMENT |
| ruleOverrides | JSON | Nullable | Bracket-specific rule overrides (see Scoring Rules Structure) |

**Relationships**:
- Many-to-one with Tournament
- One-to-many with Round (rounds within this bracket)
- One-to-many with Match (matches in this bracket)

**Validation**:
- bracketType must be one of: MAIN, CONSOLATION, LOSERS
- matchGuarantee must be one of: 1_MATCH, 2_MATCH, UNTIL_PLACEMENT
- If ruleOverrides present, must be valid scoring rules JSON

**Indexes**:
- id (primary key)
- tournamentId (foreign key index)
- (tournamentId, bracketType) (unique constraint for MAIN, non-unique for CONSOLATION/LOSERS)

---

### Round

**Purpose**: Represents a round in knockout bracket or swiss system

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| tournamentId | String | FK → Tournament, Required | Parent tournament |
| bracketId | String | FK → Bracket, Nullable | For knockout: parent bracket (null for swiss) |
| roundNumber | Integer | Required | Round number (1-indexed) |
| ruleOverrides | JSON | Nullable | Round-specific rule overrides (see Scoring Rules Structure) |
| earlyTiebreakEnabled | Boolean | Default false | For "until placement": early tiebreak for remaining matches |

**Relationships**:
- Many-to-one with Tournament
- Many-to-one with Bracket (nullable, for knockout only)
- One-to-many with Match (matches in this round)

**Validation**:
- roundNumber must be positive integer
- If ruleOverrides present, must be valid scoring rules JSON
- earlyTiebreakEnabled only relevant for "until placement" knockout tournaments

**Indexes**:
- id (primary key)
- tournamentId (foreign key index)
- bracketId (foreign key index, nullable)
- (tournamentId, bracketId, roundNumber) (unique constraint)

---

### Match

**Purpose**: Represents an individual match with specific rules and historical snapshot

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| tournamentId | String | FK → Tournament, Required | Parent tournament |
| groupId | String | FK → Group, Nullable | For group/combined tournaments |
| bracketId | String | FK → Bracket, Nullable | For knockout/combined tournaments |
| roundId | String | FK → Round, Nullable | For knockout/swiss tournaments |
| matchNumber | Integer | Required | Match number within tournament |
| player1Id | String | FK → PlayerProfile, Required | First player |
| player2Id | String | FK → PlayerProfile, Required | Second player |
| status | String | Enum, Required | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| result | JSON | Nullable | Match result (scores, winner) |
| ruleOverrides | JSON | Nullable | Match-specific rule overrides (see Scoring Rules Structure) |
| completedWithRules | JSON | Nullable | Immutable snapshot of effective rules when match was completed |
| completedAt | DateTime | Nullable | Timestamp when match was completed |

**Relationships**:
- Many-to-one with Tournament
- Many-to-one with Group (nullable)
- Many-to-one with Bracket (nullable)
- Many-to-one with Round (nullable)
- Many-to-one with PlayerProfile (player1)
- Many-to-one with PlayerProfile (player2)

**Validation**:
- status must be one of: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- If ruleOverrides present, must be valid scoring rules JSON
- completedWithRules must be set when status changes to COMPLETED
- player1Id and player2Id must be different

**Indexes**:
- id (primary key)
- tournamentId (foreign key index)
- groupId, bracketId, roundId (foreign key indexes, nullable)
- player1Id, player2Id (foreign key indexes)

---

### GroupParticipant

**Purpose**: Tracks which players are in which group

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| groupId | String | FK → Group, Required | Parent group |
| playerId | String | FK → PlayerProfile, Required | Player in this group |
| seedPosition | Integer | Nullable | Seeding position (placeholder for future feature) |

**Relationships**:
- Many-to-one with Group
- Many-to-one with PlayerProfile

**Validation**:
- (groupId, playerId) must be unique

**Indexes**:
- id (primary key)
- groupId (foreign key index)
- playerId (foreign key index)
- (groupId, playerId) (unique constraint)

## JSON Structure Definitions

### Format Config Types

#### Knockout Format
```json
{
  "formatType": "KNOCKOUT",
  "matchGuarantee": "1_MATCH" | "2_MATCH" | "UNTIL_PLACEMENT"
}
```

#### Group Format
```json
{
  "formatType": "GROUP",
  "groupSize": 4,  // Desired group size (2-8)
  "singleGroup": false  // true if tournament has only one group
}
```

#### Swiss Format
```json
{
  "formatType": "SWISS",
  "rounds": 5  // Number of swiss rounds
}
```

#### Combined Format
```json
{
  "formatType": "COMBINED",
  "groupSize": 4,  // Desired group size for group stage
  "advancementRules": [
    { "position": 1, "bracket": "MAIN" },
    { "position": 2, "bracket": "MAIN" },
    { "position": 3, "bracket": "CONSOLATION" },
    { "position": 4, "bracket": "NONE" }
  ]
}
```

### Scoring Rules Structure

```json
{
  "formatType": "SETS" | "STANDARD_TIEBREAK" | "BIG_TIEBREAK" | "MIXED",

  // For SETS format
  "winningSets": 1 | 2,
  "advantageRule": "ADVANTAGE" | "NO_ADVANTAGE",
  "tiebreakTrigger": "6-6" | "5-5" | "4-4" | "3-3",

  // For STANDARD_TIEBREAK format
  "winningTiebreaks": 1 | 2 | 3,

  // For BIG_TIEBREAK format
  "winningTiebreaks": 1 | 2,

  // For MIXED format
  "winningSets": 1 | 2,
  "advantageRule": "ADVANTAGE" | "NO_ADVANTAGE",
  "tiebreakTrigger": "6-6" | "5-5" | "4-4" | "3-3",
  "finalSetTiebreak": "STANDARD" | "BIG"
}
```

## State Transitions

### Match Status

```
SCHEDULED → IN_PROGRESS → COMPLETED
    ↓
CANCELLED (can happen from SCHEDULED or IN_PROGRESS)
```

**Rules**:
- completedWithRules snapshot created during SCHEDULED/IN_PROGRESS → COMPLETED transition
- Rule overrides can be changed only when status is SCHEDULED
- Result is set during IN_PROGRESS → COMPLETED transition

### Tournament Format

```
[Format selected at creation] → [Cannot change after matches played]
```

**Rules**:
- formatType is set at tournament creation
- formatType cannot be changed if any matches have status != SCHEDULED
- formatConfig can be updated as long as no matches are COMPLETED

## Validation Rules

### Cross-Entity Validation

1. **Group Size Consistency**:
   - Sum of Group.groupSize must equal number of registered participants
   - Each group must have groupSize = formatConfig.groupSize OR groupSize = formatConfig.groupSize - 1

2. **Advancement Rules Consistency**:
   - For combined tournaments, advancementRules positions must be 1 through groupSize
   - Each position can only appear once in advancementRules
   - Bracket values must be valid: MAIN, CONSOLATION, LOSERS, or NONE

3. **Match Assignment Consistency**:
   - Match must have exactly one of: groupId, bracketId, roundId (depending on format type)
   - Knockout/Combined matches: must have bracketId and roundId
   - Group/Combined matches: must have groupId
   - Swiss matches: must have roundId only

4. **Rule Cascade Integrity**:
   - Group.tournamentId must match parent Tournament
   - Bracket.tournamentId must match parent Tournament
   - Round.tournamentId must match parent Tournament (and Bracket if present)
   - Match.tournamentId must match all parent entities

### Field Validation

1. **Group Size**: 2 ≤ groupSize ≤ 8
2. **Round Number**: roundNumber ≥ 1
3. **Match Number**: matchNumber ≥ 1
4. **Scoring Rules Format Type**: Must be SETS, STANDARD_TIEBREAK, BIG_TIEBREAK, or MIXED
5. **Advantage Rule**: Must be ADVANTAGE or NO_ADVANTAGE
6. **Tiebreak Trigger**: Must be 6-6, 5-5, 4-4, or 3-3
7. **Winning Sets**: Must be 1 or 2
8. **Winning Tiebreaks**: 1-3 for standard, 1-2 for big

## Example Data

### Tournament with Knockout Format
```json
{
  "id": "tour_knockout_001",
  "name": "Summer Singles Championship",
  "categoryId": "cat_mens_35",
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
```

### Tournament with Group Format
```json
{
  "id": "tour_group_001",
  "name": "Round Robin League",
  "categoryId": "cat_womens_20",
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
}
```

### Group with Rule Override
```json
{
  "id": "group_001",
  "tournamentId": "tour_group_001",
  "groupNumber": 1,
  "groupSize": 4,
  "ruleOverrides": {
    "tiebreakTrigger": "5-5"  // Override: early tiebreak for this group
  },
  "advancementCriteria": null
}
```

### Match with Historical Snapshot
```json
{
  "id": "match_001",
  "tournamentId": "tour_knockout_001",
  "groupId": null,
  "bracketId": "bracket_main",
  "roundId": "round_1",
  "matchNumber": 1,
  "player1Id": "player_john",
  "player2Id": "player_jane",
  "status": "COMPLETED",
  "result": { "winner": "player_john", "score": "6-4 6-2" },
  "ruleOverrides": null,
  "completedWithRules": {
    "formatType": "SETS",
    "winningSets": 2,
    "advantageRule": "ADVANTAGE",
    "tiebreakTrigger": "6-6"
  },
  "completedAt": "2025-01-05T15:30:00Z"
}
```

## Migration Considerations

### Changes to Existing Models

**Tournament** (from 002, 003):
- Add `formatType` (String, Enum, Required)
- Add `formatConfig` (JSON, Required)
- Add `defaultScoringRules` (JSON, Required)

**No changes** to:
- Category (002)
- CategoryRegistration (002)
- CategoryRanking (002)
- TournamentRegistration (003)

### New Models to Create

- Group
- Bracket
- Round
- Match
- GroupParticipant

### Default Values for Existing Tournaments

When migrating existing tournaments (from 002, 003):
- Set `formatType = "KNOCKOUT"`
- Set `formatConfig = { "formatType": "KNOCKOUT", "matchGuarantee": "1_MATCH" }`
- Set `defaultScoringRules = { "formatType": "SETS", "winningSets": 2, "advantageRule": "ADVANTAGE", "tiebreakTrigger": "6-6" }`

## Query Patterns

### Get Effective Rules for Match
```javascript
// Cascade: match → round → group/bracket → tournament
const match = await prisma.match.findUnique({
  where: { id: matchId },
  include: {
    round: {
      include: {
        bracket: true  // For knockout
      }
    },
    group: true,  // For group/combined
    tournament: true
  }
});

const effectiveRules = {
  ...match.tournament.defaultScoringRules,
  ...(match.group?.ruleOverrides || match.round?.bracket?.ruleOverrides || {}),
  ...(match.round?.ruleOverrides || {}),
  ...(match.ruleOverrides || {})
};
```

### Get All Tournaments by Format
```javascript
const knockoutTournaments = await prisma.tournament.findMany({
  where: { formatType: 'KNOCKOUT' }
});
```

### Get Matches with Rule Overrides
```javascript
const matchesWithOverrides = await prisma.match.findMany({
  where: {
    tournamentId,
    ruleOverrides: { not: null }
  }
});
```

## Diagram

```
Tournament (1) ──┬── (M) Group ──── (M) GroupParticipant ── (M) PlayerProfile
                 │                └── (M) Match
                 │
                 ├── (M) Bracket ──── (M) Round ──── (M) Match
                 │
                 └── (M) Round (swiss only) ──── (M) Match


Cascade Resolution Path:
Match.ruleOverrides
  ↓ (if null, check parent)
Round.ruleOverrides
  ↓ (if null, check parent)
Group.ruleOverrides OR Bracket.ruleOverrides
  ↓ (if null, use default)
Tournament.defaultScoringRules
```
