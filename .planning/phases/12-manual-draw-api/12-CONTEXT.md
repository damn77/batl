# Phase 12: Manual Draw API - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend endpoints for manual bracket draw: organizers can generate an empty bracket (no auto-placement), assign individual players/pairs to specific bracket positions, clear positions, and the tournament start endpoint validates all players are placed before allowing start. This phase is API-only — the UI is Phase 13.

</domain>

<decisions>
## Implementation Decisions

### Draw mode selection
- Add `mode: 'manual' | 'seeded'` parameter to existing `POST /api/v1/tournaments/:id/bracket` endpoint
- Default to `'seeded'` for full backward compatibility
- Manual mode creates the same bracket structure (Bracket + Rounds + Matches) but all player/pair slots in Round 1 non-BYE matches are left null
- BYE positions are still determined by the bracket template (based on player count) — same as seeded mode
- BYE matches still get `isBye: true` and `status: 'BYE'` at generation time

### Consolation bracket in manual mode
- If tournament has `matchGuarantee: 'MATCH_2'`, consolation bracket is generated alongside main bracket — same as seeded mode
- Consolation behavior during tournament play is unchanged (losers auto-routed)
- Manual draw only affects initial player placement in the main bracket

### Position assignment API
- New endpoint: `PUT /api/v1/tournaments/:id/bracket/positions`
- Accepts single assignment per request: `{ matchId, slot: 'player1' | 'player2', playerId }` (or `pairId` for doubles)
- Passing `playerId: null` (or `pairId: null`) clears the position
- Endpoint validates:
  - Player/pair is registered for the tournament (error: `NOT_REGISTERED`)
  - Player/pair is not already placed elsewhere in the bracket (error: `ALREADY_PLACED`)
  - Target slot is not a BYE slot (error: `BYE_SLOT_NOT_ASSIGNABLE`)
  - Tournament is not IN_PROGRESS or COMPLETED (error: `BRACKET_LOCKED`)

### Reassignment behavior
- Assigning a player to a slot that already has someone atomically: clears old player first (including Round 2 undo if BYE-adjacent), then assigns new player (including Round 2 advance if BYE-adjacent)
- One request handles the full swap — no need for explicit clear-then-assign

### BYE auto-advance on assignment
- When a player is placed next to a BYE in manual mode, immediately pre-populate their Round 2 slot (same behavior as seeded mode does at generation time)
- When clearing a BYE-adjacent assignment, also undo the Round 2 pre-population (remove that player from Round 2)
- Fixed BYE slots — template determines BYE positions, they are locked and cannot be reassigned

### Start-gate validation
- `startTournament()` gains a new validation step before the SCHEDULED -> IN_PROGRESS transition
- Applies to both manual AND seeded draw modes (safety net)
- Full integrity check:
  - All registered players/pairs appear somewhere in the bracket
  - No player/pair appears in multiple bracket positions
  - Every non-BYE Round 1 slot is filled
- On rejection, error response includes: `{ unplacedPlayers: [{id, name}], placedCount, totalRequired }`
- Error code: `INCOMPLETE_BRACKET`

### Claude's Discretion
- HTTP method choice for the assign endpoint (PUT vs PATCH vs POST)
- Exact error message wording
- Whether to add a `drawMode` field to the Bracket model for tracking
- Internal service function organization
- Test strategy and coverage

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The API should follow existing patterns in `bracketPersistenceService.js` and `bracketPersistenceController.js`.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bracketPersistenceService.generateBracket()`: Core bracket generation logic — manual mode branches off this (skip seeding step, skip player fill step)
- `bracketPersistenceService.swapSlots()`: Similar pattern to new assign endpoint but semantically different (swap vs assign)
- `bracketPersistenceController.js`: Error mapping pattern (`ERROR_STATUS` map) reusable for new endpoints
- `tournamentLifecycleService.startTournament()`: Needs modification to add bracket integrity check
- `generateConsolationBracket()`: Internal helper, reusable as-is for manual mode consolation generation
- BYE Round 2 pre-population logic (Step 8d in `generateBracket`): Reusable pattern for on-assign auto-advance

### Established Patterns
- Service functions throw structured errors with `.code` property via `makeError(code, message)`
- Controllers map error codes to HTTP status via `ERROR_STATUS` map
- Bracket modifications use Prisma transactions for atomicity
- Joi validation schemas in `validators/` directory
- Routes registered in `tournamentRoutes.js` with `isAuthenticated` + `authorize('update', 'Tournament')`

### Integration Points
- `POST /api/v1/tournaments/:id/bracket` — existing endpoint, add `mode` parameter to schema
- `PATCH /api/v1/tournaments/:id/start` — existing endpoint, add integrity validation
- `tournamentRoutes.js` — register new position assignment route
- `bracketPersistenceValidator.js` — add validation schema for new endpoint
- `bracketPersistenceService.js` — add `assignPosition()` service function
- `bracketPersistenceController.js` — add controller handler for assign endpoint

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-manual-draw-api*
*Context gathered: 2026-03-04*
