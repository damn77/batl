# Quickstart: Tournament View

**Feature**: 005-tournament-view
**Audience**: Developers, QA, Product Owners
**Last Updated**: 2025-11-13

This guide provides an end-to-end walkthrough of the Tournament View feature from both user and technical perspectives.

---

## User Journey

### Scenario: Public user viewing a tournament

**Context**: Sarah is a spectator who wants to check the status of her local tennis tournament.

#### Step 1: Navigate to Tournament View
- Sarah visits the tournament list page at `/tournaments`
- She sees a list of tournaments with basic info
- She clicks on "Summer Singles Championship 2025" tournament card
- **Expected**: Browser navigates to `/tournaments/{tournamentId}`

#### Step 2: View Tournament Header
- **Sees**: Tournament name, category badge, format badge, status badge
- **Example Display**:
  ```
  Summer Singles Championship 2025
  [Singles | Men 40+] [Knockout - Double Elimination] [IN PROGRESS]
  ```
- **Technical**: TournamentHeader component renders with data from API

#### Step 3: View Tournament Information
- **Sees**: Organized panel with tournament details split into two columns:
  - **Left Column (Location & Schedule)**:
    - Location: "Tennis Club Central, 123 Main St"
    - Backup Location: "Indoor Tennis Center" (with weather icon)
    - Courts: 8
    - Dates: Nov 25-26, 2025
    - Registration Window: Nov 1 - Nov 20, 2025
  - **Right Column (Organizer & Registration)**:
    - Organizer: "John Organizer" (email, phone)
    - Deputy Organizer: "Jane Deputy"
    - Entry Fee: $50.00
    - Prize: "1st: $500, 2nd: $300, 3rd-4th: $150"
    - Registration Status: "Closed" (red badge)
    - Capacity: 28/32 players registered
- **Technical**: TournamentInfoPanel fetches and displays all Tournament model fields

#### Step 4: Check Tournament Rules
- **Sees**: Button "[View Rules 🟡]" with yellow complexity indicator
- Sarah clicks the button
- **Expected**: Modal opens showing tournament rules in tabbed interface
- **Modal Content**:
  - **Tab 1: Format**
    - Format Type: Knockout
    - Match Guarantee: 2 matches (Double Elimination)
  - **Tab 2: Scoring**
    - Scoring Format: Best of 3 Sets
    - Winning Sets: 2
    - Winning Games: 6
    - Tiebreak: At 6-6
    - Advantage: Yes
  - **Tab 3: Overrides**
    - Finals (Round 5): Best of 5 Sets
    - Consolation Bracket: No Advantage
  - **Advanced (collapsed)**: "View Raw Configuration" accordion
- Sarah clicks "Close"
- **Technical**: TournamentRulesModal component parses `formatConfig` and `defaultScoringRules` JSON, calculates complexity from overrides

#### Step 5: View Player List
- **Sees**: Table of registered players (28 rows)
  - Columns: Name | Ranking | Seed | Status | Current Round
  - Example row: "John Doe | 1 | 1 | ACTIVE | Semifinals"
- **Sees**: Link "[Show Waitlist (4)]" (collapsed by default)
- Sarah clicks "Show Waitlist"
- **Expected**: Waitlist section expands showing 4 waitlisted players
  - Ordered by registration time (tournament.waitlistDisplayOrder)
  - Status badge shows "WAITLISTED" in yellow
- **Technical**: PlayerListPanel fetches TournamentRegistration data, joins with PlayerProfile and CategoryRanking

#### Step 6: View Format Visualization
- **Sees**: Two collapsed bracket sections:
  ```
  [+] Main Bracket - 32 players
  [+] Consolation Bracket - 16 players
  ```
- Sarah clicks "[+] Main Bracket"
- **Expected**: Bracket expands showing tree diagram
  - **Rounds**: Round 1 (16 matches) → Round 2 (8 matches) → Quarterfinals (4 matches) → Semifinals (2 matches) → Finals (1 match)
  - **Matches displayed**:
    ```
    Round 1, Match 1:
    [1] John Doe       6 6
    [32] Player 32     4 3
    Winner: John Doe
    ```
  - **Visual**: Lines connecting matches between rounds
  - **Status colors**: Completed (green), In Progress (blue), Scheduled (gray)
- Sarah scrolls horizontally to see all rounds (on mobile)
- **Technical**: KnockoutBracket component renders custom CSS Grid layout, fetches matches via API

#### Step 7: Collapse Bracket and Navigate Back
- Sarah clicks "[-] Main Bracket" to collapse
- Sarah clicks breadcrumb "Tournaments" at top
- **Expected**: Navigates back to `/tournaments` list page
- **Technical**: React Router navigation, breadcrumb component

---

## Technical Walkthrough

### API Request Flow

#### 1. Initial Page Load (`/tournaments/{tournamentId}`)

**Frontend**:
```javascript
// TournamentViewPage.jsx
import useSWR from 'swr';
import { getTournamentById } from '../services/tournamentViewService';

function TournamentViewPage() {
  const { tournamentId } = useParams();

  // Primary data fetch with SWR caching (30s TTL)
  const { data, error, isLoading } = useSWR(
    `/tournaments/${tournamentId}`,
    () => getTournamentById(tournamentId),
    { revalidateOnFocus: true }
  );

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorBoundary error={error} />;

  const tournament = data.tournament;

  return (
    <>
      <Breadcrumb>
        <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        <Breadcrumb.Item href="/tournaments">Tournaments</Breadcrumb.Item>
        <Breadcrumb.Item active>{tournament.name}</Breadcrumb.Item>
      </Breadcrumb>

      <TournamentHeader tournament={tournament} />
      <TournamentInfoPanel tournament={tournament} />
      <PlayerListPanel tournament={tournament} />
      <FormatVisualization tournament={tournament} />
    </>
  );
}
```

**Backend**:
```javascript
// backend/src/api/tournamentController.js
export async function getTournamentById(req, res, next) {
  try {
    const { id } = req.params;

    const tournament = await tournamentService.getTournamentWithRelatedData(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOURNAMENT_NOT_FOUND',
          message: 'Tournament not found'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: { tournament }
    });
  } catch (err) {
    next(err);
  }
}
```

**Service** (backend/src/services/tournamentService.js):
```javascript
export async function getTournamentWithRelatedData(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      category: true,
      location: true,
      backupLocation: true,
      organizer: true,
      deputyOrganizer: true,
      tournamentRegistrations: {
        include: {
          player: true
        }
      }
    }
  });

  if (!tournament) return null;

  // Add computed fields
  tournament.registrationCount = tournament.tournamentRegistrations.filter(
    r => r.status === 'REGISTERED'
  ).length;

  tournament.waitlistCount = tournament.tournamentRegistrations.filter(
    r => r.status === 'WAITLISTED'
  ).length;

  // Calculate rule complexity (lazy load groups/brackets/rounds/matches if needed)
  tournament.ruleComplexity = await ruleComplexityService.calculateComplexity(tournamentId);

  return tournament;
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Summer Singles Championship",
      "category": {
        "type": "SINGLES",
        "ageGroup": "AGE_40",
        "gender": "MEN",
        "name": "Men's Singles 40+"
      },
      "location": {
        "clubName": "Tennis Club Central",
        "address": "123 Main St, City, State"
      },
      "formatType": "KNOCKOUT",
      "formatConfig": {
        "matchGuarantee": "MATCH_2"
      },
      "registrationCount": 28,
      "waitlistCount": 4,
      "ruleComplexity": "MODIFIED",
      ...
    }
  }
}
```

---

#### 2. Format Visualization Expansion

**Frontend**:
```javascript
// FormatVisualization.jsx
function FormatVisualization({ tournament }) {
  const [expandedBrackets, setExpandedBrackets] = useState([]);

  const handleBracketExpand = (bracketId) => {
    if (expandedBrackets.includes(bracketId)) {
      setExpandedBrackets(expandedBrackets.filter(id => id !== bracketId));
    } else {
      setExpandedBrackets([...expandedBrackets, bracketId]);
    }
  };

  // Lazy load format structure only when component mounts
  const { data: structure } = useSWR(
    `/tournaments/${tournament.id}/format-structure`,
    () => getFormatStructure(tournament.id),
    { revalidateOnFocus: false } // Static data, no refetch needed
  );

  if (!structure) return <LoadingSkeleton />;

  return (
    <div>
      {structure.brackets.map(bracket => (
        <ExpandableSection
          key={bracket.id}
          title={`${bracket.bracketType} Bracket - ${bracket.playerCount} players`}
          isExpanded={expandedBrackets.includes(bracket.id)}
          onToggle={() => handleBracketExpand(bracket.id)}
        >
          <KnockoutBracket
            bracket={bracket}
            tournamentId={tournament.id}
          />
        </ExpandableSection>
      ))}
    </div>
  );
}
```

**Backend** (New Endpoint):
```javascript
// backend/src/api/tournamentController.js
export async function getFormatStructure(req, res, next) {
  try {
    const { id } = req.params;

    const structure = await tournamentService.getFormatStructure(id);

    return res.status(200).json({
      success: true,
      data: structure
    });
  } catch (err) {
    next(err);
  }
}
```

**Service**:
```javascript
export async function getFormatStructure(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { formatType: true }
  });

  const structure = { formatType: tournament.formatType };

  // Fetch structure based on format type
  if (tournament.formatType === 'KNOCKOUT' || tournament.formatType === 'COMBINED') {
    structure.brackets = await prisma.bracket.findMany({
      where: { tournamentId },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' }
        }
      }
    });
  }

  if (tournament.formatType === 'GROUP' || tournament.formatType === 'COMBINED') {
    structure.groups = await prisma.group.findMany({
      where: { tournamentId },
      include: {
        groupParticipants: {
          include: { player: true }
        }
      },
      orderBy: { groupNumber: 'asc' }
    });
  }

  if (tournament.formatType === 'SWISS') {
    structure.rounds = await prisma.round.findMany({
      where: { tournamentId, bracketId: null },
      orderBy: { roundNumber: 'asc' }
    });
  }

  return structure;
}
```

---

#### 3. Bracket Matches Lazy Loading

**Frontend**:
```javascript
// KnockoutBracket.jsx
function KnockoutBracket({ bracket, tournamentId }) {
  // Lazy load matches only when bracket is expanded
  const { data: matches } = useSWR(
    `/tournaments/${tournamentId}/matches?bracketId=${bracket.id}`,
    () => getMatches(tournamentId, { bracketId: bracket.id }),
    { revalidateOnFocus: true } // Refetch to see live updates
  );

  if (!matches) return <LoadingSkeleton />;

  return (
    <div className="bracket-container">
      {bracket.rounds.map(round => (
        <BracketRound
          key={round.id}
          round={round}
          matches={matches.filter(m => m.roundId === round.id)}
        />
      ))}
    </div>
  );
}
```

**Backend** (New Endpoint):
```javascript
export async function getMatches(req, res, next) {
  try {
    const { id } = req.params;
    const { bracketId, groupId, roundId, status } = req.query;

    const where = { tournamentId: id };
    if (bracketId) where.bracketId = bracketId;
    if (groupId) where.groupId = groupId;
    if (roundId) where.roundId = roundId;
    if (status) where.status = status;

    const matches = await prisma.match.findMany({
      where,
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } }
      },
      orderBy: { matchNumber: 'asc' }
    });

    return res.status(200).json({
      success: true,
      data: { matches }
    });
  } catch (err) {
    next(err);
  }
}
```

---

## Component Hierarchy

```
TournamentViewPage
├── Breadcrumb
├── TournamentHeader
│   ├── Tournament name
│   ├── Category badge
│   ├── Format badge
│   └── Status badge
├── TournamentInfoPanel
│   ├── Location & Schedule (left column)
│   └── Organizer & Registration (right column)
├── TournamentRulesButton → Opens TournamentRulesModal
│   └── RuleComplexityIndicator (icon)
├── PlayerListPanel
│   ├── Registered players table
│   └── Waitlisted players (collapsible)
└── FormatVisualization
    ├── GroupStandingsTable (for GROUP/COMBINED)
    ├── KnockoutBracket (for KNOCKOUT/COMBINED)
    │   ├── BracketRound[]
    │   │   └── BracketMatch[]
    │   │       └── MatchResultDisplay
    │   └── ExpandableSection wrapper
    └── SwissRoundPairings (for SWISS)
```

---

## Testing Checklist

### Unit Tests
- [ ] Rule complexity calculation (DEFAULT/MODIFIED/SPECIFIC)
- [ ] Format config parsing (all 4 format types)
- [ ] Scoring rules parsing (all scoring formats)
- [ ] Match result parsing (various score formats)
- [ ] Waitlist sorting (registration time vs alphabetical)
- [ ] Component rendering (all major components)

### Integration Tests
- [ ] GET /tournaments/:id with all includes
- [ ] GET /tournaments/:id/format-structure (all 4 format types)
- [ ] GET /tournaments/:id/matches with filters
- [ ] SWR caching behavior (TTL, revalidation)
- [ ] Modal open/close interactions
- [ ] Bracket expand/collapse

### E2E Tests
- [ ] Full page load for each format type
- [ ] Navigate from tournament list to tournament view
- [ ] Open and close rules modal
- [ ] Expand and collapse brackets
- [ ] Toggle waitlist visibility
- [ ] Breadcrumb navigation back
- [ ] Mobile responsive behavior
- [ ] Horizontal scroll on large brackets

---

## Performance Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Initial page load | < 2s | Lighthouse Performance score > 90 |
| Rules modal open | < 200ms | React DevTools Profiler |
| Bracket expand | < 500ms | Network tab + React Profiler |
| Bracket render (128 players) | < 1s | React Profiler + visual inspection |
| Mobile usability | > 90 | Lighthouse Mobile score |

---

## Common Issues & Troubleshooting

### Issue 1: Tournament not found
**Symptom**: 404 error on page load
**Cause**: Invalid tournament ID in URL
**Solution**: Check that tournamentId is valid UUID, tournament exists in database

### Issue 2: Bracket not rendering
**Symptom**: Blank space where bracket should be
**Cause**: No matches created for tournament
**Solution**: Handle empty state gracefully, show message "Bracket will be generated once tournament starts"

### Issue 3: Slow bracket rendering
**Symptom**: Page freezes when expanding large bracket
**Cause**: Too many DOM elements rendered at once
**Solution**: Verify match count < 256, check for unnecessary re-renders in React DevTools

### Issue 4: Incorrect rule complexity
**Symptom**: Complexity shows DEFAULT but should be MODIFIED
**Cause**: Complexity calculation not checking all override sources
**Solution**: Debug `ruleComplexityService.calculateComplexity()`, ensure all entities (groups, brackets, rounds, matches) are checked

---

## Next Steps

After implementation:
1. Validate all acceptance criteria from spec.md
2. Run performance benchmarks
3. Conduct accessibility audit (WCAG AA)
4. Update CLAUDE.md with new routes and components
5. Create user documentation (if needed)

---

**Phase 1 Complete**: Quickstart guide created. Ready for agent context update and Constitution Check re-evaluation.
