# BATL Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-02

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
- 006-doubles-pairs: Added Node.js 20+ (ES Modules) + Express 5.1.0, Prisma ORM, React 19, React Bootstrap 2.10, TanStack React Table 8.21
- 005-tournament-view: Added SQLite via Prisma ORM (development/production-ready)
- 004-tournament-rules: Added Node.js 20+ (ES Modules) + Express 5.1.0, Prisma ORM, React 19, React Bootstrap 2.10

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

<!-- MANUAL ADDITIONS END -->
