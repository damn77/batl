# Implementation Plan: Tournament Rankings and Points System

**Branch**: `008-tournament-rankings` | **Date**: 2025-12-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-tournament-rankings/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a comprehensive tournament rankings system that automatically calculates and maintains category-based player/pair rankings using tournament points. The system supports two point calculation methods (placement-based and round-based), manages multiple rankings per category (for doubles: pair + individual), and provides seeding score calculation based on best N tournament results. Rankings reset annually and are publicly viewable to promote competitive engagement and fair tournament seeding.

**Technical Approach**: Extend existing Prisma schema with ranking entities, create backend services for point calculation and ranking management, add API endpoints for ranking retrieval and admin configuration, and build frontend pages for public rankings display and organizer point configuration.

## Technical Context

**Language/Version**: Node.js 20+ (ES Modules)
**Primary Dependencies**: Express 5.1.0, Prisma ORM (PostgreSQL), Joi/Zod validation, bcryptjs, Passport.js
**Storage**: PostgreSQL via Prisma ORM
**Testing**: Jest with Supertest for API integration tests
**Target Platform**: Web application (Linux/Windows server + modern browsers)
**Project Type**: Web application (backend + frontend monorepo)
**Performance Goals**:
- Rankings page load < 5 seconds for 1000+ players
- Point calculation and ranking update < 1 minute after tournament completion
- Seeding score calculation < 500ms per player/pair
**Constraints**:
- 100% calculation accuracy required for fairness
- Historical point awards must be immutable after calculation
- Public rankings must not require authentication
**Scale/Scope**:
- Support 1000+ players per category
- Handle 50+ tournaments per year per category
- Archive 5+ years of historical ranking data

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Specification-Driven Development ✅

- ✅ **Complete specification exists**: [spec.md](spec.md) with 5 user stories (P1-P3), 26 functional requirements, 7 success criteria
- ✅ **User stories prioritized**: P1 (rankings display, point calculation), P2 (seeding, multiple rankings), P3 (admin config)
- ✅ **Measurable success criteria**: All 7 criteria include quantifiable metrics (time, accuracy, user success rate)
- ✅ **Edge cases identified**: 6 edge cases covering tiebreakers, year transitions, tied scores, invalidation

**Status**: PASS - Specification complete and testable

### II. Incremental Delivery ✅

**User Story Decomposition**:
- **P1 - MVP Stories** (independently deliverable):
  - US1: View Real-Time Rankings → Delivers competitive standings visibility
  - US2: Earn Points Automatically → Enables the core ranking mechanism
- **P2 - Enhanced Stories**:
  - US3: Seeding Score Calculation → Improves tournament fairness
  - US4: Multiple Rankings Per Category → Supports doubles flexibility
- **P3 - Future Enhancements**:
  - US5: Admin Point Table Configuration → Allows system customization

Each story can be implemented, tested, and deployed independently with standalone value.

**Status**: PASS - Stories follow strict priority order and deliver incremental value

### III. Design Before Implementation ✅

**Required Artifacts** (to be generated in Phase 0-1):
- ✅ research.md: Point calculation algorithms, ranking tiebreaker strategies, annual rollover approaches
- ✅ data-model.md: Ranking, RankingEntry, TournamentResult, PointTable, TournamentPointConfig entities
- ✅ contracts/: API contracts for ranking retrieval, point calculation, admin configuration
- ✅ quickstart.md: End-to-end workflow from tournament completion to ranking display

**Status**: PASS - Will generate all required artifacts before task generation

### IV. Test Accountability ⚠️

**Tests NOT explicitly requested in specification** - Tests are OPTIONAL per constitution.

However, given critical business requirements (100% calculation accuracy per SC-006, financial fairness implications), integration tests are RECOMMENDED for:
- Point calculation formulas (placement and round-based)
- Seeding score calculation with top N tournament selection
- Ranking sort order with multi-level tiebreakers

**Status**: OPTIONAL (tests recommended but not required)

### V. Constitution Compliance ✅

No violations anticipated. Standard web application architecture with existing patterns.

**Status**: PASS - Full compliance expected

### Final Gate Status: ✅ APPROVED FOR PHASE 0 RESEARCH

## Project Structure

### Documentation (this feature)

```text
specs/008-tournament-rankings/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (point calculation research, ranking algorithms)
├── data-model.md        # Phase 1 output (Ranking, RankingEntry, TournamentResult, PointTable)
├── quickstart.md        # Phase 1 output (tournament completion → ranking display workflow)
├── contracts/           # Phase 1 output (API endpoint specifications)
│   ├── ranking-api.md        # GET /rankings, GET /rankings/:categoryId, GET /seeding-score
│   ├── point-calculation-api.md  # POST /tournaments/:id/calculate-points
│   └── admin-point-tables-api.md # GET/PUT /admin/point-tables
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma          # Add: Ranking, RankingEntry, TournamentResult, PointTable, TournamentPointConfig
│   └── seed.js                # UPDATE: Add test data for rankings demonstration
├── src/
│   ├── services/
│   │   ├── rankingService.js           # Ranking CRUD, ranking calculation, annual rollover
│   │   ├── pointCalculationService.js  # Placement/round-based point calculation
│   │   ├── seedingService.js           # Seeding score calculation (top N tournaments)
│   │   └── pointTableService.js        # Point table CRUD and lookup
│   ├── api/
│   │   ├── routes/
│   │   │   ├── rankings.js             # Public ranking endpoints
│   │   │   ├── seeding.js              # Seeding score endpoint
│   │   │   └── admin/
│   │   │       └── pointTables.js      # Admin point table configuration
│   │   └── validators/
│   │       ├── rankingValidators.js    # Ranking query validation
│   │       └── pointTableValidators.js # Point table update validation
│   └── utils/
│       ├── rankingCalculator.js        # Ranking sort algorithm with tiebreakers
│       └── yearRollover.js             # Annual ranking reset/archival logic
└── tests/
    ├── integration/
    │   ├── ranking.test.js             # Ranking retrieval tests
    │   ├── pointCalculation.test.js    # Point formula accuracy tests
    │   └── seeding.test.js             # Seeding score calculation tests
    └── unit/
        ├── rankingCalculator.test.js   # Tiebreaker logic tests
        └── pointTableLookup.test.js    # Point table selection tests

frontend/
├── src/
│   ├── components/
│   │   ├── RankingsTable.jsx           # Reusable rankings table (TanStack Table)
│   │   └── PointTableEditor.jsx        # Admin point table editing component
│   ├── pages/
│   │   ├── CategoryRankingsPage.jsx    # Public category rankings page (already exists - enhance)
│   │   └── admin/
│   │       └── PointTablesPage.jsx     # Admin point table configuration page
│   └── services/
│       ├── rankingService.js           # Ranking API client
│       ├── seedingService.js           # Seeding score API client
│       └── pointTableService.js        # Point table API client
└── tests/ (optional)
```

**Structure Decision**: Web application (Option 2) - Existing backend/frontend separation maintained. Rankings are a natural extension of the category and tournament systems, following established API-first architecture with React frontend.

## Complexity Tracking

No constitution violations - standard feature implementation using existing patterns.

---

## Phase 0: Research & Technical Investigation

*Status: ✅ Complete - See [research.md](research.md)*

### Research Questions

1. **Point Calculation Algorithms**: How to implement placement-based vs. round-based formulas with 100% accuracy?
2. **Ranking Tiebreakers**: Best practices for multi-level tiebreaker implementation (points → recent tournament → tournament count → alphabetical)?
3. **Annual Rollover**: Strategies for archiving previous year rankings while resetting current year?
4. **Seeding Score Optimization**: Efficient algorithm for selecting top N tournaments when N < total tournaments?
5. **Multiple Rankings Per Category**: Database design for managing pair + individual rankings in doubles categories?
6. **Point Table Lookup**: Efficient participant count → point table mapping strategy?

### Research Deliverables

- Decision matrix for point calculation approaches
- Tiebreaker algorithm pseudocode with test cases
- Annual rollover data migration strategy
- Seeding score query optimization plan
- Point table schema design rationale

---

## Phase 1: Design & Data Modeling

*Status: ✅ Complete - See artifacts below*

### Data Model

**See [data-model.md](data-model.md)** for complete entity definitions, relationships, and validation rules.

**Key Entities**:
- **Ranking**: Leaderboard for category+year+type (PAIR/MEN/WOMEN/SINGLES)
- **RankingEntry**: Individual position in ranking with points, tournament count, rank
- **TournamentResult**: Tournament participation record with placement, points awarded
- **PointTable**: Round → points mapping for participant count ranges
- **TournamentPointConfig**: Tournament-level point calculation configuration

### API Contracts

**See [contracts/](contracts/)** for OpenAPI specifications.

**Endpoints** (18 total):
- **Public Rankings** (3): GET /rankings, GET /rankings/:categoryId, GET /rankings/:categoryId/archived/:year
- **Point Calculation** (2): POST /tournaments/:id/calculate-points, GET /tournaments/:id/point-preview
- **Seeding** (2): GET /seeding-score/:entityType/:entityId/category/:categoryId, POST /seeding-score/bulk
- **Admin Point Tables** (5): GET/PUT/POST/DELETE for point table CRUD, GET /point-tables/lookup
- **Tournament Configuration** (2): PUT /tournaments/:id/point-config, GET /tournaments/:id/point-config
- **Ranking Management** (4): POST /rankings/:categoryId/recalculate, POST /rankings/year-rollover, GET /rankings/:categoryId/entries/:entryId/breakdown, DELETE /rankings/:categoryId/archive/:year

### Quickstart Guide

**See [quickstart.md](quickstart.md)** for complete end-to-end workflows.

**Primary Flow**: Tournament Completion → Point Calculation → Ranking Update → Public Display

### Test Data Requirements

**Seed Data Updates** (`backend/prisma/seed.js`):
1. **Point Tables**: Seed all 4 participant ranges (2-4, 5-8, 9-16, 17-32) with default values from spec
2. **Sample Tournaments**: Create 3-5 completed tournaments with:
   - Mix of PLACEMENT and FINAL_ROUND calculation methods
   - Different participant counts to demonstrate various point tables
   - Different categories (singles, doubles, mixed doubles)
3. **Tournament Results**: Populate results for completed tournaments with realistic placements/rounds
4. **Rankings**: Pre-calculate initial rankings for 2-3 categories showing:
   - Players with different point totals
   - Tiebreaker scenarios (same points, different tournament counts)
   - Multiple rankings per category for doubles (pair + individual)
5. **Historical Data**: Create archived rankings for previous year (2024) to demonstrate year rollover

**Purpose**: Enable immediate demonstration and manual testing of all ranking features without requiring manual tournament completion.

---

## Phase 2: Task Generation

**NOT PART OF THIS COMMAND** - Use `/speckit.tasks` to generate implementation tasks organized by user story priority.

---

## Implementation Notes

### Critical Business Rules

1. **Immutable Historical Points**: Once points are awarded, they cannot be changed (even if point tables are edited)
2. **Annual Reset**: Rankings automatically reset on January 1st, previous year archived
3. **Tiebreaker Hierarchy**: Total points → Recent tournament date → Fewest tournaments → Alphabetical
4. **Seeding Score Limit**: Default 7 best tournaments, configurable per category (not per ranking)
5. **Doubles Rankings**: Pair + Individual rankings auto-created based on category gender

### Performance Considerations

- **Ranking Calculation**: Pre-calculate and cache rankings, recalculate only on tournament completion
- **Seeding Scores**: Calculate on-demand during registration, cache for tournament duration
- **Historical Data**: Partition archived rankings by year for efficient querying
- **Point Tables**: Load into memory at server startup (small, rarely changing dataset)

### Migration Strategy

- **Phase 0**: Add new Prisma schema, run migration without data
- **Phase 1**: Seed default point tables for all participant ranges
- **Phase 2**: Seed sample tournaments and rankings for demonstration
- **Phase 3**: Schedule annual rollover cron job (future feature)

### Testing Strategy

**Recommended** (though optional per constitution):
- **Unit Tests**: Point calculation formulas, tiebreaker logic, seeding score selection
- **Integration Tests**: End-to-end tournament → points → rankings flow
- **Contract Tests**: API endpoint request/response validation
- **Manual Tests**: Admin point table editing, ranking display with 1000+ entries

### Dependencies on Existing Features

- **002-category-system**: Category entity, category types (SINGLES/DOUBLES), gender values
- **003-tournament-registration**: Tournament completion event, registration entities
- **006-doubles-pairs**: Pair entity, pair → player relationships
- **004-tournament-rules**: Tournament format, bracket structure, round definitions

All dependencies already implemented and stable.

---

## Post-Design Constitution Re-Check

### Gate Re-Evaluation

- ✅ **Design artifacts complete**: research.md, data-model.md, contracts/, quickstart.md all generated
- ✅ **No scope creep**: Implementation strictly follows spec requirements
- ✅ **No complexity violations**: Standard CRUD + calculation services
- ✅ **Independent user stories**: Each P1/P2/P3 story can be implemented in isolation
- ✅ **Test data planned**: Seed script updates included for feature demonstration

**Final Status**: ✅ APPROVED FOR TASK GENERATION (`/speckit.tasks`)

---

## Appendix: Technology Choices

**Backend**:
- **Express 5.1.0**: Existing framework, mature routing and middleware
- **Prisma ORM**: Type-safe database access, migration management
- **Joi validation**: Request validation for API endpoints
- **Jest + Supertest**: Testing framework for integration tests

**Frontend**:
- **React 19**: Existing framework, component-based architecture
- **React Bootstrap 2.10**: UI components consistent with existing pages
- **TanStack React Table 8.21**: Already used in CategoryManagementPage, ideal for ranking tables
- **Axios**: HTTP client consistent with existing service layer

**Database**:
- **PostgreSQL**: Existing database, supports complex queries for ranking calculations
- **Prisma schema**: Extends existing schema with ranking entities

No new technology introductions required - feature builds on established patterns.
