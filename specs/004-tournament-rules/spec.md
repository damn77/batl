# Feature Specification: Tournament Rules and Formats

**Feature Branch**: `004-tournament-rules`
**Created**: 2025-01-07
**Status**: Draft
**Input**: User description: "notes\tournament-rules.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define Tournament Format and Basic Rules (Priority: P1)

Organizers need to select a tournament format (knockout, group, swiss system, or combined) and define basic match scoring rules when creating or configuring a tournament.

**Why this priority**: This is the foundation of tournament execution. Without format and scoring rules, matches cannot be played. This delivers immediate value by enabling organizers to run structured tournaments with clear rules.

**Independent Test**: Can be fully tested by creating a tournament, selecting a format, defining match scoring rules (sets/tiebreaks/advantage), and verifying the rules are stored and displayed to participants.

**Acceptance Scenarios**:

1. **Given** an organizer is creating a tournament, **When** they select "Knockout" format, **Then** the system stores this format and displays it to participants
2. **Given** an organizer is configuring tournament rules, **When** they specify "2 winning sets" with "Standard tiebreak at 6:6" and "Advantage", **Then** the system saves these match scoring rules
3. **Given** an organizer is creating a tournament, **When** they select "Group" format, **Then** the system stores this format choice
4. **Given** an organizer is creating a tournament, **When** they select "Swiss System" format, **Then** the system stores this format choice
5. **Given** an organizer is creating a tournament, **When** they select "Combined (Groups + Knockout)" format, **Then** the system stores this format choice
6. **Given** a tournament has defined rules, **When** participants view tournament details, **Then** they see the format and all match scoring rules clearly displayed

---

### User Story 2 - Configure Format-Specific Settings (Priority: P2)

Organizers need to configure format-specific settings like match guarantees for knockout tournaments, group sizes for group tournaments, and advancement rules for combined tournaments.

**Why this priority**: Format-specific settings enhance tournament flexibility but basic tournaments can run with default settings. This can be implemented after core format selection works.

**Independent Test**: Can be tested by creating knockout tournament with "2 match guarantee", group tournament with "group size 4", and combined tournament with "top 2 advance to knockout", verifying all settings are saved and applied correctly.

**Acceptance Scenarios**:

1. **Given** an organizer creates a knockout tournament, **When** they select "1 match guarantee" (classic), **Then** the system stores this setting for single-elimination bracket
2. **Given** an organizer creates a knockout tournament, **When** they select "2 match guarantee", **Then** the system stores this setting indicating losers continue in separate bracket
3. **Given** an organizer creates a knockout tournament, **When** they select "Until placement" guarantee, **Then** the system stores this setting indicating all players play until their exact position is determined
4. **Given** an organizer creates a group tournament, **When** they set group size to 4, **Then** the system validates and stores this group size
5. **Given** an organizer creates a group tournament with group size 4 and 10 players, **When** generating groups, **Then** the system creates 1 group of 4 and 2 groups of 3
6. **Given** an organizer creates a group tournament with settings that make equal distribution impossible, **When** attempting to generate groups, **Then** the system displays an error message explaining the conflict
7. **Given** an organizer creates a combined tournament, **When** they specify "top 2 players per group advance to main knockout bracket", **Then** the system stores this advancement rule
8. **Given** an organizer creates a combined tournament, **When** they configure "1st and 2nd to main bracket, 3rd to secondary bracket, 4th eliminated", **Then** the system stores these multiple bracket advancement rules

---

### User Story 3 - Define Cascading Rules at Multiple Levels (Priority: P2)

Organizers need to define default tournament-wide rules that can be overridden at group, bracket, round, or individual match levels for maximum flexibility.

**Why this priority**: Cascading rules provide powerful flexibility for complex tournaments but aren't needed for simple events. This enables advanced tournament configurations without complicating basic use.

**Independent Test**: Can be tested by setting tournament default of "2 sets with advantage", then overriding a specific round to use "Big tiebreak" and a specific match to use "No advantage", verifying the cascade works correctly.

**Acceptance Scenarios**:

1. **Given** a tournament has default rules of "2 sets, advantage, standard tiebreak at 6:6", **When** viewing any match without specific overrides, **Then** the match uses these default rules
2. **Given** a tournament default is "2 sets", **When** an organizer overrides a specific group to use "3 sets", **Then** all matches in that group use 3 sets while other groups use 2 sets
3. **Given** a tournament default is "advantage", **When** an organizer overrides a specific round to use "no advantage (golden ball)", **Then** all matches in that round use golden ball
4. **Given** a specific match has an override to use "early tiebreak at 5:5", **When** that match is played, **Then** it uses early tiebreak while other matches use tournament defaults
5. **Given** a combined tournament with groups and knockout, **When** an organizer sets different rules for group stage vs knockout stage, **Then** each stage follows its configured rules
6. **Given** a rule cascade of Tournament → Group → Round → Match, **When** determining which rule applies, **Then** the system uses the most specific rule defined (match > round > group > tournament)

---

### User Story 4 - Adjust Rules During Active Tournament (Priority: P2)

Organizers need to modify tournament rules even after the tournament has started, with changes applying to future matches while preserving completed match records.

**Why this priority**: Real tournaments often require mid-event adjustments due to time constraints, weather, or other factors. This flexibility is important but can be added after initial rule definition works.

**Independent Test**: Can be tested by starting a tournament with "2 sets, advantage", completing some matches, then changing to "1 set, no advantage" for remaining matches, verifying completed matches retain original rules and new matches use updated rules.

**Acceptance Scenarios**:

1. **Given** a tournament is in progress, **When** an organizer changes the default rule from "advantage" to "no advantage", **Then** future matches use the new rule while completed matches show the original rule
2. **Given** a tournament is running behind schedule, **When** an organizer enables "early tiebreak at 5:5" for remaining matches in current round, **Then** only matches not yet completed use the new setting
3. **Given** a "until placement" knockout tournament has one match finished in a round, **When** an organizer enables "early tiebreak" for remaining matches in that round, **Then** the system applies early tiebreak to remaining matches in that round only
4. **Given** a group tournament with larger groups running late, **When** an organizer changes rules for specific groups with more players, **Then** only those groups use the modified rules
5. **Given** a tournament has rule changes made during play, **When** viewing historical match results, **Then** each match displays the rules that were active when it was played

---

### User Story 5 - View Tournament Rules and Format (Priority: P1)

Players and organizers need to clearly view the tournament format, all active rules, and any rule variations at different levels before and during the tournament.

**Why this priority**: Transparency of rules is essential for fair play. This must be implemented alongside rule definition to ensure players always know what rules apply.

**Independent Test**: Can be tested by viewing a tournament with cascading rules and verifying all levels (tournament, group, round, match) are clearly displayed with appropriate formatting.

**Acceptance Scenarios**:

1. **Given** a tournament has been configured, **When** a player views tournament details, **Then** they see the format (knockout/group/swiss/combined) prominently displayed
2. **Given** a tournament has default scoring rules, **When** viewing tournament details, **Then** players see all scoring rules clearly explained (sets, tiebreaks, advantage, early tiebreak)
3. **Given** a tournament has group-specific or round-specific rule overrides, **When** viewing the tournament, **Then** these variations are clearly indicated with explanations
4. **Given** a player is about to play a specific match, **When** they view match details, **Then** they see exactly which rules apply to that match (including any overrides)
5. **Given** a tournament uses combined format, **When** viewing the tournament, **Then** the advancement rules are clearly displayed (e.g., "Top 2 per group advance to main knockout")
6. **Given** a knockout tournament has match guarantees, **When** viewing the tournament, **Then** the guarantee type is clearly explained (e.g., "Every player guaranteed 2 matches")

---

### Edge Cases

- What happens when an organizer tries to set invalid group sizes that cannot accommodate the number of registered players?
- How does the system handle rule changes for matches that are currently in progress?
- What happens when an organizer tries to change the tournament format after matches have already been completed?
- How does the system prevent inconsistent rule cascades (e.g., match-level override conflicts with round-level override)?
- What happens when a combined tournament's advancement rules don't account for all group positions?
- How does the system handle "until placement" matches when the exact number of participants doesn't create a clean bracket structure?
- What happens when early tiebreak settings conflict with the number of sets configured?

## Requirements *(mandatory)*

### Functional Requirements

#### Tournament Format Management

- **FR-001**: System MUST support four tournament formats: Knockout, Group, Swiss System, and Combined (Groups + Knockout)
- **FR-002**: System MUST allow organizers to select exactly one format per tournament at creation time
- **FR-003**: System MUST prevent format changes after any matches have been played in the tournament
- **FR-004**: System MUST store the selected format as part of tournament configuration

#### Match Scoring Rules

- **FR-005**: System MUST support match formats: Sets (1 or 2 winning sets), Standard Tiebreaks (1/2/3 winning), Big Tiebreaks (1/2 winning), and Mixed (tiebreak after 2 sets played - 1:1)
- **FR-006**: System MUST allow configuring advantage rule as either "Advantage" or "No Advantage (Golden Ball)"
- **FR-007**: System MUST support standard tiebreak played to 7 points with minimum 2-point margin
- **FR-008**: System MUST support big tiebreak played to 10 points with minimum 2-point margin
- **FR-009**: System MUST allow configuring early tiebreak rule to start at 6:6 (default), 5:5, 4:4, or 3:3
- **FR-010**: System MUST support mixed format where sets are played except final set is replaced with tiebreak (standard or big)
- **FR-011**: System MUST default to standard tiebreak at 6:6 when sets format is selected
- **FR-012**: System MUST allow organizers to define all match scoring rules at tournament creation

#### Knockout-Specific Configuration

- **FR-013**: System MUST support three match guarantee types for knockout tournaments: "1 match" (classic single elimination), "2 match" (losers bracket), and "Until placement" (play until exact position determined)
- **FR-014**: System MUST default knockout tournaments to "1 match guarantee" if not specified
- **FR-015**: System MUST store match guarantee setting for knockout tournaments
- **FR-016**: System MUST calculate correct number of rounds based on participant count and guarantee type

#### Group Tournament Configuration

- **FR-017**: System MUST allow organizers to specify desired group size (minimum 2, maximum 8)
- **FR-018**: System MUST create groups with specified size or one less (size - 1) to accommodate total participants
- **FR-019**: System MUST validate that participant count can be divided into groups of specified size and size - 1
- **FR-020**: System MUST display error message when participant distribution is impossible with specified group size
- **FR-021**: System MUST support single-group tournaments when group size equals participant count

#### Combined Tournament Configuration

- **FR-022**: System MUST allow organizers to configure how many players from each group advance to knockout stage
- **FR-023**: System MUST support multiple knockout brackets with different advancement criteria (e.g., "1st and 2nd to main bracket, 3rd to consolation bracket")
- **FR-024**: System MUST validate that advancement rules account for valid group positions
- **FR-025**: System MUST allow organizers to configure which group positions do not advance (e.g., "4th place eliminated")

#### Swiss System Configuration

- **FR-026**: System MUST support swiss system format where participants play a fixed number of rounds without elimination
- **FR-027**: System MUST allow organizers to specify the number of rounds for swiss system tournaments

#### Cascading Rule Definitions

- **FR-028**: System MUST support rule definitions at four levels: Tournament (default), Group/Bracket, Round, and Match
- **FR-029**: System MUST apply rules using cascade priority: Match-specific > Round-specific > Group/Bracket-specific > Tournament default
- **FR-030**: System MUST allow organizers to override tournament default rules at group/bracket level
- **FR-031**: System MUST allow organizers to override rules at round level
- **FR-032**: System MUST allow organizers to override rules for individual matches
- **FR-033**: System MUST preserve original rules for completed matches when tournament defaults are changed

#### Dynamic Rule Adjustment

- **FR-034**: System MUST allow rule modifications at any time during tournament lifecycle (before start, during play, after completion)
- **FR-035**: System MUST apply rule changes only to future matches, preserving completed match configurations
- **FR-036**: System MUST allow organizers to set early tiebreak rule for remaining matches in a round once any match in that round is completed
- **FR-037**: System MUST track which rules were active when each match was played for historical accuracy

#### Rule Viewing and Transparency

- **FR-038**: System MUST display tournament format prominently on tournament details page
- **FR-039**: System MUST display all default tournament-wide scoring rules on tournament details page
- **FR-040**: System MUST clearly indicate when groups, rounds, or matches have rule overrides
- **FR-041**: System MUST show applicable rules for each match, including any cascading overrides
- **FR-042**: System MUST display format-specific settings (match guarantees, group size, advancement rules) clearly
- **FR-043**: System MUST display rule explanations in plain language understandable to players

### Key Entities

- **Tournament Format**: Defines the structural type of competition (Knockout, Group, Swiss, Combined) with format-specific configurations
  - Format type (enumeration)
  - Match guarantee (for knockout)
  - Group size (for group tournaments)
  - Advancement rules (for combined tournaments)
  - Number of rounds (for swiss system)

- **Match Scoring Rules**: Defines how individual matches are scored, with support for cascading overrides
  - Match format (sets, standard tiebreaks, big tiebreaks, mixed)
  - Number of winning sets/tiebreaks
  - Advantage rule (advantage vs golden ball)
  - Tiebreak trigger point (6:6, 5:5, 4:4, 3:3)
  - Final set/tiebreak configuration (for mixed format)
  - Level (tournament/group/round/match)
  - Parent reference (for cascading)

- **Match**: Individual game with specific rules applied
  - Match scoring rules (direct or inherited via cascade)
  - Historical rule snapshot (rules active when match was played)
  - Match number/position within bracket/group/round

- **Group**: Collection of participants in group-stage competition
  - Group size configuration
  - Group-specific rule overrides
  - Advancement criteria (for combined tournaments)

- **Bracket**: Knockout competition structure
  - Bracket type (main, consolation, losers)
  - Match guarantee configuration
  - Bracket-specific rule overrides

- **Round**: Set of concurrent matches in knockout or swiss system
  - Round number
  - Round-specific rule overrides
  - Early tiebreak trigger (for "until placement" tournaments)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Organizers can configure tournament format and basic match scoring rules in under 2 minutes
- **SC-002**: System correctly applies cascading rule overrides in 100% of cases (match-level overrides take precedence over round/group/tournament defaults)
- **SC-003**: Players can view and understand all applicable rules for their upcoming matches in under 30 seconds
- **SC-004**: System correctly validates group size configurations and prevents invalid participant distributions in 100% of cases
- **SC-005**: Rule changes during active tournaments apply only to future matches in 100% of cases, preserving completed match records
- **SC-006**: System correctly calculates group distributions (mix of group size and size-1) for all valid participant counts
- **SC-007**: Tournament format and rules information is displayed clearly with zero ambiguity complaints from organizers during beta testing
- **SC-008**: System supports all specified tournament formats (knockout with 3 guarantee types, group, swiss, combined with multi-bracket) without format limitations
- **SC-009** (Aspirational): 90% of organizers successfully configure format-specific settings without help documentation on first attempt
- **SC-010**: Combined tournament advancement rules correctly route players to appropriate brackets in 100% of tournaments

## Assumptions

- This feature builds on the existing Tournament model from 002-category-system and 003-tournament-registration
- Match execution, score entry, and bracket/group generation are separate features (out of scope)
- Seeding logic is a separate feature with placeholder functionality used here when needed
- "Completed match" means a match with a recorded score/result (match completion tracking is handled by future features)
- Rule changes preserve historical data - the specific rules active when a match was played are stored with the match record
- Early tiebreak trigger is primarily used for time management in group stages and "until placement" tournaments
- Default match format if not specified: 2 winning sets, advantage, standard tiebreak at 6:6
- Group size validation assumes final participant count is known before group generation
- Combined tournaments can have multiple knockout brackets but all groups use same advancement criteria
- Swiss system rounds are predetermined and not dynamically adjusted based on results

## Dependencies

- **003-tournament-registration**: Tournament model with basic fields (name, category, dates, status) and participant registration
- **002-category-system**: Category definitions and player eligibility
- **001-user-management**: Organizer and player roles for permissions
- Future features:
  - Match execution and score entry system (for applying defined rules)
  - Bracket and group generation algorithms (for creating match structures based on formats)
  - Seeding system (for initial participant placement in brackets/groups)

## Out of Scope

- Match score entry and result tracking - covered in future features
- Bracket generation algorithms (knockout, combined) - covered in future features
- Group standing calculations and tiebreaker rules - covered in future features
- Swiss system pairing algorithms - covered in future features
- Seeding logic and participant placement - covered in separate feature (placeholder used here)
- Court assignment and scheduling - covered in future features
- Live score display and real-time updates
- Automatic bracket progression based on match results
- Points calculation and ranking updates after tournament completion
- Tournament statistics and analytics
- Rule templates and presets for common tournament types
- Rule validation beyond basic format compatibility (e.g., ensuring tiebreak settings make sense with set count)
- Multi-day tournament scheduling with day-specific rule variations
- Team tournament formats (players compete individually in all formats)
- Custom tournament formats beyond the four supported types
- Penalty point systems and code violation tracking
- Weather delay handling and rule modifications
- Video review or challenge systems
- Prize/award distribution based on placement
- Tournament cancellation and its impact on defined rules
