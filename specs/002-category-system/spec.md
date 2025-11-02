# Feature Specification: Tournament Category System

**Feature Branch**: `002-category-system`
**Created**: 2025-11-01
**Status**: Draft
**Input**: User description: "Based on instructions in notes\categories.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Standard Tournament Categories (Priority: P1)

Tournament organizers need to create categories for their tournaments by combining category type, age group, and gender specifications to ensure fair competition groupings.

**Why this priority**: This is the foundation of the category system. Without the ability to create categories, no tournaments can be organized properly. This delivers immediate value by allowing basic tournament organization.

**Independent Test**: Can be fully tested by creating a category (e.g., "Women's Singles 35+") and verifying it's stored with all specified attributes. Delivers value by enabling basic tournament categorization.

**Acceptance Scenarios**:

1. **Given** the organizer is creating a new category, **When** they select "Singles" type, "35+" age group, and "Women" gender, **Then** the system creates a category "Women's Singles 35+" with these specifications
2. **Given** the organizer is creating a new category, **When** they select "Doubles" type, "20+" age group, and "Mixed" gender, **Then** the system creates a category "Mixed Doubles 20+" with these specifications
3. **Given** a category already exists with the same specifications, **When** the organizer attempts to create a duplicate, **Then** the system prevents the duplicate and displays an appropriate message
4. **Given** the organizer is creating a new category, **When** they select "Singles" type, "All ages" option, and "Men" gender, **Then** the system creates a category "Men's Singles (All ages)" with no age restrictions
5. **Given** the organizer is creating an open tournament, **When** they select "Doubles" type, "All ages" option, and "Mixed" gender, **Then** the system creates a category "Mixed Doubles (All ages)" with no age or gender restrictions beyond Mixed definition

---

### User Story 2 - Assign Tournament to Category (Priority: P1)

Tournament organizers need to assign each tournament to exactly one category so that participants know the competition rules and eligibility requirements.

**Why this priority**: This connects tournaments to the category system and is essential for basic functionality. Without this, categories serve no purpose. This is equally critical as P1.

**Independent Test**: Can be tested by creating a tournament and assigning it to a category, then verifying the tournament displays the category information and prevents assignment to multiple categories.

**Acceptance Scenarios**:

1. **Given** a tournament is being created, **When** the organizer assigns it to "Men's Singles 20+", **Then** the tournament is linked to that category and displays category rules
2. **Given** a tournament is already assigned to a category, **When** the organizer attempts to assign it to a different category, **Then** the system prevents the change and shows that tournaments can only belong to one category
3. **Given** multiple tournaments exist, **When** viewing the tournament list, **Then** each tournament displays its assigned category

---

### User Story 3 - Validate Player Eligibility for Categories (Priority: P2)

Players need to register for tournaments with automatic validation of their eligibility based on age and gender rules, ensuring fair competition.

**Why this priority**: This enforces the business rules around categories but can be implemented after basic category and tournament creation. Delivers value by automating eligibility checks.

**Independent Test**: Can be tested by attempting to register players with various ages and genders to different categories, verifying the system correctly allows or prevents registration based on rules.

**Acceptance Scenarios**:

1. **Given** a player is 37 years old and male, **When** they attempt to register for "Men's Singles 35+", **Then** the system allows registration
2. **Given** a player is 32 years old and male, **When** they attempt to register for "Men's Singles 35+", **Then** the system prevents registration with message indicating minimum age requirement
3. **Given** a player is 37 years old and male, **When** they attempt to register for "Men's Singles 20+", **Then** the system allows registration (can play in younger categories)
4. **Given** a player is 25 years old and female, **When** they attempt to register for "Women's Doubles 20+", **Then** the system allows registration
5. **Given** a player is 25 years old and male, **When** they attempt to register for "Women's Singles 20+", **Then** the system prevents registration due to gender mismatch
6. **Given** a player is 18 years old and male, **When** they attempt to register for "Men's Singles (All ages)", **Then** the system allows registration without age validation
7. **Given** a player is any age, **When** they attempt to register for a category with "All ages" option, **Then** the system bypasses age validation and only validates other eligibility criteria

---

### User Story 4 - Register Players in Multiple Categories (Priority: P2)

Players need to register for tournaments across multiple categories simultaneously to maximize their competitive opportunities.

**Why this priority**: This is important for player flexibility but not critical for basic tournament operation. Can be implemented after single-category registration works.

**Independent Test**: Can be tested by registering a player for multiple categories (e.g., Singles and Doubles) and verifying they appear in both category participant lists.

**Acceptance Scenarios**:

1. **Given** a player is eligible for multiple categories, **When** they register for both "Men's Singles 35+" and "Men's Doubles 35+", **Then** the system allows both registrations
2. **Given** a player is registered in multiple categories, **When** viewing their profile, **Then** all their active category registrations are displayed
3. **Given** a player is registered in three categories, **When** they withdraw from one category, **Then** they remain registered in the other two categories

---

### User Story 5 - Manage Category-Specific Rankings (Priority: P3)

Players and organizers need to view rankings that are specific to each category, showing performance within that category's competition.

**Why this priority**: Rankings are important but can be implemented after the basic category system is functional. This is an enhancement that builds on the core functionality.

**Independent Test**: Can be tested by creating results for players in a category and verifying the ranking is calculated and displayed independently from other categories.

**Acceptance Scenarios**:

1. **Given** a player has competed in "Men's Singles 35+", **When** viewing that category's rankings, **Then** the system displays their ranking within that specific category
2. **Given** a player competes in both "Men's Singles 35+" and "Men's Singles 20+", **When** viewing each category, **Then** the system displays separate independent rankings for each category
3. **Given** tournament results are recorded, **When** the rankings are updated, **Then** each category's rankings reflect only the results from tournaments in that category

---

### Edge Cases

- What happens when a player's age increases during a season and they no longer meet a category's minimum age for "younger category" play? (e.g., player was 34 in "20+" category, now turns 35)
- How does the system handle player eligibility in "Mixed" gender categories?
- What happens when attempting to delete a category that has active tournaments assigned to it?
- How are rankings handled when a player first joins a category with no prior results?
- What happens if a tournament is created without assigning it to a category?
- Can an "All ages" category coexist with age-restricted categories of the same type and gender?
- How are "All ages" categories displayed and distinguished from age-restricted categories in lists and filters?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support two category types: "Singles" and "Doubles"
- **FR-002**: System MUST allow defining age groups as minimum age thresholds in 5-year increments from 20+ to 80+ (20+, 25+, 30+, 35+, 40+, 45+, 50+, 55+, 60+, 65+, 70+, 75+, 80+) or "All ages"
- **FR-003**: System MUST support three gender options: "Men", "Women", and "Mixed"
- **FR-004**: System MUST create unique categories by combining category type, age group, and gender
- **FR-005**: System MUST prevent creation of duplicate categories with identical specifications
- **FR-006**: System MUST enforce that each tournament belongs to exactly one category. Tournament category can be changed after creation if and only if all registered players remain eligible for the new category (to allow organizers flexibility for low participation or injuries).
- **FR-007**: System MUST allow players to register for multiple categories simultaneously
- **FR-008**: System MUST validate player age against category minimum age requirement during registration for age-restricted categories. Age is calculated as (current year - birth year), meaning players are eligible from January 1st of the year they turn the required age.
- **FR-009**: System MUST allow players to register for categories with minimum age at or below their age (players can play in "younger" categories)
- **FR-010**: System MUST prevent players from registering for categories with minimum age above their age
- **FR-011**: System MUST validate player gender against category gender requirement (Men/Women), with "Mixed" allowing both genders
- **FR-012**: System MUST bypass all age validation for categories marked as "All ages"
- **FR-013**: System MUST maintain separate rankings for each category
- **FR-014**: System MUST update category rankings based only on results from tournaments within that category
- **FR-015**: System MUST display category information (type, age group, gender) for each tournament
- **FR-016**: System MUST allow viewing all players registered in a specific category
- **FR-017**: System MUST allow viewing all categories a specific player is registered for
- **FR-018**: System MUST validate category assignment when creating or updating a tournament
- **FR-019**: System MUST clearly indicate when a category has "All ages" designation in all displays and listings
- **FR-020**: System MUST allow creation of both age-restricted and "All ages" categories for the same type and gender combination

### Key Entities

- **Category**: Represents a competition classification combining category type (Singles/Doubles), age group (minimum age threshold or "All ages"), and gender (Men/Women/Mixed). Each category is unique based on this combination. Categories maintain their own rankings and have multiple associated tournaments and players. Age groups can be specific thresholds (20+ through 80+ in 5-year increments) or "All ages" which disables age validation.

- **Tournament**: Represents a competitive event that belongs to exactly one category. Tournaments inherit eligibility rules from their assigned category.

- **Player**: Represents a participant with attributes including age and gender. Players can register for and compete in multiple categories simultaneously, provided they meet eligibility requirements for each.

- **CategoryRanking**: Represents a player's ranking within a specific category. Each player-category combination has an independent ranking that is calculated based only on results from tournaments within that category.

- **CategoryRegistration**: Represents the relationship between a player and a category they are registered to compete in. Captures eligibility validation and registration status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tournament organizers can create a new category with all specifications (type, age, gender) in under 1 minute
- **SC-002**: System correctly validates 100% of player registrations against category eligibility rules without manual intervention
- **SC-003**: Players can register for multiple categories in a single session without errors
- **SC-004**: Each category maintains independent rankings that update within 5 minutes of tournament result entry
- **SC-005**: 95% of users successfully understand and navigate the category system on first use
- **SC-006**: System handles tournaments across 20+ different category combinations simultaneously without performance degradation
- **SC-007**: Zero incidents of players being registered for categories they don't meet eligibility requirements for
- **SC-008**: Category information is displayed consistently across all tournament views
- **SC-009**: "All ages" categories allow registration for players of any age without errors or validation failures
- **SC-010**: System can support both age-restricted and "All ages" categories for the same type/gender without conflicts

## Assumptions

- Player age and gender information is already captured in the user management system and is available for validation
- Tournament results and scoring system exist or will be implemented separately from the category system
- Ranking calculation algorithm will be defined separately - this spec focuses on the requirement that rankings be category-specific
- Age is calculated using calendar year only (current year - birth year), not exact birthdate. Players are eligible from January 1st of the year they turn the required age. Example: A player born December 31, 1988 is considered 37 years old for the entire 2025 calendar year. Age changes during season don't affect existing registrations.
- "Mixed" gender category allows both men and women to participate together (common in doubles categories)
- Category deletion is not permitted if active tournaments are assigned to it (archive/disable functionality would be needed)
- Age thresholds in 5-year increments from 20+ to 80+ plus "All ages" option provide comprehensive coverage for all player demographics
- "All ages" categories are commonly used for open tournaments where organizers want maximum participation without age barriers
- Multiple categories can exist for the same type/gender combination with different age restrictions (e.g., "Men's Singles 35+", "Men's Singles 50+", and "Men's Singles (All ages)" can all coexist)

## Dependencies

- User Management System (001-user-management): Requires player profiles with age and gender information
- Tournament Management System: Requires basic tournament creation and management capabilities (may need to be specified separately)
- Rankings System: Requires ability to calculate and store rankings (may need to be specified separately)

## Out of Scope

- Ranking calculation algorithms and methodologies
- Tournament scheduling and bracket management
- Player performance statistics beyond rankings
- Historical category performance tracking
- Custom or dynamic category types beyond Singles and Doubles
- Age verification processes
- Category merging or archival
- Notification system for eligibility changes
- Dynamic age group definitions beyond the 5-year increment thresholds (20+ to 80+) and "All ages"
- Age groups below 20+ or above 80+ (junior/senior categories outside standard range)
