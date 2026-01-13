# BATL Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-13

## Active Technologies
- Node.js 20+ (ES Modules) (002-category-system)
- SQLite via Prisma ORM (development/production-ready) (002-category-system)
- React 19 + Vite 7 (Frontend) (001-user-management, 002-category-system)
- React Bootstrap 2.10 + Bootstrap 5.3 (UI Components) (001-user-management, 002-category-system)
- TanStack React Table 8.21 (Data Tables) (002-category-system)
- React DatePicker 8.8 (Date Inputs) (002-category-system)
- **Vitest** (Testing Framework) (003-tournament-registration) - Jest-compatible API, native ES modules support, Vite integration
- Node.js 20+ (ES Modules) + Express 5.1.0, Prisma ORM, React 19, React Bootstrap 2.10 (004-tournament-rules)
- Node.js 20+ (ES Modules) + Express 5.1.0, Prisma ORM, React 19, React Bootstrap 2.10, TanStack React Table 8.21 (006-doubles-pairs)
- Node.js 20+ (ES Modules) + Express 5.1.0, Prisma ORM (PostgreSQL), Joi/Zod validation, bcryptjs, Passport.js (008-tournament-rankings)
- PostgreSQL via Prisma ORM (008-tournament-rankings)
- Node.js 20+ (ES Modules) + Express 5.1.0, fs/promises (file operations), Joi (validation) (009-bracket-generation)
- JSON file (bracket-templates-all.json) - read-only, no database persistence needed (009-bracket-generation)
- Node.js 20+ (ES Modules) + Express 5.1.0, Joi (validation), seedrandom 3.0.5+ (deterministic PRNG), Jest 30.2.0 (010-seeding-placement)
- seedrandom (Deterministic Randomization) (010-seeding-placement) - For reproducible randomization in tests and seeding placement

- NEEDS CLARIFICATION - First feature, tech stack not yet selected. Requirements: must support web applications, database integration, email/password authentication, and session management. + NEEDS CLARIFICATION - Will depend on language choice. Required capabilities: web framework, database ORM/driver, password hashing library, session management, email delivery integration. (001-user-management)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

# Add commands for NEEDS CLARIFICATION - First feature, tech stack not yet selected. Requirements: must support web applications, database integration, email/password authentication, and session management.

## Code Style

NEEDS CLARIFICATION - First feature, tech stack not yet selected. Requirements: must support web applications, database integration, email/password authentication, and session management.: Follow standard conventions

## Error Handling Best Practices

**CRITICAL: API Client Error Structure**

The frontend uses a custom `apiClient` (axios wrapper) at `frontend/src/services/apiClient.js` that transforms all axios errors into a standardized format. This transformation happens in the response interceptor.

**Error Object Structure:**
```javascript
{
  status: number,    // HTTP status code (e.g., 400, 404, 500)
  code: string,      // Error code from backend or 'ERROR'/'NETWORK_ERROR'/'REQUEST_ERROR'
  message: string,   // Human-readable error message from backend
  details: object    // Additional error details (e.g., { violations: [...] })
}
```

**CORRECT Error Handling Pattern:**
```javascript
try {
  const result = await someApiCall();
  // Handle success
} catch (err) {
  // ✅ CORRECT: Access error message directly
  setError(err.message || t('errors.genericFallback'));

  // ✅ CORRECT: Check for validation violations
  if (err.details?.violations) {
    // Handle violations array
  }
}
```

**INCORRECT Pattern (DO NOT USE):**
```javascript
catch (err) {
  // ❌ WRONG: This is the raw axios pattern, will NOT work
  const errorData = err.response?.data?.error;
  setError(errorData?.message || 'fallback');

  // ❌ WRONG: Violations are not here
  const violations = err.response?.data?.error?.details?.violations;
}
```

**Why This Matters:**
- The `apiClient` interceptor already extracts `err.response?.data?.error?.message` → `err.message`
- Using the old axios pattern means backend error messages are NEVER displayed to users
- Users see generic fallback messages instead of specific API errors
- This was a widespread bug fixed in 2025-11-27 across multiple pages

**Files That Use Correct Pattern:**
- `frontend/src/pages/TournamentRegistrationPage.jsx`
- `frontend/src/pages/PlayerRegistrationPage.jsx`
- `frontend/src/pages/PairRegistrationPage.jsx`

**Reference Implementation:**
See `frontend/src/services/apiClient.js` lines 38-55 for detailed documentation of the error structure and usage patterns.

## Development Process

**CRITICAL: Keep Documentation in Sync with Code**

When making bugfixes, requirement adjustments, or implementation changes:

1. **Update Implementation** - Make the code change
2. **Update Specifications** - ALWAYS update relevant .md files in specs/ directory:
   - `spec.md` - Update functional requirements (FR-XXX) and business rules
   - `contracts/*.md` - Update API contracts if endpoints/responses change
   - `plan.md` - Update implementation notes if architecture changes
   - `tasks.md` - Add notes about what changed and why
3. **Document the Change** - Add entry to feature's changelog or notes section

**Why this matters:**
- Specifications are the source of truth for business requirements
- Future developers rely on accurate documentation
- Constitution-driven development requires spec-code alignment
- Prevents confusion and reduces debugging time

**Manual Test Case Documentation**

After completing an implementation phase that introduces new UI functionality, generate a test case document:

1. **Location**: `test-cases/` folder
2. **Filename format**: `[feature-spec]_[phase].md`
   - Example: `test-cases/006-doubles-pairs_phase-7.md`
3. **Content**: UI test instructions for manual testing including:
   - Test scenarios with step-by-step instructions
   - Expected results for each scenario
   - Prerequisites (user roles, data setup)
   - Edge cases and error conditions
4. **When to generate**: After implementation phase completes, only if there is new user-facing functionality to test

This ensures QA can verify new features work correctly before deployment.

## Recent Changes
- 009-bracket-generation: Added Node.js 20+ (ES Modules) + Express 5.1.0, fs/promises (file operations), Joi (validation)
- 008-tournament-rankings: Added Node.js 20+ (ES Modules) + Express 5.1.0, Prisma ORM (PostgreSQL), Joi/Zod validation, bcryptjs, Passport.js
- 006-doubles-pairs: Added Node.js 20+ (ES Modules) + Express 5.1.0, Prisma ORM, React 19, React Bootstrap 2.10, TanStack React Table 8.21

<!-- MANUAL ADDITIONS START -->

## Feature Implementation Notes

### 001-user-management (Completed: 2025-10-31)

**Summary**: Authentication and user management system with role-based access control (RBAC) for ADMIN, ORGANIZER, PLAYER roles.

**API Endpoints** (19 total):
- **Authentication** (5): Login, logout, session, password reset, self-registration
- **User Management** (5): User CRUD (ADMIN only)
- **Player Profiles** (5): Profile CRUD (linked or unlinked accounts)
- **Authorization** (1): Permission checks
- **Health/Testing** (3): Health check, test admin creation, duplicate checks

**Database Models**: User, Session, PlayerProfile, AuditLog

**Key Features**:
- Passwordless players (profiles without accounts)
- Account linking for existing profiles
- CASL-based authorization
- Modal-based login/register UX
- Duplicate player detection

**Frontend**: LoginPage/Modal, RegisterPage/Modal, AdminDashboard, AdminUsersPage, OrganizerDashboard, OrganizerPlayersPage, PlayerProfilePage, PublicRankingsPage

**Security**: Passport.js authentication, bcrypt hashing, rate limiting, audit logging, session management

**Related Specs**: [spec.md](specs/001-user-management/spec.md), [api-endpoints.md](specs/001-user-management/contracts/api-endpoints.md)

---

### 002-category-system (Completed: 2025-11-01 Backend, 2025-11-02 Frontend)

**Summary**: Tournament category system with player eligibility validation and category-specific rankings.

**API Endpoints** (21 total):
- **Categories** (6): CRUD + stats at `/api/v1/categories`
- **Tournaments** (5): CRUD with category assignment at `/api/v1/tournaments`
- **Registrations** (7): Player registration with eligibility checks at `/api/v1/registrations`
- **Rankings** (3): Read-only category rankings at `/api/v1/rankings`

**Database Models**:
- `Category`: Unique combination of type, ageGroup, gender
- `Tournament`: Assigned to exactly one category (can be changed if players remain eligible)
- `CategoryRegistration`: One registration per player per category
- `CategoryRanking`: Independent rankings per category

**Key Business Rules**:
1. **Age Calculation**: Calendar year only (`currentYear - birthYear`). Players eligible from January 1st of year they turn required age.
2. **Category Uniqueness**: Composite unique constraint on (type, ageGroup, gender)
3. **Tournament Category Change**: Allowed if all registered players (ACTIVE/SUSPENDED) remain eligible for new category
4. **Multi-Category Registration**: Players can register for multiple categories simultaneously
5. **Eligibility Validation**: Validates age (minimum only), gender, and profile completeness

**Implementation Highlights**:
- All API responses follow consistent format: `{ success: true/false, data/error: {...} }`
- Proper error codes and detailed error messages (e.g., INELIGIBLE_AGE with specific reasons)
- Soft deletion for registrations (status: WITHDRAWN preserves history)
- Bulk registration endpoint for multi-category registration
- Check eligibility endpoint returns 200 with eligible: false (non-destructive)

**Test Data**: Seed script creates 3 users (admin, organizer, player), 6 player profiles, and 10 common categories.

**Documentation**: Complete API contracts in `specs/002-category-system/contracts/`, quickstart guide with curl examples.

**Frontend Implementation** (Completed: 2025-11-02):
- **Services**: categoryService, tournamentService, registrationService, rankingService (axios-based API clients)
- **Pages**: CategoryManagementPage, TournamentSetupPage, PlayerRegistrationPage, CategoryRankingsPage
- **Technologies**: TanStack React Table for data display, React DatePicker for tournament dates
- **Routes**:
  - `/rankings` - Public category rankings (all users)
  - `/organizer/categories` - Category CRUD (ORGANIZER/ADMIN)
  - `/organizer/tournaments` - Tournament setup (ORGANIZER/ADMIN)
  - `/player/register` - Player registration with eligibility checking (PLAYER)
- **Features**:
  - Real-time eligibility validation before registration
  - Bulk multi-category registration
  - Tournament date picker with validation
  - Category filtering and sorting with TanStack Table
  - Rankings leaderboard with win rate calculations

**Related Specs**: [spec.md](specs/002-category-system/spec.md), [tasks.md](specs/002-category-system/tasks.md)

---

### 008-tournament-rankings (Completed: 2025-12-17)

**Summary**: Comprehensive tournament ranking and points system with automated point calculation, seeding scores, and year-over-year tracking.

**API Endpoints** (18 total):
- **Rankings** (7): Public ranking views and admin management at `/api/v1/rankings`
  - GET `/rankings` - All rankings summary
  - GET `/rankings/:categoryId` - Rankings for category (all types)
  - GET `/rankings/:categoryId/type/:type` - Specific ranking type (SINGLES, PAIR, MEN, WOMEN)
  - GET `/rankings/:categoryId/entries/:entryId/breakdown` - Tournament points breakdown
  - GET `/rankings/:categoryId/archived/:year` - Historical rankings
  - POST `/rankings/admin/year-rollover` - Annual rollover (ADMIN)
  - POST `/rankings/:categoryId/recalculate` - Force recalculation (ADMIN)
- **Point Configuration** (3): Tournament point setup at `/api/v1/tournaments/:id/point-config`
  - GET - View point configuration
  - PUT - Update point configuration (before tournament starts)
  - POST `/calculate-points` - Calculate and award points (after tournament completion)
- **Seeding** (2): Player/pair seeding scores at `/api/v1/seeding-score`
  - GET `/:entityType/:entityId/category/:categoryId` - Individual seeding score
  - POST `/bulk` - Bulk seeding scores for bracket generation
- **Point Tables** (3): Admin configuration at `/api/v1/admin/point-tables`
  - GET - All point tables
  - GET `/:range` - Point table for participant range
  - PUT `/:id` - Update point value
- **Point Preview** (1): Tournament point preview at `/api/v1/tournaments/:id/point-preview`

**Database Models**:
- `Ranking`: One per category/year/type combination (SINGLES, PAIR, MEN, WOMEN)
- `RankingEntry`: Individual ranking entry for player or pair with rank, points, seeding score
- `TournamentResult`: Links tournament participation to ranking entries with awarded points
- `TournamentPointConfig`: Per-tournament point calculation configuration (PLACEMENT vs FINAL_ROUND)
- `PointTable`: Admin-configurable point values for round-based calculations

**Key Business Rules**:
1. **Multiple Rankings Per Doubles Category**: Separate rankings for pairs and individual players (Mixed: PAIR+MEN+WOMEN, Men's: PAIR+MEN, Women's: PAIR+WOMEN)
2. **Point Calculation Methods**:
   - **PLACEMENT**: Points = (participants - placement + 1) × multiplicativeValue
   - **FINAL_ROUND**: Points from lookup table based on participant range and final round reached
3. **Seeding Score**: Sum of best N tournament results (default N=7, configurable per category)
4. **Tiebreaker Logic**: totalPoints → lastTournamentDate (more recent) → tournamentCount (fewer) → alphabetical
5. **Year Rollover**: Automated annual archival of previous year's rankings and creation of new year's rankings
6. **Point Table Ranges**: 2-4, 5-8, 9-16, 17-32, 33-64, 65+ participants

**Implementation Highlights**:
- **Automated Point Calculation**: POST `/tournaments/:id/calculate-points` after tournament completion
- **Real-time Rank Recalculation**: Rankings automatically updated after point awards using multi-level tiebreaker
- **Pagination & Search**: Support for 1000+ player categories with search by player/pair names
- **Point Table Caching**: In-memory cache with invalidation on admin updates
- **Historical Archives**: Year-based archival system with configurable retention
- **Comprehensive Indexing**: Optimized database indexes for tiebreaker queries

**Frontend Implementation**:
- **Services**: rankingService, seedingService, pointTableService (axios-based API clients)
- **Pages**:
  - CategoryRankingsPage - Public rankings with type tabs (SINGLES/PAIR/MEN/WOMEN)
  - TournamentPointConfigPage - Point configuration for organizers
  - PointTablesPage - Admin point table management
  - RankingEntryDetailModal - Detailed tournament points breakdown
- **Components**:
  - RankingsTable - TanStack Table with sorting and rank badges
  - PointPreviewPanel - Real-time point calculation preview
- **Routes**:
  - `/rankings` - Public category rankings (all users)
  - `/organizer/tournaments/:id/points` - Point configuration (ORGANIZER/ADMIN)
  - `/admin/point-tables` - Point table management (ADMIN)
- **Features**:
  - Year selector for historical rankings
  - Ranking type tabs (dynamic based on category gender)
  - Seeding score display in registration flows
  - Point preview before tournament start
  - Search and pagination for large rankings

**Seeding Integration**:
- Player/pair registration displays current seeding score
- Seeding scores calculated from best N tournaments (default 7)
- Bracket generation service uses seeding scores for fair tournament draws
- Recalculation endpoint for organizers to update seeding after point awards

**Technical Details**:
- Point calculation happens post-tournament via explicit API call
- Supports both placement-based and round-based point systems
- Double points multiplier for special tournaments (Grand Slams, etc.)
- Immutable tournament results (preserve historical point awards)
- Comprehensive error handling with specific error codes

**Related Specs**: [spec.md](specs/008-tournament-rankings/spec.md), [tasks.md](specs/008-tournament-rankings/tasks.md), [plan.md](specs/008-tournament-rankings/plan.md)

---

### 009-bracket-generation (Completed: 2026-01-10)

**Summary**: Backend API for knockout tournament bracket generation providing bracket structure templates and seeding configuration based on player count (4-128 players).

**API Endpoints** (2 total):
- **Bracket Structure** (1): GET `/api/v1/brackets/structure/:playerCount` - Returns bracket pattern, preliminary matches, byes, and bracket size
- **Seeding Configuration** (1): GET `/api/v1/brackets/seeding/:playerCount` - Returns number of seeded players based on tournament size

**Data Source**:
- `docs/bracket-templates-all.json`: 125 pre-calculated bracket templates (one per player count from 4-128)
- No database persistence needed - read-only JSON file with in-memory caching

**Key Business Rules**:
1. **Bracket Structure Format**: String pattern where "0" = preliminary match required, "1" = bye (automatic advancement)
2. **Seeding Ranges**: Number of seeded players determined by tournament size:
   - 4-9 players: 2 seeded
   - 10-19 players: 4 seeded
   - 20-39 players: 8 seeded
   - 40-128 players: 16 seeded
3. **Manual Seeding**: Seeding positions within bracket determined manually by organizers (no automated placement)
4. **Derived Field Calculation**:
   - Bracket size = next power of 2 ≥ player count
   - Preliminary matches = count of "0" characters in structure
   - Byes = count of "1" characters in structure

**Implementation Highlights**:
- **No Frontend**: Backend-only feature for API consumption
- **In-Memory Caching**: Templates loaded once on first request and cached
- **Public Endpoints**: No authentication required (read-only bracket information)
- **Test-First Development**: All 38 tests written before implementation per FR-012
- **Validation Middleware**: Reusable `validateParams` middleware added to validate.js
- **Interpretation Field**: API responses include field explanations for self-documenting API (User Story 3)

**Technical Details**:
- Node.js 20+ with ES Modules
- Express 5.1.0 for routing
- Joi 18.0.1 for request validation (playerCount: integer, 4-128)
- Jest 30.2.0 for testing
- fs/promises for async file loading
- Error responses follow BATL API format: `{success: false, error: {code, message, details}}`

**Test Coverage**:
- Template validation: 5 tests (validate all 125 templates)
- Bracket service unit tests: 8 tests (structure calculation logic)
- Seeding service unit tests: 8 tests (seeding range logic)
- Integration tests: 17 tests (9 structure + 8 seeding endpoint tests)
- **Total: 38 bracket tests, all passing ✅**

**Files Created**:
- `backend/src/services/bracketService.js` - Core bracket logic with getSeedingConfig
- `backend/src/api/validators/bracketValidator.js` - Joi validation schemas
- `backend/src/api/bracketController.js` - Request handlers for both endpoints
- `backend/src/api/routes/bracketRoutes.js` - Express router configuration
- `backend/__tests__/unit/bracketTemplates.test.js` - Template validation tests
- `backend/__tests__/unit/bracketService.test.js` - Service unit tests
- `backend/__tests__/unit/seedingService.test.js` - Seeding unit tests
- `backend/__tests__/integration/bracketRoutes.test.js` - API integration tests (updated)

**Files Modified**:
- `backend/src/middleware/validate.js` - Added `validateParams` middleware (reusable for future features)
- `backend/src/index.js` - Registered bracket routes at `/api/v1/brackets`
- `specs/009-bracket-generation/quickstart.md` - Corrected preliminary match count examples

**Usage Example**:
```bash
# Get bracket structure for 11 players
curl http://localhost:3000/api/v1/brackets/structure/11
# Returns: { playerCount: 11, structure: "1110 0101", preliminaryMatches: 3, byes: 5, bracketSize: 16, interpretation: {...} }

# Get seeding requirements for 15 players
curl http://localhost:3000/api/v1/brackets/seeding/15
# Returns: { playerCount: 15, seededPlayers: 4, range: {min: 10, max: 19}, note: "..." }
```

**Integration Points**:
- Bracket templates consumed by tournament organizers for draw creation
- Seeding configuration used with Feature 008 (tournament-rankings) seeding scores
- Foundation for future bracket management and automated draw generation features

**Related Specs**: [spec.md](specs/009-bracket-generation/spec.md), [tasks.md](specs/009-bracket-generation/tasks.md), [plan.md](specs/009-bracket-generation/plan.md), [contracts/api-endpoints.md](specs/009-bracket-generation/contracts/api-endpoints.md), [quickstart.md](specs/009-bracket-generation/quickstart.md)

<!-- MANUAL ADDITIONS END -->
