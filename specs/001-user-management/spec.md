# Feature Specification: User Management System

**Feature Branch**: `001-user-management`
**Created**: 2025-10-30
**Status**: Draft
**Input**: User description: "User management - ADMIN - Super user - ORGANIZER - Persons in charge of tournaments - PLAYER - Participant in tournaments and rankings - PUBLIC - A visitor accessing public-facing functionality"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Authentication and Management (Priority: P1)

As a BATL system administrator, I need to securely log in and manage the core system settings so that I can maintain the tournament platform and oversee all operations.

**Why this priority**: Admin access is the foundation for all system operations. Without admin authentication, no other users can be created or managed, and system configuration is impossible. This is the absolute minimum viable product.

**Independent Test**: Can be fully tested by creating an admin account, logging in with valid credentials, accessing admin dashboard, and verifying that only authenticated admins can access administrative functions. Delivers immediate value by securing the system and enabling initial setup.

**Acceptance Scenarios**:

1. **Given** an admin user exists with valid credentials, **When** they enter correct email and password, **Then** they are authenticated and redirected to the admin dashboard
2. **Given** an admin is logged in, **When** they access admin-only features, **Then** the system grants access without prompting for credentials again
3. **Given** an unauthenticated visitor, **When** they attempt to access admin features, **Then** the system denies access and redirects to login page
4. **Given** an admin user enters incorrect credentials, **When** they attempt to log in, **Then** the system displays an error message and denies access
5. **Given** an admin is logged in, **When** they log out, **Then** their session is terminated and they cannot access admin features until re-authenticating

**UX Enhancement - Modal-Based Login** (Added 2025-10-31):

To improve user experience, the login flow has been enhanced with modal-based authentication:

1. **Default Landing Page**: Public rankings page (`/rankings`) is the default landing page for all unauthenticated visitors, not the login page
2. **Modal Login**: Login form appears as a modal popup overlay over the public dashboard when user clicks "Login" button in navbar
3. **Modal Registration**: Player registration form appears as a modal popup when user clicks "Register" button in navbar
4. **Seamless UX**: Users can browse public content and authenticate without navigating away from the page
5. **Backward Compatibility**: Direct links to `/login` and `/register` URLs still work for deep linking and bookmarks

**New Acceptance Scenarios for Modal Login**:

6. **Given** an unauthenticated visitor accesses the site, **When** they land on the homepage, **Then** they see the public rankings page (not login page)
7. **Given** an unauthenticated visitor is on the public rankings page, **When** they click "Login" button in navbar, **Then** a login modal appears as overlay over the page
8. **Given** the login modal is open, **When** user enters valid credentials and submits, **Then** modal closes and user is redirected to their role-specific dashboard
9. **Given** the login modal is open, **When** user clicks outside the modal or presses ESC, **Then** modal closes and public page remains visible
10. **Given** the login modal is open, **When** user clicks "Don't have an account? Register", **Then** login modal closes and register modal opens
11. **Given** the register modal is open, **When** user successfully registers, **Then** modal closes, account is created, user is logged in, and redirected to their profile

---

### User Story 2 - Organizer Account Management (Priority: P2)

As a tournament organizer, I need to create an account and log in so that I can manage tournaments, register players, and access organizer-specific features.

**Why this priority**: Organizers are the primary operational users who run tournaments. This builds on the admin foundation (P1) to enable the core use case of tournament management. Without organizers, there can be no tournaments.

**Independent Test**: Can be tested by having an admin create organizer accounts, organizers logging in with their credentials, and verifying they can access organizer features but not admin features. Delivers value by enabling tournament management operations.

**Acceptance Scenarios**:

1. **Given** an admin is logged in, **When** they create a new organizer account with email and temporary password, **Then** the organizer account is created and the organizer receives access credentials
2. **Given** an organizer account exists, **When** the organizer logs in with valid credentials, **Then** they are authenticated and can access organizer features
3. **Given** an organizer is logged in, **When** they attempt to access admin-only features, **Then** the system denies access
4. **Given** an organizer is logged in, **When** they update their profile information, **Then** the changes are saved and reflected in their account
5. **Given** multiple organizers exist, **When** an admin views the organizer list, **Then** all organizer accounts are displayed with their status and basic information

---

### User Story 3 - Player Profile Creation Without Accounts (Priority: P2)

As a tournament organizer, I need to create player profiles for participants who don't have accounts so that I can register them for tournaments quickly without requiring them to create accounts first.

**Why this priority**: This aligns with BATL's core principle that "a person doesn't need to have an account to be a player and participate." This enables faster tournament registration and lower barriers to entry for casual players. Equally important as organizer management for operational flow.

**Independent Test**: Can be tested by having an organizer create player profiles with basic information (name, contact) without requiring account credentials, registering those players in tournaments, and verifying the system tracks their participation and rankings. Delivers value by streamlining tournament registration.

**Acceptance Scenarios**:

1. **Given** an organizer is logged in, **When** they create a new player profile with name and basic contact information, **Then** the player profile is created without requiring account credentials
2. **Given** a player profile exists without an account, **When** the organizer registers them for a tournament, **Then** the registration is successful and the player appears in the tournament roster
3. **Given** a player profile exists without an account, **When** they earn points in tournaments, **Then** the points are recorded and reflected in category rankings
4. **Given** multiple player profiles exist, **When** an organizer searches for a player, **Then** matching profiles are displayed with their tournament history
5. **Given** a player profile exists without an account, **When** a duplicate is about to be created, **Then** the system warns the organizer of potential duplicates based on name similarity

---

### User Story 4 - Player Self-Service Account Creation (Priority: P3)

As a tennis player, I want to create my own account so that I can view my tournament history, update my profile, and register for tournaments myself without needing an organizer's assistance.

**Why this priority**: This is an enhancement for engaged players who want more control. While valuable for user experience, it's not essential for basic tournament operations since organizers can create player profiles (P2). This enables better player engagement but isn't blocking core functionality.

**Independent Test**: Can be tested by allowing a player to self-register with email/password, log in, view their profile and tournament history, and update their information. Delivers value by enabling player self-service and reducing organizer workload for active players.

**Acceptance Scenarios**:

1. **Given** a visitor accesses the public site, **When** they complete the player registration form with email and password, **Then** a player account is created and they can log in
2. **Given** a player account exists, **When** they log in, **Then** they can view their tournament history and rankings across all categories
3. **Given** a player is logged in, **When** they update their profile information, **Then** the changes are saved and reflected in all tournaments
4. **Given** a player profile was created by an organizer, **When** the player creates an account with matching information, **Then** the system links the account to the existing profile and preserves tournament history
5. **Given** a player is logged in, **When** they attempt to access organizer or admin features, **Then** the system denies access

---

### User Story 5 - Public Access to Tournament Information (Priority: P3)

As a public visitor, I want to view tournament results, rankings, and schedules without creating an account so that I can stay informed about BATL league activities.

**Why this priority**: Public transparency enhances community engagement and attracts new participants. However, it's not critical for core operations. This is a nice-to-have feature that builds on the foundation of user management by defining what can be accessed without authentication.

**Independent Test**: Can be tested by accessing public pages without authentication and verifying that tournament results, rankings, and schedules are visible while restricted features remain inaccessible. Delivers value by increasing league visibility and community engagement.

**Acceptance Scenarios**:

1. **Given** a visitor accesses the public site without logging in, **When** they view tournament results, **Then** completed tournament results and standings are displayed
2. **Given** a visitor accesses the public site without logging in, **When** they view category rankings, **Then** current rankings for all public categories are displayed
3. **Given** a visitor accesses the public site without logging in, **When** they attempt to access player contact information, **Then** the system displays only public profile information (name, registration status) and hides private details (email, phone)
4. **Given** a visitor accesses the public site without logging in, **When** they attempt to register for a tournament, **Then** they are prompted to either create an account or contact an organizer
5. **Given** a visitor accesses the public site without logging in, **When** they attempt to modify any data, **Then** the system denies access and prompts for authentication

**Implementation Status** (Completed 2025-10-31):

- ✅ Public rankings page (`/rankings`) implemented as default landing page
- ✅ Backend API endpoints support unauthenticated access with field-level privacy controls
- ✅ Contact information (email, phone) hidden from public view
- ✅ Public users see only: player name and registration status (hasAccount: true/false)
- ✅ Authenticated users (ORGANIZER/ADMIN) see full player details including contact info
- ⏳ Tournament results page deferred to tournament management feature
- ⏳ Protected action redirects deferred to tournament management feature

---

### Edge Cases

- What happens when an organizer creates a player profile that matches an existing self-registered player account?
- How does the system handle expired sessions for different user roles?
- What happens when an admin tries to delete their own account or the last admin account?
- How does the system handle concurrent login attempts from different devices for the same account?
- What happens when a player profile without an account needs to be merged with a later-created account?
- How does the system handle password reset requests for organizers and players?
- What happens when a user attempts multiple failed login attempts in succession?
- How does the system distinguish between multiple players with identical names?
- What happens when PUBLIC users attempt to access features that require authentication?
- How are orphaned player profiles (created by organizers who are later deleted) handled?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support four distinct user role types: ADMIN (super user with full system access), ORGANIZER (tournament management access), PLAYER (participant with account), and PUBLIC (unauthenticated visitor)
- **FR-002**: System MUST provide secure authentication via email and password for ADMIN and ORGANIZER roles
- **FR-003**: System MUST allow ADMIN users to create and manage ORGANIZER accounts
- **FR-004**: System MUST allow ORGANIZER users to create player profiles without requiring those players to have accounts
- **FR-005**: System MUST allow players to optionally create their own accounts for self-service access
- **FR-006**: System MUST link player accounts to existing player profiles when matching information is provided
- **FR-007**: System MUST maintain secure sessions for authenticated users with appropriate timeout periods
- **FR-008**: System MUST enforce role-based access control where each role can only access features appropriate to their permission level
- **FR-009**: System MUST allow users to log out and terminate their sessions
- **FR-010**: System MUST allow PUBLIC users to view designated public information without authentication
- **FR-011**: System MUST prevent unauthorized access to private features and data
- **FR-012**: System MUST handle password reset functionality for users with accounts
- **FR-013**: System MUST log authentication events for security auditing
- **FR-014**: System MUST validate user input (email format, password strength) during account creation
- **FR-015**: System MUST prevent duplicate player profiles by warning organizers of potential matches during creation
- **FR-016**: System MUST preserve player tournament history and rankings when linking profiles to accounts
- **FR-017**: System MUST allow ADMIN users to deactivate or delete user accounts while preserving associated tournament data
- **FR-018**: System MUST display appropriate error messages for failed authentication attempts

### Key Entities

- **User Account**: Represents authenticated users (ADMIN, ORGANIZER, or PLAYER with account). Contains credentials, email, role assignment, account status, creation date, and last login timestamp. Required for ADMIN and ORGANIZER; optional for PLAYER.

- **Role**: Defines permission levels within the system. Four role types: ADMIN (full system access), ORGANIZER (tournament management), PLAYER (participant self-service), PUBLIC (unauthenticated visitor). Each user account is assigned exactly one role.

- **Player Profile**: Represents a tournament participant. Contains name, contact information, tournament history, points earned, and category rankings. Can exist independently without a linked user account. Created either by organizers during registration or by player self-registration. May be linked to a user account for self-service access.

- **Session**: Represents an authenticated user's active connection to the system. Contains session identifier, user reference, creation timestamp, expiration time, and activity tracking. Terminated on logout or timeout.

- **Permission**: Defines specific actions allowed for each role type. Maps role to allowed operations (e.g., ORGANIZER can create player profiles, ADMIN can manage organizer accounts). Used to enforce role-based access control throughout the system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin users can complete login and access admin dashboard in under 10 seconds
- **SC-002**: Organizers can create a new player profile in under 30 seconds
- **SC-003**: 95% of authentication attempts with valid credentials succeed on first try
- **SC-004**: System prevents 100% of unauthorized access attempts to admin and organizer features
- **SC-005**: Player profile creation without accounts reduces tournament registration time by 50% compared to requiring account creation
- **SC-006**: Public visitors can view tournament results and rankings without requiring support from organizers or administrators
- **SC-007**: System successfully links player accounts to existing profiles in 90% of matching cases without data loss
- **SC-008**: Session management handles at least 100 concurrent authenticated users without performance degradation
- **SC-009**: Zero security breaches related to authentication or authorization in production
- **SC-010**: Password reset functionality completes successfully for 95% of valid requests within 5 minutes

### Assumptions

1. **Initial Admin Creation**: Assume a secure process exists for creating the first admin user during system installation (e.g., command-line script, environment configuration). This is outside the scope of this feature but required for bootstrapping.

2. **Email Delivery**: Assume email delivery infrastructure exists for sending account credentials and password reset links. Email content and templates are out of scope but the system will trigger email notifications.

3. **Contact Information Privacy**: Assume player contact information (email, phone) is considered private by default and not displayed to PUBLIC users. Privacy settings and granular permissions are out of scope for this feature.

4. **Single Session Per User**: Assume users can have multiple concurrent sessions from different devices. Session management will track each session independently.

5. **Password Reset Security**: Assume password reset follows industry-standard practices (time-limited tokens, secure links). Detailed security implementation is deferred to planning phase but must meet modern security standards.

6. **Player Matching Logic**: Assume player profile duplicate detection uses fuzzy name matching and basic contact information comparison. Advanced duplicate detection (e.g., machine learning, photo matching) is out of scope.

7. **Audit Logging Storage**: Assume authentication event logging stores basic information (user, timestamp, action, success/failure). Long-term log retention and analysis tools are out of scope for this feature.

8. **Data Retention**: Assume standard data retention policies apply. When user accounts are deleted, associated player profiles and tournament history are preserved for ranking integrity unless explicitly requested otherwise.

---

## Implementation Notes & Known Issues *(reference)*

This section documents technical considerations and issues discovered during implementation.

### UX Architecture: Modal-Based Authentication

**Change Request**: 2025-10-31
**Rationale**: Improve user experience by eliminating unnecessary page navigation for authentication

**Original Design**:
- Login page at `/login` as separate route
- Register page at `/register` as separate route
- Login page was default landing page for unauthenticated users
- User navigates away from public content to authenticate

**New Design**:
- Public rankings page (`/rankings`) is default landing page
- Login and registration forms appear as modal overlays
- Modal triggered by navbar buttons ("Login" / "Register")
- Users authenticate without leaving public page
- Separate `/login` and `/register` routes maintained for backward compatibility

**Benefits**:
1. **Reduced Friction**: Users can browse public content immediately without being forced to login page
2. **Better Engagement**: Public rankings visible on first visit increases engagement
3. **Seamless Flow**: Authentication happens in context without losing place on page
4. **Modern UX**: Modal-based authentication is industry standard for public-facing apps
5. **Conversion Optimization**: Users more likely to register after seeing content

**Implementation Details**:
- LoginModal.jsx component extracts functionality from LoginPage.jsx
- RegisterModal.jsx component extracts functionality from RegisterPage.jsx
- Modal state managed in App.jsx or dedicated ModalContext.jsx
- Bootstrap Modal component with proper accessibility (ARIA, keyboard support)
- Modals close on: successful authentication, ESC key, backdrop click
- Cross-navigation: Login modal has link to Register modal and vice versa

**Backward Compatibility**:
- Direct links to `/login` and `/register` still work
- These routes now render the public dashboard with modal pre-opened
- Deep linking preserved for email links, bookmarks, external referrers
- No breaking changes to existing authentication API endpoints

### Database Engine Compatibility

**Technology Choice**: SQLite (Development) → PostgreSQL (Recommended for Production)

**SQLite-Specific Limitations Encountered**:

1. **Case-Insensitive String Matching**: SQLite does not support Prisma's `mode: 'insensitive'` query option, which is available in PostgreSQL and MongoDB. This affects:
   - Player duplicate detection (name matching)
   - User email searches
   - Any case-insensitive string comparisons

   **Mitigation**:
   - Removed `mode: 'insensitive'` from all Prisma queries
   - Rely on SQLite's default case-insensitive LIKE operator (ASCII only)
   - Normalize emails to lowercase before storage
   - Document limitation in code comments

2. **Concurrency**: SQLite has limited concurrent write support compared to PostgreSQL

3. **Full-Text Search**: No native full-text search capabilities in SQLite

**Production Recommendation**: Migrate to PostgreSQL for production deployment to gain:
- Better case-insensitive search support
- Higher concurrency for concurrent user operations
- Full-text search capabilities
- Better Prisma feature support

---

### Error Handling Enhancements

**Issue**: Generic error messages for duplicate email validation prevented good user experience

**Enhancement Applied**: Multi-layer duplicate email protection

1. **Database Layer**: Unique constraint on email field (`@unique` in Prisma schema)
2. **Application Layer**: Pre-creation validation in `userService.createUser()`
3. **Error Handler**: Explicit Prisma P2002 (unique constraint violation) error translation
4. **Frontend Layer**: Field-specific error display with multiple fallback checks

**Result**:
- Users see "Email already registered" error directly on the email field (red highlight)
- Works in both development and production modes
- Graceful handling of race conditions (database constraint as final safeguard)

**Key Technical Details**:
- Prisma error code P2002 indicates unique constraint violation
- Error handler translates P2002 to 409 CONFLICT with field details
- Frontend checks both `errorDetails.field` and error code/message
- Always includes field details in error responses (not just dev mode)

---

### Validation & Security

**Email Uniqueness**:
- **Functional Requirement**: FR-002 requires unique email addresses per account
- **Implementation**: 4-layer protection (database, application, error handler, frontend)
- **Testing**: Validated with concurrent duplicate creation attempts

**Password Security**:
- Hashing: bcrypt with 12 salt rounds
- Validation: Minimum 8 characters, requires uppercase, lowercase, and number
- Storage: Only password hash stored, never plain text

**Session Management**:
- Duration: 30 minutes of inactivity
- Storage: File-based sessions (development), recommend Redis for production
- Security: httpOnly, sameSite=strict, secure in production

---

### Future Considerations

**When to Migrate from SQLite to PostgreSQL**:

1. **Development → Production**: Always recommended for production environments
2. **Case-Sensitive Search Needed**: If exact case matching is required for player names
3. **High User Concurrency**: When many organizers/players use system simultaneously
4. **Advanced Search**: If full-text search or complex queries are needed
5. **Data Volume**: When player database exceeds 10,000+ profiles

**Migration Notes**:
- Prisma schema is database-agnostic (just change datasource provider)
- Can re-enable `mode: 'insensitive'` queries after PostgreSQL migration
- Session storage should move from file-based to Redis/database
- Test all Prisma queries after migration (syntax mostly compatible)

---

### Testing Recommendations

**Critical Test Scenarios** (discovered during implementation):

1. **Duplicate Email Registration**:
   - Test: Create user with existing email
   - Expected: Red error on email field: "Email already registered"
   - Validates: FR-002 (unique email requirement)

2. **Player Duplicate Detection**:
   - Test: Create player profile with similar name to existing profile
   - Expected: Warning shown with matching profiles, creation still allowed
   - Validates: FR-015 (duplicate warning requirement)

3. **Case Variation Handling**:
   - Test: Create "John Smith" when "john smith" exists
   - Expected: SQLite treats as different, PostgreSQL can detect as duplicate
   - Note: Document database-specific behavior

4. **Production Mode Validation**:
   - Test: All error scenarios in production mode (NODE_ENV=production)
   - Expected: User-friendly errors without stack traces, field-specific errors work
   - Validates: Security (no info leakage) and UX (good error messages)

5. **Session Timeout**:
   - Test: Leave session idle for 30+ minutes
   - Expected: Auto-redirect to login on next action
   - Validates: FR-007 (session management requirement)

---

### Performance Considerations

**Current Implementation**:
- Duplicate detection: O(n) linear search (acceptable for <10,000 players)
- Session lookup: File-based (fast for <100 concurrent users)
- Authentication: bcrypt with 12 rounds (balances security and speed)

**Optimization Opportunities** (when needed):
1. Add database indexes on frequently searched fields (player name, email)
2. Implement caching for player list queries (Redis)
3. Move session storage to Redis for better concurrency
4. Consider pagination for large player lists (implemented: 20 per page)
5. Add full-text search index for player names (requires PostgreSQL)

---

### Known Limitations & Workarounds

**Limitation 1: No Email Verification**
- **Impact**: Users can register with any email without verification
- **Workaround**: User Story 4 (Player Self-Service) is P3 priority
- **Future**: Phase 8 includes password reset requiring email verification

**Limitation 2: No Profile Merging**
- **Impact**: If organizer creates "John Smith" and player registers as "John Smith", system may create two profiles
- **Workaround**: Profile linking logic in User Story 4 matches by name + email
- **Future**: Admin tool to manually merge profiles (out of scope for this feature)

**Limitation 3: Simple Duplicate Detection**
- **Impact**: Only detects exact name/email matches, not fuzzy variations
- **Workaround**: Uses name parts matching (splits "John Smith" → "John", "Smith")
- **Future**: Advanced duplicate detection (Levenshtein distance, ML) out of scope

**Limitation 4: Single Database**
- **Impact**: No read replicas or database clustering
- **Acceptable for**: <1000 users, <10,000 player profiles
- **Future**: Scale horizontally with PostgreSQL replication when needed

---

### Compliance & Audit

**Audit Logging** (FR-013):
- All authentication events logged with IP and user agent
- User creation/modification logged with actor and changes
- Logs stored in database (AuditLog table)
- Retention: Not specified, recommend 90 days minimum

**Security Events Logged**:
- Login success/failure (including IP address)
- User account creation/modification/deletion
- Role changes
- Password changes
- Session creation/destruction

**Not Logged** (out of scope):
- Player profile views
- Search queries
- Tournament registration (future feature)
- Public page access

---

### Documentation Maintenance

**When to Update This Section**:
1. New database compatibility issues discovered
2. Security vulnerabilities found and fixed
3. Performance bottlenecks identified and resolved
4. Breaking changes to database schema
5. Migration from SQLite to PostgreSQL occurs

**Related Documents**:
- `tasks.md` - Detailed issue reports with file paths and code examples
- `data-model.md` - Database schema and relationships
- `plan.md` - Architecture and technical decisions
- `backend/README.md` - Setup and deployment instructions
