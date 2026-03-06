# Quick Task 3: Visually identify seeded players in bracket by putting their seed number next to their name in all matches - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Task Boundary

Visually identify seeded players in bracket by putting their seed number next to their name in all matches

</domain>

<decisions>
## Implementation Decisions

### Seed Data Source
- Add player1Seed/player2Seed and pair1Seed/pair2Seed fields to the Match model in Prisma
- Populate during bracket generation from seeding placement data
- Copy seed numbers when players advance to next round matches
- Backend DB approach chosen for reliability — seed always available in match query results

### Display Styling
- Use bracketed number format: `[1]` after the player name (e.g., "John Smith [1]")
- Keep current code style — clean and compact
- Existing BracketMatch.jsx seed-badge rendering already uses this format

### Doubles Pair Seeds
- Same treatment as singles — show seed number next to pair name identically
- Use pair1Seed/pair2Seed fields on Match model

</decisions>

<specifics>
## Specific Ideas

- BracketMatch.jsx already has seed badge code at lines 249, 268 — needs to work with new DB fields
- Backend match query (tournamentService.getMatches) needs to include seed fields in response
- bracketPersistenceService.js needs to populate seed fields during bracket creation from positions array
- Match advancement logic needs to carry seed forward when a player/pair wins
- Prisma migration needed for new Match fields

</specifics>
