# Data Model: Tournament View

**Feature**: 005-tournament-view
**Date**: 2025-11-13
**Status**: Complete

## Overview

The Tournament View feature does NOT introduce any new database models. It exclusively uses existing models from features 001-004. This document catalogs all models used and their relationships relevant to tournament view.

---

## Models Used (Existing)

### 1. Tournament (Primary Entity)
**Source**: Feature 003 (Tournament Registration) + Feature 004 (Tournament Rules)
**Location**: `backend/prisma/schema.prisma` (lines 253-316)

**Fields Used**:
```prisma
model Tournament {
  // Identification
  id          String           @id @default(uuid())
  name        String
  description String?
  categoryId  String

  // Location & Logistics
  locationId         String?
  backupLocationId   String?
  courts             Int?
  capacity           Int?
  organizerId        String?
  deputyOrganizerId  String?
  entryFee           Float?
  rulesUrl           String?
  prizeDescription   String?
  registrationOpenDate  DateTime?
  registrationCloseDate DateTime?
  minParticipants    Int?
  waitlistDisplayOrder  WaitlistDisplayOrder @default(REGISTRATION_TIME)

  // Tournament Rules and Format
  formatType           FormatType @default(KNOCKOUT)
  formatConfig         String     // JSON
  defaultScoringRules  String     // JSON

  // Scheduling
  startDate   DateTime
  endDate     DateTime

  // Lifecycle
  status           TournamentStatus @default(SCHEDULED)
  lastStatusChange DateTime?

  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships (all used)
  category                Category
  location                Location?
  backupLocation          Location?
  organizer               Organizer?
  deputyOrganizer         Organizer?
  tournamentRegistrations TournamentRegistration[]
  groups                  Group[]
  brackets                Bracket[]
  rounds                  Round[]
  matches                 Match[]
}
```

**Usage in Tournament View**:
- **Display**: All fields shown in tournament info panel and header
- **API Enhancement**: Add computed fields `registrationCount`, `waitlistCount`, `ruleComplexity`
- **Relationships**: All relationships loaded via Prisma `include`

---

### 2. Category
**Source**: Feature 002 (Category System)
**Location**: `backend/prisma/schema.prisma` (lines 198-218)

**Fields Used**:
```prisma
model Category {
  id          String        @id @default(uuid())
  type        CategoryType  // SINGLES or DOUBLES
  ageGroup    AgeGroup      // AGE_20, AGE_30, etc.
  gender      Gender        // MEN, WOMEN, or MIXED
  name        String        // Auto-generated display name
  description String?
}
```

**Usage in Tournament View**:
- **Display**: Show category badge with type, age group, gender
- **Fetched via**: `tournament.category` relationship

---

### 3. Location
**Source**: Feature 003 (Tournament Registration)
**Location**: `backend/prisma/schema.prisma` (lines 238-251)

**Fields Used**:
```prisma
model Location {
  id        String  @id @default(uuid())
  clubName  String
  address   String?
}
```

**Usage in Tournament View**:
- **Display**: Primary location and backup location (if configured)
- **Fetched via**: `tournament.location` and `tournament.backupLocation` relationships

---

### 4. Organizer
**Source**: Feature 003 (Tournament Registration)
**Location**: `backend/prisma/schema.prisma` (lines 220-236)

**Fields Used**:
```prisma
model Organizer {
  id      String  @id @default(uuid())
  userId  String  @unique
  name    String
  email   String
  phone   String?
}
```

**Usage in Tournament View**:
- **Display**: Primary organizer and deputy organizer contact information
- **Fetched via**: `tournament.organizer` and `tournament.deputyOrganizer` relationships

---

### 5. TournamentRegistration
**Source**: Feature 003 (Tournament Registration)
**Location**: `backend/prisma/schema.prisma` (lines 365-397)

**Fields Used**:
```prisma
model TournamentRegistration {
  id                    String                         @id @default(uuid())
  playerId              String
  tournamentId          String
  status                TournamentRegistrationStatus   @default(REGISTERED)
  registrationTimestamp DateTime                       @default(now())
  withdrawnAt           DateTime?
  cancelledAt           DateTime?
  promotedBy            String?
  promotedAt            DateTime?
  demotedBy             String?
  demotedAt             DateTime?

  // Relationships
  player     PlayerProfile
  tournament Tournament
}
```

**Usage in Tournament View**:
- **Display**: Player list with status (REGISTERED, WAITLISTED, WITHDRAWN, CANCELLED)
- **Computed**: Count REGISTERED for `registrationCount`, count WAITLISTED for `waitlistCount`
- **Sorting**: Order by `registrationTimestamp` or alphabetical based on `tournament.waitlistDisplayOrder`
- **Fetched via**: Query by `tournamentId`

---

### 6. PlayerProfile
**Source**: Feature 001 (User Management)
**Location**: `backend/prisma/schema.prisma` (lines 160-194)

**Fields Used**:
```prisma
model PlayerProfile {
  id        String    @id @default(uuid())
  userId    String?   @unique
  name      String
  email     String?   @unique
  phone     String?
  birthDate DateTime?
  gender    Gender?
}
```

**Usage in Tournament View**:
- **Display**: Player name in player list and match results
- **Fetched via**: `tournamentRegistration.player` relationship

---

### 7. CategoryRanking
**Source**: Feature 002 (Category System)
**Location**: `backend/prisma/schema.prisma` (lines 342-361)

**Fields Used**:
```prisma
model CategoryRanking {
  id          String   @id @default(uuid())
  playerId    String
  categoryId  String
  rank        Int
  points      Float    @default(0)
  wins        Int      @default(0)
  losses      Int      @default(0)
  lastUpdated DateTime @updatedAt
}
```

**Usage in Tournament View**:
- **Display**: Player ranking and seeding in player list
- **Fetched via**: Query by `categoryId` matching `tournament.categoryId`

---

### 8. Group
**Source**: Feature 004 (Tournament Rules)
**Location**: `backend/prisma/schema.prisma` (lines 401-420)

**Fields Used**:
```prisma
model Group {
  id                    String   @id @default(uuid())
  tournamentId          String
  groupNumber           Int
  groupSize             Int
  ruleOverrides         String?  // JSON
  advancementCriteria   String?  // JSON

  // Relationships
  tournament            Tournament
  matches               Match[]
  groupParticipants     GroupParticipant[]
}
```

**Usage in Tournament View**:
- **Display**: Group structure in format visualization
- **Complexity Calculation**: Check for non-null `ruleOverrides`
- **Fetched via**: `GET /api/v1/tournaments/:id/format-structure`

---

### 9. GroupParticipant
**Source**: Feature 004 (Tournament Rules)
**Location**: `backend/prisma/schema.prisma` (lines 501-518)

**Fields Used**:
```prisma
model GroupParticipant {
  id                    String   @id @default(uuid())
  groupId               String
  playerId              String
  seedPosition          Int?

  // Relationships
  group                 Group
  player                PlayerProfile
}
```

**Usage in Tournament View**:
- **Display**: Players in each group with seeding
- **Fetched via**: `group.groupParticipants` relationship

---

### 10. Bracket
**Source**: Feature 004 (Tournament Rules)
**Location**: `backend/prisma/schema.prisma` (lines 422-441)

**Fields Used**:
```prisma
model Bracket {
  id                    String              @id @default(uuid())
  tournamentId          String
  bracketType           BracketType         // MAIN, CONSOLATION, PLACEMENT
  matchGuarantee        MatchGuaranteeType  // MATCH_1, MATCH_2, UNTIL_PLACEMENT
  ruleOverrides         String?             // JSON
  placementRange        String?

  // Relationships
  tournament            Tournament
  rounds                Round[]
  matches               Match[]
}
```

**Usage in Tournament View**:
- **Display**: Bracket structure in format visualization
- **Complexity Calculation**: Check for non-null `ruleOverrides`
- **Fetched via**: `GET /api/v1/tournaments/:id/format-structure`

---

### 11. Round
**Source**: Feature 004 (Tournament Rules)
**Location**: `backend/prisma/schema.prisma` (lines 443-463)

**Fields Used**:
```prisma
model Round {
  id                    String   @id @default(uuid())
  tournamentId          String
  bracketId             String?
  roundNumber           Int
  ruleOverrides         String?  // JSON
  earlyTiebreakEnabled  Boolean  @default(false)

  // Relationships
  tournament            Tournament
  bracket               Bracket?
  matches               Match[]
}
```

**Usage in Tournament View**:
- **Display**: Round structure in bracket visualization
- **Complexity Calculation**: Check for non-null `ruleOverrides`
- **Fetched via**: `GET /api/v1/tournaments/:id/format-structure`

---

### 12. Match
**Source**: Feature 004 (Tournament Rules)
**Location**: `backend/prisma/schema.prisma` (lines 465-499)

**Fields Used**:
```prisma
model Match {
  id                    String       @id @default(uuid())
  tournamentId          String
  groupId               String?
  bracketId             String?
  roundId               String?
  matchNumber           Int
  player1Id             String
  player2Id             String
  status                MatchStatus  @default(SCHEDULED)
  result                String?      // JSON
  ruleOverrides         String?      // JSON
  completedWithRules    String?      // JSON - immutable snapshot
  completedAt           DateTime?

  // Relationships
  tournament            Tournament
  group                 Group?
  bracket               Bracket?
  round                 Round?
  player1               PlayerProfile
  player2               PlayerProfile
}
```

**Usage in Tournament View**:
- **Display**: Match results in format visualization
- **Complexity Calculation**: Check for non-null `ruleOverrides` (highest priority)
- **Historical Rules**: Display `completedWithRules` for completed matches
- **Fetched via**: `GET /api/v1/tournaments/:id/matches`

---

## Enums Used

All enums are defined in `backend/prisma/schema.prisma` and used without modification.

### FormatType (lines 75-80)
```prisma
enum FormatType {
  KNOCKOUT
  GROUP
  SWISS
  COMBINED
}
```
**Usage**: `tournament.formatType` - determines visualization type

### TournamentStatus (lines 55-60)
```prisma
enum TournamentStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```
**Usage**: `tournament.status` - displayed as badge

### TournamentRegistrationStatus (lines 62-67)
```prisma
enum TournamentRegistrationStatus {
  REGISTERED
  WAITLISTED
  WITHDRAWN
  CANCELLED
}
```
**Usage**: `tournamentRegistration.status` - displayed as player status

### MatchStatus (lines 82-87)
```prisma
enum MatchStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```
**Usage**: `match.status` - displayed in match visualization

### BracketType (lines 89-93)
```prisma
enum BracketType {
  MAIN
  CONSOLATION
  PLACEMENT
}
```
**Usage**: `bracket.bracketType` - determines bracket labeling

### WaitlistDisplayOrder (lines 69-72)
```prisma
enum WaitlistDisplayOrder {
  REGISTRATION_TIME
  ALPHABETICAL
}
```
**Usage**: `tournament.waitlistDisplayOrder` - determines waitlist sorting

---

## JSON Field Schemas

The following fields store JSON data and require parsing:

### tournament.formatConfig (String/JSON)
**Schema varies by formatType**:

**KNOCKOUT**:
```json
{
  "matchGuarantee": "MATCH_1" | "MATCH_2" | "UNTIL_PLACEMENT"
}
```

**GROUP**:
```json
{
  "groupSize": 2-8,
  "singleGroup": boolean
}
```

**SWISS**:
```json
{
  "rounds": 3-20
}
```

**COMBINED**:
```json
{
  "groupSize": 2-8,
  "advancePerGroup": 1-7
}
```

### tournament.defaultScoringRules (String/JSON)
**Schema**:
```json
{
  "scoringFormat": "BEST_OF_3" | "BEST_OF_5" | "SINGLE_SET" | "MATCH_TIEBREAK",
  "winningSets": 1-3,
  "winningGames": 1-10,
  "advantageRule": "ADVANTAGE" | "NO_ADVANTAGE",
  "tiebreakTrigger": "6_6" | "5_5" | "NEVER",
  "matchTiebreakPoints": 7-21 | null
}
```

### match.result (String/JSON)
**Schema**:
```json
{
  "winnerId": "uuid",
  "sets": [
    { "player1Games": 0-13, "player2Games": 0-13 },
    ...
  ],
  "finalScore": "6-4, 6-3"
}
```

### groups/brackets/rounds/matches.ruleOverrides (String/JSON)
**Schema**: Partial override of `defaultScoringRules` fields

---

## Computed Fields

These fields are NOT in the database but computed by the API:

### tournament.registrationCount (Integer)
**Calculation**: `COUNT(TournamentRegistration WHERE tournamentId = :id AND status = 'REGISTERED')`

### tournament.waitlistCount (Integer)
**Calculation**: `COUNT(TournamentRegistration WHERE tournamentId = :id AND status = 'WAITLISTED')`

### tournament.ruleComplexity (Enum: DEFAULT | MODIFIED | SPECIFIC)
**Calculation**:
```javascript
let complexity = 'DEFAULT';
if (groups.some(g => g.ruleOverrides !== null) ||
    brackets.some(b => b.ruleOverrides !== null) ||
    rounds.some(r => r.ruleOverrides !== null)) {
  complexity = 'MODIFIED';
}
if (matches.some(m => m.ruleOverrides !== null)) {
  complexity = 'SPECIFIC';
}
return complexity;
```

---

## Relationships Diagram

```
Tournament
├── Category (1:1)
├── Location (1:1, nullable) - Primary
├── Location (1:1, nullable) - Backup
├── Organizer (1:1, nullable) - Primary
├── Organizer (1:1, nullable) - Deputy
├── TournamentRegistration[] (1:N)
│   └── PlayerProfile (N:1)
│       └── CategoryRanking (1:N filtered by categoryId)
├── Group[] (1:N)
│   ├── GroupParticipant[] (1:N)
│   │   └── PlayerProfile (N:1)
│   └── Match[] (1:N)
│       ├── PlayerProfile (N:1) - Player 1
│       └── PlayerProfile (N:1) - Player 2
├── Bracket[] (1:N)
│   ├── Round[] (1:N)
│   │   └── Match[] (1:N)
│   └── Match[] (1:N)
└── Match[] (1:N) - Direct for SWISS format
```

---

## Database Queries

### Primary Query (Tournament Details)
```javascript
const tournament = await prisma.tournament.findUnique({
  where: { id: tournamentId },
  include: {
    category: true,
    location: true,
    backupLocation: true,
    organizer: true,
    deputyOrganizer: true,
    tournamentRegistrations: {
      include: {
        player: true
      }
    }
  }
});
```

### Format Structure Query (varies by formatType)
**KNOCKOUT/COMBINED**:
```javascript
const brackets = await prisma.bracket.findMany({
  where: { tournamentId },
  include: {
    rounds: {
      orderBy: { roundNumber: 'asc' }
    }
  }
});
```

**GROUP/COMBINED**:
```javascript
const groups = await prisma.group.findMany({
  where: { tournamentId },
  include: {
    groupParticipants: {
      include: {
        player: true
      }
    }
  },
  orderBy: { groupNumber: 'asc' }
});
```

**SWISS**:
```javascript
const rounds = await prisma.round.findMany({
  where: { tournamentId, bracketId: null },
  orderBy: { roundNumber: 'asc' }
});
```

### Matches Query
```javascript
const matches = await prisma.match.findMany({
  where: { tournamentId },
  include: {
    player1: { select: { id: true, name: true } },
    player2: { select: { id: true, name: true } }
  },
  orderBy: { matchNumber: 'asc' }
});
```

---

## No Schema Migrations Required

**CRITICAL**: This feature requires ZERO database schema changes. All models, fields, and relationships already exist from features 001-004.

**Verification**:
- ✅ Tournament model complete (Feature 003 + 004)
- ✅ Related entities complete (Feature 001-003)
- ✅ Format structure models complete (Feature 004)
- ✅ All enums defined
- ✅ All indexes exist

**Phase 1 Complete**: Data model documented. No migrations needed. Ready for API contract generation.
