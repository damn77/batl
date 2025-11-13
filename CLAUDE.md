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

## Recent Changes
- 004-tournament-rules: Added Node.js 20+ (ES Modules) + Express 5.1.0, Prisma ORM, React 19, React Bootstrap 2.10
- 003-tournament-registration: Added Vitest testing framework (Jest-compatible API, native ES modules support, Vite integration)
- 002-category-system: Added Node.js 20+ (ES Modules)

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
