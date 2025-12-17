# Feature Specification: Tournament Rankings and Points System

**Feature Branch**: `008-tournament-rankings`
**Created**: 2025-12-13
**Status**: Draft
**Input**: User description: "notes/007-rankings.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Real-Time Category Rankings (Priority: P1)

Players and organizers can view current rankings for any category, showing player/pair positions based on their accumulated tournament points for the current calendar year.

**Why this priority**: Core value proposition - rankings provide competitive motivation and tournament seeding basis. Without rankings visibility, the entire points system has no user-facing value.

**Independent Test**: Can be fully tested by completing a tournament, awarding points, and verifying rankings update correctly on the rankings page. Delivers immediate value by showing competitive standings.

**Acceptance Scenarios**:

1. **Given** a player has participated in 3 tournaments in a category this year, **When** they view the category rankings page, **Then** they see their current rank, total points, and points breakdown from each tournament
2. **Given** multiple players in a category, **When** rankings are displayed, **Then** players are sorted by total points (highest first), with ties broken by most recent tournament performance
3. **Given** a new calendar year has started, **When** viewing rankings, **Then** only the current year's points are shown, and previous year's rankings are archived

---

### User Story 2 - Earn Points Through Tournament Participation (Priority: P1)

Players automatically earn points based on their tournament performance, with points calculated using either placement-based or round-based formulas depending on tournament configuration.

**Why this priority**: Core mechanism for rankings - without automatic point calculation, the system cannot function. This is the foundation of the ranking system.

**Independent Test**: Can be tested by completing a tournament with known participants and placements, then verifying each participant receives correct points according to the configured calculation method.

**Acceptance Scenarios**:

1. **Given** a placement-based tournament with 10 pairs and multiplicative value 2, **When** tournament completes, **Then** 1st place receives 20 points, 2nd receives 18 points, continuing down to last place with 2 points
2. **Given** a round-based tournament with 16 participants, **When** a player loses in the quarterfinal, **Then** they receive 10 points (per the 9-16 participants table)
3. **Given** a player participates but loses all matches (0 wins), **When** tournament completes, **Then** they receive 0 points
4. **Given** a tournament configured with double points multiplier, **When** tournament completes, **Then** all awarded points are doubled

---

### User Story 3 - Seeding Score Calculation for Tournament Registration (Priority: P2)

When registering for a tournament, players receive a seeding score calculated from their best N tournament results (default 7) in that category during the current year.

**Why this priority**: Enables fair tournament seeding based on performance, but depends on having ranking data first. Secondary to basic ranking functionality.

**Independent Test**: Can be tested by registering a player who has participated in 10 tournaments for a new tournament, verifying their seeding score uses only their top 7 results.

**Acceptance Scenarios**:

1. **Given** a player with 10 tournament results in a category, **When** calculating seeding score, **Then** only the 7 highest-scoring tournaments are included
2. **Given** a player with only 3 tournament results, **When** calculating seeding score, **Then** all 3 tournament results are included
3. **Given** a category with custom counted tournaments limit of 5, **When** calculating seeding score, **Then** only the top 5 results are used

---

### User Story 4 - Multiple Rankings Per Category (Priority: P2)

For mixed doubles categories, separate rankings are maintained for pairs, individual men, and individual women, allowing better seeding when pair composition changes.

**Why this priority**: Improves fairness in doubles play but only relevant for mixed doubles categories. Not blocking for singles or same-gender doubles.

**Independent Test**: Can be tested by completing a mixed doubles tournament and verifying three separate rankings update (pair ranking, men's individual ranking, women's individual ranking).

**Acceptance Scenarios**:

1. **Given** a mixed doubles tournament completes, **When** points are awarded, **Then** the pair ranking, men's individual ranking, and women's individual ranking all update
2. **Given** a player changes partners, **When** registering for a new tournament, **Then** their individual seeding score (not pair score) is used to calculate the new pair's seed
3. **Given** viewing men's individual ranking in mixed doubles category, **When** displaying rankings, **Then** only male players from mixed pairs are shown with their accumulated points

---

### User Story 5 - Admin Point Table Configuration (Priority: P3)

Administrators can view and edit the point tables that define how many points are awarded for each round based on tournament participant count.

**Why this priority**: Allows system flexibility but rarely needed - default tables work for most scenarios. Can be added later without blocking core functionality.

**Independent Test**: Can be tested by admin editing the quarterfinal points value for 9-16 participant tournaments, then completing such a tournament and verifying the new point value is used.

**Acceptance Scenarios**:

1. **Given** an admin viewing point tables, **When** they access the configuration, **Then** they see all participant count ranges (2-4, 5-8, 9-16, 17-32) with point values for each round
2. **Given** an admin edits a point value, **When** they save changes, **Then** future tournaments use the new values while past tournament points remain unchanged
3. **Given** a tournament is created, **When** the organizer views point preview, **Then** they see which point table will be used based on current registration count

---

### Edge Cases

- What happens when two players have identical total points and identical recent tournament performance? System uses alphabetical order by player name as final tiebreaker.
- How does the system handle a tournament that starts in one year and ends in the next? Points are awarded based on the tournament's end date year.
- What happens if an admin changes point tables mid-year? Only future tournaments are affected; historical points remain unchanged to preserve fairness.
- What if a player has more than N tournaments but some are tied for Nth place? Only earliest tournament based on end date is considered. (e.g., if tournaments 6, 7, and 8 all have same points, and tournament 7 had earliest and date then tournaments 6 and 8 are excluded).
- How are rankings calculated when a category has no completed tournaments yet? Rankings show all registered players with 0 points.
- What happens to rankings if a tournament result is later invalidated? Points are recalculated retroactively, and all affected rankings update.

## Requirements *(mandatory)*

### Functional Requirements

#### Core Ranking System

- **FR-001**: System MUST maintain separate rankings for each category, with each ranking belonging to exactly one category
- **FR-002**: System MUST reset rankings at the start of each calendar year, archiving the previous year's data
- **FR-003**: System MUST allow a single category to have multiple rankings (e.g., Mixed Doubles category has pair ranking, men ranking, and women ranking)
- **FR-004**: System MUST display rankings publicly without requiring authentication
- **FR-005**: System MUST sort rankings by total points descending, with ties broken by most recent tournament performance, then by least amount of tournaments played in that year, then alphabetically by player/pair name

#### Point Calculation - Placement Method

- **FR-006**: System MUST support placement-based point calculation using formula: `Points = (NumberOfParticipants - Placement + 1) × MultiplicativeValue`
- **FR-007**: System MUST allow organizers to configure the multiplicative value for each tournament (default: 2)
- **FR-008**: System MUST award points to all participants who finish the tournament, from 1st place to last place

#### Point Calculation - Round Method

- **FR-009**: System MUST support round-based point calculation where participants receive points based on the last round they won
- **FR-010**: System MUST only award points to participants who win at least one match during the tournament
- **FR-011**: System MUST select the appropriate point table based on the number of tournament participants (2-4, 5-8, 9-16, 17-32)
- **FR-012**: System MUST support separate point values for main bracket rounds and consolation bracket rounds

#### Point Table Management

- **FR-013**: System MUST store predefined point tables for four participant count ranges: 2-4, 5-8, 9-16, 17-32
- **FR-014**: System MUST allow administrators to view and edit point table values
- **FR-015**: System MUST preserve historical tournament point awards even when point tables are modified
- **FR-016**: System MUST apply point table changes only to future tournaments

#### Tournament Point Configuration

- **FR-017**: System MUST allow organizers to select point calculation method (PLACEMENT or FINAL_ROUND) when creating a tournament
- **FR-018**: System MUST allow organizers to enable double points multiplier for special tournaments (e.g., Masters) (only for FINAL_ROUND type)
- **FR-019**: System MUST prevent changes to point calculation method or multiplier after a tournament has started

#### Seeding Score Calculation

- **FR-020**: System MUST calculate seeding scores based on the sum of a player's/pair's best N tournament results in the category
- **FR-021**: System MUST use a default value of 7 for the number of counted tournaments unless configured otherwise per category (all rankings in category use same value)
- **FR-022**: System MUST allow configuring the number of counted tournaments per category (all rankings in category use same value)
- **FR-023**: System MUST recalculate seeding scores whenever new tournament results are added (finishing the tournament - don't update on partial results) or rankings configuration changes

#### Multiple Rankings Per Category

- **FR-024-1**: System MUST automatically create pair ranking, men's individual ranking, and women's individual ranking for Mixed Doubles categories
- **FR-024-2**: System MUST automatically create pair ranking, men's individual ranking for Men Doubles categories
- **FR-024-3**: System MUST automatically create pair ranking, women's individual ranking for Women Doubles categories
- **FR-025**: System MUST award points to both the pair and individual players when a Doubles tournament completes
- **FR-026**: System MUST use individual player seeding scores (not pair scores) when calculating seeding for new pair combinations

### Key Entities

- **Ranking**: Represents a competitive leaderboard for a category in a specific year. Attributes: category, year, type (PAIR/MEN/WOMEN/SINGLES), counted_tournaments_limit. Relationships: belongs to one Category, contains multiple RankingEntries.

- **RankingEntry**: Represents a single player/pair's position in a ranking. Attributes: rank, total_points, tournament_count, last_tournament_date. Relationships: belongs to one Ranking, references one Player or one Pair.

- **TournamentResult**: Represents a participant's performance in a completed tournament. Attributes: placement, final_round_reached, points_awarded, award_date. Relationships: belongs to one Tournament, references one Player or one Pair, contributes to one or more Rankings.

- **PointTable**: Stores point values for different rounds based on participant count range. Attributes: participant_range (e.g., "9-16"), round_name, points, is_consolation. Relationships: used by Tournaments for point calculation.

- **TournamentPointConfig**: Configuration for how a specific tournament awards points. Attributes: calculation_method (PLACEMENT/FINAL_ROUND), multiplicative_value, double_points_enabled. Relationships: belongs to one Tournament.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can view their current ranking position and points in any category within 5 seconds of page load
- **SC-002**: System automatically calculates and updates all rankings within 1 minute of tournament completion
- **SC-003**: Seeding scores accurately reflect top N tournament performances, with 100% calculation accuracy
- **SC-004**: 95% of tournament organizers successfully configure point settings without support assistance
- **SC-005**: Rankings page handles displaying 1000+ players per category without performance degradation
- **SC-006**: Point calculation produces mathematically correct results for both placement and round-based methods with 100% accuracy
- **SC-007**: Historical ranking data remains accessible for at least 5 previous years

## Assumptions

1. **Calendar year basis**: Rankings operate on calendar year (January 1 - December 31), not rolling 12-month periods
2. **Public visibility**: All rankings are publicly viewable to encourage transparency and competitive engagement
3. **No manual overrides**: Point calculations are fully automated to ensure fairness; organizers cannot manually adjust awarded points
4. **Tiebreaker rules**: Standard tiebreaker hierarchy is: total points → recent tournament performance → alphabetical order
5. **Point table ranges**: Four participant ranges (2-4, 5-8, 9-16, 17-32) cover all realistic tournament sizes
6. **Default counted tournaments**: The value of 7 best tournaments is based on typical annual tournament participation rates
7. **Archived data**: Previous year's rankings remain viewable but are clearly marked as archived/historical

## Dependencies

- **002-category-system**: Rankings require existing category definitions and category-specific player registrations
- **003-tournament-registration**: Tournament completion triggers point calculation and ranking updates
- **006-doubles-pairs**: Multiple rankings per category (pair/men/women) depend on pair entity definitions
- **004-tournament-rules**: Tournament format (bracket structure) determines which rounds are used for round-based point calculation

## Out of Scope

- **Cross-year ranking aggregation**: Career statistics or multi-year cumulative rankings are not included in this feature
- **Ranking predictions**: "What if" scenarios showing how rankings would change based on hypothetical tournament results
- **Player performance analytics**: Detailed statistics beyond total points and tournament count (e.g., win/loss ratios, head-to-head records)
- **Ranking export/sharing**: Downloadable ranking reports or social media sharing features
- **Notifications**: Automated alerts when a player's ranking position changes
- **Regional/club sub-rankings**: Rankings are global within a category, not segmented by geography or club affiliation
