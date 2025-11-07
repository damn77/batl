# Feature Specification: Tournament Registration & Enhanced Tournament Management

**Feature Branch**: `003-tournament-registration`
**Created**: 2025-11-02
**Status**: Draft
**Input**: User description: "notes\tournament-managment.md (take specs\002-category-system implemented feature into consideration)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register for Tournament with Auto-Category Registration (Priority: P1)

Players and organizers need to register participants for tournaments, with automatic category registration when entering a tournament in a new category for the first time.

**Why this priority**: This is the core value of the feature - enabling tournament participation. Without this, tournaments cannot have participants. This delivers immediate value by connecting players to tournament events.

**Independent Test**: Can be fully tested by registering a player for a tournament and verifying they're automatically registered in the tournament's category if not already registered. Delivers value by streamlining the registration process.

**Acceptance Scenarios**:

1. **Given** a player is not registered in "Men's Singles 35+" category, **When** they register for a tournament in that category, **Then** the system automatically registers them for both the tournament and the category
2. **Given** a player is already registered in "Women's Doubles 20+" category, **When** they register for another tournament in the same category, **Then** the system registers them for the tournament only without duplicate category registration
3. **Given** an organizer is registering a player for a tournament, **When** the player meets eligibility requirements, **Then** the system allows registration and auto-registers the category if needed
4. **Given** a player without birthDate filled in, **When** they attempt to register for an age-restricted tournament, **Then** the system prevents registration with message about missing birthDate
5. **Given** a player without birthDate filled in, **When** they register for an "All ages" tournament, **Then** the system allows registration without age validation
6. **Given** a player without gender filled in, **When** they attempt to register for any tournament, **Then** the system prevents registration as gender is mandatory

---

### User Story 2 - Unregister from Tournament with Smart Category Cleanup (Priority: P1)

Players need to withdraw from tournaments with automatic category unregistration when they have no remaining tournament participation in that category.

**Why this priority**: This is equally critical as registration - players must be able to withdraw from events, and automatic cleanup prevents orphaned category registrations.

**Independent Test**: Can be tested by registering a player for two tournaments in the same category, withdrawing from one (stays in category), then withdrawing from the second (auto-removes from category).

**Acceptance Scenarios**:

1. **Given** a player is registered for two tournaments in "Men's Singles 35+", **When** they unregister from one tournament, **Then** they remain registered in the category and the other tournament
2. **Given** a player is registered for only one tournament in "Women's Doubles 20+", **When** they unregister from that tournament, **Then** the system automatically unregisters them from the category as well
3. **Given** a player has participated in past tournaments in a category but has no active registrations, **When** checking their category registration, **Then** they remain registered in the category (participation history preserved)
4. **Given** an organizer is managing registrations, **When** they remove a player from a tournament, **Then** the system applies the same auto-unregister logic

---

### User Story 3 - Create Tournament with Enhanced Details (Priority: P2)

Organizers need to create tournaments with comprehensive logistical information including location, capacity, organizer contacts, and entry costs.

**Why this priority**: Enhanced tournament details are important for organization but tournaments can function with basic information. This can be implemented after core registration works.

**Independent Test**: Can be tested by creating a tournament with all optional fields and verifying the information is stored and displayed to participants.

**Acceptance Scenarios**:

1. **Given** an organizer is creating a tournament, **When** they provide location (club name, address), **Then** the system stores and displays location information
2. **Given** an organizer is creating a tournament, **When** they provide backup location for bad weather, **Then** the system stores this optional information
3. **Given** an organizer is creating a tournament, **When** they set maximum participants to 32, **Then** the system prevents registration beyond this limit
4. **Given** an organizer is creating a tournament, **When** they specify 4 courts available, **Then** this logistical information is stored for planning
5. **Given** an organizer is creating a tournament, **When** they provide organizer name and contact info, **Then** participants can view who to contact
6. **Given** an organizer is creating a tournament, **When** they optionally provide deputy organizer info, **Then** this backup contact is stored
7. **Given** an organizer is creating a tournament, **When** they set entry cost as fixed value per player, **Then** this cost is displayed to participants during registration

---

### User Story 4 - Manage Tournament Lifecycle (Priority: P2)

Organizers need to update tournament details and cancel tournaments when necessary, with appropriate handling of existing registrations.

**Why this priority**: Tournament management is important but can be implemented after creation and registration. Updates are less frequent than initial creation.

**Independent Test**: Can be tested by updating tournament details and verifying changes are reflected, and by canceling a tournament with registered players.

**Acceptance Scenarios**:

1. **Given** a tournament is scheduled, **When** the organizer updates the start date/time, **Then** all registered participants see the updated schedule
2. **Given** a tournament has registered participants, **When** the organizer updates location or backup location, **Then** the changes are visible to participants
3. **Given** a tournament is scheduled with registered players, **When** the organizer cancels it, **Then** the tournament status changes to CANCELLED and all registrations are marked with CANCELLED status (preserves history of who was registered)
4. **Given** a tournament is in progress or completed, **When** the organizer attempts to cancel it, **Then** the system prevents cancellation of non-scheduled tournaments
5. **Given** a cancelled tournament, **When** viewing participant list, **Then** all previously registered players are shown with CANCELLED registration status

---

### User Story 5 - Waitlist Management for Full Tournaments (Priority: P2)

Players need to join a waitlist when tournaments are full, with automatic promotion when spots become available, allowing organizers to manage waitlist order and manual promotions.

**Why this priority**: Waitlist functionality significantly improves user experience and tournament capacity management. It's important enough to implement early as it affects the core registration flow.

**Independent Test**: Can be tested by filling a tournament to capacity, adding players to waitlist, then having someone unregister and verifying automatic promotion of waitlisted players.

**Acceptance Scenarios**:

1. **Given** a tournament has reached maximum capacity AND player is already registered in the category, **When** the player attempts to register, **Then** the system adds them to the waitlist with WAITLISTED status and records registration timestamp
2. **Given** a tournament has reached maximum capacity AND player is NOT yet registered in the category, **When** the player attempts to register, **Then** the system prevents waitlist registration with message requiring category registration first (anti-spam protection)
3. **Given** a tournament has 3 waitlisted players, **When** a registered player unregisters, **Then** the system automatically promotes the first waitlisted player (by registration time) to REGISTERED status
4. **Given** a tournament is configured to display waitlist alphabetically, **When** viewing the waitlist, **Then** players are shown in alphabetical order regardless of registration time
5. **Given** a tournament is configured to display waitlist by registration order, **When** viewing the waitlist, **Then** players are shown in order of registration timestamp
6. **Given** an organizer manually sets a registered player to WAITLISTED, **When** the action is confirmed, **Then** a modal appears offering to auto-promote the next eligible waitlisted player or manually select one
7. **Given** an organizer chooses to manually promote from waitlist, **When** they select a specific waitlisted player, **Then** that player is promoted to REGISTERED status regardless of waitlist order
8. **Given** an organizer chooses auto-promote from waitlist, **When** confirmed, **Then** the system promotes the next player based on registration timestamp order
9. **Given** a waitlisted player, **When** they withdraw their waitlist registration, **Then** they are removed from the waitlist without affecting others' positions

---

### User Story 6 - View Tournament Participants and Manage Capacity (Priority: P3)

Organizers need to view all registered and waitlisted participants to ensure proper tournament planning.

**Why this priority**: Participant viewing is useful but not critical for basic tournament operation. This is an enhancement for better tournament management.

**Independent Test**: Can be tested by registering multiple players and viewing the participant list with capacity and waitlist indicators.

**Acceptance Scenarios**:

1. **Given** a tournament has 15 registered participants, max capacity 32, and 3 waitlisted, **When** viewing tournament details, **Then** the system displays "15/32 registered, 3 waitlisted"
2. **Given** a tournament has registered participants, **When** the organizer views the participant list, **Then** all registered players are displayed with registration timestamps and status (REGISTERED/WAITLISTED/WITHDRAWN/CANCELLED)
3. **Given** a tournament is accepting registrations, **When** viewing as a public user, **Then** the system displays current registration count, availability, and waitlist count
4. **Given** a tournament has waitlisted players, **When** viewing the waitlist, **Then** players are shown in order based on tournament's waitlist display setting (registration time or alphabetical)

---

### Edge Cases

- What happens when an organizer changes a tournament's category after players are registered? (Existing system from 002: allowed only if all players remain eligible - applies to both REGISTERED and WAITLISTED players)
- How are entry costs calculated when specified as "calculated at tournament start"? (Needs formula/rules from tournament rules feature)
- What happens to player registrations when max participants is reduced below current registration count? (Should excess players be moved to waitlist or require manual intervention?)
- What happens to waitlisted players when max participants is increased? (Should they be auto-promoted or remain waitlisted?)
- Can a player register for multiple tournaments in the same category simultaneously? (Yes, each tournament registration is independent)
- What happens to tournament registrations when a player's profile is deleted? (Registrations should be preserved with player info for historical records)
- How is "participation history" determined for category unregistration logic? (Defined as having completed at least one match - from 004-tournament-rules)
- Can organizers override the auto-category registration/unregistration logic manually? (No, system enforces automatic logic for consistency)
- What happens when a tournament's start date has passed but organizer didn't cancel it? (Status should auto-transition to IN_PROGRESS, preventing new registrations)
- What happens to waitlisted players when a tournament is cancelled? (All registrations including WAITLISTED are marked as CANCELLED)
- Can a waitlisted player be manually promoted ahead of others with earlier registration timestamps? (Yes, organizer has manual override option)
- What happens if multiple players unregister simultaneously and there are waitlisted players? (Process in order of unregistration, promoting one waitlisted player per available spot)
- Can waitlisted players view their position in the waitlist? (Yes, if tournament is configured to display by registration time)
- Can an organizer change the waitlist display setting after players are waitlisted? (Yes, it only affects display order, not promotion order which is always by registration time for auto-promote)
- Can a player join a waitlist if they're not registered in the tournament's category? (No - they must register to the category first. This anti-spam protection prevents malicious actors from flooding waitlists with fake players)

## Requirements *(mandatory)*

### Functional Requirements

#### Tournament Registration

- **FR-001**: System MUST allow players with active accounts to register for tournaments
- **FR-002**: System MUST allow organizers to register any player for tournaments
- **FR-003**: System MUST automatically register a player for a tournament's category when they register for a tournament in a category they're not already registered for
- **FR-004**: System MUST skip category auto-registration if player is already registered in the tournament's category
- **FR-005**: System MUST validate player eligibility against tournament category rules before allowing registration
- **FR-006**: System MUST prevent registration for players without birthDate when tournament category is age-restricted
- **FR-007**: System MUST allow registration for players without birthDate when tournament category is "All ages"
- **FR-008**: System MUST require player gender to be filled in before allowing tournament registration
- **FR-009**: System MUST prevent registration when tournament has reached maximum participants capacity
- **FR-010**: System MUST record registration timestamp for audit purposes

#### Tournament Unregistration

- **FR-011**: System MUST allow players to unregister from tournaments before tournament start
- **FR-012**: System MUST allow organizers to remove players from tournament registrations
- **FR-013**: System MUST automatically unregister a player from a tournament's category when they unregister from their last tournament in that category AND have no participation history in that category
- **FR-014**: System MUST preserve category registration when player unregisters from tournament but has other active tournaments or past participation in that category
- **FR-015**: System MUST define "participation" as having completed at least one match in a tournament (placeholder - detailed match tracking in 004-tournament-rules feature)
- **FR-016**: System MUST update registration status to WITHDRAWN when a player unregisters (preserves historical record)
- **FR-017**: System MUST update registration status to CANCELLED when a tournament is cancelled (preserves who was registered)

#### Waitlist Management

- **FR-018**: System MUST allow players to register for waitlist when tournament has reached maximum capacity
- **FR-019**: System MUST assign WAITLISTED status to registrations that exceed maximum capacity
- **FR-020**: System MUST record registration timestamp for all registrations to track waitlist order
- **FR-021**: System MUST automatically promote the oldest waitlisted player (by registration timestamp) to REGISTERED status when a spot becomes available
- **FR-022**: System MUST allow organizers to manually set a registered player's status to WAITLISTED
- **FR-023**: System MUST present a modal to organizer when manually waitlisting a player, offering option to auto-promote next eligible player or manually select one
- **FR-024**: System MUST allow organizers to manually promote a specific waitlisted player to REGISTERED status
- **FR-025**: System MUST store tournament configuration for waitlist display order (registration time or alphabetical)
- **FR-026**: System MUST display waitlist according to tournament's display setting while maintaining promotion order by registration timestamp
- **FR-027**: System MUST allow waitlisted players to withdraw from waitlist (status changes to WITHDRAWN)
- **FR-028**: System MUST prevent waitlist registration if player doesn't meet eligibility requirements (same validation as regular registration)
- **FR-029**: System MUST require player to be already registered in tournament's category before allowing waitlist registration (anti-spam protection - prevents malicious actors from spamming tournaments with fake players)
- **FR-030**: System MUST apply auto-category registration logic only to players who receive REGISTERED status, NOT to waitlisted players (waitlisted players must join category first)
- **FR-031**: System MUST update all registrations (including WAITLISTED) to CANCELLED status when tournament is cancelled

#### Enhanced Tournament Data

- **FR-032**: System MUST store tournament location as club name and address
- **FR-033**: System MUST allow optional backup location for bad weather as club name and address
- **FR-034**: System MUST store number of courts available for tournament
- **FR-035**: System MUST store maximum number of participants
- **FR-036**: System MUST enforce maximum participants limit during registration (triggers waitlist)
- **FR-037**: System MUST store organizer name and contact information (phone/email)
- **FR-038**: System MUST allow optional deputy organizer name and contact information
- **FR-039**: System MUST store entry cost per player as either fixed value or "calculated at tournament start"
- **FR-040**: System MUST store match rules reference (placeholder - detailed rules implemented in 004-tournament-rules feature)
- **FR-041**: System MUST store points distribution configuration for ranking updates (placeholder - detailed configuration in 004-tournament-rules feature)
- **FR-042**: System MUST store waitlist display order preference (registration time or alphabetical)

#### Tournament Lifecycle Management

- **FR-043**: System MUST allow organizers to update tournament details (name, dates, location, capacity, costs, organizer info, waitlist settings)
- **FR-044**: System MUST allow organizers to cancel scheduled tournaments
- **FR-045**: System MUST prevent cancellation of tournaments that are in progress or completed
- **FR-046**: System MUST track tournament status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
- **FR-047**: System MUST maintain change history for tournament updates (who changed what and when)

#### Tournament Viewing

- **FR-048**: System MUST display all tournament details to registered and waitlisted participants
- **FR-049**: System MUST display participant count, capacity, and waitlist count to public viewers
- **FR-050**: System MUST allow organizers to view complete participant list with registration timestamps and status
- **FR-051**: System MUST display tournament location including backup location if specified
- **FR-052**: System MUST display organizer contact information to registered participants
- **FR-053**: System MUST display entry cost during registration process
- **FR-054**: System MUST display waitlist position to waitlisted players when tournament is configured for registration time order

### Key Entities

- **Tournament** (extended from 002-category-system): Represents a competitive event within a category. Extended to include comprehensive logistical details: location (club name, address), optional backup location, number of courts, maximum participants, match rules reference (placeholder for 004), points distribution reference (placeholder for 004), organizer information (name, contact), optional deputy organizer, entry cost (fixed value or "calculated"), waitlist display order preference (registration time or alphabetical), start date/time, status (SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED).

- **TournamentRegistration**: Represents a player's registration to participate in a specific tournament. Includes player ID, tournament ID, registration timestamp (used for waitlist ordering), status (REGISTERED/WAITLISTED/WITHDRAWN/CANCELLED), withdrawal/cancellation timestamp (if applicable). Status changes: REGISTERED when confirmed (triggers auto-category registration if player not in category), WAITLISTED when tournament is full (requires player to already be in category - anti-spam protection), WITHDRAWN when player withdraws, CANCELLED when tournament is cancelled. Promotion from WAITLISTED to REGISTERED happens automatically by registration timestamp order or manually by organizer selection.

- **Location**: Embedded information within Tournament consisting of club name and full address. Can be primary or backup location for bad weather.

- **OrganizerInfo**: Embedded information within Tournament consisting of name and contact details (phone and/or email). Can be primary organizer or deputy.

- **EntryCost**: Configuration for tournament entry fees, stored as numeric value with flag indicating if it's fixed or calculated at tournament start.

- **WaitlistConfig**: Tournament configuration for how waitlist is displayed to users. Options: "REGISTRATION_TIME" (chronological order) or "ALPHABETICAL" (sorted by player name). Note: Auto-promotion always uses registration timestamp order regardless of display setting.

- **Player** (from 001-user-management): Must have gender filled in (mandatory). BirthDate is optional but required for registration in age-restricted tournaments.

- **CategoryRegistration** (from 002-category-system): Modified to track participation history (hasParticipated boolean) to enable smart auto-unregistration logic.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can register for a tournament and be automatically registered in the category in a single action taking under 30 seconds
- **SC-002**: System correctly applies auto-category registration logic in 100% of direct tournament registrations (REGISTERED status only) without manual intervention
- **SC-003**: System correctly prevents waitlist registration for players not in category in 100% of cases (anti-spam protection)
- **SC-004**: System correctly applies auto-category unregistration logic, preserving category registration when participation history exists
- **SC-005**: Organizers can create a tournament with all enhanced details (location, capacity, costs, contacts, waitlist settings) in under 3 minutes
- **SC-006**: System enforces maximum participant capacity with automatic waitlist functionality in 100% of cases
- **SC-007**: Tournament updates (location, dates, costs, waitlist settings) are visible to all registered and waitlisted participants within 1 minute
- **SC-008**: 95% of players successfully understand the auto-category registration and waitlist behavior without confusion
- **SC-009**: Zero incidents of players being registered for tournaments they don't meet eligibility for (applies to both registered and waitlisted)
- **SC-010**: Organizers can view complete participant lists (registered and waitlisted) and manage capacity across 50+ simultaneous tournaments
- **SC-011**: Entry cost, organizer contact information, and waitlist position (if applicable) are clearly displayed during registration process
- **SC-012**: System correctly auto-promotes waitlisted players within 5 seconds when a spot becomes available
- **SC-013**: Organizers can manually manage waitlist (promote specific players, reorder) in under 1 minute per action
- **SC-014**: 90% of players on waitlist successfully get promoted and notified when spots become available

## Assumptions

- The existing Tournament model from 002-category-system contains basic fields (name, categoryId, description, startDate, endDate, status)
- This feature extends the Tournament model with additional logistical and organizational fields
- CategoryRegistration model from 002-category-system needs a new field to track participation history (e.g., hasParticipated boolean or participationCount)
- "Participation" is defined as having completed at least one match in a tournament - detailed match completion tracking will be implemented in 004-tournament-rules
- Tournament status values: SCHEDULED (default), IN_PROGRESS (tournament has started), COMPLETED (tournament finished), CANCELLED (organizer cancelled)
- Entry cost "calculated at tournament start" uses a formula that will be defined in 004-tournament-rules feature
- Match rules and points distribution are stored as JSON references/configurations - detailed schema and validation in 004-tournament-rules
- Organizers can manage registrations up until tournament starts (status changes from SCHEDULED to IN_PROGRESS), after which registration is frozen
- Players can only unregister before tournament starts (no withdrawals mid-tournament via this feature - handled in 004 if needed)
- Email/SMS notifications for registration confirmations, tournament updates, and cancellations are handled by a separate notification system (out of scope)
- Maximum 1 deputy organizer per tournament (can be extended later if needed)
- Entry costs are per individual player (for doubles, each team member pays separately)
- Location address is free-text format, no strict validation or geocoding required
- Backup location is organizer's responsibility to communicate to participants when activated
- Players can register for multiple tournaments simultaneously as long as dates don't conflict (conflict detection out of scope for this feature)
- Tournament lifecycle: SCHEDULED → IN_PROGRESS → COMPLETED, with CANCELLED as an alternative end state

## Dependencies

- **001-user-management**: Requires PlayerProfile with gender (mandatory) and birthDate (optional but required for age-restricted tournament registration)
- **002-category-system**: Requires Category model, CategoryRegistration model with eligibility validation, and tournament-category relationship
- **004-tournament-rules** (future feature): Match rules schema, points distribution configuration, match completion tracking for participation history will be fully defined in next feature
- Notification system (if exists): For sending registration confirmations, tournament updates, and cancellation notices to participants

## Out of Scope

- Tournament formats (knockout, groups, swiss, combined) - covered in 004-tournament-rules
- Match scheduling and court assignments
- Match score entry and results tracking
- Automated points distribution and ranking updates based on tournament results
- Tournament bracket/group generation algorithms
- Seeding logic for participant placement
- Payment processing for entry costs (only storing and displaying the cost amount)
- Player check-in/attendance tracking on tournament day
- Team formation and management for doubles tournaments (players register individually)
- Tournament series or multi-event packages
- Real-time notifications for registration status changes (waitlist promotion notifications handled by notification system if available)
- Custom tournament types beyond the category system from 002
- Tournament promotion, advertising, or public browsing features
- Prize/award distribution tracking
- Tournament conflict detection (overlapping dates for same player)
- Weather monitoring or automatic backup location activation
- Multi-language support for tournament information
- Advanced waitlist features (priority tiers, conditional promotion rules, waitlist time limits)
