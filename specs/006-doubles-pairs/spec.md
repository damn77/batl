# Feature Specification: Doubles Pair Management

**Feature Branch**: `006-doubles-pairs`
**Created**: 2025-11-18
**Status**: Draft
**Input**: User description: "Doubles tournament pair management system for player partnerships"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Player Registers Doubles Pair for Tournament (Priority: P1)

A player wants to participate in a doubles tournament with a partner. They register by selecting themselves and their partner, creating a doubles pair that can compete in the tournament category. The system validates that both players meet the category requirements before allowing registration.

**Why this priority**: This is the core functionality that enables doubles tournaments. Without the ability to register pairs, the feature has no value. This represents the minimum viable product.

**Independent Test**: Can be fully tested by creating two eligible players, navigating to doubles tournament registration, selecting both players, and verifying the pair is successfully registered. Delivers immediate value by enabling doubles tournament participation.

**Acceptance Scenarios**:

1. **Given** two players meet category criteria and no existing registration, **When** a player registers themselves and partner for doubles tournament, **Then** a new doubles pair is created and registered for the tournament
2. **Given** a doubles pair already exists for two players in the same category, **When** registering for another tournament in that category, **Then** the existing pair is reused (no duplicate pair created)
3. **Given** one player does not meet category age requirements, **When** attempting to register the pair, **Then** registration is rejected with clear error message indicating which player and which requirement failed
4. **Given** a player is already registered in the tournament with a different partner, **When** attempting to register with another partner, **Then** registration is rejected with message indicating existing registration

---

### User Story 2 - System Manages Pair Lifecycle and Rankings (Priority: P2)

The system automatically manages the creation and deletion of doubles pairs based on tournament activity. When a pair completes tournaments in a doubles category, they earn points that contribute to both the pair's ranking in that category and each individual player's ranking in that same category. Pairs that have no active registrations or tournament history in the current season are automatically removed to keep data clean.

**Why this priority**: Automated pair management prevents data clutter and ensures rankings accurately reflect current partnerships. This builds on P1 by adding the business logic that makes the system maintainable.

**Independent Test**: Can be tested by registering a pair, having them complete matches to earn points, verifying points appear in both pair and individual rankings within the same category, then withdrawing from all tournaments and confirming pair deletion. Delivers value by maintaining data quality without manual intervention.

**Acceptance Scenarios**:

1. **Given** a pair wins a match in a doubles category tournament, **When** points are awarded, **Then** the same points are added to the pair's ranking in that category AND to each individual player's ranking in that same category
2. **Given** a pair has no active registrations and no tournament participation in current season, **When** they withdraw from their last tournament, **Then** the pair is automatically deleted from the system
3. **Given** a pair has historical tournament participation, **When** checking their status, **Then** their match history and earned points are preserved even if they are not currently registered
4. **Given** multiple tournaments in current season, **When** a pair withdraws from one but remains in others, **Then** the pair is NOT deleted
5. **Given** a player competes in both a singles category and a doubles category, **When** viewing rankings, **Then** the player has separate individual rankings for each category (singles points only in singles category, doubles points only in doubles category)

---

### User Story 3 - Tournament Seeding Based on Combined Player Strength (Priority: P3)

When organizing a doubles tournament, the system calculates seeding positions by adding together both players' individual ranking points from the same category. This ensures that pairs formed by two highly-ranked players are seeded appropriately even if they have never played together before. However, the pair's tournament ranking (for season awards) only considers points earned by that specific pair in that category.

**Why this priority**: Fair seeding improves tournament quality and player experience. This builds on P2 by adding the competitive fairness layer that makes tournaments enjoyable.

**Independent Test**: Can be tested by creating players with known ranking points in a category, forming pairs, and verifying seeding order matches the sum of individual points from that category. Also verify that new high-ranked pairs start from bottom in pair rankings. Delivers value by ensuring competitive balance.

**Acceptance Scenarios**:

1. **Given** Player A has 1000 points in Men's Doubles Open category and Player B has 800 points in the same category, **When** calculating tournament seeding for that category, **Then** their pair receives seeding score of 1800
2. **Given** three pairs with combined scores of 1500, 1800, and 1200 in the same category, **When** generating tournament bracket, **Then** pairs are seeded in order: 1800, 1500, 1200
3. **Given** two highly-ranked players form a new pair in a category, **When** viewing category pair rankings, **Then** the new pair starts with 0 points in pair ranking (despite high individual player rankings in that category)
4. **Given** a pair earns 100 points in a doubles category tournament, **When** updating rankings, **Then** the pair's ranking increases by 100 AND each player's individual ranking in that category increases by 100

---

### User Story 4 - Organizer Overrides Eligibility Requirements (Priority: P4)

Tournament organizers and admins can register pairs that don't meet standard category criteria. This supports special circumstances like injury replacements, guest players, or mixed-category exceptions where players of comparable skill are allowed to compete despite not meeting strict category requirements.

**Why this priority**: This provides flexibility for real-world tournament management scenarios. It's less critical than core functionality but important for handling edge cases.

**Independent Test**: Can be tested by attempting to register an ineligible pair as a player (should fail), then as an organizer (should succeed with warning). Delivers value by enabling tournament directors to handle exceptional circumstances.

**Acceptance Scenarios**:

1. **Given** a player does not meet age requirements, **When** an organizer registers them as part of a pair, **Then** registration succeeds with warning indicator visible to organizer
2. **Given** ineligible pair is registered by organizer, **When** viewing tournament registrations, **Then** the pair is clearly marked as having eligibility override
3. **Given** normal player tries to register ineligible pair, **When** submitting registration, **Then** request is rejected (override privilege only for organizers/admins)

---

### Edge Cases

- What happens when a pair is deleted but has historical tournament data? Historical match results and point awards are preserved for record-keeping; only the active pair entity is removed. Past tournaments show the pair as it existed at that time.
- How does system handle concurrent registration attempts by both partners? First registration succeeds and creates the pair; second registration detects existing pair and joins the same tournament registration (no duplicate).
- What happens if player account is deleted while part of active pair? Pair registration is cancelled, partner is notified, and pair is marked for deletion per standard lifecycle rules.
- How are ties resolved in seeding when pairs have identical combined scores? Ties are broken first by registration timestamp (earlier = higher seed), then alphabetically by pair name.
- What happens when category criteria change after pair is registered? Existing registrations remain valid (criteria are evaluated at registration time); new criteria apply only to future registrations.
- Can a player be in multiple pairs in the same category? Yes, a player can be part of multiple pairs in the same doubles category (playing with different partners in different tournaments), but only one pair per tournament. Each pair has its own ranking.
- How are individual player rankings calculated in doubles categories? Each player has one individual ranking per category that includes all points they've earned in that category, regardless of which partner(s) they played with. Pair rankings are separate and specific to each pair.

## Requirements *(mandatory)*

### Functional Requirements

**Pair Creation and Registration:**

- **FR-001**: System MUST allow players to register for doubles tournaments by specifying two players (themselves and a partner)
- **FR-002**: System MUST create a new doubles pair when two players register together for a doubles tournament in a category where no pair exists for those players
- **FR-003**: System MUST reuse existing doubles pair when the same two players register for another tournament in the same category
- **FR-004**: Players MUST be able to register themselves with a partner (registering player must be one of the two pair members)
- **FR-005**: Organizers and admins MUST be able to register any two players as a doubles pair, regardless of whether they are one of the members
- **FR-006**: System MUST allow a player to be part of multiple different pairs within the same category (with different partners)
- **FR-007**: System MUST enforce that each pair can only register once per tournament

**Eligibility Validation:**

- **FR-008**: System MUST validate that both players in a pair meet all category criteria (age, gender, type) before allowing registration by players
- **FR-009**: System MUST prevent registration if either player is already registered in the same tournament as part of a different pair
- **FR-010**: Organizers and admins MUST be able to override eligibility requirements and register pairs that don't meet category criteria
- **FR-011**: System MUST clearly mark pair registrations that were created with eligibility overrides

**Pair Lifecycle Management:**

- **FR-012**: System MUST automatically delete pairs when they are unregistered from their last tournament AND have no tournament participation in the current season
- **FR-013**: System MUST preserve historical tournament data (matches, results, points) even after a pair is deleted
- **FR-014**: System MUST define current season as the calendar year (January 1 - December 31)
- **FR-015**: System MUST prevent deletion of pairs that have active tournament registrations or current season participation

**Scoring and Points:**

- **FR-016**: System MUST award points earned by a pair in a category to both the pair's ranking in that category AND to each individual player's ranking in that same category
- **FR-017**: System MUST maintain separate pair rankings for each unique pair within a category
- **FR-018**: System MUST maintain one individual player ranking per player per category that aggregates all points earned in that category (across all pairs the player competed with)
- **FR-019**: System MUST never mix points from singles and doubles categories (categories are type-specific: SINGLES or DOUBLES)

**Seeding:**

- **FR-020**: System MUST calculate tournament seeding score for a pair by adding both players' individual ranking points from the same category
- **FR-021**: System MUST use only the pair's own earned points for pair ranking purposes (not the sum of individual player points)
- **FR-022**: System MUST break seeding ties using registration timestamp (earlier timestamp = higher seed)
- **FR-023**: System MUST break remaining ties alphabetically by pair name

**Display and UI:**

- **FR-024**: System MUST display both pair ranking and individual player rankings on tournament pages for doubles categories
- **FR-025**: System MUST show pair information in player lists, match brackets, and standings for doubles tournaments
- **FR-026**: System MUST display both players' names when showing a doubles pair
- **FR-027**: System MUST never mix singles players and doubles pairs in the same tournament instance (tournament category determines type)
- **FR-028**: System MUST indicate when a pair registration was created with an eligibility override

### Key Entities

- **DoublesPair**: Represents a partnership of exactly two players for doubles tournament competition within a specific category. Contains references to both players, creation timestamp, and category association. A pair is unique per category and player combination - the same two players competing in the same doubles category reuse the same pair entity across multiple tournaments. The same two players in a different category would be a different pair entity.

- **PairRegistration**: Links a doubles pair to a specific doubles tournament. Functions identically to individual player registration but for pairs. Includes registration status (registered, waitlisted, withdrawn), registration timestamp, and eligibility override flag.

- **PairRanking**: Tracks a doubles pair's competitive standing within a category, including total points earned by that specific pair in that category, wins, losses, and current rank. Each unique pair (combination of two players) has its own ranking. This is separate from individual player rankings.

- **CategoryRanking (Player)**: Extended to support doubles categories. Each player has one individual ranking per category (whether singles or doubles). In doubles categories, this ranking aggregates all points the player earned in that category regardless of which partner(s) they played with. A player can appear in multiple pair rankings (as part of different pairs) but only once in the individual ranking per category.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can complete doubles pair registration in under 2 minutes from tournament selection to confirmation
- **SC-002**: System validates pair eligibility with 100% accuracy (no invalid registrations accepted through player interface)
- **SC-003**: Seeding calculations reflect combined player strength correctly in 100% of cases within the same category
- **SC-004**: Pair lifecycle management executes automatically with zero manual intervention required
- **SC-005**: Rankings display correctly for both pairs and individual players with updates reflected within 5 seconds of match completion
- **SC-006**: 90% of players successfully complete pair registration on first attempt without errors
- **SC-007**: Tournament pages load and display pair information without performance degradation compared to singles tournaments (within 10% load time)
- **SC-008**: Historical tournament data remains accessible after pair deletion for record-keeping and statistical purposes
- **SC-009**: Point attribution is accurate 100% of the time (correct category, correct pair ranking, correct individual player rankings)
