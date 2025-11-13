# Data Contracts: Tournament Rules and Formats

**Feature**: 004-tournament-rules | **Date**: 2025-01-07

## Enumerations

### FormatType

**Purpose**: Tournament format type

**Values**:
| Value | Label | Description |
|-------|-------|-------------|
| KNOCKOUT | Knockout | Single or double elimination bracket tournament |
| GROUP | Group Stage | Round-robin group tournament |
| SWISS | Swiss System | Swiss-system pairing tournament |
| COMBINED | Combined | Groups followed by knockout stages |

**Usage**: Tournament.formatType, FormatConfig.formatType

**Validation**:
- Must be one of the values above
- Case-sensitive

---

### MatchGuaranteeType

**Purpose**: Number of matches each player is guaranteed in knockout tournaments

**Values**:
| Value | Label | Description |
|-------|-------|-------------|
| 1_MATCH | 1 Match (Classic) | Single elimination - one loss eliminates player |
| 2_MATCH | 2 Matches | Losers get second chance in separate bracket |
| UNTIL_PLACEMENT | Until Placement | Players continue until exact position is determined |

**Usage**: Bracket.matchGuarantee, KnockoutFormatConfig.matchGuarantee

**Validation**:
- Must be one of the values above
- Only applicable to KNOCKOUT and COMBINED formats

---

### BracketType

**Purpose**: Type of knockout bracket

**Values**:
| Value | Label | Description |
|-------|-------|-------------|
| MAIN | Main Bracket | Primary bracket for winners |
| CONSOLATION | Consolation Bracket | Bracket for first-match losers (for 2-match guarantee) |
| PLACEMENT | Placement Bracket | Brackets for final placement identified by range (e.g. 4-8)

**Usage**: Bracket.bracketType

**Validation**:
- Must be one of the values above
- MAIN bracket is required for knockout/combined tournaments
- CONSOLATION and LOSERS brackets are optional

---

### ScoringFormatType

**Purpose**: Match scoring format

**Values**:
| Value | Label | Description |
|-------|-------|-------------|
| SETS | Sets | Traditional tennis sets (games to 6, win by 2) |
| STANDARD_TIEBREAK | Standard Tiebreak | First to 7 points, win by 2 |
| BIG_TIEBREAK | Big Tiebreak (Match Tiebreak) | First to 10 points, win by 2 |
| MIXED | Mixed (Sets + Final Tiebreak) | Sets with tiebreak replacing final set |

**Usage**: ScoringRules.formatType

**Validation**:
- Must be one of the values above
- Determines which config fields are required

---

### AdvantageRule

**Purpose**: Game scoring rule

**Values**:
| Value | Label | Description |
|-------|-------|-------------|
| ADVANTAGE | Advantage | Traditional deuce/advantage scoring |
| NO_ADVANTAGE | No Advantage (Golden Ball) | At deuce, next point wins game |

**Usage**: ScoringRules.advantageRule

**Validation**:
- Must be one of the values above
- Only applicable to SETS and MIXED formats

---

### TiebreakTrigger

**Purpose**: When tiebreak starts in a set

**Values**:
| Value | Label | Description |
|-------|-------|-------------|
| 6-6 | At 6-6 (Standard) | Tiebreak at 6-6 (default) |
| 5-5 | At 5-5 | Early tiebreak for time saving |
| 4-4 | At 4-4 | Earlier tiebreak for time saving |
| 3-3 | At 3-3 | Very early tiebreak for time saving |

**Usage**: ScoringRules.tiebreakTrigger

**Validation**:
- Must be one of the values above
- Only applicable to SETS and MIXED formats

---

### FinalSetTiebreakType

**Purpose**: Type of tiebreak used for final set in mixed format

**Values**:
| Value | Label | Description |
|-------|-------|-------------|
| STANDARD | Standard Tiebreak | First to 7, win by 2 |
| BIG | Big Tiebreak | First to 10, win by 2 |

**Usage**: ScoringRules.finalSetTiebreak

**Validation**:
- Must be one of the values above
- Only applicable to MIXED format
- Required when formatType is MIXED

---

### MatchStatus

**Purpose**: Current status of a match

**Values**:
| Value | Label | Description |
|-------|-------|-------------|
| SCHEDULED | Scheduled | Match is scheduled but not started |
| IN_PROGRESS | In Progress | Match is currently being played |
| COMPLETED | Completed | Match has been completed |
| CANCELLED | Cancelled | Match was cancelled |

**Usage**: Match.status

**Validation**:
- Must be one of the values above
- State transitions: SCHEDULED → IN_PROGRESS → COMPLETED
- CANCELLED can be set from SCHEDULED or IN_PROGRESS

---

## JSON Structures

### FormatConfig

**Purpose**: Format-specific configuration for tournament

**Type**: Discriminated union based on formatType

#### Knockout Format Config
```typescript
{
  formatType: "KNOCKOUT",
  matchGuarantee: "1_MATCH" | "2_MATCH" | "UNTIL_PLACEMENT"
}
```

**Validation**:
- formatType must be "KNOCKOUT"
- matchGuarantee is required and must be valid MatchGuaranteeType

#### Group Format Config
```typescript
{
  formatType: "GROUP",
  groupSize: number,  // 2-8
  singleGroup: boolean
}
```

**Validation**:
- formatType must be "GROUP"
- groupSize is required, must be integer between 2 and 8 inclusive
- singleGroup is required, must be boolean

#### Swiss Format Config
```typescript
{
  formatType: "SWISS",
  rounds: number  // positive integer
}
```

**Validation**:
- formatType must be "SWISS"
- rounds is required, must be positive integer (typically 3-7)

#### Combined Format Config
```typescript
{
  formatType: "COMBINED",
  groupSize: number,  // 2-8
  advancementRules: Array<{
    position: number,  // 1-indexed group position
    bracket: "MAIN" | "CONSOLATION" | "LOSERS" | "NONE"
  }>
}
```

**Validation**:
- formatType must be "COMBINED"
- groupSize is required, must be integer between 2 and 8 inclusive
- advancementRules is required, must be non-empty array
- Each advancementRule:
  - position must be positive integer (1 through groupSize)
  - bracket must be valid bracket type or "NONE"
  - Positions must be unique (each position appears at most once)

---

### ScoringRules

**Purpose**: Match scoring configuration

**Type**: Discriminated union based on formatType

#### Sets Format Rules
```typescript
{
  formatType: "SETS",
  winningSets: 1 | 2,
  advantageRule: "ADVANTAGE" | "NO_ADVANTAGE",
  tiebreakTrigger: "6-6" | "5-5" | "4-4" | "3-3"
}
```

**Validation**:
- formatType must be "SETS"
- winningSets is required, must be 1 or 2
- advantageRule is required, must be valid AdvantageRule
- tiebreakTrigger is required, must be valid TiebreakTrigger

#### Standard Tiebreak Rules
```typescript
{
  formatType: "STANDARD_TIEBREAK",
  winningTiebreaks: 1 | 2 | 3
}
```

**Validation**:
- formatType must be "STANDARD_TIEBREAK"
- winningTiebreaks is required, must be 1, 2, or 3

#### Big Tiebreak Rules
```typescript
{
  formatType: "BIG_TIEBREAK",
  winningTiebreaks: 1 | 2
}
```

**Validation**:
- formatType must be "BIG_TIEBREAK"
- winningTiebreaks is required, must be 1 or 2

#### Mixed Format Rules
```typescript
{
  formatType: "MIXED",
  winningSets: 1 | 2,
  advantageRule: "ADVANTAGE" | "NO_ADVANTAGE",
  tiebreakTrigger: "6-6" | "5-5" | "4-4" | "3-3",
  finalSetTiebreak: "STANDARD" | "BIG"
}
```

**Validation**:
- formatType must be "MIXED"
- winningSets is required, must be 1 or 2
- advantageRule is required, must be valid AdvantageRule
- tiebreakTrigger is required, must be valid TiebreakTrigger
- finalSetTiebreak is required, must be "STANDARD" or "BIG"

---

## Validation Rules

### Cross-Field Validation

#### FormatConfig Validation
- formatConfig.formatType must match Tournament.formatType
- If Tournament.formatType is "KNOCKOUT", formatConfig must be KnockoutFormatConfig
- If Tournament.formatType is "GROUP", formatConfig must be GroupFormatConfig
- If Tournament.formatType is "SWISS", formatConfig must be SwissFormatConfig
- If Tournament.formatType is "COMBINED", formatConfig must be CombinedFormatConfig

#### ScoringRules Validation
- formatType determines which fields are required
- SETS requires: winningSets, advantageRule, tiebreakTrigger
- STANDARD_TIEBREAK requires: winningTiebreaks
- BIG_TIEBREAK requires: winningTiebreaks
- MIXED requires: winningSets, advantageRule, tiebreakTrigger, finalSetTiebreak

#### Advancement Rules Validation (Combined Format)
- Total unique positions in advancementRules must be ≤ groupSize
- Each position from 1 to groupSize can appear at most once
- Bracket value "NONE" means player does not advance

### Field-Level Validation

| Field | Type | Min | Max | Required | Default |
|-------|------|-----|-----|----------|---------|
| Tournament.formatType | Enum | - | - | Yes | - |
| Tournament.formatConfig | JSON | - | - | Yes | - |
| Tournament.defaultScoringRules | JSON | - | - | Yes | - |
| Group.groupNumber | Integer | 1 | - | Yes | - |
| Group.groupSize | Integer | 2 | 8 | Yes | - |
| Group.ruleOverrides | JSON | - | - | No | null |
| Bracket.bracketType | Enum | - | - | Yes | - |
| Bracket.matchGuarantee | Enum | - | - | Yes | - |
| Bracket.ruleOverrides | JSON | - | - | No | null |
| Round.roundNumber | Integer | 1 | - | Yes | - |
| Round.ruleOverrides | JSON | - | - | No | null |
| Round.earlyTiebreakEnabled | Boolean | - | - | No | false |
| Match.matchNumber | Integer | 1 | - | Yes | - |
| Match.status | Enum | - | - | Yes | SCHEDULED |
| Match.ruleOverrides | JSON | - | - | No | null |
| Match.completedWithRules | JSON | - | - | No | null |

### Business Logic Validation

**Tournament Format Changes**:
- formatType cannot be changed if any Match has status = COMPLETED
- formatConfig can be updated if all matches are SCHEDULED or IN_PROGRESS
- defaultScoringRules can always be updated (affects future matches only)

**Rule Override Changes**:
- Group.ruleOverrides can be changed at any time (affects future matches)
- Bracket.ruleOverrides can be changed at any time (affects future matches)
- Round.ruleOverrides can be changed at any time (affects future matches)
- Match.ruleOverrides can only be changed if Match.status = SCHEDULED

**Match Completion**:
- When Match.status changes to COMPLETED, Match.completedWithRules must be set
- Match.completedWithRules is immutable once set
- Match.completedAt timestamp must be set when completing match

**Group Size Distribution**:
- For group tournaments, validate that totalPlayers can be divided into groups of groupSize and groupSize-1
- Algorithm: Try all combinations of X groups of size S and Y groups of size S-1
- Must find exact division (no players left over)

## Examples

### Valid Knockout Format Config
```json
{
  "formatType": "KNOCKOUT",
  "matchGuarantee": "2_MATCH"
}
```

### Invalid Knockout Format Config
```json
{
  "formatType": "KNOCKOUT",
  "groupSize": 4  // ERROR: groupSize not valid for knockout
}
```

### Valid Combined Format Config
```json
{
  "formatType": "COMBINED",
  "groupSize": 4,
  "advancementRules": [
    { "position": 1, "bracket": "MAIN" },
    { "position": 2, "bracket": "MAIN" },
    { "position": 3, "bracket": "CONSOLATION" },
    { "position": 4, "bracket": "NONE" }
  ]
}
```

### Invalid Combined Format Config
```json
{
  "formatType": "COMBINED",
  "groupSize": 4,
  "advancementRules": [
    { "position": 1, "bracket": "MAIN" },
    { "position": 1, "bracket": "CONSOLATION" }  // ERROR: position 1 appears twice
  ]
}
```

### Valid Sets Scoring Rules
```json
{
  "formatType": "SETS",
  "winningSets": 2,
  "advantageRule": "ADVANTAGE",
  "tiebreakTrigger": "6-6"
}
```

### Invalid Sets Scoring Rules
```json
{
  "formatType": "SETS",
  "winningSets": 2,
  "winningTiebreaks": 1  // ERROR: winningTiebreaks not valid for SETS format
}
```

### Valid Mixed Scoring Rules
```json
{
  "formatType": "MIXED",
  "winningSets": 1,
  "advantageRule": "NO_ADVANTAGE",
  "tiebreakTrigger": "5-5",
  "finalSetTiebreak": "BIG"
}
```

### Invalid Mixed Scoring Rules
```json
{
  "formatType": "MIXED",
  "winningSets": 1,
  "advantageRule": "NO_ADVANTAGE",
  "tiebreakTrigger": "5-5"
  // ERROR: finalSetTiebreak is required for MIXED format
}
```

## Zod Schemas (Reference)

**Note**: These schemas are for backend validation using Zod library

```typescript
import { z } from 'zod';

// Enums
const FormatTypeSchema = z.enum(['KNOCKOUT', 'GROUP', 'SWISS', 'COMBINED']);
const MatchGuaranteeSchema = z.enum(['1_MATCH', '2_MATCH', 'UNTIL_PLACEMENT']);
const BracketTypeSchema = z.enum(['MAIN', 'CONSOLATION', 'LOSERS']);
const ScoringFormatTypeSchema = z.enum(['SETS', 'STANDARD_TIEBREAK', 'BIG_TIEBREAK', 'MIXED']);
const AdvantageRuleSchema = z.enum(['ADVANTAGE', 'NO_ADVANTAGE']);
const TiebreakTriggerSchema = z.enum(['6-6', '5-5', '4-4', '3-3']);
const FinalSetTiebreakSchema = z.enum(['STANDARD', 'BIG']);
const MatchStatusSchema = z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

// Format Configs
const KnockoutFormatConfigSchema = z.object({
  formatType: z.literal('KNOCKOUT'),
  matchGuarantee: MatchGuaranteeSchema
});

const GroupFormatConfigSchema = z.object({
  formatType: z.literal('GROUP'),
  groupSize: z.number().int().min(2).max(8),
  singleGroup: z.boolean()
});

const SwissFormatConfigSchema = z.object({
  formatType: z.literal('SWISS'),
  rounds: z.number().int().positive()
});

const CombinedFormatConfigSchema = z.object({
  formatType: z.literal('COMBINED'),
  groupSize: z.number().int().min(2).max(8),
  advancementRules: z.array(z.object({
    position: z.number().int().positive(),
    bracket: z.enum(['MAIN', 'CONSOLATION', 'LOSERS', 'NONE'])
  })).min(1)
});

const FormatConfigSchema = z.discriminatedUnion('formatType', [
  KnockoutFormatConfigSchema,
  GroupFormatConfigSchema,
  SwissFormatConfigSchema,
  CombinedFormatConfigSchema
]);

// Scoring Rules
const SetsScoringRulesSchema = z.object({
  formatType: z.literal('SETS'),
  winningSets: z.union([z.literal(1), z.literal(2)]),
  advantageRule: AdvantageRuleSchema,
  tiebreakTrigger: TiebreakTriggerSchema
});

const StandardTiebreakScoringRulesSchema = z.object({
  formatType: z.literal('STANDARD_TIEBREAK'),
  winningTiebreaks: z.union([z.literal(1), z.literal(2), z.literal(3)])
});

const BigTiebreakScoringRulesSchema = z.object({
  formatType: z.literal('BIG_TIEBREAK'),
  winningTiebreaks: z.union([z.literal(1), z.literal(2)])
});

const MixedScoringRulesSchema = z.object({
  formatType: z.literal('MIXED'),
  winningSets: z.union([z.literal(1), z.literal(2)]),
  advantageRule: AdvantageRuleSchema,
  tiebreakTrigger: TiebreakTriggerSchema,
  finalSetTiebreak: FinalSetTiebreakSchema
});

const ScoringRulesSchema = z.discriminatedUnion('formatType', [
  SetsScoringRulesSchema,
  StandardTiebreakScoringRulesSchema,
  BigTiebreakScoringRulesSchema,
  MixedScoringRulesSchema
]);
```

## Usage in Frontend

Frontend should use TypeScript types derived from these contracts:

```typescript
// types/tournamentRules.ts
export type FormatType = 'KNOCKOUT' | 'GROUP' | 'SWISS' | 'COMBINED';

export type KnockoutFormatConfig = {
  formatType: 'KNOCKOUT';
  matchGuarantee: '1_MATCH' | '2_MATCH' | 'UNTIL_PLACEMENT';
};

export type GroupFormatConfig = {
  formatType: 'GROUP';
  groupSize: number;
  singleGroup: boolean;
};

// ... etc for all types
```
