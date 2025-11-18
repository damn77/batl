# Feature Specification: Tournament View

**Feature ID**: 005-tournament-view
**Status**: Draft
**Created**: 2025-11-13
**Dependencies**: 001-user-management, 002-category-system, 003-tournament-registration, 004-tournament-rules

## Overview

The Tournament View feature provides a comprehensive, unified page for displaying all information related to a specific tournament. This page is accessible to all users (public, players, organizers, admins) and serves as the central hub for tournament information, including general data, rules, registered players, and format-specific visualizations.

## Business Requirements

### FR-001: General Tournament Information Display
The system must display all general tournament information in a clear, organized manner.

**Tournament Identification**:
- Tournament name
- Tournament description (if provided)
- Category (type, age group, gender)
- Tournament status badge (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)

**Location & Logistics**:
- Primary location (club name and address)
- Backup location (if configured) - displayed with weather-contingency indicator
- Number of courts available
- Entry fee (or "Free" if null)
- Prize/award description (if provided)
- Link to external tournament rules (if provided)

**Organizer Information**:
- Primary organizer (name, email, phone)
- Deputy organizer (name, email, phone) - if configured

**Schedule & Dates**:
- Tournament start date
- Tournament end date
- Registration open date
- Registration close date
- Tournament created date
- Last status change timestamp

**Registration Information**:
- Current number of registered players
- Tournament capacity (or "Unlimited" if null)
- Minimum participants required (if configured)
- Registration status indicator:
  - "Registration Open" (if current date is between open/close dates)
  - "Registration Closed" (if past close date)
  - "Not Yet Open" (if before open date)
- Waitlist display order configuration (REGISTRATION_TIME or ALPHABETICAL)

**Acceptance Criteria**:
- All non-null tournament fields are displayed
- Related data (location, organizer, category) is fetched and displayed
- Dates are formatted in user-friendly format (e.g., "Nov 15, 2025")
- Entry fee is formatted as currency
- Links (rulesUrl) are clickable
- Missing optional fields are handled gracefully (not shown or shown as "Not specified")

### FR-002: Tournament Format Display
The system must clearly display the tournament format type and configuration.

**Format Type Badge**:
- Display format type with icon/badge: KNOCKOUT, GROUP, SWISS, or COMBINED
- Show format type label (e.g., "Single Elimination", "Group Stage", etc.)

**Format Configuration Summary**:
- **Knockout**: Show match guarantee (1 match, 2 matches, or until placement)
- **Group**: Show group size configuration (e.g., "Groups of 4")
- **Swiss**: Show number of rounds (e.g., "5 rounds")
- **Combined**: Show group size and advancement criteria

**Acceptance Criteria**:
- Format type is displayed prominently with visual indicator
- Format-specific configuration is parsed from JSON and displayed in human-readable format
- Configuration is displayed in summary form (not raw JSON)

### FR-003: Tournament Rules Display
The system must provide access to tournament rules through a modal popup.

**Acceptance Criteria**:
- Rules are hidden by default
- Rules open in a modal popup when triggered
- Display rule complexity indicator icon:
  - **DEFAULT** (Green 🟢): Rules defined only at tournament level
  - **MODIFIED** (Yellow 🟡): Rule changes defined at group or round level
  - **SPECIFIC** (Red 🔴): Rule changes configured for specific matches
  - Complexity hierarchy: DEFAULT < MODIFIED < SPECIFIC
- Modal shows complete rule configuration including:
  - Tournament format rules (formatConfig JSON)
  - Default scoring rules (defaultScoringRules JSON)
  - Any group/round/match-level overrides (from groups.ruleOverrides, rounds.ruleOverrides, matches.ruleOverrides)
- Rules are displayed in human-readable format (not raw JSON)

### FR-004: Player List Display
The system must display all registered players with their status and format-specific information.

**Player General Data**:
- Player name
- Current ranking (in tournament category)
- Tournament seed (if assigned)
- Player status: REGISTERED, WAITLISTED, WITHDRAWN, CANCELLED

**Waitlist Management**:
- Show registered players by default
- Show waitlisted players (collapsed by default)
- Display waitlist order indicator (position in waitlist)
- Show waitlist ordering method (by registration time or alphabetical)

**Format-Specific Player Data** (only show applicable fields):
- **Groups**: Group name/identifier, position in group standings
- **Knockout**: Current round, bracket identifier (main/consolation/placement)
- **Combined**: Both group and knockout data
- **Swiss**: Placement after last fully finished round

**Acceptance Criteria**:
- All registered players are shown
- Waitlisted players are collapsible (hidden by default)
- Player status is clearly indicated with badges
- Format-specific columns are shown only for relevant format types
- Player rankings are fetched from CategoryRanking model
- Empty states handled gracefully (no players registered)

### FR-005: Format Visualization
The system must provide graphical visualization of tournament structure and matches.

**Visualization Types**:
- **Groups**: Render as standings tables with match results
- **Brackets**: Render as tree-like diagrams showing knockout progression
- **Combined**: Show both group tables and bracket trees
- **Swiss**: Show round pairings and current standings

**Interaction**:
- All groups and brackets are minimizable
- All groups and brackets are minimized by default
- Support expanding individual groups/brackets to view details
- Display match results within the visualization
- Show match status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)

**Match Details** (when expanded):
- Player names
- Match result (if completed)
- Match status
- Match number
- Round information

**Acceptance Criteria**:
- Correct visualization shown based on formatType
- Groups, brackets, and rounds are fetched from database
- Matches are fetched and displayed with results
- Expand/collapse functionality works smoothly
- Match results are clearly displayed
- Handles tournaments with no matches created yet (shows structure only)

### FR-006: Public Access
The tournament view must be accessible to all users without authentication.

**Acceptance Criteria**:
- Public access to all read-only tournament information
- No authentication required to view tournaments
- Players see same view as public users (no special privileges on view page)
- Organizers/admins see same view but may have action buttons (edit, manage) if appropriate

### FR-007: Responsive Design
The tournament view must be fully responsive and mobile-friendly.

**Acceptance Criteria**:
- Responsive layout using Bootstrap grid
- Bracket visualization adapts to screen size (horizontal scroll if needed)
- Group tables are scrollable on small screens
- Modal popups are mobile-optimized
- Touch-friendly interaction on mobile devices

## Technical Requirements

### TR-001: React Component Architecture
Build the tournament view using a modular component structure.

**Page Component**:
- `TournamentViewPage` - Main page component (route: `/tournaments/:id`)

**Section Components**:
- `TournamentHeader` - Tournament name, status, category
- `TournamentInfoPanel` - General information (location, dates, organizer, etc.)
- `TournamentFormatBadge` - Format type display with icon
- `TournamentRulesButton` - Button with complexity indicator
- `PlayerListPanel` - Player roster with status and seeding
- `FormatVisualization` - Format-specific display wrapper

**Modal Components**:
- `TournamentRulesModal` - Rules display modal with tabs for tournament/group/round/match rules

**Format-Specific Components**:
- `GroupStandingsTable` - Group stage table component (shows matches in group)
- `KnockoutBracket` - Bracket tree component
- `SwissRoundPairings` - Swiss round pairings display
- `CombinedFormatDisplay` - Combined format orchestrator (groups + brackets)

**Utility Components**:
- `ExpandableSection` - Reusable expand/collapse wrapper
- `MatchResultDisplay` - Match result formatting
- `RuleComplexityIndicator` - Rule complexity icon

### TR-002: Third-Party Library Integration
Evaluate and integrate bracket visualization libraries.

**Research Required**:
- [brackets-manager.js](https://github.com/Drarig29/brackets-manager.js/) - Bracket management library
- [brackets-viewer.js](https://github.com/Drarig29/brackets-viewer.js) - Bracket visualization library
- Assess compatibility with existing data models (Bracket, Round, Match)
- Determine if data transformation layer is needed
- Consider alternative libraries if these don't fit requirements
- Fallback: Build custom bracket visualization with React + CSS Grid/Flexbox

**Evaluation Criteria**:
- Does it support our BracketType enum (MAIN, CONSOLATION, PLACEMENT)?
- Can it display match results and status?
- Is it responsive and mobile-friendly?
- Can it integrate with our existing Match model structure?
- Does it support our MatchGuaranteeType (MATCH_1, MATCH_2, UNTIL_PLACEMENT)?

### TR-003: API Integration
Integrate with existing backend APIs to fetch tournament data.

**Existing Endpoints to Use**:
- `GET /api/v1/tournaments/:id` - Fetch tournament details with related data
  - Must include: category, location, backupLocation, organizer, deputyOrganizer
- `GET /api/v1/tournament-rules/:tournamentId` - Fetch tournament rules
- `GET /api/v1/registrations?tournamentId=:id` - Fetch registered players
- `GET /api/v1/rankings?categoryId=:id` - Fetch player rankings for seeding

**New Endpoints Needed**:
- `GET /api/v1/tournaments/:id/format-structure` - Fetch format-specific structure
  - Returns: groups (with groupParticipants), brackets, rounds based on formatType
  - Include ruleOverrides for each entity
- `GET /api/v1/tournaments/:id/matches` - Fetch all matches with results
  - Returns: all matches for tournament with player names, results, status
  - Include completedWithRules for historical rule snapshot
- `GET /api/v1/tournaments/:id/standings` - Fetch current tournament standings
  - For GROUP/COMBINED: group standings with wins/losses
  - For SWISS: current round standings
  - For KNOCKOUT: bracket progression

**Endpoint Response Enhancements** (modify existing endpoints):
- `GET /api/v1/tournaments/:id` should include related data:
  ```json
  {
    "success": true,
    "data": {
      "tournament": {
        "id": "...",
        "name": "...",
        "category": { "type": "SINGLES", "ageGroup": "AGE_40", "gender": "MEN" },
        "location": { "clubName": "...", "address": "..." },
        "backupLocation": { "clubName": "...", "address": "..." },
        "organizer": { "name": "...", "email": "...", "phone": "..." },
        "deputyOrganizer": { "name": "...", "email": "...", "phone": "..." },
        "formatType": "KNOCKOUT",
        "formatConfig": { "matchGuarantee": "MATCH_1" },
        "defaultScoringRules": { ... },
        "registrationCount": 16,
        "waitlistCount": 4,
        ...
      }
    }
  }
  ```

### TR-004: Rule Complexity Calculation
Implement logic to determine rule complexity level.

**Algorithm**:
```javascript
function calculateRuleComplexity(tournament, groups, brackets, rounds, matches) {
  let complexity = 'DEFAULT';

  // Check for group-level overrides
  if (groups.some(g => g.ruleOverrides !== null)) {
    complexity = 'MODIFIED';
  }

  // Check for round-level overrides
  if (rounds.some(r => r.ruleOverrides !== null)) {
    complexity = 'MODIFIED';
  }

  // Check for bracket-level overrides
  if (brackets.some(b => b.ruleOverrides !== null)) {
    complexity = 'MODIFIED';
  }

  // Check for match-level overrides (highest complexity)
  if (matches.some(m => m.ruleOverrides !== null)) {
    complexity = 'SPECIFIC';
  }

  return complexity;
}
```

**Implementation Location**:
- Backend: Add `ruleComplexity` field to `GET /api/v1/tournaments/:id` response
- Frontend: Display complexity indicator on [View Rules] button

### TR-005: Data Fetching Strategy
Implement efficient data fetching to minimize API calls.

**Approach**:
- Single initial API call to fetch tournament with all related data (category, location, organizer)
- Lazy load format structure (groups/brackets/rounds) only when user expands visualization
- Lazy load matches only when user expands a specific group/bracket
- Cache fetched data to avoid redundant calls when collapsing/expanding

**Performance Optimization**:
- Use React Query or SWR for caching and automatic revalidation
- Implement loading skeletons for async data
- Prefetch format structure on page load (low priority)

## Data Model Considerations

### Existing Models Used

**Tournament Model** (all fields displayed):
- `name`, `description` - Basic info
- `categoryId` → `Category` - Tournament category
- `locationId` → `Location` - Primary location (clubName, address)
- `backupLocationId` → `Location` - Backup location
- `courts` - Number of courts
- `capacity` - Max players
- `organizerId` → `Organizer` - Primary organizer (name, email, phone)
- `deputyOrganizerId` → `Organizer` - Deputy organizer
- `entryFee` - Entry fee
- `rulesUrl` - External rules link
- `prizeDescription` - Prize details
- `registrationOpenDate`, `registrationCloseDate` - Registration window
- `minParticipants` - Minimum participants
- `waitlistDisplayOrder` - Waitlist ordering (REGISTRATION_TIME or ALPHABETICAL)
- `formatType` - Format type (KNOCKOUT, GROUP, SWISS, COMBINED)
- `formatConfig` - JSON format configuration
- `defaultScoringRules` - JSON scoring rules
- `startDate`, `endDate` - Tournament dates
- `status` - Tournament status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
- `lastStatusChange` - Status change timestamp
- `createdAt`, `updatedAt` - Audit timestamps

**Related Models**:
- `Category` - Type, age group, gender
- `Location` - Club name, address
- `Organizer` - Name, email, phone
- `TournamentRegistration` - Player registrations with status
- `CategoryRanking` - Player rankings for seeding
- `Group` - Group structure with `ruleOverrides`, `groupNumber`, `groupSize`
- `GroupParticipant` - Players in each group with `seedPosition`
- `Bracket` - Bracket structure with `bracketType`, `matchGuarantee`, `ruleOverrides`
- `Round` - Round structure with `roundNumber`, `ruleOverrides`
- `Match` - Matches with `player1Id`, `player2Id`, `status`, `result`, `ruleOverrides`, `completedWithRules`

### New Models/Fields Needed
None. All data exists in current schema from features 001-004.

### Data Transformations Needed

**Format Config Parsing** (JSON → Display):
- KNOCKOUT: `{ matchGuarantee: "MATCH_1" }` → "Single Elimination (1 match guarantee)"
- GROUP: `{ groupSize: 4, singleGroup: false }` → "Groups of 4"
- SWISS: `{ rounds: 5 }` → "5 rounds"
- COMBINED: `{ groupSize: 4, advancePerGroup: 2 }` → "Groups of 4, top 2 advance"

**Scoring Rules Parsing** (JSON → Display):
- Parse `defaultScoringRules` JSON into human-readable format
- Example: `{ scoringFormat: "BEST_OF_3", winningSets: 2, winningGames: 6, ... }` → "Best of 3 sets, first to 6 games"

**Match Result Parsing** (JSON → Display):
- Parse `result` JSON from Match model
- Display as: "Player A def. Player B: 6-4, 6-3"

**Group Standings Calculation**:
- Calculate wins/losses for each player in group
- Calculate points (if applicable)
- Sort by wins, then head-to-head, then points

**Swiss Standings Calculation**:
- Calculate current standings after each completed round
- Sort by wins, then tiebreaker criteria

## UI/UX Requirements

### Layout Structure
```
┌──────────────────────────────────────────────────────────┐
│ Tournament Header                                         │
│ - Name: "Summer Singles Championship"                    │
│ - Status Badge: [IN_PROGRESS]                            │
│ - Category Badge: [Singles | Men 40+]                    │
│ - Format Badge: [Knockout - Single Elimination]          │
├──────────────────────────────────────────────────────────┤
│ Tournament Information Panel                              │
│ ┌─────────────────────┬──────────────────────────────┐   │
│ │ Location & Schedule │ Organizer & Registration     │   │
│ │ - Location          │ - Organizer                  │   │
│ │ - Backup Location   │ - Deputy Organizer           │   │
│ │ - Courts            │ - Entry Fee                  │   │
│ │ - Dates             │ - Prize                      │   │
│ │ - Registration      │ - Registration Status        │   │
│ │   Open/Close        │ - Capacity: 16/32            │   │
│ └─────────────────────┴──────────────────────────────┘   │
│ - [View Rules 🟡] Button (complexity indicator)          │
│ - [View External Rules] Link (if rulesUrl exists)        │
├──────────────────────────────────────────────────────────┤
│ Player List Panel                                         │
│ - Registered Players (16)                                 │
│   Name         | Ranking | Seed | Status | Round/Group   │
│   John Doe     | 1       | 1    | ACTIVE | Quarterfinals │
│   Jane Smith   | 5       | 2    | ACTIVE | Quarterfinals │
│   ...                                                     │
│ - [Show Waitlist (4)] Toggle                             │
│   (Collapsed by default, shows waitlisted players)       │
├──────────────────────────────────────────────────────────┤
│ Format Visualization                                      │
│ - Main Bracket (collapsed)                                │
│   [+] Main Bracket - 16 players                          │
│ - Consolation Bracket (collapsed)                         │
│   [+] Consolation Bracket - 8 players                    │
│ (Click [+] to expand and show bracket tree)              │
└──────────────────────────────────────────────────────────┘
```

### Rule Complexity Icons
- **DEFAULT** (Green 🟢): Tournament-level rules only
  - Tooltip: "Standard rules - no custom overrides"
- **MODIFIED** (Yellow 🟡): Group/Round-level overrides exist
  - Tooltip: "Modified rules - group or round overrides configured"
- **SPECIFIC** (Red 🔴): Match-level overrides exist
  - Tooltip: "Specific rules - individual matches have custom rules"

### Tournament Rules Modal
```
┌────────────────────────────────────────────┐
│ Tournament Rules                      [X]   │
├────────────────────────────────────────────┤
│ Complexity: 🟡 MODIFIED                     │
│ (Rule changes defined at round level)      │
├────────────────────────────────────────────┤
│ Tabs: [Format] [Scoring] [Overrides]      │
├────────────────────────────────────────────┤
│ Format Tab:                                 │
│ - Format Type: Knockout                     │
│ - Match Guarantee: 2 matches (Double Elim) │
│                                             │
│ Scoring Tab:                                │
│ - Scoring Format: Best of 3 Sets           │
│ - Winning Sets: 2                           │
│ - Winning Games: 6                          │
│ - Tiebreak: At 6-6                          │
│ - Advantage: Yes                            │
│                                             │
│ Overrides Tab:                              │
│ - Finals (Round 5): Best of 5 Sets         │
│ - Consolation Bracket: No Advantage        │
│                                             │
│                          [Close]            │
└────────────────────────────────────────────┘
```

### Interaction Patterns
- Click [View Rules] button → Open rules modal
- Click rule complexity icon → Open rules modal with tooltip
- Click [Show Waitlist] → Expand waitlisted players section
- Click [+] on group/bracket → Expand to show standings/bracket tree
- Click [-] on expanded group/bracket → Collapse to minimize
- Click on match → Show match details (future enhancement)
- Click player name → Navigate to player profile (future enhancement)

### Color Scheme & Badges
- **Status Badges**:
  - SCHEDULED: Blue (info)
  - IN_PROGRESS: Orange (warning)
  - COMPLETED: Green (success)
  - CANCELLED: Red (danger)
- **Registration Status Badges**:
  - REGISTERED: Blue (info)
  - WAITLISTED: Yellow (warning)
  - WITHDRAWN: Gray (secondary)
  - CANCELLED: Red (danger)
- **Format Type Badges**:
  - KNOCKOUT: Purple
  - GROUP: Teal
  - SWISS: Blue
  - COMBINED: Indigo

## Integration Points

### Feature 001 (User Management)
- Use authentication context to determine if user is organizer/admin
- Show edit/manage buttons only to authorized users
- No authentication required for viewing

### Feature 002 (Category System)
- Display category information (type, age group, gender)
- Link to category rankings page
- Use category data for player eligibility context
- Fetch player rankings from CategoryRanking for seeding display

### Feature 003 (Tournament Registration)
- Display registered players from TournamentRegistration model
- Show registration status (REGISTERED, WAITLISTED, WITHDRAWN, CANCELLED)
- Display waitlist order based on tournament.waitlistDisplayOrder
- Link to registration page (if tournament is open and user is authenticated)
- Show registration count vs capacity

### Feature 004 (Tournament Rules)
- Fetch and display tournament format configuration (formatType, formatConfig)
- Fetch and display scoring rules (defaultScoringRules)
- Calculate rule complexity level based on overrides
- Display rule overrides at group/round/bracket/match levels
- Show match completion rules (completedWithRules) for historical accuracy

## Testing Requirements

### Unit Tests
- Rule complexity calculation logic
- Format config parsing (JSON → Display)
- Scoring rules parsing (JSON → Display)
- Match result parsing (JSON → Display)
- Component rendering with different format types
- Player list filtering and sorting
- Format-specific data extraction
- Standings calculation (group and swiss)

### Integration Tests
- API calls for tournament data
- Tournament data fetching with all related entities
- Format structure fetching (groups/brackets/rounds/matches)
- Modal open/close interactions
- Group/bracket expand/collapse
- Responsive layout on different screen sizes
- Lazy loading of format visualization

### E2E Tests
- Full page load and data display for each format type
- Navigate to tournament view from tournament list
- Open and close rules modal
- Expand and collapse groups/brackets
- View waitlisted players
- View tournament with no players registered
- View tournament with no matches created
- Mobile responsive behavior

## Performance Considerations

### Optimization Strategies
- Lazy load bracket visualization libraries (code splitting)
- Minimize expanded groups/brackets by default to reduce initial DOM size
- Pagination for large player lists (100+ players)
- Cache tournament data for 30 seconds to avoid redundant API calls
- Use React.memo for expensive visualization components
- Prefetch format structure on hover over visualization section
- Optimize bracket rendering for large tournaments (128+ players)
- Use virtual scrolling for match lists if needed

### Expected Performance
- Initial page load: < 2 seconds
- Rules modal open: < 200ms
- Group/bracket expand: < 500ms (includes API call for matches)
- Support tournaments up to 256 players without performance degradation
- Bracket rendering: < 1 second for 128-player bracket

### Data Fetching Optimization
- Single API call for tournament with includes (category, location, organizer)
- Lazy load format structure only when visualization section is visible
- Lazy load matches only when specific group/bracket is expanded
- Use React Query for automatic caching and background revalidation

## Security Considerations

- All data is read-only, minimal security risk
- No sensitive data displayed (all tournament info is public)
- Rate limiting on API endpoints to prevent abuse (use existing rate limiters)
- Input sanitization on tournament ID to prevent injection attacks
- Validate tournament ID is valid UUID before querying database

## Accessibility Requirements

- Semantic HTML for screen readers
- ARIA labels for interactive elements (expand/collapse buttons, modal)
- Keyboard navigation support:
  - Tab through all interactive elements
  - Enter/Space to expand/collapse sections
  - Escape to close modal
- Sufficient color contrast for rule complexity indicators (WCAG AA)
- Alt text for any icons or visual indicators
- Focus management when opening/closing modal
- Screen reader announcements for dynamic content (expanded sections)

## Future Enhancements (Out of Scope)

- Live updates during tournament (WebSocket integration)
- Match scheduling and court assignments display
- Player performance statistics and head-to-head records
- Tournament bracket printable view (PDF export)
- Embed tournament widget for external websites
- Social sharing features (share match results, standings)
- Tournament timeline (visual timeline of all rounds/matches)
- Real-time score updates for in-progress matches
- Tournament director notes and announcements
- Photo gallery for tournament
- Spectator mode with live leaderboard

## Success Metrics

- Page load time < 2 seconds for 95% of requests
- Zero accessibility violations (WCAG AA compliance)
- Mobile usability score > 90 (Google Lighthouse)
- User feedback: "Tournament information is clear and easy to find"
- Bracket visualization loads in < 1 second for 99% of cases
- Less than 5% bounce rate on tournament view page

## Open Questions

1. **Rules Modal Format**: Should the rules modal display the full JSON rule configuration, or a formatted/simplified view?
   - Recommendation: Use formatted/simplified view with expandable "Show JSON" option for advanced users
2. **Large Bracket Handling**: How should we handle very large brackets (128+ players) in terms of visualization?
   - Options: (a) Horizontal scroll, (b) Zoom controls, (c) Paginated bracket sections, (d) Minimap overview
3. **Player List Filtering**: Should we support filtering/searching players in the player list?
   - Recommendation: Add search box if player count > 50
4. **Bracket Zoom**: Should bracket visualization support zoom in/out functionality?
   - Recommendation: Yes for brackets with > 32 players, use pinch-to-zoom on mobile
5. **Navigation**: Do we need a "back to tournament list" breadcrumb/navigation?
   - Recommendation: Yes, add breadcrumb: Home > Tournaments > [Tournament Name]
6. **Match Details**: Should clicking on a match open a detailed match view?
   - Recommendation: Out of scope for initial version, add to future enhancements
7. **External Rules Link**: Should the external rules link (rulesUrl) open in new tab or same tab?
   - Recommendation: New tab with `rel="noopener noreferrer"` for security
8. **Waitlist Promotion**: Should the tournament view show promotion/demotion history for waitlisted players?
   - Recommendation: No for public view, possibly yes for organizer view (future enhancement)

## References

- [brackets-manager.js GitHub](https://github.com/Drarig29/brackets-manager.js/)
- [brackets-viewer.js GitHub](https://github.com/Drarig29/brackets-viewer.js)
- Feature 004 Tournament Rules Specification (`specs/004-tournament-rules/spec.md`)
- Tournament Model Schema (`backend/prisma/schema.prisma` lines 253-316)
- Original Feature Notes (`notes/tournament-view.md`)
