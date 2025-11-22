# Phase 0: Research & Technical Decisions

**Feature**: Doubles Pair Management
**Date**: 2025-11-18

## Overview

This document outlines technical research and decisions for implementing doubles pair management in the BATL tournament system. The feature extends the existing singles tournament infrastructure to support player partnerships in doubles categories.

## Key Technical Decisions

### 1. Database Schema Design for Pairs

**Decision**: Create `DoublesPair` entity with composite unique constraint on `(player1Id, player2Id, categoryId)`

**Rationale**:
- Ensures exactly one pair entity exists for any two players in a given category
- Prevents duplicate pairs from being created on repeated registrations
- Simplifies pair lookup and reuse logic (FR-003)
- Supports requirement that same players in different categories are different pairs

**Alternatives Considered**:
- **Option A**: Single `playerId` array field
  - Rejected: Difficult to enforce two-player constraint at database level
  - Rejected: Complex querying for "all pairs containing player X"
  - Rejected: No natural way to define unique constraint
- **Option B**: Junction table pattern (PairMember linking Pair → Player)
  - Rejected: Overkill for fixed two-player requirement
  - Rejected: Adds unnecessary complexity (extra table, joins)
  - Rejected: Harder to enforce "exactly two players" rule
- **Option C**: Store player IDs in sorted order with single unique constraint
  - Rejected: Requires application-level sorting logic before every query
  - Rejected: Error-prone (easy to forget sorting step)

**Implementation Notes**:
- Use `player1Id` and `player2Id` fields with check constraint `player1Id < player2Id`
- Application layer sorts player IDs before insertion
- Composite unique index: `@@unique([player1Id, player2Id, categoryId])`
- Include `deletedAt` timestamp for soft deletes (preserve historical data per FR-011)

### 2. Pair Ranking vs Individual Player Ranking

**Decision**: Maintain separate `PairRanking` table distinct from `CategoryRanking` (player) table

**Rationale**:
- Clear separation between pair competitive standing and individual player standing (FR-017, FR-018)
- Supports requirement that new pairs start with 0 points even if players are highly ranked (FR-021)
- Allows different ranking logic: pair rankings use only pair's own points, individual rankings aggregate across all partners
- Prevents complex conditional logic in single ranking table

**Alternatives Considered**:
- **Option A**: Add `pairId` nullable field to existing `CategoryRanking` table
  - Rejected: Violates single responsibility principle
  - Rejected: Creates confusion (is this a player ranking or pair ranking?)
  - Rejected: Complex queries with multiple null checks
- **Option B**: Polymorphic ranking with `rankableType` and `rankableId` fields
  - Rejected: Loses type safety at database level
  - Rejected: Requires runtime type checking in application
  - Rejected: Makes queries more complex and slower

**Implementation Notes**:
- `PairRanking`: `(pairId, categoryId)` unique constraint
- `CategoryRanking`: unchanged, represents individual player ranking
- Both tables have `points`, `wins`, `losses`, `rank` fields for consistency
- Points distribution logic: award same points to both tables when pair wins (FR-016)

### 3. Pair Lifecycle Management

**Decision**: Use soft delete with `deletedAt` timestamp + automated cleanup job

**Rationale**:
- Preserves historical tournament data after pair deletion (FR-011, FR-013)
- Supports audit trail and reporting requirements
- Allows "un-delete" if pair registers again in same season
- Clean implementation of "current season" logic (FR-012)

**Alternatives Considered**:
- **Option A**: Hard delete with historical snapshot table
  - Rejected: Requires duplicate storage of pair data
  - Rejected: Complex snapshot logic on every deletion
  - Rejected: Historical data becomes stale (no updates)
- **Option B**: Never delete pairs
  - Rejected: Database grows indefinitely
  - Rejected: Active pair queries become slower over time
  - Rejected: Unclear which pairs are actually "active"

**Implementation Notes**:
- Add `deletedAt` nullable timestamp to `DoublesPair`
- Cleanup trigger: On tournament registration withdrawal, check if pair has zero active registrations AND zero current season participation
- Current season: `WHERE YEAR(matchDate) = YEAR(CURRENT_DATE)`
- Active pairs query: `WHERE deletedAt IS NULL`
- Historical queries include soft-deleted pairs

### 4. Tournament Seeding Score Storage and Updates

**Decision**: Store `seedingScore` in `DoublesPair` table, recalculate after every tournament in the category closes

**Rationale**:
- Efficiency: Seeding score is pre-calculated and immediately available for tournament generation and display
- Consistency: All pairs in a category have current seeding scores based on latest player rankings
- Performance: No need to calculate seeding on-the-fly for bracket generation or pair comparison
- Aligns with existing pattern: Rankings are recalculated when tournaments close, seeding follows same pattern

**Alternatives Considered**:
- **Option A**: Calculate seeding score on-demand each time needed
  - Rejected: Inefficient - requires joining through players to rankings every time brackets are viewed or generated
  - Rejected: Performance impact scales poorly (N pairs × 2 players × ranking lookup)
  - Rejected: Inconsistent results if player rankings change during tournament setup
- **Option B**: Cache in `PairRegistration` only
  - Rejected: Doesn't help with general pair comparison (e.g., showing all pairs ordered by seeding)
  - Rejected: Still requires calculation at registration time
  - Rejected: Seeding score in registration could become stale if player rankings change

**Implementation Notes**:
- Add `seedingScore` field to `DoublesPair` table (indexed for sorting)
- Recalculation trigger: When any tournament in a category closes (status changes to COMPLETED)
- Recalculation logic:
  ```
  FOR EACH pair IN category:
    seedingScore = (player1.categoryRanking.points + player2.categoryRanking.points)
  UPDATE DoublesPair SET seedingScore = calculated_value
  ```
- Tournament bracket generation uses `ORDER BY seedingScore DESC` directly from DoublesPair
- Tie-breaking at registration time: `ORDER BY seedingScore DESC, registrationTimestamp ASC, pairName ASC`
- Manual recalculation option available for organizers (e.g., if rankings are manually adjusted)

### 5. API Design Pattern

**Decision**: RESTful API at `/api/v1/pairs` following existing project conventions

**Rationale**:
- Consistency with existing endpoints (`/categories`, `/tournaments`, `/registrations`)
- Standard HTTP methods map naturally to CRUD operations
- Existing auth middleware, error handling, validation patterns reusable

**Alternatives Considered**:
- **Option A**: Embed pair endpoints under `/tournaments/:id/pairs`
  - Rejected: Pairs exist independently of specific tournaments (reused across multiple tournaments)
  - Rejected: Makes pair lifecycle management awkward (pairs not tied to single tournament)
- **Option B**: GraphQL endpoint
  - Rejected: Rest of application uses REST
  - Rejected: Adds complexity (GraphQL server, schema, resolvers)
  - Rejected: Not requested in requirements

**Implementation Notes**:
- Primary endpoints:
  - `POST /api/v1/pairs` - Create/get-or-create pair
  - `GET /api/v1/pairs/:id` - Get pair details
  - `GET /api/v1/pairs` - List pairs (filterable by categoryId, playerId)
  - `DELETE /api/v1/pairs/:id` - Soft delete (organizer/admin only)
  - `POST /api/v1/pairs/recalculate-seeding/:categoryId` - Recalculate seeding scores (organizer/admin only)
- Registration via existing `/api/v1/registrations` endpoint (modified to accept pairId instead of playerId for doubles tournaments)
- Rankings via `/api/v1/rankings/pairs/:categoryId` (new endpoint, parallel to existing player rankings)

### 6. Frontend Component Strategy

**Decision**: Create reusable `PairSelector` component for player selection, modify existing registration flow to detect doubles categories

**Rationale**:
- Reusability: same component used in player registration, organizer registration, and any future pair-related forms
- Consistency: follows React Bootstrap patterns used throughout application
- Conditional rendering: registration page detects category type and shows appropriate UI (single player vs pair)

**Alternatives Considered**:
- **Option A**: Separate DoublesRegistrationPage completely independent from singles
  - Rejected: Duplicates majority of registration logic
  - Rejected: Maintenance burden (changes to registration flow need updates in two places)
  - Rejected: User confusion (different UI for similar operations)
- **Option B**: Single form with hidden pair fields
  - Rejected: Poor UX (confusing for singles tournaments to show disabled pair fields)
  - Rejected: Complex conditional validation logic

**Implementation Notes**:
- `PairSelector` component:
  - Props: `categoryId`, `currentUserId`, `onPairSelect`, `disabled`
  - Features: Player 1 and Player 2 dropdowns, eligibility validation, "create new pair" vs "use existing pair" logic
  - Validation: prevents selecting same player twice, checks both players meet category criteria
- Modify `TournamentRegistrationPage`:
  - Add conditional rendering: `{category.type === 'DOUBLES' ? <PairSelector /> : <PlayerSelector />}`
  - Handle pair selection vs player selection in submission logic
  - Show appropriate rankings (pair + both individual players for doubles)

### 7. Eligibility Override Implementation

**Decision**: Add `eligibilityOverride` boolean flag to `PairRegistration` with required `overrideReason` text field

**Rationale**:
- Clear audit trail of which registrations bypassed normal validation (FR-011)
- Supports organizer accountability (reason must be provided)
- Preserves validation history for reporting

**Alternatives Considered**:
- **Option A**: Store override as pair-level flag
  - Rejected: Pair may be eligible for some tournaments but not others
  - Rejected: Override is registration-specific, not pair-specific
- **Option B**: Skip database flag, only check user role at registration time
  - Rejected: No audit trail
  - Rejected: Can't identify overridden registrations later
  - Rejected: Doesn't support display requirement (FR-028)

**Implementation Notes**:
- Fields: `eligibilityOverride BOOLEAN DEFAULT FALSE`, `overrideReason TEXT`
- Validation logic:
  - Players: Run full eligibility checks, reject if failed
  - Organizers/Admins: Run eligibility checks, show warnings, allow override with required reason
- Display: Badge on registration indicating "Eligibility Override" with tooltip showing reason

## Performance Considerations

### Database Indexes

Required indexes for optimal query performance:

```sql
-- Pair lookups by players
CREATE INDEX idx_pairs_player1 ON DoublesPair(player1Id, deletedAt);
CREATE INDEX idx_pairs_player2 ON DoublesPair(player2Id, deletedAt);
CREATE INDEX idx_pairs_category ON DoublesPair(categoryId, deletedAt);

-- Seeding score for tournament bracket generation
CREATE INDEX idx_pairs_seeding ON DoublesPair(categoryId, seedingScore DESC, deletedAt);

-- Pair rankings
CREATE UNIQUE INDEX idx_pair_ranking ON PairRanking(pairId, categoryId);
CREATE INDEX idx_pair_ranking_category ON PairRanking(categoryId, rank);

-- Pair registrations
CREATE INDEX idx_pair_reg_tournament ON PairRegistration(tournamentId, status);
CREATE INDEX idx_pair_reg_timestamp ON PairRegistration(tournamentId, registrationTimestamp);
```

### Query Optimization

- **Seeding score**: Pre-calculated and stored in DoublesPair, recalculated after each category tournament closes
- **Pair lookup**: Use composite unique constraint for instant pair-exists checks
- **Active pairs filter**: `deletedAt IS NULL` indexed for fast filtering
- **Current season check**: Index on match timestamps for historical participation queries
- **Bracket generation**: Direct ORDER BY on indexed seedingScore field

### Estimated Performance

- Pair registration: <100ms (includes eligibility check, pair creation/lookup, tournament registration)
- Bracket generation for 32 pairs: <50ms (indexed seeding score ordering, no calculation)
- Seeding score recalculation for category: <500ms for 100 pairs (bulk update after tournament closes)
- Pair ranking updates: <200ms per match (updates 2 tables: PairRanking + 2× CategoryRanking)

## Security Considerations

### Authorization Rules

- **Pair creation**: Any authenticated player (for themselves + partner), organizers/admins (any two players)
- **Pair deletion**: System only (automatic lifecycle), organizers/admins (manual override)
- **Registration with override**: Organizers/admins only
- **Viewing pairs**: Public (same as viewing players)
- **Viewing rankings**: Public
- **Recalculate seeding**: Organizers/admins only

### Validation Rules

- **Player selection**: Registering player must be one of the two pair members (unless organizer/admin)
- **Eligibility**: Both players must meet all category criteria (age, gender) unless overridden
- **Duplicate prevention**: Cannot register same pair twice in same tournament
- **Partner conflict**: Cannot register player if already registered with different partner in same tournament

## Migration Strategy

### Data Migration

No existing data migration required - this is a new feature. Existing singles tournaments remain unchanged.

### Backwards Compatibility

- Existing `TournamentRegistration` table retains `playerId` field for singles tournaments
- New `PairRegistration` table handles doubles tournaments
- Category type field (`SINGLES` vs `DOUBLES`) determines which registration path to use
- Frontend conditionally renders player vs pair selection based on category type
- No changes to existing singles tournament flows

### Rollout Plan

1. Phase 1 (P1): Deploy pair registration for new doubles tournaments
   - Validate: Players can register pairs, basic lifecycle works
2. Phase 2 (P2): Enable ranking calculations
   - Validate: Points correctly awarded to pairs and individual players
3. Phase 3 (P3): Enable seeding calculations and recalculation on tournament close
   - Validate: Brackets correctly seeded by combined player strength, seeding scores update after tournaments
4. Phase 4 (P4): Enable organizer overrides
   - Validate: Organizers can register ineligible pairs with justification

## Testing Strategy

*(Tests are OPTIONAL per constitution - not explicitly requested in spec)*

If tests are implemented:
- **Unit tests**: Seeding calculation logic, eligibility validation, pair lifecycle rules, seeding score recalculation
- **Integration tests**: Pair registration flow, ranking updates, tournament bracket generation, seeding score updates on tournament close
- **E2E tests**: Complete user journey from pair creation through tournament registration to rankings

## Open Questions

None - all technical decisions resolved during research phase.

## References

- Feature specification: [spec.md](spec.md)
- Implementation plan: [plan.md](plan.md)
- Existing category system: specs/002-category-system/
- Existing tournament registration: specs/003-tournament-registration/
