# Codebase Concerns

**Analysis Date:** 2026-02-26

## Tech Debt

**Large Service Files Requiring Refactoring:**
- Files: `backend/src/services/tournamentService.js` (1134 lines), `backend/src/services/tournamentRegistrationService.js` (882 lines), `backend/src/services/pairRegistrationService.js` (840 lines)
- Issue: Single Responsibility Principle violation. Services handle multiple concerns: validation, data operations, business logic, error handling in monolithic files
- Impact: Difficult to test individual functions, high cognitive load for developers, increased chance of side effects when making changes
- Fix approach: Break large services into focused modules (e.g., separate validators, query builders, transformers). Extract reusable business logic into utility functions.

**Large React Components:**
- Files: `frontend/src/pages/PairRegistrationPage.jsx` (750 lines), `frontend/src/pages/TournamentSetupPage.jsx` (665 lines), `frontend/src/pages/TournamentRegistrationPage.jsx` (650 lines)
- Issue: Page components handle too many responsibilities (state management, validation, API calls, rendering). Difficult to isolate logic.
- Impact: Components are hard to test, difficult to reuse form logic, state management becomes tangled
- Fix approach: Extract form logic into custom hooks, separate validation logic, create smaller presentation components

**Incomplete Session Secret Configuration:**
- Issue: `backend/src/index.js` line 109 uses default `'change-this-secret'` as SESSION_SECRET fallback
- Files: `backend/src/index.js`
- Risk: If `SESSION_SECRET` env var is not set in production, sessions become predictable and attackable
- Recommendation: Fail fast if SESSION_SECRET is missing in production mode, or use strongly random default

## Test Coverage Gaps

**Missing Integration Tests for Core Features:**
- Files: `backend/__tests__/integration/seedingRoutes.test.js` (line 23)
- Issue: Integration tests mock or skip database setup. Tests use placeholder assertions like `expect([404, 200, 500]).toContain(response.status)` instead of actual validation
- What's not tested: Full tournament registration flow, point calculation across multiple registrations, seeding with real ranking data
- Risk: Critical bugs in multi-step workflows may only surface in production
- Priority: High - These are core business flows that must be validated end-to-end

**Missing Frontend Unit Tests:**
- Issue: Frontend codebase has 97 JS/JSX files but no test suite configured
- What's not tested: Component rendering, state transitions, error handling, form validation, API error handling
- Files affected: All `frontend/src/pages/*.jsx` and `frontend/src/components/*.jsx`
- Risk: Regressions in UI behavior, broken error handling in forms, silent failures in complex components like PairRegistrationPage
- Priority: High - Frontend is user-facing and susceptible to subtle bugs

**Database-Dependent Code Path Untested:**
- Files: `backend/src/services/pointCalculationService.js`, `backend/src/services/seedingPlacementService.js`
- Issue: Services depend on Prisma queries that aren't tested against actual database schema
- What's not tested: Point calculation with actual tournament results, ranking calculations with tiebreakers, seeding with real player data
- Risk: Schema mismatches, missing indexes, N+1 query problems only discovered in production
- Priority: Medium - Can be addressed with database test fixtures

## Fragile Areas

**Tournament State Transitions:**
- Files: `backend/src/services/tournamentService.js`, `backend/src/api/tournamentController.js`
- Why fragile: Tournament status changes (SCHEDULED → IN_PROGRESS → COMPLETED) are not atomic. Multiple services modify tournament state based on assumptions about current status.
- Safe modification: Add explicit pre-transition validation and use database transactions for all state changes. Document state transition rules clearly.
- Test coverage: Only happy path tested. Missing validation of impossible transitions (COMPLETED → SCHEDULED).

**Cascade Delete Behavior:**
- Files: `backend/prisma/schema.prisma`
- Why fragile: Extensive use of `onDelete: Cascade` across relationships (Sessions, CategoryRegistrations, TournamentRegistrations, Matches, Brackets, Rounds). Deleting a parent entity silently removes all related data.
- Impact: Orphaning of tournament results, rankings becoming inconsistent, audit trail gaps
- Safe modification: Audit all cascade deletes. Use `onDelete: Restrict` for critical audit data (TournamentResult, RankingEntry). Document cascade expectations.
- Example: Deleting a Tournament cascades to delete all its Matches, Rounds, Brackets, and TournamentResults without preserving historical point calculations.

**Point Calculation Consistency:**
- Files: `backend/src/services/pointCalculationService.js`, `backend/src/services/rankingService.js`
- Why fragile: Points are calculated and stored in RankingEntry, but original calculation method and parameters are not preserved. Recalculating points with different parameters produces different results but overwrites historical data.
- Safe modification: Store calculation parameters (participantCount, placement, method) in TournamentResult for auditability. Prevent rewriting historical results.
- Test coverage: No tests validating tiebreaker logic (totalPoints → lastTournamentDate → tournamentCount → alphabetical order)

**Waitlist Auto-Promotion Logic:**
- Files: `backend/src/services/tournamentRegistrationService.js` (lines 200-300+)
- Why fragile: Withdrawal/cancellation triggers complex waitlist promotion cascades. No apparent rollback mechanism if promotion fails mid-transaction.
- Impact: Inconsistent waitlist states, players not promoted despite capacity, or promoted multiple times
- Safe modification: Ensure `prisma.$transaction` wraps entire promotion logic. Add logging for each promotion step. Test failure scenarios.

## Known Bugs

**TODO Comments Indicating Incomplete Implementation:**
- Location: `backend/__tests__/integration/seedingRoutes.test.js` line 23
- Issue: "TODO: Setup test database with seed data for full integration test"
- Symptoms: Integration tests don't validate actual behavior because database is not available
- Workaround: None currently - tests are placeholders
- Impact: Cannot verify seeding algorithm works with real tournament data

**Temporary Status Field:**
- Location: `backend/src/services/registrationService.js` line 431
- Issue: Code references `status: 'TEMP'` with no explanation of when/why this is used
- Symptoms: Registration state becomes unclear when 'TEMP' status appears
- Impact: Debugging is difficult; unclear if this is intentional placeholder or legacy code
- Recommendation: Remove or document the TEMP status clearly in schema with transition rules

**Tournament Rules/Format Configuration:**
- Location: `backend/prisma/schema.prisma` lines 313-314
- Issue: `formatConfig` and `defaultScoringRules` stored as JSON strings with no validation schema
- Impact: Invalid JSON silently stored; no type safety; deserialization can fail at runtime
- Recommendation: Create Zod schemas for format configs, validate on insert/update, consider storing as separate typed models

## Scaling Limits

**File-Based Session Storage:**
- Current implementation: `backend/src/index.js` line 104-107 uses `session-file-store`
- Current capacity: Filesystem-based storage becomes slow at 10,000+ session files
- Limit: Single-node deployment only; doesn't scale to multiple backend instances
- Scaling path: Migrate to Redis or PostgreSQL session store in production

**In-Memory Bracket Template Cache:**
- Current implementation: `backend/src/services/bracketService.js` loads all 125 bracket templates into memory on first request
- Current capacity: ~1-2 MB, negligible impact
- Limit: If bracket templates expand significantly (e.g., 1000+ players), memory usage scales linearly
- Scaling path: Consider lazy-loading templates or moving to database if templates become dynamic

**PostgreSQL Indexes:**
- Files: `backend/prisma/schema.prisma`
- Current coverage: Indexes on frequently queried fields (userId, createdBy, name, email, birthDate, gender, type, ageGroup, gender for categories)
- Potential gap: Complex queries joining Tournament + TournamentRegistration + CategoryRegistration lack composite indexes
- Recommendation: Add index on (tournament.categoryId, tournament.status) and (tournamentRegistration.playerId, tournamentRegistration.status)

## Performance Bottlenecks

**Standings Calculation in GroupStandingsTable:**
- Problem: `frontend/src/components/GroupStandingsTable.jsx` recalculates standings from scratch every render
- Location: Lines 26-120 use useMemo but recalculates on every matches update
- Cause: forEach loop through matches rebuilds playerStats Map for every match
- Improvement path: Implement incremental calculation, cache previous results, or move calculation to backend as cached endpoint

**Seeding Score Aggregation:**
- Problem: `backend/src/services/seedingPlacementService.js` retrieves all tournament results for a player to calculate seeding score
- Cause: No pre-calculated seeding score stored in RankingEntry
- Impact: Multiple queries per player when generating large tournament brackets
- Improvement path: Add `seedingScore` field to RankingEntry; update it when points are awarded

**Category Rankings with Large Leaderboards:**
- Problem: `backend/src/services/rankingService.js` sorts by composite key (totalPoints, lastTournamentDate, tournamentCount, name)
- Cause: Sorting happens in-memory after database query
- Impact: 1000+ player categories require loading all entries into memory
- Improvement path: Use PostgreSQL expressions for sorting; add index on (categoryId, totalPoints DESC, lastTournamentDate DESC)

## Security Considerations

**Session Secret Fallback:**
- Risk: Using hardcoded fallback secret `'change-this-secret'` if SESSION_SECRET env var unset
- Files: `backend/src/index.js` line 109
- Current mitigation: Only used if env var missing (unlikely in production if properly configured)
- Recommendations:
  1. Throw error if SESSION_SECRET not set in production
  2. Use crypto.randomBytes() for development defaults
  3. Add startup validation to ensure secure secret exists

**CORS Configuration Overly Permissive in Development:**
- Risk: Line 65-66 allows any localhost:* origin without hostname validation
- Files: `backend/src/index.js`
- Current mitigation: Only applies in development
- Recommendation: If exposing development backend remotely, be explicit about allowed ports

**Error Messages Expose System Details:**
- Risk: Error responses may leak implementation details in non-production environments
- Files: `backend/src/middleware/errorHandler.js`
- Current mitigation: Stack traces only logged in development (lines check NODE_ENV)
- Recommendation: Ensure error handler sanitizes messages sent to client in all environments

**No Input Sanitization on User-Provided Text:**
- Risk: Player names, tournament descriptions, and other text fields stored directly
- Files: Multiple places accept `name`, `description`, `email` without sanitization
- Impact: Potential for XSS if rendered without escaping (unlikely with React but possible with future changes)
- Recommendation: Use input validation library (currently using Joi for structure, but no content sanitization)

## Missing Critical Features

**No Audit Trail for Point Recalculation:**
- Problem: Rankings can be recalculated via POST `/rankings/:categoryId/recalculate` (admin only)
- What's missing: No log of what changed, when, or why
- Blocks: Dispute resolution for ranking changes, compliance auditing
- Files: `backend/src/api/rankingController.js`, `backend/src/services/rankingService.js`

**No Transaction Rollback for Failed Bracket Generation:**
- Problem: `backend/src/api/seedingController.js` generates and returns bracket, but doesn't persist to database
- What's missing: If bracket generation succeeds but return fails, state is inconsistent
- Blocks: Reliable tournament bracket creation workflow
- Impact: Organizers may need to regenerate brackets multiple times

**No Player Eligibility Caching:**
- Problem: Eligibility validation queries database multiple times during registration
- What's missing: Cache of player eligibility per category
- Blocks: Bulk registration performance
- Impact: Slow registration flows for large tournaments

**No Rate Limiting on Seeding Generation:**
- Problem: POST `/api/v1/seeding/generate-bracket` computationally expensive but no rate limit
- What's missing: Protection against algorithmic complexity attacks
- Blocks: DDoS protection for seeding service
- Impact: Attacker could submit many large bracket requests

## Dependencies at Risk

**Session File Store Not Updated Recently:**
- Package: `session-file-store` version 1.5.0
- Risk: File-based session storage not suitable for production, no cluster support
- Impact: Cannot scale to multiple backend instances
- Migration plan: Switch to Redis (`connect-redis`) or PostgreSQL (`connect-pg-simple`) for production

**Using Both Joi and Zod:**
- Packages: `joi` 18.0.1 and `zod` 4.1.12 both used in codebase
- Risk: Duplicate validation logic, maintainability burden, inconsistent error formats
- Impact: Developers must understand two validation libraries
- Migration plan: Standardize on Zod (more modern) and gradually replace Joi imports

## Fragility Summary

### Critical Fragility Areas (High Priority)

1. **Cascade Delete Relationships** - Deleting tournaments silently removes all point history
2. **Test Database Unavailable** - Integration tests are placeholders, real scenarios untested
3. **Session Secret Fallback** - Production deployments at risk if env var not set

### Medium Fragility Areas

1. **Large Service Files** - Difficult to modify without breaking multiple concerns
2. **Point Calculation Audit Trail** - Recalculations not tracked; impossible to dispute
3. **Large React Components** - Form logic tightly coupled to page layout

### Low Priority But Notable

1. **File-based Sessions** - Works for single-instance deployment but limits scalability
2. **Tournament State Transitions** - Missing explicit state machine enforcement
3. **Missing Frontend Tests** - Can only be caught through manual testing

---

*Concerns audit: 2026-02-26*
