# Data Model: Knockout Bracket Generation

**Feature**: 009-bracket-generation
**Date**: 2026-01-10
**Purpose**: Define entities, attributes, relationships, and validation rules

## Overview

This feature involves **read-only data** from a static JSON file. No database models or persistence layer is required. The entities below represent the logical data structures used in the application layer.

---

## Entities

### 1. BracketTemplate

**Purpose**: Represents a single knockout bracket structure template for a specific player count.

**Source**: Loaded from `docs/bracket-templates-all.json`

**Attributes**:

| Attribute | Type | Description | Validation | Example |
|-----------|------|-------------|------------|---------|
| `playerCount` | Integer | Number of players in the tournament | Required, min: 4, max: 128 | `7` |
| `structure` | String | Pattern of 0s and 1s indicating matches/byes | Required, regex: `^[01\s]+$` | `"1000"` |
| `preliminaryMatches` | Integer | Count of matches in first round | Calculated: count of '0' / 2 | `3` |
| `byes` | Integer | Count of byes (automatic advancement) | Calculated: count of '1' | `1` |
| `bracketSize` | Integer | Bracket slot size (power of 2) | Calculated: next power of 2 ≥ playerCount | `8` |

**JSON Source Format**:
```json
{
  "key": "7",
  "value": "1000"
}
```

**Application Format**:
```javascript
{
  playerCount: 7,
  structure: "1000",
  preliminaryMatches: 3,
  byes: 1,
  bracketSize: 8
}
```

**Business Rules**:
- One template per player count (4-128)
- Structure must contain only '0', '1', and spaces
- Total slots (0s + 1s, ignoring spaces) must equal bracketSize
- bracketSize must be a power of 2 (4, 8, 16, 32, 64, 128)
- preliminaryMatches + byes = playerCount (when counting individual slots)

**Validation Rules**:
```javascript
{
  playerCount: {
    type: 'integer',
    min: 4,
    max: 128,
    required: true
  },
  structure: {
    type: 'string',
    pattern: /^[01\s]+$/,
    required: true,
    minLength: 2
  }
}
```

---

### 2. SeedingConfiguration

**Purpose**: Defines how many players should be seeded based on tournament size.

**Source**: Calculated based on predefined ranges (FR-004)

**Attributes**:

| Attribute | Type | Description | Validation | Example |
|-----------|------|-------------|------------|---------|
| `playerCount` | Integer | Number of players in the tournament | Required, min: 4, max: 128 | `15` |
| `seededPlayers` | Integer | Number of players to be seeded | Required, one of: [2, 4, 8, 16] | `4` |
| `range` | Object | Min/max range for this seeding level | Informational | `{ min: 10, max: 19 }` |

**Seeding Ranges** (per FR-004):
```javascript
const SEEDING_RANGES = [
  { min: 4,  max: 9,   seededPlayers: 2 },
  { min: 10, max: 19,  seededPlayers: 4 },
  { min: 20, max: 39,  seededPlayers: 8 },
  { min: 40, max: 128, seededPlayers: 16 }
];
```

**Application Format**:
```javascript
{
  playerCount: 15,
  seededPlayers: 4,
  range: { min: 10, max: 19 }
}
```

**Business Rules**:
- seededPlayers is always a power of 2 (2, 4, 8, 16)
- Ranges are non-overlapping and exhaustive (cover 4-128)
- seededPlayers ≤ playerCount (always true given ranges)
- seededPlayers ≤ bracketSize (always true given ranges)

**Validation Rules**:
```javascript
{
  playerCount: {
    type: 'integer',
    min: 4,
    max: 128,
    required: true
  }
}
```

---

## Relationships

### BracketTemplate ↔ SeedingConfiguration

**Relationship**: Indirect association through `playerCount`

```
playerCount (7)
    ↓
BracketTemplate { structure: "1000", byes: 1, ... }
    +
SeedingConfiguration { seededPlayers: 2, range: { min: 4, max: 9 } }
```

**Cardinality**: One-to-One (for a given playerCount)

**Usage**: When organizer queries bracket information for a tournament, both entities are retrieved:
1. BracketTemplate provides the bracket structure pattern
2. SeedingConfiguration provides the seeding requirements

---

## State Transitions

**Not Applicable**: This feature deals with static, read-only data with no state changes.

---

## Data Flow

```
┌─────────────────────────────────────────┐
│  docs/bracket-templates-all.json        │
│  (Static source data)                   │
└────────────────┬────────────────────────┘
                 │ Load on startup
                 ↓
┌─────────────────────────────────────────┐
│  In-Memory Cache                        │
│  Map<playerCount, BracketTemplate>      │
└────────────────┬────────────────────────┘
                 │ Lookup by playerCount
                 ↓
┌─────────────────────────────────────────┐
│  bracketService.getBracketByPlayerCount │
│  - Retrieves template                   │
│  - Calculates derived fields            │
│  - Returns enriched BracketTemplate     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  SEEDING_RANGES (Constant)              │
│  Array of range definitions             │
└────────────────┬────────────────────────┘
                 │ Find matching range
                 ↓
┌─────────────────────────────────────────┐
│  seedingService.getSeedingConfig        │
│  - Finds matching range                 │
│  - Returns SeedingConfiguration         │
└─────────────────────────────────────────┘
```

---

## Validation Summary

### Input Validation (API Layer)

**Bracket Structure Request**:
- playerCount: integer, 4-128, required

**Seeding Configuration Request**:
- playerCount: integer, 4-128, required

### Data Integrity Validation (Service Layer)

**Template Validation** (on load):
- All player counts 4-128 must have templates
- Structure must match `^[01\s]+$` pattern
- Calculated fields must be consistent (tested in FR-012 tests)

**Seeding Validation** (on calculation):
- playerCount must fall into exactly one range
- Ranges must be exhaustive and non-overlapping (validated in tests)

---

## Error Scenarios

| Scenario | Error Code | HTTP Status | Message |
|----------|-----------|-------------|---------|
| playerCount < 4 | `INVALID_PLAYER_COUNT` | 400 | "Player count must be at least 4" |
| playerCount > 128 | `INVALID_PLAYER_COUNT` | 400 | "Player count cannot exceed 128" |
| playerCount not integer | `INVALID_PLAYER_COUNT` | 400 | "Player count must be an integer" |
| Template not found | `BRACKET_NOT_FOUND` | 404 | "No bracket template found for {N} players" |
| Template file missing | `TEMPLATE_LOAD_ERROR` | 500 | "Failed to load bracket templates" |
| Invalid JSON format | `TEMPLATE_LOAD_ERROR` | 500 | "Bracket template file is corrupted" |

---

## Derived Fields Calculation

### preliminaryMatches

```javascript
function calculatePreliminaryMatches(structure) {
  const cleanStructure = structure.replace(/\s/g, ''); // Remove spaces
  const matchCount = cleanStructure.split('').filter(c => c === '0').length;
  return matchCount / 2; // Each match involves 2 slots
}
```

### byes

```javascript
function calculateByes(structure) {
  const cleanStructure = structure.replace(/\s/g, '');
  return cleanStructure.split('').filter(c => c === '1').length;
}
```

### bracketSize

```javascript
function calculateBracketSize(playerCount) {
  return Math.pow(2, Math.ceil(Math.log2(playerCount)));
}

// Examples:
// 7 players → 8 bracket size
// 9 players → 16 bracket size
// 16 players → 16 bracket size
```

---

## Data Access Patterns

### Pattern 1: Retrieve Bracket Structure

```javascript
const template = await bracketService.getBracketByPlayerCount(7);
// Returns: {
//   playerCount: 7,
//   structure: "1000",
//   preliminaryMatches: 3,
//   byes: 1,
//   bracketSize: 8
// }
```

### Pattern 2: Retrieve Seeding Configuration

```javascript
const config = seedingService.getSeedingConfig(15);
// Returns: {
//   playerCount: 15,
//   seededPlayers: 4,
//   range: { min: 10, max: 19 }
// }
```

### Pattern 3: Combined Retrieval (Typical Use Case)

```javascript
async function getTournamentBracketInfo(playerCount) {
  const [bracket, seeding] = await Promise.all([
    bracketService.getBracketByPlayerCount(playerCount),
    seedingService.getSeedingConfig(playerCount)
  ]);

  return {
    bracket,
    seeding
  };
}
```

---

## Testing Validation Rules

### Unit Tests Required

1. **Template Loading**:
   - ✅ All 125 templates (4-128) are present
   - ✅ All structures match `^[01\s]+$` pattern
   - ✅ Derived fields calculate correctly

2. **Seeding Ranges**:
   - ✅ All player counts 4-128 map to exactly one range
   - ✅ Ranges are non-overlapping
   - ✅ Correct seeded player count for each range

3. **Error Handling**:
   - ✅ playerCount < 4 throws validation error
   - ✅ playerCount > 128 throws validation error
   - ✅ Non-integer playerCount throws validation error
   - ✅ Missing template file throws load error

---

**Data Model Complete**: All entities, relationships, and validation rules defined. Ready for API contract design.
