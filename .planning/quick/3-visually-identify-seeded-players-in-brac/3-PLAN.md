---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/prisma/schema.prisma
  - backend/src/services/bracketPersistenceService.js
  - backend/src/services/tournamentLifecycleService.js
  - frontend/src/components/BracketMatch.jsx
autonomous: true
requirements: [SEED-DISPLAY]

must_haves:
  truths:
    - "Seeded players show their seed number in bracket view across all rounds"
    - "Seed numbers persist through match advancement (winner keeps seed badge)"
    - "Manual draw matches have no seed badges (null seed fields)"
    - "Doubles pairs show seed number identically to singles"
  artifacts:
    - path: "backend/prisma/schema.prisma"
      provides: "player1Seed, player2Seed, pair1Seed, pair2Seed fields on Match model"
      contains: "player1Seed"
    - path: "backend/src/services/bracketPersistenceService.js"
      provides: "Seed population during bracket creation from positions array"
    - path: "backend/src/services/tournamentLifecycleService.js"
      provides: "Seed carry-forward during match advancement"
    - path: "frontend/src/components/BracketMatch.jsx"
      provides: "Seed badge rendering from Match-level seed fields"
  key_links:
    - from: "bracketPersistenceService.js"
      to: "Match records"
      via: "positions[].seed written to player1Seed/player2Seed at creation"
      pattern: "player1Seed.*pos.*seed"
    - from: "tournamentLifecycleService.js"
      to: "Match records"
      via: "advanceBracketSlot copies seed to next-round match"
      pattern: "player1Seed|pair1Seed"
    - from: "BracketMatch.jsx"
      to: "match.player1Seed"
      via: "seed badge reads Match-level fields instead of player.seed"
      pattern: "match\\.player1Seed"
---

<objective>
Add seed number display to knockout bracket matches so seeded players are visually identifiable across all rounds.

Purpose: Tournament organizers and spectators need to see which players are seeded and their ranking at a glance, throughout the entire bracket (not just Round 1).

Output: Seed numbers appear as `[N]` badges next to player names in all bracket matches, persisted in the database and carried forward through advancement.
</objective>

<execution_context>
@C:/Users/erich/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/erich/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<interfaces>
<!-- Key types and contracts the executor needs -->

From backend/prisma/schema.prisma (Match model, lines 495-535):
- Match has player1Id, player2Id, pair1Id, pair2Id (String?)
- Need to add: player1Seed, player2Seed, pair1Seed, pair2Seed (Int?)

From backend/src/services/seedingPlacementService.js (positions array format):
- Each position has: { positionNumber, positionIndex, seed, entityId, entityType, entityName, isBye, isPreliminary }
- `seed` is Int or null — only seeded players have a value

From backend/src/services/bracketPersistenceService.js:
- generateBracket() creates Round 1 matches from `positions` array (lines 331-384)
- Seeded mode: pos1 = positions[i*2], pos2 = positions[i*2+1] — each has .seed
- Manual mode: all positions empty — seed fields stay null
- BYE pre-population to Round 2 (lines 411-426): must also carry seed
- assignPosition(): manual draw function — no seed handling needed (manual has no seeds)

From backend/src/services/tournamentLifecycleService.js:
- advanceBracketSlot(tx, updatedMatch, winnerId) at line 197
- Determines winner side (player1 or player2), writes winnerId to next match
- Must also copy the winner's seed field to the next match

From backend/src/services/tournamentService.js (getMatches, lines 818-839):
- Includes player1/player2 with {id, name} and pair1/pair2 with nested players
- Scalar fields on Match (like player1Seed) are automatically included — no query change needed

From frontend/src/components/BracketMatch.jsx:
- Lines 249, 268: Already has seed-badge rendering but reads from `match.player1?.seed`
- Must change to read from `match.player1Seed` (Match-level field) instead
- For BYE matches: need to determine which seed field has the active player's seed
- PropTypes already declare player1.seed/player2.seed — update to match-level fields
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add seed fields to Match model and populate during bracket creation</name>
  <files>backend/prisma/schema.prisma, backend/src/services/bracketPersistenceService.js</files>
  <action>
1. **Schema migration** — Add four optional Int fields to the Match model in schema.prisma:
   ```
   player1Seed  Int?  // Seed number for player/pair in slot 1 (null = unseeded)
   player2Seed  Int?  // Seed number for player/pair in slot 2 (null = unseeded)
   pair1Seed    Int?  // Seed number for pair in slot 1 (doubles only, null = unseeded)
   pair2Seed    Int?  // Seed number for pair in slot 2 (doubles only, null = unseeded)
   ```
   Place them after the `pair2Id` line, before the `status` field. Run `npx prisma migrate dev --name add-match-seed-fields`.

2. **bracketPersistenceService.js — generateBracket() Round 1 match creation** (lines ~331-384):
   In the Round 1 match creation loop, add seed fields to both the DOUBLES and SINGLES matchData objects:
   - For SINGLES matchData: add `player1Seed: isManual ? null : (pos1?.seed || null)` and `player2Seed: isManual ? null : (pos2?.seed || null)`
   - For DOUBLES matchData: add `pair1Seed: isManual ? null : (pos1?.seed || null)` and `pair2Seed: isManual ? null : (pos2?.seed || null)`
   - player1Seed/player2Seed stay null for DOUBLES, pair1Seed/pair2Seed stay null for SINGLES.

3. **bracketPersistenceService.js — BYE pre-population to Round 2** (lines ~411-426):
   When BYE players are advanced to Round 2 during bracket creation, also carry their seed:
   - In the `byeInfo` collection (line ~378), also store the seed: `seed: pos1?.seed || null`
   - In the Round 2 update loop (lines ~411-426), add seed to the updateData:
     - For SINGLES: if `isPlayer1Slot` add `player1Seed: bye.seed`, else `player2Seed: bye.seed`
     - For DOUBLES: if `isPlayer1Slot` add `pair1Seed: bye.seed`, else `pair2Seed: bye.seed`

4. **bracketPersistenceService.js — assignPosition() BYE auto-advance** (lines ~748-780):
   When a manually assigned player in a BYE-adjacent slot auto-advances to Round 2, no seed is involved (manual mode has no seeds), so no change needed here. Verify this is the case and leave as-is.
  </action>
  <verify>
    <automated>cd D:\Workspace\BATL && npx prisma migrate status && node -e "import('./backend/src/services/bracketPersistenceService.js').then(() => console.log('Import OK'))"</automated>
  </verify>
  <done>Match model has 4 seed fields, migration applied, Round 1 matches get seed values from positions array, BYE auto-advance to Round 2 carries seed forward</done>
</task>

<task type="auto">
  <name>Task 2: Carry seed through match advancement and update frontend display</name>
  <files>backend/src/services/tournamentLifecycleService.js, frontend/src/components/BracketMatch.jsx</files>
  <action>
1. **tournamentLifecycleService.js — advanceBracketSlot()** (lines 197-288):
   After determining the winner side and building `updateData` (lines 277-283), also copy the winner's seed to the next match:
   - Read the winner's seed from the current match: `const winnerSeed = winnerIsPlayer1 ? updatedMatch.player1Seed : updatedMatch.player2Seed;` (for singles) or `const winnerPairSeed = winnerIsPlayer1 ? updatedMatch.pair1Seed : updatedMatch.pair2Seed;` (for doubles).
   - For doubles (winnerPairId truthy, line 278-279): add seed to updateData — `isOdd ? { pair1Id: winnerPairId, pair1Seed: winnerPairSeed } : { pair2Id: winnerPairId, pair2Seed: winnerPairSeed }`
   - For singles (line 281-282): add seed to updateData — `isOdd ? { player1Id: winnerId, player1Seed: winnerSeed } : { player2Id: winnerId, player2Seed: winnerSeed }`
   - Important: the `updatedMatch` parameter comes from Prisma and will include the new scalar fields automatically.

2. **Also check matchResultService.js** for the winner-change cascade path (lines ~444-570). When a winner changes and the old winner is cleared from the next match, the seed must also be cleared. Find where the old winner's slot is set to null and also set the corresponding seed field to null. Look for the `cascadeClearMainBracket` call or direct update that nullifies the old winner — ensure seed fields are cleared alongside.

3. **BracketMatch.jsx — Update seed badge rendering** (lines 249, 268):
   - Line 249 (top player): Change from `(isBye ? byeActivePlayer : match.player1)?.seed` to read from Match-level fields:
     ```jsx
     {(() => {
       const seed = isBye
         ? (match.player1Seed || match.player2Seed || match.pair1Seed || match.pair2Seed)
         : (isDoubles ? match.pair1Seed : match.player1Seed);
       return seed ? <span className="seed-badge">[{seed}]</span> : null;
     })()}
     ```
   - Line 268 (bottom player): Change from `match.player2?.seed` to:
     ```jsx
     {(isDoubles ? match.pair2Seed : match.player2Seed) && <span className="seed-badge">[{isDoubles ? match.pair2Seed : match.player2Seed}]</span>}
     ```
   - Update PropTypes: Remove `seed` from player1/player2 shape. Add match-level seed PropTypes:
     ```
     player1Seed: PropTypes.number,
     player2Seed: PropTypes.number,
     pair1Seed: PropTypes.number,
     pair2Seed: PropTypes.number,
     ```

4. **No change needed to getMatches query** in tournamentService.js — scalar fields on Match are automatically included in Prisma responses.
  </action>
  <verify>
    <automated>cd D:\Workspace\BATL && npx vitest run --reporter=verbose 2>&1 | tail -20</automated>
  </verify>
  <done>Winner seed carries forward to all subsequent rounds. Frontend displays [N] seed badge from Match-level fields for both singles and doubles. BYE matches show the active player's seed. Cleared/changed winners also clear seed fields.</done>
</task>

</tasks>

<verification>
1. Generate a seeded bracket for a tournament with 10+ players — verify Round 1 matches have non-null player1Seed/player2Seed for seeded positions
2. Verify BYE auto-advanced players in Round 2 have their seed carried over
3. Submit a match result — verify the winner's seed appears in the next round match
4. View the bracket in the frontend — seed badges [1], [2], etc. visible next to seeded player names
5. Generate a manual draw — verify all seed fields are null (no badges shown)
</verification>

<success_criteria>
- Seeded players display `[N]` badge in every match they appear in, from Round 1 through the final
- Seed numbers persist through match advancement
- Manual draw brackets show no seed badges
- No regressions in existing bracket generation or match result submission
</success_criteria>

<output>
After completion, create `.planning/quick/3-visually-identify-seeded-players-in-brac/3-SUMMARY.md`
</output>
