# Architecture

**Analysis Date:** 2026-02-26

## Pattern Overview

**Overall:** Three-tier layered MVC architecture with separation of concerns across backend API and React frontend.

**Key Characteristics:**
- RESTful backend API (Express.js + Node.js) with database access via Prisma ORM
- React frontend with component-based UI architecture and context-based state management
- Middleware-based request processing (authentication, validation, error handling, authorization)
- Service layer handles business logic independent of HTTP concerns
- Database-first design with PostgreSQL (via Prisma) as single source of truth

## Layers

**Request/Routing Layer:**
- Purpose: Accept HTTP requests, route to appropriate handler, manage middleware pipeline
- Location: `backend/src/api/routes/*.js`
- Contains: Express route definitions with middleware composition
- Depends on: Middleware stack, controllers, validators
- Used by: HTTP clients (browsers, API consumers)

**Controller Layer:**
- Purpose: Handle HTTP requests, parse inputs, orchestrate service calls, format responses
- Location: `backend/src/api/*Controller.js`
- Contains: Async request handlers with error delegation to middleware
- Depends on: Services, middleware utilities
- Used by: Routes, request pipeline

**Service Layer:**
- Purpose: Encapsulate business logic, data transformation, complex calculations
- Location: `backend/src/services/*.js`
- Contains: Pure business logic, Prisma client calls, reusable domain operations
- Depends on: Prisma ORM, validation schemas, utility helpers
- Used by: Controllers, other services

**Data Layer:**
- Purpose: Define database schema and manage all persistence
- Location: `backend/prisma/schema.prisma`
- Contains: Prisma models, enums, relationships, indexes
- Depends on: PostgreSQL database
- Used by: Services via Prisma ORM

**Middleware Layer:**
- Purpose: Cross-cutting concerns (auth, validation, error handling, logging)
- Location: `backend/src/middleware/*.js`
- Contains: Authentication (Passport), authorization (CASL), validation (Joi), error handling
- Depends on: Request/response objects, libraries (Passport, Joi, CASL)
- Used by: Express app in boot, routes

**Frontend Presentation Layer:**
- Purpose: Render UI components, manage local state, display user feedback
- Location: `frontend/src/components/**/*.jsx`, `frontend/src/pages/**/*.jsx`
- Contains: React components, hooks, CSS styling
- Depends on: React, React Bootstrap, services layer
- Used by: App router, parent components

**Frontend Service Layer:**
- Purpose: Handle API communication, authentication state, data fetching
- Location: `frontend/src/services/*.js`
- Contains: Axios-based API clients, auth session management, service-level error handling
- Depends on: apiClient wrapper, HTTP communication
- Used by: Components, pages, context providers

**Frontend State Management:**
- Purpose: Manage authentication state, modal state, toast notifications across app
- Location: `frontend/src/utils/*Context.jsx`
- Contains: React Context providers with hooks (AuthContext, ModalContext, ToastContext)
- Depends on: React hooks, services
- Used by: App wrapper, any component via useContext

## Data Flow

**User Authentication Flow:**

1. User submits login form on LoginPage → authService.login()
2. Frontend sends POST /api/auth/login with email/password to apiClient
3. Backend authController.login() uses Passport.authenticate('local')
4. Passport middleware calls LocalStrategy with bcrypt password verification
5. On success: establishes session via req.logIn(), returns user data
6. Frontend receives success response → AuthContext.login() → navigates to dashboard
7. On subsequent requests: session cookie sent automatically via apiClient credentials

**Category Registration Flow:**

1. Player views CategoryManagementPage or PlayerRegistrationPage
2. Frontend calls registrationService.checkEligibility(playerId, categoryId)
3. Frontend receives eligibility validation result
4. If eligible: Frontend displays form → calls registrationService.registerForCategory()
5. Backend registrationController calls registrationService.registerForCategory()
6. Service validates eligibility again, inserts CategoryRegistration row
7. On success: frontend updates local state, displays confirmation toast

**Tournament Bracket Generation Flow:**

1. Organizer initiates bracket generation on TournamentSetupPage
2. Frontend calls seedingService.generateSeededBracket(categoryId, playerCount)
3. Backend seedingController.generateBracket() validates request via seedingValidator
4. seedingPlacementService retrieves top N players from rankingService via ranking scores
5. Service recursively places seeds in optimal bracket positions using deterministic PRNG
6. Returns seeded bracket array with player positions → frontend displays via KnockoutBracket

**State Management:**

- **Authentication:** AuthContext holds user object, isAuthenticated flag, loading state
- **Modals:** ModalContext holds activeModal name, open/closeModal functions
- **Toasts:** ToastContext holds toast queue, add/remove functions
- **Component State:** Individual components manage form inputs, local UI state
- **API Cache:** Services do NOT implement caching (each call fetches fresh data)
- **Server State:** All persistent data lives in PostgreSQL, accessed via Prisma ORM

## Key Abstractions

**Request Validation:**
- Purpose: Standardize input validation across all endpoints
- Examples: `backend/src/middleware/validate.js`, `backend/src/api/validators/*.js`
- Pattern: Joi schemas defined per route, validateBody/validateQuery middleware intercepts requests, errors collected in validationError format

**Error Handling:**
- Purpose: Consistent error responses across API, proper HTTP status codes
- Examples: `backend/src/middleware/errorHandler.js`, error creation utilities (createValidationError, createAuthError, createForbiddenError)
- Pattern: Controllers throw errors with proper HTTP status, middleware catches and formats as JSON with code/message/details

**Authorization:**
- Purpose: Role-based access control using CASL ability builder
- Examples: `backend/src/middleware/authorize.js`, ability definitions
- Pattern: defineAbilitiesFor(user) builds permission matrix, authorize(action, subject) middleware enforces it

**API Response Format:**
- Purpose: Standardize success and error responses
- Success format: `{ success: true, data: {...} }`
- Error format: `{ error: { code: "...", message: "...", details: {...} } }`
- Pattern: Controllers format success responses, errorHandler formats errors

**Frontend Error Transformation:**
- Purpose: Convert axios errors to predictable error object structure
- Examples: `frontend/src/services/apiClient.js` response interceptor
- Pattern: Intercepts errors, extracts message from nested response.data.error, returns standardized { status, code, message, details }

**Category System:**
- Purpose: Multi-dimensional tournament categorization (type/ageGroup/gender)
- Examples: categoryService.generateCategoryName(), categoryService.findDuplicateCategory()
- Pattern: Composite unique constraint (type, ageGroup, gender), auto-generated display names

**Ranking & Seeding:**
- Purpose: Track player performance, calculate seeding scores, seed tournaments
- Examples: rankingService, seedingService, seedingPlacementService
- Pattern: Rankings store top N tournament results per category, seeding scores derived from best N tournaments (configurable per category)

## Entry Points

**Backend Server:**
- Location: `backend/src/index.js`
- Triggers: npm start or deployment container startup
- Responsibilities: Bootstrap Express app, setup middleware, register all routes, initialize cache (point tables), start listening

**Frontend Application:**
- Location: `frontend/src/main.jsx`
- Triggers: Browser loads index.html, Vite builds and serves
- Responsibilities: Create React root, render App component wrapped in context providers, attach to DOM element #root

**API Routes (Backend):**
- Auth endpoints: `backend/src/api/routes/authRoutes.js` → /api/auth
- Category endpoints: `backend/src/api/routes/categoryRoutes.js` → /api/v1/categories
- Tournament endpoints: `backend/src/api/routes/tournamentRoutes.js` → /api/v1/tournaments
- Ranking endpoints: `backend/src/api/routes/rankingRoutes.js` → /api/v1/rankings
- Seeding endpoints: `backend/src/api/routes/seedingPlacementRoutes.js` → /api/v1/seeding
- All routes registered in index.js startup sequence

**Page Routes (Frontend):**
- Location: `frontend/src/App.jsx`
- Routes defined: Public (/login, /register, /rankings, /tournaments/:id), Protected (role-gated admin/organizer/player routes)
- Router: React Router with BrowserRouter, Routes, Route components, ProtectedRoute wrapper for authentication/authorization

## Error Handling

**Strategy:** Multi-layer error handling with specific error types at each layer, global error middleware for centralization.

**Patterns:**

**Backend:**
- Controllers: Catch errors via try/catch, call next(err) to pass to middleware
- Validation: Joi schemas throw validation errors, validateBody/validateQuery middleware catches
- Services: Throw http-errors with specific status/code/details
- Error handler: Global middleware catches all errors, formats as JSON, returns appropriate HTTP status
- Prisma errors: Special handling for P2002 (constraint violations) converted to 409 Conflict
- Error codes: Standardized codes (VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, INELIGIBLE_AGE, DUPLICATE_CATEGORY, etc.)

**Frontend:**
- API calls: Wrapped in try/catch, errors caught from apiClient
- Error transformation: Response interceptor extracts nested error structure from backend
- Component handling: Direct access to err.message, err.details?.violations via standardized error object
- User display: Error messages from backend via err.message, fallback to generic translation key
- Network errors: Handled as NETWORK_ERROR with message, non-blocking (no hard redirects)

**Session Expiration:**
- Backend: 401 response code signals session expired
- Frontend: apiClient detects 401, dispatches window event 'session-expired'
- AuthContext: Listener clears user state, navigates to /rankings with message toast

## Cross-Cutting Concerns

**Logging:**
- Backend: console.log for server startup, console.error for exceptions (development mode includes stack)
- Frontend: apiClient logs requests/responses in development mode via import.meta.env.DEV
- No centralized log aggregation (logs only go to stdout)

**Validation:**
- Backend: Joi schemas in validateBody/validateQuery middleware validate all request inputs
- Frontend: Component-level validation via controlled inputs, api responses validate data integrity
- Shared: Category eligibility validated at registration time (age, gender, profile completeness)

**Authentication:**
- Backend: Passport.js with LocalStrategy (email/password), session-file-store for persistence
- Frontend: AuthContext wraps entire App, AuthProvider checks session on mount, ProtectedRoute enforces authentication
- Session: 30-minute TTL, httpOnly cookies, secure flag in production

**Authorization:**
- Backend: CASL ability builder defines role-based permissions (ADMIN/ORGANIZER/PLAYER)
- Frontend: ProtectedRoute checks user.role against requiredRole/requiredRoles
- Pattern: authorize(action, subject) middleware blocks unauthorized requests with 403

**Internationalization (i18n):**
- Frontend: react-i18next loads locale files from `frontend/src/i18n/locales/*.json`
- Pattern: useTranslation() hook provides t() function in components
- Supported: Multiple languages via locale switching
- Missing keys: Fallback to key name if translation missing
