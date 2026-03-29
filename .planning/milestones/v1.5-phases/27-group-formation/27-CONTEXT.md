# Phase 27: Group Formation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizer generates a seeded group draw with round-robin schedule for GROUP or COMBINED tournaments. Covers group count configuration, snake draft placement by ranking, manual player-to-group overrides, and round-robin fixture generation. Group stage play (result entry), standings calculation, and combined format advancement are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Draw generation UX
- Extend existing `BracketGenerationSection` component to handle GROUP and COMBINED formats — same Close Registration → Configure → Generate flow as knockout
- Organizer specifies **group count** directly (not group size); system calculates and previews group sizes (e.g., "4 groups: 2 of 4, 2 of 3")
- After generating, display **full GroupStandingsTable** views immediately (empty standings with player lists)
- Regenerate button with confirmation modal ("This will erase all groups and matches") — same pattern as knockout bracket regenerate

### Snake draft & seeding
- Organizer configures number of **seeded rounds** for snake draft placement
- Snake order: Round 1 fills groups 1→N, Round 2 fills groups N→1, etc. (standard snake)
- Ranking data comes from **Feature 008 seeding scores** via `getRankingsForCategory()` — same source as knockout seeding
- Remaining unseeded players distributed randomly across groups after seeded rounds complete
- **Deterministic randomization** using `seedrandom` library (same pattern as knockout draws in Feature 010) for audit trail reproducibility
- Uneven group sizes: **first groups get the extra players** (natural snake draft fill order)
- Balanced group validation: no group more than 1 player smaller than the largest (GFORM-02)

### Manual override flow
- **Swap two players** between groups — select player from group A, select player from group B, swap. Keeps group sizes balanced automatically
- Round-robin schedule **auto-regenerates** for affected groups after each swap
- Overrides **locked at tournament start** (status → IN_PROGRESS). Use Revert to undo draw entirely (existing revert pattern)
- Swap UI shows **seed position numbers** next to player names so organizer understands ranking impact

### Round-robin schedule generation
- Use **standard circle method** (rotate players) to generate balanced rounds — each player plays once per round
- For a group of N players: N-1 rounds (or N rounds if N is odd, with BYE rotation)
- Matches stored using **existing Match model** with `groupId` FK set — existing result submission and score entry infrastructure works
- Match numbers use **group offset pattern**: Group 1 starts at 100, Group 2 at 200, etc. (analogous to consolation bracket's 1000+ offset)
- Fixtures generated atomically inside a Prisma transaction alongside Group and GroupParticipant records

### Doubles support (GFORM-07)
- **Add `pairId` FK** to `GroupParticipant` model (nullable) — singles uses `playerId`, doubles uses `pairId`. Schema migration required
- Matches for doubles groups use existing `pair1Id`/`pair2Id` fields on Match model
- Snake draft for doubles uses pair seeding scores from rankings (same as knockout doubles)

### Claude's Discretion
- Exact group offset numbering scheme (100/200/300 vs 1000/2000/3000)
- Circle method implementation details
- Error state UI for generation failures
- API endpoint naming and route structure
- Whether to add a `roundNumber` field to group matches or reuse existing Round model

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Group formation requirements
- `.planning/milestones/v1.4-REQUIREMENTS.md` — GFORM-01 through GFORM-07 requirements with acceptance criteria

### Existing draw generation pattern
- `backend/src/services/bracketPersistenceService.js` — Knockout draw persistence pattern: closeRegistration → generateBracket → swapSlots. Follow this atomic transaction pattern for group draw
- `frontend/src/components/BracketGenerationSection.jsx` — Knockout draw UI: registration close → configure → generate → view. Extend this component for GROUP/COMBINED formats

### Seeding infrastructure
- `backend/src/services/seedingPlacementService.js` — Seeding algorithm with `seedrandom` deterministic randomization. Reuse ranking retrieval pattern
- `backend/src/services/bracketService.js` — Template/structure lookup, pattern for in-memory caching

### Database schema
- `backend/prisma/schema.prisma` — Group, GroupParticipant, Match models. GroupParticipant needs `pairId` FK migration for doubles support

### Existing group UI components
- `frontend/src/components/GroupStandingsTable.jsx` — Already renders group standings with match stats. Display target after draw generation
- `frontend/src/components/GroupConfigPanel.jsx` — Existing group size config (will need adaptation for group count input)
- `frontend/src/components/FormatVisualization.jsx` — Routes to GroupStandingsTable for GROUP format. Integration point for draw generation section

### Format validation
- `backend/src/validation/formatConfigSchemas.js` — Existing GroupFormatConfigSchema with Zod validation

### Project context
- `.planning/PROJECT.md` — v1.5 milestone goals and constraints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BracketGenerationSection`: Full draw workflow component (close reg → generate → view → regenerate). Extend for GROUP/COMBINED
- `GroupStandingsTable`: Already renders group standings with wins/losses/points. Can be used as post-generation view
- `GroupConfigPanel`: Existing group configuration UI (needs adaptation from groupSize to groupCount)
- `bracketPersistenceService.js`: Atomic Prisma transaction pattern for draw persistence
- `seedingPlacementService.js`: Ranking retrieval via `getRankingsForCategory()` and `seedrandom` deterministic randomization
- `ManualDrawEditor`: Knockout slot swap UI — pattern reference for group swap UI

### Established Patterns
- Draw persistence: Service layer with atomic Prisma `$transaction` wrapping all Group/GroupParticipant/Match creates
- Doubles duality: `pair1Id ?? player1Id` nullish coalescing pattern for singles/doubles code paths
- Match numbering: Consolation uses 1000+ offset — group matches will use 100/200/300+ per group
- Error handling: `makeError(code, message)` pattern from bracketPersistenceService
- Frontend services: Axios-based API clients in `frontend/src/services/`

### Integration Points
- `FormatVisualization.jsx` — Must add group draw generation section for GROUP/COMBINED when organizer and no groups exist
- `backend/src/index.js` — Register new group draw routes
- `backend/prisma/schema.prisma` — Migration to add `pairId` to GroupParticipant
- Tournament status/lifecycle — Groups locked when tournament moves to IN_PROGRESS (existing pattern)

</code_context>

<specifics>
## Specific Ideas

- Follow the exact same organizer workflow as knockout: Close Registration → Configure (group count + seeded rounds) → Generate Draw → View result
- Group offset match numbering inspired by consolation bracket's 1000+ offset pattern
- Swap UI should feel similar to ManualDrawEditor but for inter-group player swaps instead of bracket position swaps

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-group-formation*
*Context gathered: 2026-03-17*
