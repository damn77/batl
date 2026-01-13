# Feature Specification: Knockout Bracket Generation

**Feature Branch**: `009-bracket-generation`
**Created**: 2026-01-10
**Status**: Draft
**Input**: User description: "Backend functionality for knockout bracket structure generation and seeding information"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve Bracket Structure for Tournament (Priority: P1)

Tournament organizers need to retrieve the correct bracket structure based on the number of registered players to set up single-elimination tournaments.

**Why this priority**: This is the core functionality - without bracket structures, organizers cannot create tournament brackets. This delivers immediate value by providing the foundation for all tournament setup workflows.

**Independent Test**: Can be fully tested by calling the bracket structure API with various player counts (4-128) and verifying the returned structure matches the expected template format. Delivers value by allowing organizers to see how their tournament bracket will be structured.

**Acceptance Scenarios**:

1. **Given** a tournament has 7 registered players, **When** organizer requests bracket structure, **Then** system returns "1000" structure (3 preliminary matches, 1 bye)
2. **Given** a tournament has 16 players, **When** organizer requests bracket structure, **Then** system returns "0000 0000" structure (8 preliminary matches, 0 byes)
3. **Given** a tournament has 11 players, **When** organizer requests bracket structure, **Then** system returns "1110 0101" structure (3 preliminary matches in first half, 2 in second half, 5 byes)
4. **Given** an invalid player count (less than 4 or greater than 128), **When** organizer requests bracket structure, **Then** system returns error with clear message about valid range

---

### User Story 2 - Determine Seeding Requirements (Priority: P2)

Tournament organizers need to know how many players should be seeded based on tournament size to ensure fair bracket distribution.

**Why this priority**: Seeding is essential for competitive fairness but can be configured after bracket structure is known. This is independent functionality that adds value for tournament quality.

**Independent Test**: Can be tested by calling the seeding configuration API with various player counts and verifying the correct number of seeded players is returned according to defined ranges. Delivers value by informing organizers of seeding requirements.

**Acceptance Scenarios**:

1. **Given** a tournament has 7 players, **When** organizer requests seeding configuration, **Then** system returns 2 seeded players required
2. **Given** a tournament has 15 players, **When** organizer requests seeding configuration, **Then** system returns 4 seeded players required
3. **Given** a tournament has 25 players, **When** organizer requests seeding configuration, **Then** system returns 8 seeded players required
4. **Given** a tournament has 100 players, **When** organizer requests seeding configuration, **Then** system returns 16 seeded players required

---

### User Story 3 - Understand Bracket Structure Format (Priority: P3)

Organizers and developers need to understand how to interpret bracket structure data to correctly display brackets and assign player positions.

**Why this priority**: This is supporting documentation and guidance. The API works without explicit understanding, but interpretation is needed for proper usage and integration.

**Independent Test**: Can be tested through documentation examples and integration tests that verify correct interpretation of "0" and "1" values. Delivers value by enabling correct usage of bracket data.

**Acceptance Scenarios**:

1. **Given** bracket structure "1011" for 5 players, **When** interpreting the structure, **Then** position 1 is bye, position 2 is bye, position 3 is preliminary match, position 4 is preliminary match
2. **Given** bracket structure with all "0" values, **When** counting preliminary matches, **Then** number of matches equals number of "0" values divided by 2
3. **Given** bracket structure with "1" values, **When** counting byes, **Then** number of byes equals number of "1" values

---

### Edge Cases

- What happens when requesting bracket for exactly 4 players (minimum)?
- What happens when requesting bracket for exactly 128 players (maximum)?
- How does system handle power-of-2 player counts (8, 16, 32, 64, 128) where no byes are needed?
- What happens if organizer requests bracket before player registration is finalized?
- How are bracket structures updated if player count changes after initial retrieval?
- What happens if the bracket templates file is missing or corrupted?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide bracket structure for any player count from 4 to 128 players
- **FR-002**: System MUST load bracket structures from the predefined templates file (bracket-templates-all.json)
- **FR-003**: System MUST return bracket structure as a string of "0" and "1" characters where "0" indicates preliminary match and "1" indicates bye
- **FR-004**: System MUST determine the number of seeded players based on tournament size:
  - 4-9 players: 2 seeded
  - 10-19 players: 4 seeded
  - 20-39 players: 8 seeded
  - 40-128 players: 16 seeded
- **FR-005**: System MUST provide API endpoint to retrieve bracket structure for a given player count
- **FR-006**: System MUST provide API endpoint to retrieve seeding configuration for a given player count
- **FR-007**: System MUST validate player count is within valid range (4-128) before returning bracket data
- **FR-008**: System MUST return appropriate error messages for invalid player counts
- **FR-009**: System MUST calculate number of preliminary matches from bracket structure (count of "0" values divided by 2)
- **FR-010**: System MUST calculate number of byes from bracket structure (count of "1" values)
- **FR-011**: Bracket templates MUST be immutable and match the official tournament regulations
- **FR-012**: System MUST provide automated tests that verify bracket templates against source documentation
- **FR-013**: Seeding positions within brackets are determined manually by organizers (not automated in this phase)

### Key Entities

- **Bracket Structure**: Template defining first-round match distribution
  - Attributes: player count, structure pattern (0s and 1s), number of preliminary matches, number of byes
  - Relationships: One structure per player count (4-128)

- **Seeding Configuration**: Rules for number of seeded players
  - Attributes: player count range, number of seeded players
  - Relationships: Maps to player count ranges

- **Tournament**: Context for bracket usage
  - Attributes: total registered players, category, status
  - Relationships: Uses one bracket structure based on player count

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Organizers can retrieve accurate bracket structure for any tournament size (4-128 players) in under 1 second
- **SC-002**: System returns correct seeding requirements for 100% of valid player counts
- **SC-003**: Bracket structures match official tournament templates with 100% accuracy (verified through automated tests)
- **SC-004**: Invalid player count requests return clear error messages 100% of the time
- **SC-005**: All bracket structures (4-128 players) are available and correctly formatted
- **SC-006**: Organizers can understand bracket structure format without consulting developers (through clear API documentation)

## Assumptions *(optional)*

- Bracket templates in bracket-templates-all.json are accurate and match official regulations
- Single-elimination tournament format is standard for all tournaments
- No reseeding occurs between rounds
- Player count is finalized before bracket generation
- Seeding positions within brackets will be determined manually by organizers in this phase (automated seeding is future work)
- Frontend integration for bracket display will be implemented in a future feature
- Tournament brackets use standard power-of-2 sizing (8, 16, 32, 64, 128 slots)

## Out of Scope *(optional)*

- Frontend UI for bracket visualization and display
- Automated player seeding based on rankings or scores
- Double-elimination or other tournament formats
- Real-time bracket updates during tournament
- Match scheduling and time slot assignment
- Player position assignment within seeded slots (manual only in this phase)
- Bracket printing or PDF generation
- Tournament bracket history or archival
- Support for player counts outside 4-128 range
- Custom or modified bracket structures
