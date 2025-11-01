# Tasks: User Management System

**Input**: Design documents from `/specs/001-user-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL per Constitution Principle IV and are NOT explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Backend structure: models/, services/, api/, middleware/
- Frontend structure: components/, pages/, services/, utils/

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create backend directory structure: backend/src/{models,services,api,middleware}
- [x] T002 Create frontend directory structure: frontend/src/{components,pages,services,utils}
- [x] T003 [P] Initialize Node.js backend project with package.json in backend/
- [x] T004 [P] Initialize React frontend project with package.json in frontend/
- [x] T005 [P] Install backend dependencies: express, prisma, @prisma/client, passport, passport-local, bcryptjs, express-session, session-file-store, @casl/ability, helmet, express-rate-limit, joi, winston, http-errors in backend/
- [x] T006 [P] Install frontend dependencies: react, react-dom, react-router-dom, bootstrap, axios in frontend/
- [x] T007 Create Prisma schema file in backend/prisma/schema.prisma with datasource and generator configuration
- [x] T008 [P] Create environment configuration file backend/.env with DATABASE_URL, SESSION_SECRET, SMTP settings
- [x] T009 [P] Create frontend environment file frontend/.env with REACT_APP_API_URL
- [x] T010 Configure Express app entry point in backend/src/index.js with middleware setup (body-parser, cors, helmet, express-session)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Define Role enum in backend/prisma/schema.prisma (ADMIN, ORGANIZER, PLAYER)
- [x] T012 Define User model in backend/prisma/schema.prisma with id, email, passwordHash, role, isActive, emailVerified, timestamps
- [x] T013 Define Session model in backend/prisma/schema.prisma with id, userId, data, expiresAt, timestamps
- [x] T014 Define AuditLog model in backend/prisma/schema.prisma with id, userId, action, entityType, entityId, changes, ipAddress, userAgent, timestamp
- [x] T015 Run Prisma migration to create database schema: npx prisma migrate dev --name init_user_management in backend/
- [x] T016 Generate Prisma Client: npx prisma generate in backend/
- [x] T017 Implement authentication middleware in backend/src/middleware/auth.js using Passport.js local strategy with bcrypt verification
- [x] T018 [P] Implement authorization middleware in backend/src/middleware/authorize.js using CASL for role-based access control
- [x] T019 [P] Implement error handling middleware in backend/src/middleware/errorHandler.js using http-errors
- [x] T020 [P] Implement request validation middleware in backend/src/middleware/validate.js using Joi schemas
- [x] T021 [P] Implement audit logging service in backend/src/services/auditService.js using Winston for security event logging
- [x] T022 Configure Helmet security headers in backend/src/index.js with CSP, HSTS, X-Frame-Options
- [x] T023 Configure express-rate-limit for auth endpoints in backend/src/middleware/rateLimiter.js (5 login attempts per 15 min)
- [x] T024 [P] Create frontend API client utility in frontend/src/services/apiClient.js using axios with base URL configuration
- [x] T025 [P] Create frontend auth context in frontend/src/utils/AuthContext.jsx for managing authentication state
- [x] T026 [P] Create frontend route protection component in frontend/src/components/ProtectedRoute.jsx for role-based routing

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Admin Authentication and Management (Priority: P1) 🎯 MVP

**Goal**: Secure admin login, session management, and access to admin dashboard

**Independent Test**: Admin can log in with credentials, access admin dashboard, perform admin operations, and log out. Session expires after 30 minutes of inactivity.

### Implementation for User Story 1

- [x] T027 [P] [US1] Create backend auth controller in backend/src/api/authController.js with login, logout, session check endpoints
- [x] T028 [P] [US1] Implement user service in backend/src/services/userService.js with authentication, user lookup, and session management methods
- [x] T029 [US1] Register auth routes in backend/src/api/routes/authRoutes.js: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/session
- [x] T030 [US1] Connect auth routes to Express app in backend/src/index.js with rate limiting on login endpoint
- [x] T031 [P] [US1] Create login page component in frontend/src/pages/LoginPage.jsx with email/password form and validation
- [x] T032 [P] [US1] Create admin dashboard page component in frontend/src/pages/AdminDashboard.jsx with navigation and user management links
- [x] T033 [P] [US1] Implement auth service in frontend/src/services/authService.js with login, logout, and session check methods
- [x] T034 [US1] Configure React Router in frontend/src/App.jsx with /login, /admin routes and protected route wrapper
- [x] T035 [US1] Implement session expiration handling in frontend/src/utils/AuthContext.jsx with auto-redirect to login on 401
- [x] T036 [US1] Create Prisma seed script in backend/prisma/seed.js to create initial admin user from environment variables
- [x] T037 [US1] Run seed script to create first admin: npx prisma db seed in backend/
- [x] T038 [US1] Add logout button to admin dashboard in frontend/src/components/NavBar.jsx with logout handler

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional - admin can authenticate, access dashboard, and log out

---

## Phase 4: User Story 2 - Organizer Account Management (Priority: P2)

**Goal**: Admin can create organizer accounts, organizers can log in and access organizer features

**Independent Test**: Admin creates organizer account with email/password. Organizer logs in, accesses organizer dashboard, cannot access admin features. Admin can list and manage organizer accounts.

### Implementation for User Story 2

- [x] T039 [P] [US2] Create user management controller in backend/src/api/userController.js with CRUD operations for User entity
- [x] T040 [US2] Register user routes in backend/src/api/routes/userRoutes.js: POST /api/users, GET /api/users, GET /api/users/:id, PATCH /api/users/:id, DELETE /api/users/:id
- [x] T041 [US2] Add ADMIN role authorization to user routes using authorize middleware with CASL rules
- [x] T042 [US2] Connect user routes to Express app in backend/src/index.js
- [x] T043 [P] [US2] Implement user CRUD methods in backend/src/services/userService.js: createUser, listUsers, getUserById, updateUser, deleteUser (soft delete)
- [x] T044 [P] [US2] Create user list page component in frontend/src/pages/AdminUsersPage.jsx with table, pagination, and create user button
- [x] T045 [P] [US2] Create user create modal component in frontend/src/components/CreateUserModal.jsx with email, password, role selection form
- [x] T046 [P] [US2] Create user detail page component in frontend/src/pages/UserDetailPage.jsx with edit and delete options
- [x] T047 [P] [US2] Implement user service in frontend/src/services/userService.js with API calls for user CRUD operations
- [x] T048 [US2] Add user management link to admin dashboard navigation in frontend/src/pages/AdminDashboard.jsx
- [x] T049 [P] [US2] Create organizer dashboard page component in frontend/src/pages/OrganizerDashboard.jsx with tournament and player management links
- [x] T050 [US2] Configure React Router with /organizer route and role-based routing in frontend/src/App.jsx
- [x] T051 [US2] Implement role-based redirect after login in frontend/src/utils/AuthContext.jsx: ADMIN → /admin, ORGANIZER → /organizer

**Checkpoint**: Admin can create/manage organizer accounts. Organizers can log in and access organizer-specific features but not admin features.

---

## Phase 5: User Story 3 - Player Profile Creation Without Accounts (Priority: P2)

**Goal**: Organizers can create player profiles for tournament participants without requiring account creation

**Independent Test**: Organizer creates player profile with name and optional contact info. Profile has no linked User account (userId=null). Profile appears in player list and can be used for tournament registration. Duplicate warning shown for similar names/emails.

### Implementation for User Story 3

- [x] T052 Define PlayerProfile model in backend/prisma/schema.prisma with id, userId (nullable), name, email, phone, createdBy, timestamps
- [x] T053 Add PlayerProfile relationships to User model in backend/prisma/schema.prisma: user relation (optional), creator relation (required)
- [x] T054 Run Prisma migration for PlayerProfile: npx prisma migrate dev --name add_player_profile in backend/
- [x] T055 [P] [US3] Create player profile controller in backend/src/api/playerController.js with create, list, get, update operations
- [x] T056 [US3] Register player routes in backend/src/api/routes/playerRoutes.js: POST /api/players, GET /api/players, GET /api/players/:id, PATCH /api/players/:id
- [x] T057 [US3] Add ORGANIZER/ADMIN role authorization to player routes using authorize middleware
- [x] T058 [US3] Connect player routes to Express app in backend/src/index.js
- [x] T059 [P] [US3] Implement player profile service in backend/src/services/playerService.js with create, list, search, update, duplicate detection methods
- [x] T060 [P] [US3] Implement fuzzy name matching logic in backend/src/services/playerService.js for duplicate detection using name + email comparison
- [x] T061 [P] [US3] Create player list page component in frontend/src/pages/OrganizerPlayersPage.jsx with search, table, pagination, and add player button
- [x] T062 [P] [US3] Create player create modal component in frontend/src/components/CreatePlayerModal.jsx with name (required), email, phone fields and duplicate warning display
- [x] T063 [P] [US3] Create player detail page component in frontend/src/pages/PlayerDetailPage.jsx with edit option and tournament history placeholder
- [x] T064 [P] [US3] Implement player service in frontend/src/services/playerService.js with API calls for player CRUD operations
- [x] T065 [US3] Add player management link to organizer dashboard navigation in frontend/src/pages/OrganizerDashboard.jsx

**Checkpoint**: Organizers can create player profiles without accounts. Profiles are searchable and ready for tournament registration. Duplicate warnings help prevent unintentional duplicates.

---

## Phase 6: User Story 4 - Player Self-Service Account Creation (Priority: P3)

**Goal**: Players can self-register, creating both User account and PlayerProfile. System links to existing profiles when name/email match.

**Independent Test**: Player self-registers with email, password, name. If matching PlayerProfile exists (same name + email), system links account to existing profile and preserves tournament history. If no match, creates new PlayerProfile. Player logs in, views profile, updates information, cannot access organizer/admin features.

### Implementation for User Story 4

- [x] T066 [P] [US4] Add player self-registration endpoint to auth controller in backend/src/api/authController.js: POST /api/auth/register
- [x] T067 [US4] Register /api/auth/register route in backend/src/api/routes/authRoutes.js with public access
- [x] T068 [US4] Implement player registration logic in backend/src/services/userService.js: create User with PLAYER role, search for matching PlayerProfile, link if found or create new
- [x] T069 [US4] Implement profile linking logic in backend/src/services/playerService.js: match by name + email, update PlayerProfile.userId, preserve tournament history
- [x] T070 [P] [US4] Create player registration page component in frontend/src/pages/RegisterPage.jsx with email, password, name, phone form
- [x] T071 [US4] Add registration link to login page in frontend/src/pages/LoginPage.jsx
- [x] T072 [US4] Configure React Router with /register route in frontend/src/App.jsx
- [x] T073 [P] [US4] Create player profile page component in frontend/src/pages/PlayerProfilePage.jsx displaying profile info and edit option
- [x] T074 [US4] Configure React Router with /player/profile route protected by PLAYER role in frontend/src/App.jsx
- [x] T075 [US4] Implement role-based redirect in frontend/src/services/authService.js: PLAYER → /player/profile
- [x] T076 [P] [US4] Add profile update functionality to player profile page in frontend/src/pages/PlayerProfilePage.jsx with save handler
- [x] T077 [US4] Implement player profile update authorization in backend/src/api/playerController.js: PLAYER can only update own linked profile

**Checkpoint**: Players can self-register, log in, view/edit their profiles. Existing tournament history is preserved when profiles are linked. Authorization prevents players from accessing organizer/admin features.

---

## Phase 7: User Story 5 - Public Access to Tournament Information (Priority: P3)

**Goal**: Public visitors can view tournament results and rankings without authentication. Contact information remains private.

**Independent Test**: Unauthenticated visitor accesses tournament results and rankings pages. Player names and points are visible. Contact information (email, phone) is hidden. Attempting to register for tournament redirects to login page.

### Implementation for User Story 5

- [x] T078 [US5] Add public access to player list endpoint in backend/src/api/playerController.js: GET /api/players with limited fields (name, hasAccount only) for unauthenticated requests
- [x] T079 [US5] Implement conditional field selection in backend/src/services/playerService.js: full details for authenticated ORGANIZER/ADMIN, limited fields for public
- [x] T080 [US5] Update player routes authorization in backend/src/api/routes/playerRoutes.js: allow unauthenticated GET /api/players with field restrictions
- [x] T081 [P] [US5] Create public rankings page component in frontend/src/pages/PublicRankingsPage.jsx displaying player names and points without contact info
- [ ] T082 [P] [US5] Create public tournament results page component in frontend/src/pages/PublicTournamentResultsPage.jsx with read-only view (deferred until tournament feature)
- [x] T083 [US5] Configure React Router with /rankings route as public in frontend/src/App.jsx, set as default landing page
- [x] T084 [US5] Update frontend navigation in frontend/src/components/NavBar.jsx to show public links (rankings) for all users
- [ ] T085 [US5] Implement redirect to login for protected actions in frontend tournament registration flow (deferred until tournament feature)

**Checkpoint**: Public visitors can view player rankings without authentication. Private data (contact information) is properly hidden. Public rankings page is the default landing page for unauthenticated users.

---

## Phase 7.5: Modal-Based Login UX Enhancement (Priority: P2)

**Goal**: Replace separate login page with modal-based login that appears as popup over public dashboard for improved user experience

**Independent Test**: Unauthenticated visitor accesses public rankings page (default landing), clicks login button in navbar, login modal appears over rankings page, successful login closes modal and navigates to role-specific dashboard. Login and register flows work entirely through modals without separate page navigation.

### Implementation for Modal-Based Login

- [x] T086.1 [P] [UX] Create login modal component in frontend/src/components/LoginModal.jsx with email/password form, matching functionality from LoginPage.jsx
- [x] T086.2 [P] [UX] Create register modal component in frontend/src/components/RegisterModal.jsx with registration form, matching functionality from RegisterPage.jsx
- [x] T086.3 [UX] Add login button to navbar in frontend/src/components/NavBar.jsx for unauthenticated users, triggering login modal
- [x] T086.4 [UX] Add register button to navbar in frontend/src/components/NavBar.jsx for unauthenticated users, triggering register modal
- [x] T086.5 [P] [UX] Add modal state management to frontend/src/App.jsx or create new context in frontend/src/utils/ModalContext.jsx for controlling modal visibility
- [x] T086.6 [UX] Update PublicRankingsPage.jsx navbar to use modal buttons instead of direct links to /login and /register
- [x] T086.7 [UX] Add link from login modal to register modal (and vice versa) for easy switching between forms
- [x] T086.8 [UX] Ensure modal backdrop closes on click outside, ESC key, and after successful authentication
- [x] T086.9 [UX] Update React Router in frontend/src/App.jsx to keep /login and /register routes for backward compatibility but make them optional (deep link support)
- [x] T086.10 [UX] Test modal behavior: login triggers role-based navigation, register creates account and logs in, error messages display correctly within modal

**Checkpoint**: Users experience seamless authentication flow. Public rankings page is default landing. Login/register appear as modals over public content. No separate login page required for normal flow. Backward compatibility maintained for direct links to /login and /register URLs.

---

## Phase 8: Password Reset & Additional Features

**Purpose**: Password reset functionality and account recovery

- [ ] T087 Define PasswordResetToken model in backend/prisma/schema.prisma with id, userId, tokenHash, expiresAt, used, usedAt, timestamps
- [ ] T088 Run Prisma migration for PasswordResetToken: npx prisma migrate dev --name add_password_reset in backend/
- [ ] T089 [P] Implement password reset service in backend/src/services/passwordResetService.js with token generation, validation, and expiration logic
- [ ] T090 [P] Add password reset request endpoint to auth controller in backend/src/api/authController.js: POST /api/auth/password-reset/request
- [ ] T091 [P] Add password reset confirm endpoint to auth controller in backend/src/api/authController.js: POST /api/auth/password-reset/confirm
- [ ] T092 Register password reset routes in backend/src/api/routes/authRoutes.js with rate limiting (3 requests per hour)
- [ ] T093 [P] Implement email service in backend/src/services/emailService.js using SMTP configuration for sending password reset emails
- [ ] T094 [P] Create forgot password modal component in frontend/src/components/ForgotPasswordModal.jsx with email input form (or page if preferred)
- [ ] T095 [P] Create reset password page component in frontend/src/pages/ResetPasswordPage.jsx with new password form and token validation
- [ ] T096 Configure React Router with /reset-password route in frontend/src/App.jsx
- [ ] T097 Add forgot password link to login modal in frontend/src/components/LoginModal.jsx

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T098 [P] Implement session cleanup job in backend/src/jobs/sessionCleanup.js to delete expired sessions hourly
- [ ] T099 [P] Implement password reset token cleanup job in backend/src/jobs/tokenCleanup.js to delete expired/used tokens daily
- [ ] T100 [P] Add comprehensive error messages for validation failures across all endpoints in backend/src/middleware/errorHandler.js
- [ ] T101 [P] Implement consistent API response format wrapper in backend/src/utils/response.js for success/error responses
- [ ] T102 [P] Add loading states to all frontend forms in components with spinner/disabled button UX
- [ ] T103 [P] Implement toast notifications in frontend/src/utils/toast.js for success/error feedback using Bootstrap alerts
- [ ] T104 [P] Add form validation to all frontend forms using Joi schemas mirroring backend validation
- [ ] T105 [P] Implement responsive design testing for mobile/tablet viewports across all pages
- [ ] T106 [P] Add accessibility attributes (ARIA labels, roles) to all frontend components
- [ ] T107 [P] Create README.md in root with setup instructions, environment variables, and quickstart guide
- [ ] T108 [P] Create API documentation in docs/api.md linking to contracts/api-endpoints.md
- [ ] T109 Validate all quickstart scenarios from specs/001-user-management/quickstart.md work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion + User Story 1 (for auth system)
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion + User Story 2 (for organizer role)
- **User Story 4 (Phase 6)**: Depends on Foundational phase completion + User Story 3 (for player profiles)
- **User Story 5 (Phase 7)**: Depends on Foundational phase completion + User Story 3 (for player data)
- **Modal-Based Login (Phase 7.5)**: Depends on Phase 7 (public dashboard) + Phase 3 (login page components)
- **Password Reset (Phase 8)**: Depends on Foundational phase completion + User Story 1 (for auth system)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **MVP**
- **User Story 2 (P2)**: Depends on User Story 1 (requires authentication system working)
- **User Story 3 (P2)**: Depends on User Story 2 (requires organizer role working)
- **User Story 4 (P3)**: Depends on User Story 3 (requires player profiles existing)
- **User Story 5 (P3)**: Depends on User Story 3 (requires player data to display publicly)

### Within Each User Story

- Models before services (database schema must exist)
- Services before controllers (business logic needed by endpoints)
- Controllers before routes (handlers needed for routing)
- Routes before frontend (API must be available)
- Frontend services before components (API clients needed)
- Components before pages (reusable components needed)

### Parallel Opportunities

- **Setup phase**: All tasks T003-T010 can run in parallel (different initialization activities)
- **Foundational phase**: Tasks T017-T026 can run in parallel (different middleware/utilities)
- **Within User Story 1**: T027-T028 (backend), T031-T032 (frontend pages), T033 (frontend service) can run in parallel
- **Within User Story 2**: T039-T040 (backend), T044-T047 (frontend), T049-T050 (dashboard/routing) can run in parallel
- **Within User Story 3**: T055-T056 (backend), T061-T064 (frontend) can run in parallel
- **Within User Story 4**: T066-T067 (backend registration), T070-T073 (frontend registration), T076-T077 (profile update) can run in parallel
- **Within User Story 5**: T081-T082 (frontend public pages), T084 (navigation) can run in parallel
- **Modal-Based Login phase**: T086.1-T086.2 (modal components), T086.5 (modal state) can run in parallel
- **Password Reset phase**: T089-T091 (backend), T094-T095 (frontend) can run in parallel
- **Polish phase**: Nearly all tasks T098-T109 can run in parallel (independent improvements)

---

## Parallel Example: User Story 1 (MVP)

```bash
# Backend tasks (can run in parallel):
Task T027: Create backend auth controller in backend/src/api/authController.js
Task T028: Implement user service in backend/src/services/userService.js

# Frontend tasks (can run in parallel after backend API is ready):
Task T031: Create login page component in frontend/src/pages/LoginPage.jsx
Task T032: Create admin dashboard page component in frontend/src/pages/AdminDashboard.jsx
Task T033: Implement auth service in frontend/src/services/authService.js
```

---

## Implementation Strategy

### MVP First (User Story 1 Only - Recommended)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T026) - CRITICAL BLOCKING PHASE
3. Complete Phase 3: User Story 1 (T027-T038)
4. **STOP and VALIDATE**: Test admin authentication independently
5. Admin can log in, access dashboard, log out - MVP complete!

### Incremental Delivery (Recommended)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (P1) → Test independently → **Deploy MVP** (admin-only system)
3. Add User Story 2 (P2) → Test independently → Deploy (admin + organizer management)
4. Add User Story 3 (P2) → Test independently → **Deploy operational system** (tournament operations enabled)
5. Add User Story 4 (P3) → Test independently → Deploy (player self-service added)
6. Add User Story 5 (P3) → Test independently → Deploy (public transparency added)
7. Add Password Reset (Phase 8) → Test independently → Deploy (account recovery added)
8. Add Polish (Phase 9) → Final production release

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

1. Team completes Setup + Foundational together (T001-T026)
2. Once Foundational is done:
   - Developer A: User Story 1 (T027-T038) - **Blocks User Story 2**
   - Developer B: Start Data Model work for User Story 3 (T052-T054)
   - Developer C: Start Password Reset (T086-T087)
3. After User Story 1 complete:
   - Developer A → User Story 2 (T039-T051)
   - Developer B → Continue User Story 3 (T055-T065)
   - Developer C → Continue Password Reset (T088-T096)
4. Stories complete and integrate sequentially

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **Tests are OPTIONAL** - not included since not explicitly requested in specification
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, breaking user story independence
- All tasks include specific file paths for clarity
- Frontend/backend tasks can often run in parallel within same user story

---

## Task Summary

- **Total Tasks**: 119
- **Setup Phase**: 10 tasks
- **Foundational Phase**: 16 tasks (BLOCKING - must complete first)
- **User Story 1 (P1 - MVP)**: 12 tasks
- **User Story 2 (P2)**: 13 tasks
- **User Story 3 (P2)**: 14 tasks
- **User Story 4 (P3)**: 12 tasks
- **User Story 5 (P3)**: 8 tasks
- **Modal-Based Login (P2 - UX Enhancement)**: 10 tasks
- **Password Reset**: 11 tasks
- **Polish Phase**: 12 tasks
- **Parallelizable Tasks**: ~45 tasks marked with [P]
- **Estimated MVP Completion**: 38 tasks (Setup + Foundational + User Story 1)

---

## Issues Encountered & Resolutions

This section documents bugs discovered during implementation and their solutions for future reference.

### Issue #1: SQLite Prisma Query Mode Compatibility (Phase 5)

**Discovered**: 2025-10-31 during Phase 5 (User Story 3 - Player Profile Creation) implementation
**Severity**: High - Application crash
**Impact**: Duplicate detection feature completely non-functional

**Symptoms**:
- Prisma query error when checking for duplicate player profiles
- Error message: `Invalid 'prisma.playerProfile.findMany()' invocation: Unknown argument 'mode'. Did you mean 'lte'?`
- Error occurred in `findDuplicates()` and `findMatchingProfile()` functions

**Root Cause**:
- Used Prisma's `mode: 'insensitive'` option for case-insensitive string matching
- This option is only supported by PostgreSQL and MongoDB, **NOT SQLite**
- SQLite doesn't support case-insensitive mode through Prisma's API

**Affected Files**:
- `backend/src/services/playerService.js` - Lines 147, 160, 249, 254

**Solution**:
Removed all instances of `mode: 'insensitive'` from Prisma queries:

```javascript
// ❌ BEFORE (caused error):
where: {
  name: {
    equals: name.trim(),
    mode: 'insensitive'  // Not supported in SQLite
  }
}

// ✅ AFTER (works with SQLite):
where: {
  name: {
    equals: name.trim()  // SQLite LIKE is case-insensitive by default
  }
}
```

**Implementation Details**:
1. Removed `mode: 'insensitive'` from exact name matching queries
2. Removed `mode: 'insensitive'` from exact email matching queries (already normalized to lowercase)
3. Added comment explaining SQLite limitations
4. Note: SQLite's LIKE operator (used by `contains`) is case-insensitive by default for ASCII characters

**Files Modified**:
- `backend/src/services/playerService.js`:
  - `findDuplicates()` function - Lines 144-182
  - `findMatchingProfile()` function - Lines 244-264

**Prevention**:
- Document database-specific Prisma limitations in project README
- Consider PostgreSQL for production if case-sensitive searching is required
- Test with actual database engine early in development

---

### Issue #2: Duplicate Email Validation Error Handling (Phase 4/5)

**Discovered**: 2025-10-31 during user registration testing
**Severity**: Medium - Poor user experience
**Impact**: Users receive generic error messages instead of field-specific validation errors

**Symptoms**:
- Creating user with duplicate email showed generic "Failed to create user" error
- Error appeared as page-level alert instead of inline field validation
- Error details only shown in development mode, not production
- Frontend didn't highlight the email field as invalid

**Root Cause**:
1. **Backend**: Prisma unique constraint violations (P2002) weren't explicitly handled
2. **Backend**: Error details only included in development mode (line 34)
3. **Frontend**: Error handling didn't check for CONFLICT status code
4. **Frontend**: Only checked `errorDetails.field` but not error code or message content

**Affected Files**:
- `backend/src/middleware/errorHandler.js` - Lines 9-45
- `frontend/src/components/CreateUserModal.jsx` - Lines 90-102

**Solution**:

**Backend Enhancement** (`errorHandler.js`):
```javascript
// Added Prisma P2002 error detection and translation
if (err.code === 'P2002' && err.meta?.target) {
  status = 409;
  code = 'CONFLICT';
  const field = Array.isArray(err.meta.target) ? err.meta.target[0] : err.meta.target;

  if (field === 'email') {
    message = 'Email already registered';
    details = { field: 'email' };
  } else {
    message = `A record with this ${field} already exists`;
    details = { field };
  }
}

// Always include field-level details (removed dev-only restriction)
if (details) {
  errorResponse.error.details = details;
}
```

**Frontend Enhancement** (`CreateUserModal.jsx`):
```javascript
// Handle email-specific errors more robustly
const errorData = err.response?.data?.error;
const errorMessage = errorData?.message || 'Failed to create user';
const errorCode = errorData?.code;
const errorDetails = errorData?.details;

if (errorDetails?.field === 'email' ||
    (errorCode === 'CONFLICT' && errorMessage.toLowerCase().includes('email'))) {
  setValidationErrors({ email: errorMessage });  // Shows on email field
} else {
  setError(errorMessage);  // Shows as page alert
}
```

**Benefits**:
1. ✅ Prisma unique constraint violations are automatically translated to user-friendly messages
2. ✅ Field-specific errors work in both development and production
3. ✅ Email field highlights red with specific error message
4. ✅ Fallback logic ensures errors are caught even without explicit field details
5. ✅ Works for any unique constraint violation, not just email

**Files Modified**:
- `backend/src/middleware/errorHandler.js`: Lines 9-64 (enhanced error handler)
- `frontend/src/components/CreateUserModal.jsx`: Lines 90-106 (enhanced error handling)

**Validation**:
- Tested with duplicate email: Shows "Email already registered" on email field ✓
- Tested with other validation errors: Shows appropriate field-specific errors ✓
- Database constraint prevents duplicate emails at schema level ✓
- Application layer also checks before creation ✓

**Multi-Layer Protection**:
1. Database: `@unique` constraint in Prisma schema (ultimate safeguard)
2. Application: Pre-creation check in `userService.createUser()` (lines 35-38)
3. Error handling: Prisma P2002 → 409 CONFLICT translation
4. Frontend: Field-specific error display

**Prevention**:
- Always include field details in error responses, regardless of environment
- Handle database-specific error codes explicitly (Prisma P2002, etc.)
- Frontend should check multiple error indicators (code, message, details)
- Test validation error display early in development

---

### Issue #3: Stale Session References After Database Reset

**Discovered**: 2025-10-31 during database reset testing
**Severity**: Medium - Prevents login after database reset
**Impact**: Users cannot login after running `prisma migrate reset` until sessions are manually cleared

**Symptoms**:
- Login attempt fails with error: `User not found` (500 Internal Server Error)
- Error occurs at `auth.js:65` in `deserializeUser` function
- User credentials are correct and exist in database
- Error happens even on first login attempt after database reset

**Root Cause**:
1. **Session Persistence**: File-based sessions stored in `backend/sessions/` directory
2. **Database Reset Scope**: `npx prisma migrate reset` only deletes database, **not session files**
3. **Session Deserialization**: Existing session files contain user IDs from deleted database
4. **Authentication Flow**: Express tries to deserialize existing session before allowing new login
5. **Error Handling**: Original code threw error when user ID not found, blocking login

**Scenario**:
```
1. User logs in → Session created with user ID abc-123
2. Developer runs: npx prisma migrate reset
3. Database deleted and recreated (user ID abc-123 no longer exists)
4. Session file still exists with reference to abc-123
5. User tries to login → Express tries to deserialize abc-123 → Error!
```

**Affected Files**:
- `backend/src/middleware/auth.js` - Lines 51-81 (deserializeUser)
- `backend/sessions/` - Orphaned session files
- `backend/package.json` - Missing cleanup scripts

**Solution**:

**1. Improved Error Handling** (`auth.js`):
```javascript
// ❌ BEFORE (threw error):
if (!user) {
  return done(new Error('User not found'));  // Blocks login!
}

// ✅ AFTER (gracefully handles):
if (!user) {
  // User no longer exists (deleted or database reset)
  // Return false to clear invalid session instead of throwing error
  console.warn(`Session references non-existent user ID: ${id}`);
  return done(null, false);  // Clears session, allows new login
}

// Also check if user is deactivated
if (!user.isActive) {
  console.warn(`Session for deactivated user: ${user.email}`);
  return done(null, false);
}
```

**2. Database Reset Script** (`package.json`):
```json
{
  "scripts": {
    "db:reset": "npm run db:clear-sessions && prisma migrate reset",
    "db:clear-sessions": "node -e \"const fs = require('fs'); const path = require('path'); const dir = './sessions'; if (fs.existsSync(dir)) { fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f))); console.log('Sessions cleared'); } else { console.log('No sessions directory'); }\""
  }
}
```

**Benefits**:
1. ✅ Sessions automatically cleared when resetting database
2. ✅ Orphaned sessions no longer block login
3. ✅ Graceful handling of deleted/deactivated users
4. ✅ Better logging for troubleshooting
5. ✅ Single command for complete reset: `npm run db:reset`

**Files Modified**:
- `backend/src/middleware/auth.js`: Lines 51-81 (improved deserializeUser)
- `backend/package.json`: Added `db:reset` and `db:clear-sessions` scripts

**Usage**:

```bash
# OLD WAY (sessions not cleared):
cd backend
npx prisma migrate reset
# Manual cleanup required: rm -rf sessions/*

# NEW WAY (automatic cleanup):
cd backend
npm run db:reset
# Sessions cleared automatically!

# Or clear sessions independently:
npm run db:clear-sessions
```

**Prevention**:
- **Always use** `npm run db:reset` instead of `npx prisma migrate reset` directly
- Consider moving to database-backed sessions in production (Redis or PostgreSQL)
- File-based sessions are only suitable for development
- Add sessions directory to `.gitignore` (should already be there)

**Production Recommendation**:
Switch from file-based sessions to database or Redis sessions for production:

```javascript
// Development: File-based (current)
store: new SessionFileStore({ path: './sessions' })

// Production: PostgreSQL-based (recommended)
store: new PrismaSessionStore(prisma)

// Or: Redis-based (best for scaling)
store: new RedisStore({ client: redisClient })
```

**Additional Considerations**:
- File-based sessions don't scale across multiple server instances
- Session files accumulate over time (no automatic cleanup)
- Database-backed sessions get cleared with database resets automatically
- Redis sessions provide best performance and automatic expiration

---

### Issue #4: Missing Unique Constraint on Player Profile Email

**Discovered**: 2025-10-31 during testing of Phase 5 (Player Profile Creation)
**Severity**: High - Data integrity violation
**Impact**: Multiple player profiles can be created with the same email address, causing data inconsistency

**Symptoms**:
- System allows creating multiple player profiles with identical email addresses
- Example: Two different "John Smith" profiles both with `test@test.com`
- No error or warning when creating duplicate email
- Database accepts duplicate emails without constraint violation

**Root Cause**:
- **Missing Constraint**: `PlayerProfile.email` field in Prisma schema lacked `@unique` constraint
- **Schema Design Oversight**: Email was marked as optional (`String?`) but not unique
- Unlike `User.email` which has `@unique`, player profile emails were not protected

**Data Integrity Issue**:
```
Player 1: John Smith → test@test.com
Player 2: Jane Doe → test@test.com
Player 3: Mike Johnson → test@test.com
```
This creates ambiguity - which player "owns" this email? Prevents future account linking.

**Affected Files**:
- `backend/prisma/schema.prisma` - Line 82 (PlayerProfile.email)

**Solution**:

**Schema Update** (`schema.prisma`):
```prisma
// ❌ BEFORE (allowed duplicates):
model PlayerProfile {
  email String?  // No unique constraint
}

// ✅ AFTER (enforces uniqueness):
model PlayerProfile {
  email String? @unique  // Email must be unique if provided
}
```

**Important Note**: SQLite allows multiple `NULL` values with `@unique` constraint:
- ✅ Profile 1: email = `null` → Allowed
- ✅ Profile 2: email = `null` → Allowed (multiple nulls OK)
- ✅ Profile 3: email = `john@test.com` → Allowed
- ❌ Profile 4: email = `john@test.com` → **BLOCKED** (duplicate)

This behavior is perfect for our use case:
- Players without emails can still be created (null emails)
- Players with emails must have unique emails
- Prevents data integrity issues

**Migration Process**:
```bash
# 1. Check for existing duplicates
node check-duplicate-emails.js

# 2. Clean up duplicates manually if found
# (In this case: deleted one of two "John Smith" profiles)

# 3. Reset database with new schema
npm run db:reset

# 4. Verify constraint is active
# Try creating two players with same email → Should fail
```

**Benefits**:
1. ✅ Data integrity enforced at database level
2. ✅ Prevents accidental duplicate player emails
3. ✅ Enables future account linking (email uniqueness required)
4. ✅ Consistent with User.email behavior (also unique)
5. ✅ Works with nullable emails (multiple nulls allowed)

**Files Modified**:
- `backend/prisma/schema.prisma`: Line 82 (added `@unique` to email)
- Database migration: Applied via `npm run db:reset`

**Error Handling**:

The existing Prisma P2002 error handler (from Issue #2) automatically handles this:

```javascript
// Backend error handler already translates unique violations
if (err.code === 'P2002' && err.meta?.target) {
  const field = err.meta.target[0];
  if (field === 'email') {
    message = 'Email already registered';
    details = { field: 'email' };
  }
}
```

**Frontend Display**:
- Attempting to create player with duplicate email shows error on email field
- Message: "Email already registered" or "A record with this email already exists"
- Error appears inline on the email field with red highlight

**Testing**:
After fix, attempting to create duplicate player emails:

```bash
# Test scenario:
1. Create player: "John Smith" with email "test@test.com" → ✅ Success
2. Create player: "Jane Doe" with email "test@test.com" → ❌ Error: "Email already registered"
```

**Prevention**:
- Always add `@unique` constraints to fields that should be unique
- Test data integrity constraints during development
- Review schema for missing constraints when adding new models
- Consider both nullable and non-nullable unique constraints

**Related Issues**:
- Issue #2: Duplicate Email Validation Error Handling (benefits from this fix)
- Error handler already in place to translate P2002 errors

**Production Impact**:
- **Low Risk**: This is a data integrity improvement
- **No Breaking Changes**: Existing null emails continue to work
- **Migration Required**: Must clean up any existing duplicate emails before applying

---

## Database-Specific Considerations

### SQLite Limitations

**Known Limitations**:
1. No support for Prisma `mode: 'insensitive'` in queries
2. LIKE operator is case-insensitive by default (for ASCII only)
3. No native full-text search capabilities
4. Limited concurrent write operations

**Mitigations Applied**:
1. Removed `mode: 'insensitive'` from all queries
2. Normalize emails to lowercase before storage
3. Added comments documenting SQLite-specific behavior
4. Use `contains` for fuzzy matching (leverages LIKE operator)

**Production Recommendations**:
- Consider PostgreSQL for production deployment if:
  - Case-sensitive searching is required
  - High concurrency is needed
  - Full-text search is needed
  - Better `mode: 'insensitive'` support is desired

---

## Testing Checklist for Known Issues

When deploying to new environments or databases:

- [ ] Test duplicate player profile creation with exact name match
- [ ] Test duplicate player profile creation with case variations
- [ ] Test duplicate email registration (user accounts)
- [ ] **Test duplicate player profile email** (Issue #4) - should show "Email already registered"
- [ ] Verify error messages show on correct form fields
- [ ] Test in production mode (not just development)
- [ ] Verify database unique constraints are enforced (User.email and PlayerProfile.email)
- [ ] Test fuzzy name matching for duplicate detection
- [ ] Verify SQLite compatibility if using SQLite
- [ ] Consider PostgreSQL testing if planning production migration
- [ ] Test login after database reset (should work without manual session cleanup)
- [ ] Verify `npm run db:reset` clears sessions automatically
- [ ] Test that deactivated users cannot maintain active sessions
- [ ] Test player profiles with null emails (multiple should be allowed)
- [ ] Test player profile with email, then try creating another with same email (should fail)
