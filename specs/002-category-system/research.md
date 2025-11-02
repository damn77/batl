# Technical Research: Tournament Category System

**Feature**: 002-category-system
**Date**: 2025-11-01
**Phase**: Phase 0 - Research & Technical Decisions

## Research Questions

Based on Technical Context NEEDS CLARIFICATION markers and feature requirements:

1. **Testing Framework**: Which Node.js testing framework to adopt?
2. **Frontend Framework**: Which frontend framework to use for UI components?
3. **Category-Tournament Relationship**: Best practices for 1:1 relationships in Prisma
4. **Multi-Category Registration**: Pattern for managing multiple registrations per player
5. **Eligibility Validation**: Server-side validation patterns for age/gender rules
6. **Ranking System Design**: Category-specific ranking calculation and storage

## Research Findings

### 1. Testing Framework Selection

**Decision**: Jest

**Rationale**:
- Industry standard for Node.js applications
- Built-in assertion library, mocking, and code coverage
- Excellent TypeScript/JavaScript support
- Parallel test execution for performance
- Large ecosystem and community support
- Works seamlessly with Prisma (via @prisma/client mock utilities)
- Snapshot testing useful for API response validation

**Alternatives Considered**:
- **Mocha**: More flexible but requires additional libraries (Chai for assertions, Sinon for mocks)
  - Rejected: Additional configuration overhead
- **Vitest**: Faster, more modern, compatible with Vite
  - Rejected: Project uses Node.js/Express, not Vite-based

**Implementation Notes**:
- Add jest to devDependencies
- Configure jest.config.js for ES modules support
- Use supertest for Express API testing
- Prisma test database setup with separate DATABASE_URL for tests

---

### 2. Frontend Framework Selection

**Decision**: React 18+ with Vite

**Rationale**:
- React is the most popular and well-supported framework
- Vite provides fast dev server and optimized builds
- Excellent ecosystem for form validation, routing, state management
- Large talent pool and extensive documentation
- Works well with existing backend Express API
- Component-based architecture matches category/tournament/registration domain structure

**Alternatives Considered**:
- **Vue 3**: Simpler learning curve, good performance
  - Rejected: Smaller ecosystem compared to React for complex forms/validation
- **Svelte**: Excellent performance, minimal boilerplate
  - Rejected: Smaller community, fewer libraries for enterprise features
- **Next.js**: React with SSR/SSG capabilities
  - Rejected: Overkill for this application; SSR not required for tournament management

**Implementation Notes**:
- Use Vite for build tooling
- React Router for navigation
- React Hook Form for form handling (better performance than Formik)
- TanStack Query (React Query) for server state management
- Axios or Fetch API for backend communication
- Tailwind CSS or Material-UI for styling (TBD based on team preference)

---

### 3. Category-Tournament Relationship Pattern

**Decision**: Direct foreign key relationship with unique constraint

**Rationale**:
- Requirement: Each tournament belongs to exactly ONE category (1:1 from tournament perspective)
- Pattern: Tournament has categoryId field with @relation to Category
- Enforcement: Database-level constraint ensures data integrity
- Query efficiency: Direct foreign key enables fast lookups and joins
- Prisma support: Native 1:many relationship (Category has many Tournaments, Tournament belongs to Category)

**Prisma Schema Pattern**:
```prisma
model Category {
  id          String       @id @default(uuid())
  type        CategoryType
  ageGroup    AgeGroup
  gender      Gender
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  tournaments Tournament[]  // One category has many tournaments
  registrations CategoryRegistration[]
  rankings    CategoryRanking[]

  @@unique([type, ageGroup, gender]) // Prevent duplicates
}

model Tournament {
  id         String   @id @default(uuid())
  name       String
  categoryId String
  startDate  DateTime
  endDate    DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  category   Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@index([categoryId])
}
```

**Best Practices**:
- Use `onDelete: Restrict` to prevent accidental category deletion while tournaments exist
- Index categoryId for query performance
- Unique constraint on [type, ageGroup, gender] prevents duplicate categories

---

### 4. Multi-Category Registration Pattern

**Decision**: Junction table (CategoryRegistration) with composite unique constraint

**Rationale**:
- Requirement: Player can register for multiple categories
- Pattern: Many-to-many relationship between Player (PlayerProfile) and Category
- Enforcement: Unique constraint on [playerId, categoryId] prevents duplicate registrations
- Flexibility: Can add registration metadata (registrationDate, status, etc.)
- Query efficiency: Indexes on both foreign keys for bidirectional lookups

**Prisma Schema Pattern**:
```prisma
model CategoryRegistration {
  id             String    @id @default(uuid())
  playerId       String
  categoryId     String
  registeredAt   DateTime  @default(now())
  status         RegistrationStatus @default(ACTIVE)

  player         PlayerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  category       Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@unique([playerId, categoryId]) // One registration per player per category
  @@index([playerId])
  @@index([categoryId])
}

enum RegistrationStatus {
  ACTIVE
  WITHDRAWN
  SUSPENDED
}
```

**Best Practices**:
- Composite unique index prevents duplicate registrations
- Cascade delete on player removal (GDPR compliance)
- Restrict delete on category (protect active registrations)
- Status field enables soft deletion (withdraw without losing history)

---

### 5. Eligibility Validation Pattern

**Decision**: Service-layer validation with Joi schemas + business logic

**Rationale**:
- Requirement: Validate age and gender against category rules with 100% accuracy
- Pattern: Two-layer validation
  1. Joi schema validation for input format
  2. Business logic validation for eligibility rules
- Enforcement: Server-side only (never trust client)
- Flexibility: Complex rules (age calculations, "All ages" bypass) handled in code

**Implementation Pattern**:
```javascript
// registrationService.js
export const validateEligibility = async (playerId, categoryId) => {
  // Fetch player and category with required data
  const player = await prisma.playerProfile.findUnique({
    where: { id: playerId },
    include: { user: true } // For age/gender data
  });

  const category = await prisma.category.findUnique({
    where: { id: categoryId }
  });

  // Eligibility rules
  const errors = [];

  // Age validation (skip if "All ages")
  if (category.ageGroup !== 'ALL_AGES') {
    const minAge = parseAgeGroup(category.ageGroup); // e.g., "35+" → 35
    const playerAge = calculateAge(player.birthDate);

    // Players can play in categories at or below their age
    // But cannot play in categories requiring higher minimum age
    if (playerAge < minAge) {
      errors.push(`Player age ${playerAge} is below minimum age ${minAge}`);
    }
  }

  // Gender validation (skip if "Mixed")
  if (category.gender !== 'MIXED' && player.gender !== category.gender) {
    errors.push(`Player gender ${player.gender} does not match category gender ${category.gender}`);
  }

  return {
    eligible: errors.length === 0,
    errors
  };
};
```

**Best Practices**:
- Calculate age from birthDate, not stored age field (always current)
- Validate at registration time (don't re-validate during tournament)
- Return detailed error messages for user feedback
- Log all validation failures for audit trail

---

### 6. Ranking System Design Pattern

**Decision**: Separate CategoryRanking table with calculated fields

**Rationale**:
- Requirement: Each category maintains independent rankings
- Pattern: CategoryRanking stores player's rank within specific category
- Calculation: Triggered by tournament results, updates asynchronously
- Storage: Denormalized ranking data for query performance
- Flexibility: Can support multiple ranking algorithms per category

**Prisma Schema Pattern**:
```prisma
model CategoryRanking {
  id          String   @id @default(uuid())
  playerId    String
  categoryId  String
  rank        Int
  points      Float
  wins        Int      @default(0)
  losses      Int      @default(0)
  updatedAt   DateTime @updatedAt

  player      PlayerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  category    Category      @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([playerId, categoryId]) // One ranking per player per category
  @@index([categoryId, rank])      // Fast category leaderboard queries
  @@index([playerId])
}
```

**Implementation Pattern**:
```javascript
// rankingService.js
export const updateCategoryRankings = async (categoryId) => {
  // 1. Fetch all tournament results for this category
  const results = await fetchTournamentResultsByCategory(categoryId);

  // 2. Calculate points for each player
  const playerPoints = calculatePoints(results);

  // 3. Upsert rankings (update existing, create new)
  for (const [playerId, stats] of Object.entries(playerPoints)) {
    await prisma.categoryRanking.upsert({
      where: {
        playerId_categoryId: { playerId, categoryId }
      },
      update: {
        points: stats.points,
        wins: stats.wins,
        losses: stats.losses,
        updatedAt: new Date()
      },
      create: {
        playerId,
        categoryId,
        rank: 0, // Will be assigned in step 4
        points: stats.points,
        wins: stats.wins,
        losses: stats.losses
      }
    });
  }

  // 4. Assign ranks based on points (descending order)
  const rankings = await prisma.categoryRanking.findMany({
    where: { categoryId },
    orderBy: { points: 'desc' }
  });

  for (let i = 0; i < rankings.length; i++) {
    await prisma.categoryRanking.update({
      where: { id: rankings[i].id },
      data: { rank: i + 1 }
    });
  }
};
```

**Best Practices**:
- Use upsert for idempotent ranking updates
- Calculate rankings asynchronously (background job or on-demand)
- Store denormalized rank for query performance
- Index [categoryId, rank] for fast leaderboard queries
- Consider caching for frequently accessed rankings

---

## Technology Decisions Summary

| Area | Decision | Rationale |
|------|----------|-----------|
| **Testing** | Jest + Supertest | Industry standard, built-in features, Prisma support |
| **Frontend** | React 18 + Vite | Popular, extensive ecosystem, component-based |
| **API Testing** | Supertest | Express integration testing, intuitive API |
| **State Management** | TanStack Query | Server state synchronization, caching, mutations |
| **Form Handling** | React Hook Form | Performance, minimal re-renders, validation support |
| **Category-Tournament** | Foreign key + Restrict delete | Data integrity, query performance |
| **Multi-Registration** | Junction table + unique constraint | Prevents duplicates, enables metadata |
| **Eligibility** | Service-layer validation | Business logic separation, server-side security |
| **Rankings** | Separate table + async calc | Independent per category, query performance |

---

## Integration Points

### With Existing User Management (001-user-management)

**PlayerProfile Table**:
- Already exists with user relationship
- Need to add fields:
  - `birthDate: DateTime` (for age calculation)
  - `gender: Gender` (for gender validation)
- Migration required to extend existing table

**Dependency**:
```prisma
// In 001-user-management schema (EXTEND)
model PlayerProfile {
  // EXISTING FIELDS
  id        String    @id @default(uuid())
  userId    String?   @unique
  name      String
  email     String?   @unique
  phone     String?
  createdBy String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // NEW FIELDS for category system
  birthDate DateTime? // Nullable for backward compatibility
  gender    Gender?   // Nullable for backward compatibility

  // NEW RELATIONS for category system
  categoryRegistrations CategoryRegistration[]
  categoryRankings      CategoryRanking[]

  // EXISTING RELATIONS
  user    User? @relation("UserProfile", fields: [userId], references: [id], onDelete: SetNull)
  creator User  @relation("ProfileCreator", fields: [createdBy], references: [id], onDelete: Restrict)

  @@index([userId])
  @@index([createdBy])
  @@index([name])
  @@index([email])
  @@index([birthDate]) // NEW INDEX for age queries
  @@index([gender])    // NEW INDEX for gender queries
}

enum Gender {
  MEN
  WOMEN
  OTHER // For "Mixed" eligibility
}
```

**Migration Strategy**:
1. Add nullable birthDate and gender fields to PlayerProfile
2. Seed existing players with default/placeholder values OR
3. Require players to complete profile before category registration
4. Add validation to enforce non-null for new registrations

---

## Open Questions / Future Research

1. **Ranking Algorithm**: Which ranking system to use (ELO, points-based, win-loss ratio)?
   - **Status**: Deferred to tournament results feature
   - **Recommendation**: Start with simple points-based system

2. **Frontend Styling**: Tailwind CSS vs Material-UI vs custom CSS?
   - **Status**: Team preference TBD
   - **Recommendation**: Tailwind for flexibility, MUI for rapid prototyping

3. **Real-time Updates**: Should rankings update in real-time or batch process?
   - **Status**: Performance requirement is <5 minutes (SC-004)
   - **Recommendation**: Async job triggered after tournament completion

4. **Age Calculation**: Use current date or tournament start date?
   - **Status**: Spec assumes registration time (see Assumptions section)
   - **Recommendation**: Calculate at registration time, store in CategoryRegistration

---

## Dependencies & Blockers

### No Blockers
- All required technologies are available and compatible
- Existing infrastructure (Express, Prisma, SQLite) supports new features
- PlayerProfile can be extended without breaking changes (nullable fields)

### Dependencies
1. **PlayerProfile Extension**: Need birthDate and gender fields
   - **Timeline**: Include in Phase 1 data model
   - **Migration**: Add nullable fields, update seed data

2. **Tournament Model**: Referenced but not yet implemented
   - **Status**: Will be created in this feature (parallel to categories)
   - **Decision**: Define minimal Tournament model for category assignment

---

## Next Steps

1. **Phase 1**: Create data-model.md with complete Prisma schema
2. **Phase 1**: Generate API contracts for category/registration endpoints
3. **Phase 1**: Write quickstart.md with end-to-end user flow
4. **Phase 2** (after plan review): Generate tasks.md for implementation

---

**Research Completed**: 2025-11-01
**Ready for**: Phase 1 - Design & Contracts
