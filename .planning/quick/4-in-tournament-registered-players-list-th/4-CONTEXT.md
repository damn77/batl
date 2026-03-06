# Quick Task 4: Fill Ranking/Seed/Bracket/Round columns in Registered Players list - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Task Boundary

In tournament -> Registered Players list there are columns for Ranking/Seed/Bracket/Round but they aren't filled. Add missing logic.

</domain>

<decisions>
## Implementation Decisions

### Ranking Source
- Query RankingEntry from Feature 008 for the tournament's category
- Shows the player's current rank (1st, 2nd, etc.) in that category
- For DOUBLES: pair's seedingScore is already returned

### Seed Source
- Pull from Match.player1Seed/player2Seed fields populated during bracket creation
- Only shows after bracket is generated
- Need to cross-reference matches to find each player's seed position

### Bracket/Round Display
- Bracket column: player's bracket position number (1-N)
- Round column: furthest round reached (e.g. 'R1', 'QF', 'SF', 'F')
- Only populated after bracket generation
- Derived from Match data for the tournament

### Claude's Discretion
- API endpoint structure for fetching supplementary data
- Whether to add data to existing registration endpoint or create separate calls

</decisions>

<specifics>
## Specific Ideas

- PlayerListPanel.jsx currently has placeholder `renderFormatSpecificData()` returning '-'
- Match model has player1Seed/player2Seed (Int?) fields
- RankingEntry model has rank field per category/year
- Registration API at GET /api/tournaments/:tournamentId/registrations needs enrichment
- Feature 008 rankings API already exists for category rankings

</specifics>
