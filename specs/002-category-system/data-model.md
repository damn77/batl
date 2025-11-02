# Data Model: Tournament Category System

**Feature**: 002-category-system
**Date**: 2025-11-01
**Phase**: Phase 1 - Design & Contracts

## Overview

The category system extends the existing Prisma schema with four new models and two enums to support tournament categorization, player registration, and category-specific rankings. The design enforces business rules through database constraints and relationships.

## Entity Relationship Diagram

```
PlayerProfile (EXTENDED)
    ↓ 1:N
CategoryRegistration ← N:1 → Category
    ↓                         ↓ 1:N
CategoryRanking              Tournament
```

**Relationships**:
- PlayerProfile → CategoryRegistration (1:N): Player can register for multiple categories
- Category → CategoryRegistration (1:N): Category can have multiple registered players
- Category → CategoryRanking (1:N): Category maintains rankings for all players
- Category → Tournament (1:N): Category can have multiple tournaments
- PlayerProfile → CategoryRanking (1:N): Player has ranking in each registered category

## Enums

### CategoryType
Defines the type of competitive format.

```prisma
enum CategoryType {
  SINGLES   // Individual competition
  DOUBLES   // Two-player team competition
}
```

**Business Rules**:
- Only two types supported initially (per FR-001)
- Future extensions could add MIXED_DOUBLES, TEAM, etc.

---

### AgeGroup
Defines age eligibility thresholds in 5-year increments.

```prisma
enum AgeGroup {
  ALL_AGES  // No age restriction
  AGE_20    // 20+ years
  AGE_25    // 25+ years
  AGE_30    // 30+ years
  AGE_35    // 35+ years
  AGE_40    // 40+ years
  AGE_45    // 45+ years
  AGE_50    // 50+ years
  AGE_55    // 55+ years
  AGE_60    // 60+ years
  AGE_65    // 65+ years
  AGE_70    // 70+ years
  AGE_75    // 75+ years
  AGE_80    // 80+ years
}
```

**Business Rules** (per FR-002):
- 14 age groups total: ALL_AGES + 13 age thresholds (20+ to 80+)
- ALL_AGES bypasses age validation (FR-012)
- Age thresholds are minimum ages (players can compete in younger categories, FR-009)
- Future extensions could add junior categories (<20) if needed

**Display Mapping**:
```javascript
const AGE_GROUP_LABELS = {
  ALL_AGES: 'All ages',
  AGE_20: '20+',
  AGE_25: '25+',
  // ... etc
};
```

---

### Gender
Defines gender eligibility options.

```prisma
enum Gender {
  MEN    // Men's category
  WOMEN  // Women's category
  MIXED  // Mixed gender allowed
}
```

**Business Rules** (per FR-003):
- Three gender options
- MEN and WOMEN categories validate player gender match (FR-011)
- MIXED allows both men and women to participate
- Used in both Category (category requirement) and PlayerProfile (player attribute)

---

### RegistrationStatus
Tracks the status of a player's category registration.

```prisma
enum RegistrationStatus {
  ACTIVE      // Currently registered and eligible
  WITHDRAWN   // Player withdrew from category
  SUSPENDED   // Temporarily ineligible (e.g., disciplinary)
}
```

**Business Rules**:
- Default status is ACTIVE
- WITHDRAWN enables soft deletion (maintain history)
- SUSPENDED for administrative actions

---

## Models

### Category (NEW)

Represents a unique competition classification combining type, age group, and gender.

```prisma
model Category {
  id          String        @id @default(uuid())
  type        CategoryType  // Singles or Doubles
  ageGroup    AgeGroup      // Age threshold or ALL_AGES
  gender      Gender        // Men, Women, or Mixed
  name        String        // Auto-generated display name
  description String?       // Optional category description
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Relationships
  tournaments         Tournament[]
  registrations       CategoryRegistration[]
  rankings            CategoryRanking[]

  // Constraints
  @@unique([type, ageGroup, gender]) // Prevent duplicate categories (FR-005)
  @@index([type])
  @@index([ageGroup])
  @@index([gender])
}
```

**Field Descriptions**:
- `id`: UUID primary key
- `type`: Category type (Singles/Doubles) per FR-001
- `ageGroup`: Age eligibility threshold per FR-002
- `gender`: Gender requirement per FR-003
- `name`: Auto-generated from type+ageGroup+gender (e.g., "Men's Singles 35+")
- `description`: Optional organizer-provided description
- `createdAt/updatedAt`: Audit timestamps

**Unique Constraint** (FR-004, FR-005):
- `[type, ageGroup, gender]` combination must be unique
- Prevents duplicate categories like two "Men's Singles 35+" entries
- Database-level enforcement ensures data integrity

**Indexes**:
- Individual indexes on type, ageGroup, gender for filtering
- Example queries:
  - "Show all Singles categories"
  - "Show all 35+ categories"
  - "Show all Women's categories"

**Business Logic**:
- Name generation: `${gender}'s ${type} ${ageGroup}`
  - Example: "Women's Singles 35+", "Mixed Doubles (All ages)"
- Validation: Ensure type, ageGroup, gender are valid enum values

---

### Tournament (NEW)

Represents a competitive event belonging to exactly one category.

```prisma
model Tournament {
  id          String   @id @default(uuid())
  name        String   // Tournament display name
  categoryId  String   // Required: belongs to one category (FR-006)
  description String?  // Optional tournament details
  location    String?  // Optional location
  startDate   DateTime
  endDate     DateTime
  status      TournamentStatus @default(SCHEDULED)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  // Constraints
  @@index([categoryId])
  @@index([startDate])
  @@index([status])
}

enum TournamentStatus {
  SCHEDULED   // Not yet started
  IN_PROGRESS // Currently running
  COMPLETED   // Finished
  CANCELLED   // Cancelled by organizers
}
```

**Field Descriptions**:
- `id`: UUID primary key
- `name`: Tournament name (e.g., "Spring Championship 2025")
- `categoryId`: Foreign key to Category (required, FR-006)
- `startDate/endDate`: Tournament date range
- `status`: Current tournament state

**Relationship Constraints** (FR-006):
- `categoryId` is required (NOT NULL)
- `onDelete: Restrict`: Prevents category deletion if tournaments exist
- Each tournament belongs to exactly ONE category

**Indexes**:
- `categoryId`: Fast lookups of tournaments by category
- `startDate`: Date range queries for scheduling
- `status`: Filter active/completed tournaments

**Validation Rules**:
- `endDate` must be >= `startDate`
- Cannot change categoryId after tournament creation (per FR-006)
- Status transitions: SCHEDULED → IN_PROGRESS → COMPLETED

---

### CategoryRegistration (NEW)

Junction table managing player registrations to categories with eligibility tracking.

```prisma
model CategoryRegistration {
  id             String              @id @default(uuid())
  playerId       String              // Foreign key to PlayerProfile
  categoryId     String              // Foreign key to Category
  status         RegistrationStatus  @default(ACTIVE)
  registeredAt   DateTime            @default(now())
  withdrawnAt    DateTime?           // Timestamp when withdrawn
  notes          String?             // Optional admin notes
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  // Relationships
  player         PlayerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  category       Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  // Constraints
  @@unique([playerId, categoryId]) // One registration per player per category (FR-007)
  @@index([playerId])
  @@index([categoryId])
  @@index([status])
}
```

**Field Descriptions**:
- `id`: UUID primary key
- `playerId`: References PlayerProfile
- `categoryId`: References Category
- `status`: ACTIVE, WITHDRAWN, or SUSPENDED
- `registeredAt`: When player first registered
- `withdrawnAt`: Timestamp of withdrawal (null if ACTIVE)
- `notes`: Admin notes (e.g., reason for suspension)

**Unique Constraint** (FR-007):
- `[playerId, categoryId]` prevents duplicate registrations
- Allows same player to register for multiple different categories
- Database-level enforcement

**Deletion Behaviors**:
- `onDelete: Cascade` on player: Remove registrations when player deleted (GDPR)
- `onDelete: Restrict` on category: Prevent category deletion if registrations exist

**Business Logic**:
- Registration creation validates eligibility via `registrationService.validateEligibility()`
- Validation checks age (FR-008, FR-009, FR-010, FR-012) and gender (FR-011)
- Status changes: ACTIVE → WITHDRAWN (soft delete)

**Indexes**:
- `playerId`: Get all categories for a player (FR-017)
- `categoryId`: Get all players in a category (FR-016)
- `status`: Filter active registrations

---

### CategoryRanking (NEW)

Stores category-specific player rankings calculated from tournament results.

```prisma
model CategoryRanking {
  id          String   @id @default(uuid())
  playerId    String   // Foreign key to PlayerProfile
  categoryId  String   // Foreign key to Category
  rank        Int      // Current rank in category (1 = first place)
  points      Float    @default(0) // Ranking points
  wins        Int      @default(0) // Total wins in category
  losses      Int      @default(0) // Total losses in category
  lastUpdated DateTime @updatedAt  // When ranking was last recalculated
  createdAt   DateTime @default(now())

  // Relationships
  player      PlayerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  category    Category      @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  // Constraints
  @@unique([playerId, categoryId])  // One ranking per player per category (FR-013)
  @@index([categoryId, rank])       // Fast leaderboard queries
  @@index([playerId])
}
```

**Field Descriptions**:
- `id`: UUID primary key
- `playerId`: References PlayerProfile
- `categoryId`: References Category
- `rank`: Ordinal rank (1, 2, 3, ...) within category
- `points`: Calculated ranking points (algorithm TBD)
- `wins/losses`: Win-loss record in this category
- `lastUpdated`: Timestamp of last ranking calculation

**Unique Constraint** (FR-013):
- `[playerId, categoryId]` ensures one ranking per player per category
- Rankings are independent across categories

**Indexes**:
- `[categoryId, rank]`: Fast leaderboard queries (top 10, top 100, etc.)
- `playerId`: Lookup player's rankings across all categories

**Business Logic**:
- Rankings are calculated asynchronously via `rankingService.updateCategoryRankings()`
- Triggered after tournament completion
- Ranks assigned based on points (descending order)
- Updates within 5 minutes of tournament results (SC-004)

**Calculation Notes**:
- Points calculation algorithm deferred to tournament results feature
- Initial implementation can use simple points-based system
- Future: Support ELO, ladder, or other ranking systems

---

### PlayerProfile (EXTENDED)

Extends existing PlayerProfile model with fields required for category eligibility validation.

```prisma
model PlayerProfile {
  // ========================================
  // EXISTING FIELDS (from 001-user-management)
  // ========================================
  id        String    @id @default(uuid())
  userId    String?   @unique // Nullable - profile can exist without account
  name      String
  email     String?   @unique
  phone     String?
  createdBy String    // Organizer who created this profile
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // ========================================
  // NEW FIELDS (for 002-category-system)
  // ========================================
  birthDate DateTime? // Required for age calculation (FR-008, FR-009, FR-010)
  gender    Gender?   // Required for gender validation (FR-011)

  // ========================================
  // EXISTING RELATIONSHIPS
  // ========================================
  user    User? @relation("UserProfile", fields: [userId], references: [id], onDelete: SetNull)
  creator User  @relation("ProfileCreator", fields: [createdBy], references: [id], onDelete: Restrict)

  // ========================================
  // NEW RELATIONSHIPS (for 002-category-system)
  // ========================================
  categoryRegistrations CategoryRegistration[]
  categoryRankings      CategoryRanking[]

  // ========================================
  // INDEXES
  // ========================================
  @@index([userId])
  @@index([createdBy])
  @@index([name])
  @@index([email])
  @@index([birthDate]) // NEW: For age-based queries
  @@index([gender])    // NEW: For gender-based queries
}
```

**New Fields**:
- `birthDate`: Player's date of birth (nullable for backward compatibility)
  - Used to calculate age at registration time
  - Required for age validation (FR-008, FR-009, FR-010)
  - Nullable to support existing players without breaking schema

- `gender`: Player's gender (nullable for backward compatibility)
  - Used for gender validation (FR-011)
  - Values: MEN, WOMEN, or null
  - Nullable to support existing players

**Migration Strategy**:
1. Add nullable fields to existing PlayerProfile table
2. Existing players have birthDate=null, gender=null
3. Require birthDate and gender when registering for categories
4. Update frontend to collect birthDate and gender on profile creation
5. Backfill existing players (manual or default values)

**Business Logic**:
- Age calculation: `calculateAge(birthDate, referenceDate = new Date())`
- Validation: Enforce non-null birthDate and gender before category registration
- Privacy: birthDate is sensitive data, restrict access appropriately

---

## Schema Updates Required

### 1. Extend Existing Schema

File: `backend/prisma/schema.prisma`

```prisma
// ========================================
// EXTEND PlayerProfile model (existing)
// ========================================
model PlayerProfile {
  // ... existing fields ...

  // NEW FIELDS
  birthDate DateTime?
  gender    Gender?

  // NEW RELATIONS
  categoryRegistrations CategoryRegistration[]
  categoryRankings      CategoryRanking[]

  // NEW INDEXES
  @@index([birthDate])
  @@index([gender])
}

// ========================================
// NEW ENUMS
// ========================================
enum CategoryType {
  SINGLES
  DOUBLES
}

enum AgeGroup {
  ALL_AGES
  AGE_20
  AGE_25
  AGE_30
  AGE_35
  AGE_40
  AGE_45
  AGE_50
  AGE_55
  AGE_60
  AGE_65
  AGE_70
  AGE_75
  AGE_80
}

enum Gender {
  MEN
  WOMEN
  MIXED
}

enum RegistrationStatus {
  ACTIVE
  WITHDRAWN
  SUSPENDED
}

enum TournamentStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

// ========================================
// NEW MODELS
// ========================================
// [Copy Category, Tournament, CategoryRegistration, CategoryRanking from above]
```

### 2. Create Migration

```bash
npx prisma migrate dev --name add-category-system
```

This will:
1. Alter PlayerProfile table (add birthDate, gender columns)
2. Create Category table with unique constraint
3. Create Tournament table with foreign key to Category
4. Create CategoryRegistration table with composite unique key
5. Create CategoryRanking table with composite unique key
6. Create all enum types
7. Create all indexes

### 3. Generate Prisma Client

```bash
npx prisma generate
```

Updates `@prisma/client` with new models and types.

---

## Data Integrity Rules

### Enforced by Database Constraints

1. **Unique Categories** (FR-005):
   - UNIQUE constraint on `[type, ageGroup, gender]`
   - Prevents duplicate "Men's Singles 35+" categories

2. **One Registration Per Player Per Category** (FR-007):
   - UNIQUE constraint on `CategoryRegistration.[playerId, categoryId]`
   - Allows multiple categories, prevents duplicate registrations

3. **Tournament Belongs to One Category** (FR-006):
   - NOT NULL constraint on `Tournament.categoryId`
   - Foreign key relationship enforces referential integrity

4. **Category Deletion Protection**:
   - `onDelete: Restrict` on Tournament.category
   - Cannot delete Category if Tournaments exist

5. **Cascade Deletions**:
   - CategoryRegistration cascades on player deletion (GDPR)
   - CategoryRanking cascades on player/category deletion

### Enforced by Application Logic

1. **Age Validation** (FR-008, FR-009, FR-010):
   - Service layer validates player age against category.ageGroup
   - ALL_AGES bypasses age validation (FR-012)
   - Players can register for categories at or below their age

2. **Gender Validation** (FR-011):
   - Service layer validates player.gender against category.gender
   - MIXED allows all genders

3. **Eligibility Validation** (FR-008 through FR-012):
   - `registrationService.validateEligibility()` checks all rules
   - 100% accuracy required (SC-002, SC-007)

---

## Query Patterns

### Common Queries

**1. Get all categories for a specific type and gender:**
```javascript
const categories = await prisma.category.findMany({
  where: {
    type: 'SINGLES',
    gender: 'MEN'
  },
  orderBy: { ageGroup: 'asc' }
});
```

**2. Get all tournaments in a category:**
```javascript
const tournaments = await prisma.tournament.findMany({
  where: { categoryId: 'category-uuid' },
  include: { category: true }
});
```

**3. Get all categories a player is registered for:**
```javascript
const registrations = await prisma.categoryRegistration.findMany({
  where: {
    playerId: 'player-uuid',
    status: 'ACTIVE'
  },
  include: { category: true }
});
```

**4. Get category leaderboard (top 10):**
```javascript
const leaderboard = await prisma.categoryRanking.findMany({
  where: { categoryId: 'category-uuid' },
  orderBy: { rank: 'asc' },
  take: 10,
  include: { player: { select: { name: true } } }
});
```

**5. Validate eligibility before registration:**
```javascript
const player = await prisma.playerProfile.findUnique({
  where: { id: 'player-uuid' },
  select: { birthDate: true, gender: true }
});

const category = await prisma.category.findUnique({
  where: { id: 'category-uuid' },
  select: { ageGroup: true, gender: true }
});

const isEligible = validateEligibility(player, category);
```

---

## Seed Data Examples

### Categories
```javascript
// Men's Singles - All age groups
{ type: 'SINGLES', ageGroup: 'ALL_AGES', gender: 'MEN', name: "Men's Singles (All ages)" }
{ type: 'SINGLES', ageGroup: 'AGE_20', gender: 'MEN', name: "Men's Singles 20+" }
{ type: 'SINGLES', ageGroup: 'AGE_35', gender: 'MEN', name: "Men's Singles 35+" }
{ type: 'SINGLES', ageGroup: 'AGE_50', gender: 'MEN', name: "Men's Singles 50+" }

// Women's Doubles - Selected age groups
{ type: 'DOUBLES', ageGroup: 'ALL_AGES', gender: 'WOMEN', name: "Women's Doubles (All ages)" }
{ type: 'DOUBLES', ageGroup: 'AGE_35', gender: 'WOMEN', name: "Women's Doubles 35+" }

// Mixed Doubles
{ type: 'DOUBLES', ageGroup: 'ALL_AGES', gender: 'MIXED', name: "Mixed Doubles (All ages)" }
{ type: 'DOUBLES', ageGroup: 'AGE_40', gender: 'MIXED', name: "Mixed Doubles 40+" }
```

### Sample Tournament
```javascript
{
  name: "Spring Championship 2025",
  categoryId: "[Men's Singles 35+ ID]",
  startDate: new Date('2025-05-01'),
  endDate: new Date('2025-05-03'),
  status: 'SCHEDULED'
}
```

---

## Migration Checklist

- [ ] Extend PlayerProfile with birthDate and gender (nullable)
- [ ] Create Gender enum (MEN, WOMEN, MIXED)
- [ ] Create CategoryType enum (SINGLES, DOUBLES)
- [ ] Create AgeGroup enum (ALL_AGES, AGE_20...AGE_80)
- [ ] Create RegistrationStatus enum (ACTIVE, WITHDRAWN, SUSPENDED)
- [ ] Create TournamentStatus enum (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
- [ ] Create Category model with unique constraint
- [ ] Create Tournament model with foreign key to Category
- [ ] Create CategoryRegistration model with composite unique key
- [ ] Create CategoryRanking model with composite unique key
- [ ] Add indexes for query performance
- [ ] Run migration: `npx prisma migrate dev --name add-category-system`
- [ ] Generate client: `npx prisma generate`
- [ ] Create seed data for common categories
- [ ] Update existing PlayerProfile records (backfill or require completion)

---

**Data Model Completed**: 2025-11-01
**Ready for**: API Contract Design
