# Feature Specification: Tournament Seeding Placement

**Feature Branch**: `010-seeding-placement`
**Created**: 2026-01-13
**Status**: Draft
**Input**: User description: "Tournament seeding placement rules for bracket positioning based on player rankings with randomization for lower seeds"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Place Two Seeded Players (Priority: P1) 🎯 MVP

Tournament organizers need to place the top 2 ranked players in correct bracket positions for small tournaments (4-9 players) to ensure fair competition and prevent early matchups between top players.

**Why this priority**: This is the foundational seeding rule that all other seeding builds upon. Small tournaments with 4-9 players require only 2 seeds, making this the most common use case and the base for recursive seeding logic.

**Independent Test**: Can be fully tested by creating a 7-player tournament with 2 seeded players, verifying 1st seed is at position 1 and 2nd seed is at the bottom position. Delivers value by enabling fair small tournament brackets.

**Acceptance Scenarios**:

1. **Given** a 7-player tournament with 2 seeded players ranked 1 and 2, **When** bracket is generated, **Then** 1st ranked player is placed at position 1 (top) and 2nd ranked player is placed at position 8 (bottom)
2. **Given** a 5-player tournament with 2 seeded players, **When** bracket is generated, **Then** seeded players are placed at opposite ends of the bracket (positions 1 and 8)
3. **Given** a 9-player tournament with players ranked 1-9, **When** seeding is applied, **Then** only top 2 ranked players are seeded according to 2-seed rules

---

### User Story 2 - Place Four Seeded Players with Randomization (Priority: P2)

Tournament organizers need to place the top 4 ranked players in correct bracket positions for medium tournaments (10-19 players), with fair randomization for 3rd and 4th seeds to prevent predictable bracket patterns.

**Why this priority**: Extends seeding to medium-sized tournaments. Uses recursive rules (2-seed placement first, then adds 3rd/4th) and introduces randomization, which is critical for fairness.

**Independent Test**: Can be tested by creating a 15-player tournament with 4 seeded players, verifying 1st/2nd follow 2-seed rules, and 3rd/4th are randomly placed in bottom-of-first-half and top-of-second-half positions. Multiple test runs verify randomization produces both possible orderings.

**Acceptance Scenarios**:

1. **Given** a 15-player tournament with 4 seeded players ranked 1-4, **When** bracket is generated, **Then** 1st and 2nd seeds follow 2-seed placement rules (top and bottom)
2. **Given** 4 seeded players in a 15-player tournament, **When** bracket is generated, **Then** 3rd and 4th seeds are placed at bottom of first half and top of second half in random order
3. **Given** 100 tournaments with 4 seeds, **When** seeding is applied repeatedly, **Then** 3rd seed appears in first half approximately 50% of the time and in second half approximately 50% of the time
4. **Given** a 15-player tournament where 1st seed has bye, **When** 3rd and 4th seeds are placed, **Then** they are positioned at 3rd and 4th preliminary match positions respectively (accounting for bracket structure)

---

### User Story 3 - Place Eight Seeded Players with Quarter Segments (Priority: P3)

Tournament organizers need to place the top 8 ranked players in correct bracket positions for larger tournaments (20-39 players), ensuring each quarter of the bracket has appropriate seeding distribution.

**Why this priority**: Supports larger tournaments where bracket is divided into quarters. Builds on 4-seed logic recursively and requires more complex segment positioning.

**Independent Test**: Can be tested by creating a 25-player tournament with 8 seeded players, verifying 1st-4th follow 4-seed rules, and 5th-8th are randomly placed in free quarter positions. Delivers value for competitive tournaments requiring deeper seeding.

**Acceptance Scenarios**:

1. **Given** a 25-player tournament with 8 seeded players ranked 1-8, **When** bracket is generated, **Then** 1st through 4th seeds follow 4-seed placement rules
2. **Given** 8 seeded players in a tournament, **When** bracket is divided into quarters, **Then** each quarter has either top or bottom position filled by seeds 1-4
3. **Given** seeds 5-8 need placement, **When** examining each quarter, **Then** each free position (not occupied by seeds 1-4) receives one of seeds 5-8 in random order
4. **Given** 100 tournaments with 8 seeds, **When** seeding is applied, **Then** randomization of seeds 5-8 produces fair distribution across all quarters

---

### User Story 4 - Place Sixteen Seeded Players with Eight Segments (Priority: P4)

Tournament organizers need to place the top 16 ranked players in correct bracket positions for large tournaments (40-128 players), ensuring each eighth segment of the bracket has appropriate seeding distribution.

**Why this priority**: Supports largest tournament sizes with maximum seeding depth. This is less common but critical for major tournaments. Builds on all previous seeding recursively.

**Independent Test**: Can be tested by creating a 64-player tournament with 16 seeded players, verifying 1st-8th follow 8-seed rules, and 9th-16th are randomly placed in free segment positions. Ensures complete seeding system coverage.

**Acceptance Scenarios**:

1. **Given** a 64-player tournament with 16 seeded players ranked 1-16, **When** bracket is generated, **Then** 1st through 8th seeds follow 8-seed placement rules
2. **Given** 16 seeded players in a tournament, **When** bracket is divided into eight segments, **Then** each segment has either top or bottom position filled by seeds 1-8
3. **Given** seeds 9-16 need placement, **When** examining each segment, **Then** each free position receives one of seeds 9-16 in random order
4. **Given** a 100-player tournament with 16 seeds, **When** seeding is applied, **Then** all 16 seeds are correctly distributed according to recursive rules and randomization

---

### Edge Cases

- What happens when there are fewer registered players than seeded positions (e.g., only 6 players in a 4-seed tournament)?
- How does system handle ties in category rankings when determining seed order?
- What happens if a seeded player withdraws after bracket generation but before tournament starts?
- How is randomization seeded for reproducibility in automated tests?
- What happens when bracket structure has unexpected bye patterns due to irregular player counts?
- How does system handle doubles tournaments (pair seeding vs individual player seeding)?
- What happens if ranking data is unavailable or incomplete for a category?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST place 1st ranked player at position 1 (top) of the bracket
- **FR-002**: System MUST place 2nd ranked player at the bottom position of the bracket
- **FR-003**: System MUST apply 2-seed placement rules before any higher-seed placement (recursive foundation)
- **FR-004**: System MUST randomize the placement order of 3rd and 4th seeded players when 4 seeds are used
- **FR-005**: System MUST place 3rd and 4th seeds at bottom of first half and top of second half (in random order)
- **FR-006**: System MUST divide brackets into quarters when placing 8 seeded players
- **FR-007**: System MUST place seeds 5-8 in free quarter positions (not occupied by seeds 1-4) in random order
- **FR-008**: System MUST divide brackets into eight segments when placing 16 seeded players
- **FR-009**: System MUST place seeds 9-16 in free segment positions (not occupied by seeds 1-8) in random order
- **FR-010**: System MUST determine seed order based on category rankings from feature 008 (tournament-rankings)
- **FR-011**: System MUST use bracket structure from feature 009 (bracket-generation) to determine positions
- **FR-012**: System MUST provide seeding configuration based on tournament size: 4-9 players → 2 seeds, 10-19 → 4 seeds, 20-39 → 8 seeds, 40-128 → 16 seeds
- **FR-013**: System MUST handle both singles and doubles (player pairs) seeding using the same placement logic
- **FR-014**: System MUST provide API endpoint(s) for bracket generation with seeding applied
- **FR-015**: System MUST include comprehensive automated tests for all seeding variants (2, 4, 8, 16 seeds)
- **FR-016**: System MUST test all randomization variants for 4-seed, 8-seed, and 16-seed tournaments
- **FR-017**: System MUST use deterministic randomization (seeded PRNG) for testing reproducibility
- **FR-018**: System MUST return seeded bracket with player/pair IDs mapped to bracket positions
- **FR-019**: System MUST validate that seeded players are eligible for the tournament category
- **FR-020**: System MUST handle cases where fewer players are registered than required seeded positions (e.g., only 3 players in 4-seed tournament)

### Key Entities

- **Seeded Player/Pair**: Tournament participant with ranking position in category
  - Attributes: entity ID (player or pair), ranking position, category ID, seeding position in bracket
  - Relationships: Belongs to category ranking, assigned to bracket position

- **Bracket Position**: Location in tournament bracket structure
  - Attributes: position number (1-N where N is bracket size), segment/quarter, preliminary or bye
  - Relationships: Contains one seeded or unseeded player/pair, part of bracket structure

- **Seeding Configuration**: Rules for number and placement of seeded participants
  - Attributes: tournament size, number of seeds (2/4/8/16), placement rules, randomization seed
  - Relationships: Applied to tournament bracket, uses category rankings

- **Bracket Structure**: Template defining tournament bracket layout
  - Attributes: player count, bracket size (power of 2), preliminary matches, byes
  - Relationships: From feature 009, receives seeded player assignments

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System correctly places seeded players in 100% of bracket generations according to defined rules for all seed counts (2, 4, 8, 16)
- **SC-002**: Randomization for 3rd/4th seeds produces both possible orderings with approximately 50/50 distribution over 100 test runs
- **SC-003**: All seeding variants (2, 4, 8, 16 seeds) pass comprehensive automated test suites with 100% pass rate
- **SC-004**: Bracket generation with seeding applied completes in under 2 seconds for maximum tournament size (128 players with 16 seeds)
- **SC-005**: Seeded bracket generation API returns valid bracket structure with player/pair IDs correctly mapped to positions
- **SC-006**: Tournament organizers can generate seeded brackets for any valid tournament size (4-128 players) without errors
- **SC-007**: Seeding system handles edge cases (ties, withdrawals, insufficient players) with appropriate error messages or fallback behavior

## Assumptions *(optional)*

- Feature 008 (tournament-rankings) provides accurate and up-to-date category rankings for all players/pairs
- Feature 009 (bracket-generation) provides correct bracket structure templates for all player counts
- Seeding is determined and applied before tournament bracket is finalized and published
- Players/pairs cannot be re-seeded or moved after bracket generation is complete
- Category rankings are frozen at time of seeding (no real-time ranking updates during tournament)
- Randomization uses a pseudo-random number generator with deterministic seeding for testing
- Singles tournaments seed individual players; doubles tournaments seed player pairs
- Tournament size (player count) determines number of seeds automatically based on defined ranges
- Byes in bracket structure do not affect seeding position calculation (seeded players may receive byes)
- All seeded players/pairs are eligible for the tournament category (eligibility checked before seeding)

## Out of Scope *(optional)*

- UI for manual seeding position adjustments or overrides
- Real-time bracket updates during tournament play
- Unseeded player/pair placement logic (random draw or separate algorithm)
- Multi-stage tournament seeding (group stages, double elimination)
- Seeding based on criteria other than category rankings (manual seeding, wildcard entries)
- Bracket visualization or graphical display of seeded positions
- Player/pair substitution or replacement after seeding
- Tournament organizer tools for overriding automatic seeding rules
- Historical seeding data or seeding analytics
- Seeding for tournament formats other than single-elimination
- Integration with external tournament management systems
