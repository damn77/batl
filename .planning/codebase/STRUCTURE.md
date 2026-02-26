# Codebase Structure

**Analysis Date:** 2026-02-26

## Directory Layout

```
BATL/
├── backend/                    # Express.js API server (Node.js 20+, ES Modules)
│   ├── src/                   # Source code
│   │   ├── api/               # HTTP layer (routes, controllers, validators)
│   │   ├── middleware/        # Request processing (auth, validation, error handling)
│   │   ├── services/          # Business logic and data access
│   │   ├── types/             # Type definitions and enums
│   │   ├── utils/             # Utility helpers
│   │   ├── validation/        # Schema definitions for validation
│   │   └── index.js          # Server entry point
│   ├── prisma/               # Database schema and migrations
│   ├── __tests__/            # Test suites (unit, integration, performance)
│   ├── jest.config.js        # Jest test configuration
│   ├── package.json          # Dependencies and scripts
│   └── sessions/             # Session file storage (runtime generated)
│
├── frontend/                  # React 19 + Vite 7 UI application
│   ├── src/                  # Source code
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Full-page components (routes)
│   │   ├── services/         # API clients (Axios wrappers)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Context providers and utilities
│   │   ├── config/           # Configuration files
│   │   ├── i18n/             # Internationalization (translations)
│   │   └── main.jsx          # React entry point
│   ├── vite.config.js        # Vite build configuration
│   ├── package.json          # Dependencies and scripts
│   └── index.html            # HTML root document
│
├── specs/                    # Feature specifications (git-tracked)
│   ├── 001-user-management/
│   ├── 002-category-system/
│   ├── 003-tournament-registration/
│   ├── ...
│   └── 011-knockout-bracket-view/
│
├── .planning/               # GSD planning documents (generated)
│   └── codebase/           # This directory - architecture analysis
│
├── docs/                   # Additional documentation
├── CLAUDE.md              # Development guidelines (auto-updated)
└── package.json          # Root workspace package.json
```

## Directory Purposes

**backend/src/api/:**
- Purpose: HTTP request handling and validation layer
- Contains: Controllers and routes for all API endpoints
- Key files:
  - `*Controller.js` - Request handlers (14 controllers)
  - `routes/*.js` - Express route definitions (12 route modules)
  - `validators/*.js` - Joi validation schemas

**backend/src/middleware/:**
- Purpose: Cross-cutting request processing concerns
- Contains: Authentication, authorization, validation, error handling, rate limiting
- Key files:
  - `auth.js` - Passport configuration and authentication
  - `authorize.js` - CASL-based role authorization
  - `validate.js` - Joi validation middleware
  - `errorHandler.js` - Global error handler and error creation utilities
  - `rateLimiter.js` - Request rate limiting

**backend/src/services/:**
- Purpose: Encapsulated business logic and data access
- Contains: Domain operations, calculations, database queries via Prisma
- Key files:
  - `categoryService.js` - Category CRUD and eligibility logic
  - `registrationService.js` - Category and tournament registration
  - `rankingService.js` - Ranking calculations and retrieval
  - `seedingPlacementService.js` - Deterministic seeding algorithm
  - `tournamentService.js` - Tournament CRUD and status management
  - `pairService.js` - Doubles pair creation and management
  - `pointCalculationService.js` - Point award and ranking updates
  - 26 total service files (one per feature domain)

**backend/src/types/:**
- Purpose: Shared type definitions and enums
- Contains: TypeScript-style type exports for consistency
- Key files:
  - `errorCodes.js` - Standardized error codes
  - `matchStatus.js` - Match lifecycle enums
  - `formatTypes.js` - Tournament format enums
  - `bracketTypes.js` - Bracket configuration types

**backend/src/utils/:**
- Purpose: Reusable utility functions
- Contains: Helpers for calculations, logging, common operations
- Key files:
  - `logger.js` - Logging utilities
  - `eligibility.js` - Age/gender eligibility checks
  - `categoryHelpers.js` - Category name generation, mapping
  - `participantRange.js` - Point table range calculations
  - `rankingCalculator.js` - Tiebreaker logic

**backend/src/validation/:**
- Purpose: Complex validation schemas for tournament rules
- Contains: Joi schemas for format configuration and scoring rules
- Key files:
  - `formatConfigSchemas.js` - Knockout/Group/Swiss/Combined format schemas
  - `scoringRulesSchemas.js` - Match scoring configuration schemas
  - `formatValidation.js` - Cross-schema validation logic

**backend/prisma/:**
- Purpose: Database schema definition and migrations
- Contains: Prisma schema file and migration history
- Key files:
  - `schema.prisma` - Complete data model (250+ lines, 30+ models)
  - `migrations/` - Migration history with timestamps

**backend/__tests__/:**
- Purpose: Test suites for quality assurance
- Contains: Unit tests, integration tests, performance tests
- Key files:
  - `unit/` - Service and utility unit tests (Jest)
  - `integration/` - API endpoint integration tests (Jest)
  - `performance/` - Load testing and performance benchmarks

**frontend/src/components/:**
- Purpose: Reusable UI components
- Contains: React functional components with Bootstrap styling
- Key files:
  - `*Form*.jsx` - Form components (LoginModal, RegisterModal, RegistrationForm)
  - `*Table*.jsx` - Data display (RankingsTable, GroupStandingsTable)
  - `*Panel*.jsx` - Configuration panels (FormatConfigPanel, BracketRulesPanel)
  - `Bracket*.jsx` - Knockout bracket visualization (KnockoutBracket, BracketMatch, BracketControls)
  - `NavBar.jsx` - Top navigation
  - `ProtectedRoute.jsx` - Authentication/authorization wrapper
  - `admin/` - Admin-specific components

**frontend/src/pages/:**
- Purpose: Full-page route components (one per URL route)
- Contains: Page-level composition, routing integration
- Key files:
  - `LoginPage.jsx`, `RegisterPage.jsx` - Authentication pages
  - `AdminDashboard.jsx`, `AdminUsersPage.jsx` - Admin pages
  - `OrganizerDashboard.jsx`, `TournamentSetupPage.jsx` - Organizer pages
  - `PlayerRegistrationPage.jsx`, `CategoryRankingsPage.jsx` - Player pages
  - `TournamentViewPage.jsx` - Public tournament viewing
  - `admin/` - Subdir for advanced admin pages

**frontend/src/services/:**
- Purpose: API client wrappers for backend communication
- Contains: Axios-based HTTP clients, one per API domain
- Key files:
  - `apiClient.js` - Base Axios instance with error transformation interceptor
  - `authService.js` - Authentication endpoints (login, logout, session check)
  - `categoryService.js` - Category endpoints
  - `registrationService.js` - Registration endpoints
  - `rankingService.js` - Ranking retrieval
  - `seedingService.js` - Seeding score retrieval
  - `tournamentService.js` - Tournament endpoints
  - `pointTableService.js` - Admin point table management
  - 12 total service files

**frontend/src/utils/:**
- Purpose: Context providers and utility functions
- Contains: React Context definitions, helper functions
- Key files:
  - `AuthContext.jsx` - Authentication state management provider
  - `ModalContext.jsx` - Global modal state
  - `ToastContext.jsx` - Notification/toast queue management
  - `bracketUtils.js` - Knockout bracket positioning utilities
  - `errorHandler.js` - Error display and formatting

**frontend/src/hooks/:**
- Purpose: Custom React hooks for reusable logic
- Contains: Hook abstractions for common patterns
- Key files:
  - `useBracketNavigation.js` - Zoom/pan state for bracket view
  - `useRegistration.jsx` - Registration form logic

**frontend/src/config/:**
- Purpose: Configuration constants
- Contains: Theme settings, app configuration
- Key files:
  - `bracketColors.js` - Knockout bracket color scheme (customizable CSS variables)

**frontend/src/i18n/:**
- Purpose: Internationalization and localization
- Contains: Translation strings by language
- Key files:
  - `index.js` - i18next configuration
  - `locales/*.json` - Translation dictionaries per language

## Key File Locations

**Entry Points:**
- Backend: `backend/src/index.js` - Express app bootstrap, route registration
- Frontend: `frontend/src/main.jsx` - React root render, context provider setup

**Configuration:**
- Backend: `backend/.env` (file-based secrets, not in git)
- Frontend: `frontend/.env` (API URL configuration)
- Build: `frontend/vite.config.js` - Vite config with proxy setup
- Database: `backend/prisma/schema.prisma` - Data model
- Tests: `backend/jest.config.js` - Jest test runner config

**Core Logic:**
- User auth: `backend/src/middleware/auth.js` - Passport strategies
- Authorization: `backend/src/middleware/authorize.js` - CASL permissions
- Categories: `backend/src/services/categoryService.js` - Category operations
- Rankings: `backend/src/services/rankingService.js` - Ranking calculations
- Seeding: `backend/src/services/seedingPlacementService.js` - Tournament seeding
- Tournaments: `backend/src/services/tournamentService.js` - Tournament management

**Testing:**
- Backend tests: `backend/__tests__/unit/`, `backend/__tests__/integration/`
- Test runner: Jest (ES Modules enabled)
- Frontend: Vitest configured (referenced in CLAUDE.md but no tests committed yet)

## Naming Conventions

**Files:**
- Controllers: `{domain}Controller.js` (e.g., `categoryController.js`)
- Services: `{domain}Service.js` (e.g., `rankingService.js`)
- Routes: `{domain}Routes.js` (e.g., `categoryRoutes.js`)
- Validators: `{domain}Validator.js` or `{domain}Validators.js` (e.g., `seedingValidator.js`)
- Components: `{Feature}{Type}.jsx` (e.g., `KnockoutBracket.jsx`, `RankingsTable.jsx`)
- Pages: `{Feature}Page.jsx` (e.g., `CategoryManagementPage.jsx`)
- Context: `{Feature}Context.jsx` (e.g., `AuthContext.jsx`)
- Hooks: `use{Feature}.js` or `use{Feature}.jsx` (e.g., `useBracketNavigation.js`)
- Tests: `{target}.test.js` or `{target}.spec.js` (e.g., `bracketService.test.js`)

**Directories:**
- Features: kebab-case in specs/ (e.g., `001-user-management`, `011-knockout-bracket-view`)
- Components: camelCase for subdirs (e.g., `admin/`, not `Admin/`)
- Routes: camelCase with plural (e.g., `routes/`, `validators/`)

## Where to Add New Code

**New API Endpoint:**
1. Create route handler in `backend/src/api/routes/{domain}Routes.js`
2. Create or update controller in `backend/src/api/{domain}Controller.js`
3. Create or update service in `backend/src/services/{domain}Service.js`
4. Add validation schema in `backend/src/api/validators/{domain}Validator.js` or `backend/src/validation/`
5. Register route in `backend/src/index.js` with `app.use('/api/v1/{path}', routes)`
6. Add integration tests in `backend/__tests__/integration/{domain}Routes.test.js`

**New React Component:**
1. If reusable: Create in `frontend/src/components/{Name}.jsx`
2. If page-level: Create in `frontend/src/pages/{Name}Page.jsx`
3. Create service if API needed: `frontend/src/services/{domain}Service.js`
4. Add route to `frontend/src/App.jsx` if page

**New Service (Frontend API Client):**
1. Create `frontend/src/services/{domain}Service.js`
2. Import and use `apiClient` for HTTP calls
3. Follow pattern: export named async functions for each endpoint
4. Handle errors via apiClient interceptor (standardized error object)

**New Feature Module:**
1. Create backend service layer: `backend/src/services/{feature}Service.js`
2. Create controller(s): `backend/src/api/{feature}Controller.js`
3. Create routes: `backend/src/api/routes/{feature}Routes.js`
4. Add data models to `backend/prisma/schema.prisma`
5. Create database migration: `npx prisma migrate dev --name {feature}`
6. Create validation: `backend/src/api/validators/{feature}Validator.js`
7. Create tests: `backend/__tests__/integration/{feature}Routes.test.js`
8. Create frontend pages: `frontend/src/pages/{Feature}Page.jsx`
9. Create frontend service: `frontend/src/services/{feature}Service.js`

**New Hook (Frontend):**
- Location: `frontend/src/hooks/use{FeatureName}.js`
- Pattern: Export named function starting with "use", manage internal state with useState/useEffect

**New Utility Function:**
- Backend: `backend/src/utils/{feature}.js` or `backend/src/utils/{feature}Helpers.js`
- Frontend: `frontend/src/utils/{feature}.js` or `frontend/src/utils/{feature}Utils.js`

## Special Directories

**backend/sessions/:**
- Purpose: File-based session storage (Passport session persistence)
- Generated: Yes (created at runtime by express-session middleware)
- Committed: No (.gitignore excludes)
- Cleanup: Sessions are TTL-expired (30 min default), old files can be manually cleaned

**backend/coverage/:**
- Purpose: Jest code coverage reports
- Generated: Yes (created by `npm test -- --coverage`)
- Committed: No (.gitignore excludes)
- Access: HTML reports in `backend/coverage/lcov-report/index.html`

**frontend/dist/:**
- Purpose: Vite production build output
- Generated: Yes (created by `npm run build`)
- Committed: No (.gitignore excludes)
- Deployment: Contents served by production web server

**docs/bracket-templates-all.json:**
- Purpose: Pre-calculated bracket templates (125 templates for 4-128 players)
- Generated: No (static reference data)
- Committed: Yes (source of truth for bracket generation)
- Read by: `backend/src/services/bracketService.js`

**backend/data/ and backend/logs/:**
- Purpose: Runtime data storage, application logs
- Generated: Yes (at runtime as needed)
- Committed: No (.gitignore excludes)
- Retention: Depends on deployment, typically temporary

**frontend/src/i18n/locales/:**
- Purpose: Translation strings for internationalization
- Generated: No (manually maintained)
- Committed: Yes (language files tracked in git)
- Format: JSON with nested key structure

**.planning/codebase/:**
- Purpose: GSD-generated architecture analysis documents
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes (checked into git after generation)
- Files: ARCHITECTURE.md, STRUCTURE.md, STACK.md, INTEGRATIONS.md, CONVENTIONS.md, TESTING.md, CONCERNS.md
