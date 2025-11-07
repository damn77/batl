# Data Model: Tournament Registration & Enhanced Tournament Management

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)
**Created**: 2025-11-02
**Phase**: 1 (Data Model & Contracts)

## Purpose

This document defines the complete data model for tournament registration with waitlist management, auto-category enrollment, and enhanced tournament details. It includes new models, extended models, and database migrations required for implementation.

## Entity Relationship Overview

```
Category (EXISTING - from 002)
  └─→ Tournament (EXTENDED)
        ├─→ TournamentRegistration (NEW)
        │     └─→ PlayerProfile (EXISTING)
        └─→ CategoryRegistration (EXTENDED - via auto-registration)
```

**Key Relationships**:
- One Tournament belongs to one Category (existing, unchanged)
- One Tournament has many TournamentRegistrations (NEW - many-to-many through join table)
- One PlayerProfile has many TournamentRegistrations (NEW)
- TournamentRegistration triggers CategoryRegistration auto-creation (service layer logic)

---

## New Enums

### TournamentRegistrationStatus

**Purpose**: Track player's registration state for a specific tournament

```prisma
enum TournamentRegistrationStatus {
  REGISTERED   // Player has confirmed spot in tournament
  WAITLISTED   // Player is on waitlist (tournament at capacity)
  WITHDRAWN    // Player withdrew from tournament (terminal state)
  CANCELLED    // Tournament was cancelled (terminal state, preserves history)
}
```

**Allowed Transitions** (from [research.md](research.md#3-registration-state-machine-patterns)):
- `REGISTERED → WITHDRAWN` (player action)
- `REGISTERED → WAITLISTED` (organizer manual demotion OR capacity reduction)
- `REGISTERED → CANCELLED` (tournament cancelled)
- `WAITLISTED → REGISTERED` (auto-promotion OR manual promotion)
- `WAITLISTED → WITHDRAWN` (player withdraws from waitlist)
- `WAITLISTED → CANCELLED` (tournament cancelled)
- `WITHDRAWN` → (terminal, no transitions)
- `CANCELLED` → (terminal, no transitions)

**Functional Requirements**: FR-001, FR-002, FR-005, FR-006, FR-007, FR-017, FR-019, FR-030

---

### WaitlistDisplayOrder

**Purpose**: Configure how waitlist is displayed to users (note: auto-promotion always uses timestamp)

```prisma
enum WaitlistDisplayOrder {
  REGISTRATION_TIME  // Display waitlist in chronological order (oldest first)
  ALPHABETICAL       // Display waitlist alphabetically by player name
}
```

**Note**: This only affects **display** order. Auto-promotion logic **always** uses `registrationTimestamp` for fairness (FR-021, FR-026).

**Functional Requirements**: FR-026, FR-027

---

## Extended Models

### Tournament (EXTENDED)

**Status**: EXTENDED from 002-category-system

**New Fields**:

| Field | Type | Required | Default | Description | FR Reference |
|-------|------|----------|---------|-------------|--------------|
| `capacity` | `Int?` | No | `null` | Maximum number of registered players. `null` = unlimited capacity. When reached, new registrations become WAITLISTED. | FR-018, FR-031 |
| `organizerEmail` | `String?` | No | `null` | Contact email for tournament organizer | FR-033 |
| `organizerPhone` | `String?` | No | `null` | Contact phone for tournament organizer | FR-034 |
| `entryFee` | `Float?` | No | `null` | Entry fee in local currency. `null` = free entry. | FR-035 |
| `rulesUrl` | `String?` | No | `null` | URL to tournament-specific rules document | FR-036 |
| `prizeDescription` | `String?` | No | `null` | Text description of prizes/awards | FR-037 |
| `registrationOpenDate` | `DateTime?` | No | `null` | When registration opens. `null` = open immediately. | FR-038 |
| `registrationCloseDate` | `DateTime?` | No | `null` | When registration closes. `null` = open until tournament starts. | FR-039 |
| `minParticipants` | `Int?` | No | `null` | Minimum participants required. Tournament may be cancelled if not met. | FR-040 |
| `maxParticipants` | `Int?` | No | `null` | Alias for `capacity` for clarity. Consider deprecating one. | FR-031 |
| `waitlistDisplayOrder` | `WaitlistDisplayOrder` | Yes | `REGISTRATION_TIME` | How to display waitlist to users | FR-026 |
| `lastStatusChange` | `DateTime?` | No | `null` | When status last changed (for lifecycle tracking) | FR-042-046 |

**Complete Extended Model**:

```prisma
model Tournament {
  id          String           @id @default(uuid())
  name        String           // Tournament display name
  categoryId  String           // Required: belongs to one category (FR-006)
  description String?          // Optional tournament details

  // Location & Logistics (EXTENDED - FR-031 to FR-041)
  location              String?          // Physical location or "Online"
  capacity              Int?             // Max registered players (null = unlimited)
  organizerEmail        String?          // Organizer contact email
  organizerPhone        String?          // Organizer contact phone
  entryFee              Float?           // Entry fee (null = free)
  rulesUrl              String?          // Link to tournament rules
  prizeDescription      String?          // Prize/award details
  registrationOpenDate  DateTime?        // When registration opens
  registrationCloseDate DateTime?        // When registration closes
  minParticipants       Int?             // Minimum required participants

  // Waitlist Configuration (EXTENDED - FR-026)
  waitlistDisplayOrder WaitlistDisplayOrder @default(REGISTRATION_TIME)

  // Scheduling (EXISTING)
  startDate   DateTime
  endDate     DateTime

  // Lifecycle (EXISTING + EXTENDED)
  status           TournamentStatus @default(SCHEDULED)
  lastStatusChange DateTime?        // When status last changed

  // Audit (EXISTING)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  // Relationships
  category              Category                   @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  tournamentRegistrations TournamentRegistration[] // NEW relationship

  // Constraints
  @@index([categoryId])
  @@index([startDate])
  @@index([status])
  @@index([registrationOpenDate])  // NEW: for registration window queries
  @@index([registrationCloseDate]) // NEW: for registration window queries
}
```

**Migration Strategy**:
- All new fields are nullable or have defaults
- Existing tournaments continue to work without changes
- Organizers can gradually add enhanced details

---

### CategoryRegistration (EXTENDED)

**Status**: EXTENDED from 002-category-system

**New Fields**:

| Field | Type | Required | Default | Description | FR Reference |
|-------|------|----------|---------|-------------|--------------|
| `hasParticipated` | `Boolean` | Yes | `false` | Set to `true` when player completes first tournament in category. Prevents auto-unregistration even if no active tournaments. | FR-014, FR-029 |

**Complete Extended Model**:

```prisma
model CategoryRegistration {
  id           String             @id @default(uuid())
  playerId     String             // Foreign key to PlayerProfile
  categoryId   String             // Foreign key to Category
  status       RegistrationStatus @default(ACTIVE)

  // Participation Tracking (NEW - FR-014, FR-029)
  hasParticipated Boolean         @default(false) // True after first completed tournament

  // Timestamps
  registeredAt DateTime           @default(now())
  withdrawnAt  DateTime?          // Timestamp when withdrawn
  notes        String?            // Optional admin notes
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  // Relationships
  player   PlayerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  category Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  // Constraints
  @@unique([playerId, categoryId]) // One registration per player per category
  @@index([playerId])
  @@index([categoryId])
  @@index([status])
  @@index([hasParticipated]) // NEW: for participation queries
}
```

**Business Logic** (implemented in service layer):
1. When player registers for first tournament in category → create CategoryRegistration with `hasParticipated = false`
2. When tournament completes with player participation → update `hasParticipated = true`
3. When player unregisters from last active tournament:
   - If `hasParticipated = false` AND no other active tournaments → delete CategoryRegistration
   - If `hasParticipated = true` → keep CategoryRegistration (preserve history)

---

## New Models

### TournamentRegistration (NEW)

**Purpose**: Track player registration for specific tournaments with waitlist support

**Complete Model**:

```prisma
model TournamentRegistration {
  id                    String                         @id @default(uuid())
  playerId              String                         // Foreign key to PlayerProfile
  tournamentId          String                         // Foreign key to Tournament
  status                TournamentRegistrationStatus   @default(REGISTERED)

  // Timestamps (FR-020, FR-021)
  registrationTimestamp DateTime                       @default(now()) // Used for waitlist ordering
  withdrawnAt           DateTime?                      // When player withdrew (if WITHDRAWN)
  cancelledAt           DateTime?                      // When tournament cancelled (if CANCELLED)

  // Waitlist Management (FR-022, FR-023, FR-024, FR-025)
  promotedBy            String?                        // 'SYSTEM' or userId of organizer who promoted
  promotedAt            DateTime?                      // When promoted from waitlist
  demotedBy             String?                        // userId of organizer who demoted
  demotedAt             DateTime?                      // When demoted to waitlist

  // Audit
  createdAt             DateTime                       @default(now())
  updatedAt             DateTime                       @updatedAt

  // Relationships
  player     PlayerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  tournament Tournament    @relation(fields: [tournamentId], references: [id], onDelete: Cascade)

  // Constraints
  @@unique([playerId, tournamentId]) // One registration per player per tournament (FR-009)
  @@index([playerId])
  @@index([tournamentId])
  @@index([status])
  @@index([tournamentId, status, registrationTimestamp]) // Critical for waitlist queries (see research.md)
  @@index([registrationTimestamp]) // For ordering queries
}
```

**Key Indexes Explained**:

1. **`@@index([tournamentId, status, registrationTimestamp])`** (CRITICAL)
   - Composite index for efficient waitlist queries
   - Used by auto-promotion: "Find oldest WAITLISTED player for this tournament"
   - Query pattern: `WHERE tournamentId = ? AND status = 'WAITLISTED' ORDER BY registrationTimestamp ASC LIMIT 1`
   - Expected to be used frequently (every unregistration triggers this query)

2. **`@@index([status])`**
   - For filtering by registration status across tournaments
   - Used for player dashboard: "Show all my REGISTERED tournaments"

3. **`@@index([registrationTimestamp])`**
   - For chronological ordering
   - Used when displaying waitlist in REGISTRATION_TIME order

**Field Details**:

- **`status`**: Current registration state (see enum above)
- **`registrationTimestamp`**: Millisecond-precision timestamp for fair queue ordering (FR-020, FR-021)
- **`promotedBy`**: Tracks who promoted (auditability). Values: `'SYSTEM'` for auto-promotion, or User ID for manual promotion
- **`promotedAt`**: When promotion occurred (for analytics and dispute resolution)
- **`demotedBy`/`demotedAt`**: Track manual demotion by organizer (FR-022, FR-023)

**Example Queries**:

```javascript
// Auto-promote next waitlisted player (FR-021)
const nextWaitlisted = await prisma.tournamentRegistration.findFirst({
  where: {
    tournamentId: tournamentId,
    status: 'WAITLISTED'
  },
  orderBy: {
    registrationTimestamp: 'asc'  // Oldest first
  }
});

// Get all registered players for tournament (FR-047, FR-048)
const registeredPlayers = await prisma.tournamentRegistration.findMany({
  where: {
    tournamentId: tournamentId,
    status: 'REGISTERED'
  },
  include: { player: true }
});

// Get waitlist with configurable display order (FR-026, FR-027)
const tournament = await prisma.tournament.findUnique({
  where: { id: tournamentId }
});

const displayOrder = tournament.waitlistDisplayOrder === 'ALPHABETICAL'
  ? [{ player: { name: 'asc' } }]
  : [{ registrationTimestamp: 'asc' }];

const waitlist = await prisma.tournamentRegistration.findMany({
  where: {
    tournamentId: tournamentId,
    status: 'WAITLISTED'
  },
  orderBy: displayOrder,
  include: { player: true }
});

// Check if player is already registered (FR-009, FR-010, FR-011)
const existingReg = await prisma.tournamentRegistration.findUnique({
  where: {
    playerId_tournamentId: {
      playerId: playerId,
      tournamentId: tournamentId
    }
  }
});

// Count registered players (for capacity check) (FR-018)
const registeredCount = await prisma.tournamentRegistration.count({
  where: {
    tournamentId: tournamentId,
    status: 'REGISTERED'
  }
});
```

---

## Complete Prisma Schema Changes

**File**: `backend/prisma/schema.prisma`

### Additions to Existing File

```prisma
// ADD TO EXISTING ENUMS SECTION (after line 60)

enum TournamentRegistrationStatus {
  REGISTERED
  WAITLISTED
  WITHDRAWN
  CANCELLED
}

enum WaitlistDisplayOrder {
  REGISTRATION_TIME
  ALPHABETICAL
}

// REPLACE EXISTING Tournament MODEL (lines 174-193)

model Tournament {
  id          String           @id @default(uuid())
  name        String
  categoryId  String
  description String?

  // Location & Logistics
  location              String?
  capacity              Int?
  organizerEmail        String?
  organizerPhone        String?
  entryFee              Float?
  rulesUrl              String?
  prizeDescription      String?
  registrationOpenDate  DateTime?
  registrationCloseDate DateTime?
  minParticipants       Int?

  // Waitlist Configuration
  waitlistDisplayOrder WaitlistDisplayOrder @default(REGISTRATION_TIME)

  // Scheduling
  startDate   DateTime
  endDate     DateTime

  // Lifecycle
  status           TournamentStatus @default(SCHEDULED)
  lastStatusChange DateTime?

  // Audit
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  // Relationships
  category                Category                   @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  tournamentRegistrations TournamentRegistration[]

  // Constraints
  @@index([categoryId])
  @@index([startDate])
  @@index([status])
  @@index([registrationOpenDate])
  @@index([registrationCloseDate])
}

// MODIFY EXISTING CategoryRegistration MODEL (add hasParticipated field after line 199)

model CategoryRegistration {
  id              String             @id @default(uuid())
  playerId        String
  categoryId      String
  status          RegistrationStatus @default(ACTIVE)
  hasParticipated Boolean            @default(false) // NEW FIELD
  registeredAt    DateTime           @default(now())
  withdrawnAt     DateTime?
  notes           String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  player   PlayerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  category Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@unique([playerId, categoryId])
  @@index([playerId])
  @@index([categoryId])
  @@index([status])
  @@index([hasParticipated]) // NEW INDEX
}

// ADD NEW MODEL (after CategoryRanking model, before end of file)

model TournamentRegistration {
  id                    String                         @id @default(uuid())
  playerId              String
  tournamentId          String
  status                TournamentRegistrationStatus   @default(REGISTERED)

  // Timestamps
  registrationTimestamp DateTime                       @default(now())
  withdrawnAt           DateTime?
  cancelledAt           DateTime?

  // Waitlist Management
  promotedBy            String?
  promotedAt            DateTime?
  demotedBy             String?
  demotedAt             DateTime?

  // Audit
  createdAt             DateTime                       @default(now())
  updatedAt             DateTime                       @updatedAt

  // Relationships
  player     PlayerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  tournament Tournament    @relation(fields: [tournamentId], references: [id], onDelete: Cascade)

  // Constraints
  @@unique([playerId, tournamentId])
  @@index([playerId])
  @@index([tournamentId])
  @@index([status])
  @@index([tournamentId, status, registrationTimestamp])
  @@index([registrationTimestamp])
}

// MODIFY EXISTING PlayerProfile MODEL (add relationship)
// ADD THIS LINE to the PlayerProfile relationships section (after line 140):
  tournamentRegistrations TournamentRegistration[]
```

---

## Migration Strategy

### Migration File: `20251102_add_tournament_registration.sql`

**Generated by**: `npx prisma migrate dev --name add_tournament_registration`

**Expected Changes**:

1. **Create new enums**:
   - `TournamentRegistrationStatus`
   - `WaitlistDisplayOrder`

2. **Alter Tournament table**:
   - Add columns: `location`, `capacity`, `organizerEmail`, `organizerPhone`, `entryFee`, `rulesUrl`, `prizeDescription`, `registrationOpenDate`, `registrationCloseDate`, `minParticipants`, `waitlistDisplayOrder`, `lastStatusChange`
   - Add indexes on `registrationOpenDate`, `registrationCloseDate`
   - All new columns nullable or have defaults (safe migration)

3. **Alter CategoryRegistration table**:
   - Add column: `hasParticipated BOOLEAN DEFAULT false`
   - Add index on `hasParticipated`
   - Safe migration: default value prevents null issues

4. **Create TournamentRegistration table**:
   - All columns as defined above
   - All indexes as defined above
   - Foreign keys to PlayerProfile and Tournament

5. **Alter PlayerProfile table**:
   - No schema changes (relationship is reverse side)
   - Prisma will track the relationship

**Rollback Safety**:
- All Tournament changes are additive (nullable fields or defaults)
- CategoryRegistration change has safe default
- TournamentRegistration is new table (safe to drop if needed)
- No data loss on rollback (existing data untouched)

---

## Data Validation Rules

**Enforced at Service Layer** (not database level):

### Tournament Registration Validation

1. **Capacity Validation** (FR-018, FR-031):
   ```javascript
   if (tournament.capacity !== null) {
     const registeredCount = await getRegisteredCount(tournamentId);
     if (registeredCount >= tournament.capacity) {
       // Assign WAITLISTED status
     }
   }
   ```

2. **Duplicate Registration Prevention** (FR-009):
   ```javascript
   const existing = await findUnique({ playerId, tournamentId });
   if (existing && existing.status !== 'WITHDRAWN') {
     throw new Error('Already registered or waitlisted');
   }
   ```

3. **Registration Window Validation** (FR-038, FR-039):
   ```javascript
   const now = new Date();
   if (tournament.registrationOpenDate && now < tournament.registrationOpenDate) {
     throw new Error('Registration not yet open');
   }
   if (tournament.registrationCloseDate && now > tournament.registrationCloseDate) {
     throw new Error('Registration closed');
   }
   ```

4. **Tournament Status Validation** (FR-010, FR-011):
   ```javascript
   if (tournament.status !== 'SCHEDULED') {
     throw new Error('Can only register for scheduled tournaments');
   }
   ```

5. **Player Eligibility Validation** (via Category):
   - Age validation: Player age >= category minimum age (if not ALL_AGES)
   - Gender validation: Player gender matches category gender (or category is MIXED)
   - Implemented in `categoryService.validatePlayerEligibility()`

---

## Performance Considerations

### Index Strategy

**Critical Indexes** (most frequently queried):
1. `tournamentId, status, registrationTimestamp` on TournamentRegistration - Auto-promotion queries
2. `categoryId` on Tournament - Tournament listing by category
3. `status` on Tournament - Active tournament queries
4. `playerId, categoryId` on CategoryRegistration - Eligibility checks

### Query Optimization

**Auto-Promotion Query** (executes on every unregistration):
```sql
-- Optimized by composite index
SELECT * FROM TournamentRegistration
WHERE tournamentId = ? AND status = 'WAITLISTED'
ORDER BY registrationTimestamp ASC
LIMIT 1;
```
**Expected Performance**: < 5ms with proper indexing (research.md target: < 100ms)

**Capacity Check Query** (executes on every registration attempt):
```sql
-- Optimized by tournamentId, status index
SELECT COUNT(*) FROM TournamentRegistration
WHERE tournamentId = ? AND status = 'REGISTERED';
```
**Expected Performance**: < 10ms with index

### Scalability

**Database**: SQLite
- **Expected Load**: 50+ simultaneous tournaments, ~20 players each = ~1000 registrations
- **Write Load**: Registration/unregistration operations (< 30s requirement from plan.md)
- **Read Load**: Tournament listings, participant lists, waitlist displays
- **Assessment**: SQLite suitable for this scale. Consider PostgreSQL if scaling beyond 10,000+ registrations.

---

## Data Model Verification

### Functional Requirements Coverage

| FR Range | Description | Model Coverage |
|----------|-------------|----------------|
| FR-001 to FR-017 | Tournament Registration | ✅ TournamentRegistration |
| FR-018 to FR-030 | Waitlist Management | ✅ TournamentRegistration + Tournament.waitlistDisplayOrder |
| FR-031 to FR-041 | Enhanced Tournament Data | ✅ Tournament extensions |
| FR-042 to FR-046 | Tournament Lifecycle | ✅ Tournament.status + lastStatusChange |
| FR-047 to FR-053 | Tournament Viewing | ✅ Relationships + indexes |

### User Story Coverage

| User Story | Primary Model | Status |
|------------|---------------|--------|
| P1: Register with Auto-Category | TournamentRegistration + CategoryRegistration | ✅ Complete |
| P1: Unregister with Smart Cleanup | TournamentRegistration + CategoryRegistration.hasParticipated | ✅ Complete |
| P2: Create Tournament with Enhanced Details | Tournament extensions | ✅ Complete |
| P2: Manage Tournament Lifecycle | Tournament.status + lastStatusChange | ✅ Complete |
| P2: Waitlist Management | TournamentRegistration + WaitlistDisplayOrder | ✅ Complete |
| P3: View Participants and Manage Capacity | Relationships + indexes | ✅ Complete |

---

## Next Steps

**Phase 1 Remaining Tasks**:
1. ✅ Generate `data-model.md` (this file)
2. ⏳ Generate `contracts/` directory with API endpoint contracts
3. ⏳ Generate `quickstart.md` with end-to-end usage walkthrough
4. ⏳ Update agent context (CLAUDE.md) with Vitest testing framework

**Phase 2** (via `/speckit.tasks`):
- Not started until Phase 1 complete (per Principle III)

---

**Data Model Status**: ✅ **COMPLETE**
**Next Artifact**: API Contracts (`contracts/` directory)
