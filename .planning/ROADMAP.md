# Roadmap: BATL — Amateur Tennis League Manager

## Milestones

- ✅ **v1.0 Tournament Core** — Phases 1, 01.1, 2, 3 (shipped 2026-02-28)
- 🚧 **v1.1 Consolation Brackets** — Phases 4–6.1, 7, 8 (in progress)

## Phases

<details>
<summary>✅ v1.0 Tournament Core (Phases 1, 01.1, 2, 3) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: Match Result Submission (3/3 plans) — completed 2026-02-27
- [x] Phase 01.1: Bracket Generation and Seeding Persistence (5/5 plans) — completed 2026-02-28 (INSERTED)
- [x] Phase 2: Tournament Lifecycle and Bracket Progression (2/2 plans) — completed 2026-02-28
- [x] Phase 3: Player Statistics (3/3 plans) — completed 2026-02-28

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

### 🚧 v1.1 Consolation Brackets (In Progress)

**Milestone Goal:** Extend knockout tournaments with a consolation bracket that guarantees every player at least 2 real matches (MATCH_2), running the full loop from configuration through point awards.

- [ ] **Phase 4: Configuration and Consolation Draw** - Organizer selects Match Guarantee; consolation bracket structure generated automatically at draw time
- [x] **Phase 5: Loser Routing and Consolation Progression** - Losers feed into consolation slots; winners advance; tournament completes only when all brackets finish (completed 2026-03-01)
- [x] **Phase 5.1: Consolation Gap Closure** - Closes gaps from v1.1 milestone audit: post-placement opt-out advancement, doubles BYE hardening, slot editor fix, error pattern fix (completed 2026-03-01)
- [x] **Phase 5.2: Doubles Backend Fixes** - Closes 2nd-audit integration breaks: matchResultService winnerId derivation for doubles; consolationOptOutService slot direction fix for doubles opt-out (completed 2026-03-01)
- [ ] **Phase 6: Visualization and Result Entry** - Consolation bracket displayed on tournament page; results enterable; TBD-blocked slots visible; consolation opt-out UI affordance
- [ ] **Phase 6.1: Match Result Resubmission and Bracket Recalculation** - Correct bracket behavior when match results are resubmitted: block non-organizer winner changes, cascade-clear downstream matches, verification popup for impacted later stages
- [x] **Phase 7: Consolation Points** - Consolation point tables seeded and wired into point calculation; admin-editable via existing UI (completed 2026-03-03)
- [ ] **Phase 8: Consolation Bug Fixes** - Fix PTS-01 case mismatch in consolation point calculation and LIFE-05 doubles player self-service opt-out entity key

## Phase Details

### Phase 4: Configuration and Consolation Draw
**Goal**: Organizer can configure Match Guarantee on a tournament and, at draw time, the consolation bracket structure is automatically generated as a mirror draw alongside the main bracket
**Depends on**: v1.0 (bracketPersistenceService, KnockoutFormatConfigSchema, Bracket/Round/Match DB models already in place)
**Requirements**: CONF-01, DRAW-01
**Success Criteria** (what must be TRUE):
  1. Organizer sees a Match Guarantee field (None / MATCH_2) on the tournament create/edit form and can save it
  2. When a MATCH_2 tournament draw is executed, a CONSOLATION bracket record is created alongside the MAIN bracket with the correct mirror-draw match structure (loser of Main Match N vs loser of Main Match N+1)
  3. An existing tournament with Match Guarantee = None generates only a MAIN bracket when drawn (backward-compatible behavior unchanged)
  4. The formatConfig matchGuarantee value is read by bracketPersistenceService rather than hardcoded to MATCH_1
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Update KnockoutConfigPanel dropdown (MATCH_2 default, Until Placement disabled option)
- [ ] 04-02-PLAN.md — bracketPersistenceService reads formatConfig; generates CONSOLATION bracket for MATCH_2 draws

### Phase 5: Loser Routing and Consolation Progression
**Goal**: Main bracket losers are automatically placed in their consolation slots when they have not yet played 2 real matches; consolation winners advance through consolation rounds; the tournament does not complete until all brackets are fully played
**Depends on**: Phase 4
**Requirements**: DRAW-02, LIFE-01, LIFE-02, LIFE-03, LIFE-04, LIFE-05
**Success Criteria** (what must be TRUE):
  1. When a main bracket match result is submitted, the loser is automatically placed in the corresponding consolation bracket slot if they have played fewer than 2 real matches
  2. BYE matches (isBye=true) and matches with a CANCELLED outcome are not counted toward a player's real-match total for consolation eligibility
  3. A player who lost their first main bracket match after receiving a BYE is routed to consolation because they have only 1 real match
  4. When a consolation match result is submitted, the winner automatically advances to the next consolation round (same auto-advance mechanism as the main bracket)
  5. A tournament in MATCH_2 mode remains IN_PROGRESS until all consolation matches have been played; submitting the main bracket final result alone does not trigger auto-completion
  6. A player/pair can opt out of consolation participation at any time; the opt-out is recorded as an automatic forfeit (opponent advances without playing)
**Plans**: 6 plans

Plans:
- [ ] 05-01-PLAN.md — Schema migration: add RETIRED to MatchStatus enum, add ConsolationOptOut model; update matchValidator
- [ ] 05-02-PLAN.md — consolationEligibilityService: real-match counting, loser routing, auto-BYE detection; updated tournament completion check
- [ ] 05-03-PLAN.md — Consolation opt-out API: POST /:id/consolation-opt-out endpoint with player/organizer authorization
- [ ] 05-04-PLAN.md — GAP: Fix advanceBracketSlot updateData doubles/singles branch (P2003 FK blocker)
- [ ] 05-05-PLAN.md — GAP: Add RETIRED option + partial score fields to MatchResultModal
- [ ] 05-06-PLAN.md — GAP: Create ConsolationOptOutPanel and mount in TournamentViewPage for MATCH_2

### Phase 5.1: Consolation Gap Closure
**Goal**: Close the three unsatisfied/partial gaps identified in the v1.1 milestone audit — post-placement opt-out opponent advancement (LIFE-05), doubles auto-BYE consolation progression hardening (DRAW-02/LIFE-03), consolation slot visibility in the draw UI, and error handling in the tournament rules setup page
**Depends on**: Phase 5
**Requirements**: LIFE-05, DRAW-02, LIFE-03
**Gap Closure:** Closes gaps from v1.1 milestone audit (2026-03-01)
**Success Criteria** (what must be TRUE):
  1. A player/pair who opts out of consolation AFTER being placed in a consolation slot causes the opponent to advance automatically (BYE/forfeit treatment)
  2. Doubles auto-BYE consolation advancement works correctly — the waiting opponent advances when their consolation match partner is a pre-draw BYE (solePlayerId derivation hardened)
  3. The draw UI slot editor shows consolation bracket match slots alongside MAIN bracket slots, allowing organizers to manually assign players
  4. TournamentRulesSetupPage error handling uses the BATL apiClient pattern (`err.message`/`err.code`); FORMAT_CHANGE_NOT_ALLOWED code check fires correctly
  5. `'RETIRED'` removed from consolationEligibilityService status IN clause (dead code cleanup); 05-02-SUMMARY.md has correct `requirements-completed` frontmatter
**Plans**: 1 plan

Plans:
- [ ] 05.1-01-PLAN.md — All gap closure tasks: post-placement opt-out advancement, doubles BYE solePlayerId hardening, RETIRED dead code removal, slot editor bracket selection, TournamentRulesSetupPage error pattern, 05-02-SUMMARY frontmatter

### Phase 5.2: Doubles Backend Fixes
**Goal**: Close two remaining integration breaks found in the 2nd v1.1 audit: (1) matchResultService derives winnerId from player1Id/player2Id which is null for doubles — fix to prefer pair1Id/pair2Id; (2) consolationOptOutService calls advanceBracketSlot with null resultJson so advancing opponent always lands in pair2 slot — fix to derive slot direction from opponentId's actual position in currentMatch
**Depends on**: Phase 5.1
**Requirements**: DRAW-02, LIFE-03, LIFE-05 (partial)
**Gap Closure:** Closes BREAK 1 and BREAK 2 from v1.1 2nd-audit
**Success Criteria** (what must be TRUE):
  1. Submitting a doubles main bracket result advances the correct winner in the consolation slot (winnerId is derived from pair1Id/pair2Id when available)
  2. A doubles pair that opts out post-placement causes their opponent to advance into the correct slot (pair1 or pair2) rather than always pair2
  3. Existing singles behavior is unaffected
**Plans**: 1 plan

Plans:
- [ ] 05.2-01-PLAN.md — BREAK 1: winnerId derivation for doubles (pair1Id/pair2Id preference); BREAK 2: advanceBracketSlot slot direction from opponentId position when resultJson is null

### Phase 6: Visualization and Result Entry
**Goal**: The tournament page shows the consolation bracket alongside the main bracket; participants can submit and view consolation match results; matches waiting on main bracket outcomes are visually blocked; organizers/players can trigger consolation opt-out via a UI button
**Depends on**: Phase 5.2
**Requirements**: VIEW-01, VIEW-02, VIEW-03, LIFE-05 (final close)
**Success Criteria** (what must be TRUE):
  1. The tournament detail page renders both the main bracket and consolation bracket (using the existing KnockoutBracket component), with a clear tab or section separator between them
  2. A participant can open the result entry modal for a consolation match and submit a score, which is saved and reflected in the bracket view
  3. Consolation matches whose player slots are not yet determined (awaiting main bracket outcomes) display "TBD" for each unresolved player name and disable the result entry action
  4. An organizer or player can trigger consolation opt-out via a UI button/affordance on the tournament page, which calls the existing POST /api/v1/tournaments/:id/consolation-opt-out endpoint (closes LIFE-05 BREAK 3)
**Plans**: 1 plan

Plans:
- [ ] 06-01-PLAN.md — TBD styling for unresolved match slots; organizer opt-out accordion collapse; ConsolationOptOutPanel repositioned below bracket section

### Phase 6.1: Match Result Resubmission and Bracket Recalculation
**Goal**: When a match result is resubmitted, correctly handle bracket state across both main and consolation brackets — block non-organizer winner changes, cascade-clear downstream matches when the winner changes, and prompt organizer verification when later stages have already been played
**Depends on**: Phase 6
**Requirements**: Acceptance criteria from notes/bracket-behaviour.md
**Success Criteria** (what must be TRUE):
  1. A non-organizer attempting to resubmit a match result with a different winner is blocked with a warning message informing them only an organizer can make such a change
  2. When same winner is resubmitted (score correction only), only the score is updated — no bracket recalculation occurs
  3. When an organizer changes the winner of a main bracket match and impacted players have NOT finished playing later stages, both brackets are recalculated: old winner is cleared from downstream main bracket slots, new winner is advanced, and consolation routing is corrected
  4. When an organizer changes the winner of a main bracket match and impacted players HAVE finished playing later stages, a verification/confirmation popup appears before proceeding; upon confirmation, later stages of both brackets are cleared and recalculated
  5. When a consolation bracket match result is resubmitted with a different winner, impacted downstream consolation matches (1 per round) are identified and cascade-cleared before advancing the new winner
  6. When a player enters the consolation bracket and the paired opponent is not eligible (forfeit, opt-out, or BYE origin), the match is updated with a BYE result and the eligible player advances — player positions (P1/P2) correspond to correct bracket positions
**Plans**: 2 plans

Plans:
- [ ] 06.1-01-PLAN.md — Backend: non-organizer winner-change block, main+consolation cascade-clear, dry-run impact detection, score-only passthrough
- [ ] 06.1-02-PLAN.md — Frontend: MatchResultModal pre-fill, winner-lock for non-organizers, dry-run call + confirmation popup for organizer winner changes

### Phase 7: Consolation Points
**Goal**: Consolation bracket point tables are seeded with the correct values and wired into point calculation so players who win at least one consolation match receive consolation points based on their final consolation round
**Depends on**: Phase 6.1
**Requirements**: PTS-01, PTS-02
**Success Criteria** (what must be TRUE):
  1. The database contains pre-seeded PointTable rows with isConsolation=true matching values from the spec (notes/013-bracket-points-rules.md)
  2. An organizer running point calculation for a completed MATCH_2 tournament sees consolation points awarded to players who won at least one consolation match
  3. A player who lost all consolation matches (zero consolation wins) receives no consolation points
  4. An admin can view and edit consolation point table values in the existing Point Tables admin UI without any code change
**Plans**: 1 plan

Plans:
- [ ] 07-01-PLAN.md — deriveConsolationResults service + calculate-points endpoint auto-includes consolation results for MATCH_2 tournaments

### Phase 8: Consolation Bug Fixes
**Goal**: Fix two runtime bugs that break E2E flows: consolation point calculation case mismatch (PTS-01) and doubles player self-service opt-out sending wrong entity key (LIFE-05)
**Depends on**: Phase 7
**Requirements**: PTS-01, LIFE-05
**Gap Closure:** Closes gaps from v1.1 milestone audit (2026-03-03)
**Success Criteria** (what must be TRUE):
  1. `deriveConsolationResults()` correctly identifies consolation match winners by comparing against uppercase `'PLAYER1'`/`'PLAYER2'` values stored in `resultJson.winner`
  2. Point calculation for a completed MATCH_2 tournament awards consolation points to players who won consolation matches (no longer returns empty array)
  3. `ConsolationOptOutPanel` in player self-service mode sends `{ pairId: <uuid> }` for doubles tournaments instead of `{ playerId: <uuid> }`
  4. Doubles players can successfully self-opt-out of consolation and the opt-out is recognized by loser-routing logic
**Plans**: 1 plan

Plans:
- [ ] 08-01-PLAN.md — Fix deriveConsolationResults case mismatch (PTS-01) + ConsolationOptOutPanel doubles entity key (LIFE-05)

## Progress

**Execution Order:**
Phases execute in numeric order: 4 → 5 → 5.1 → 5.2 → 6 → 6.1 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Match Result Submission | v1.0 | 3/3 | Complete | 2026-02-27 |
| 01.1. Bracket Generation and Seeding Persistence | v1.0 | 5/5 | Complete | 2026-02-28 |
| 2. Tournament Lifecycle and Bracket Progression | v1.0 | 2/2 | Complete | 2026-02-28 |
| 3. Player Statistics | v1.0 | 3/3 | Complete | 2026-02-28 |
| 4. Configuration and Consolation Draw | v1.1 | 2/2 | Complete | 2026-03-01 |
| 5. Loser Routing and Consolation Progression | 6/6 | Complete   | 2026-03-03 | - |
| 5.1. Consolation Gap Closure | v1.1 | 1/1 | Complete | 2026-03-01 |
| 5.2. Doubles Backend Fixes | v1.1 | 1/1 | Complete | 2026-03-01 |
| 6. Visualization and Result Entry | v1.1 | 0/1 | Not started | - |
| 6.1. Match Result Resubmission and Bracket Recalculation | 1/2 | In Progress|  | - |
| 7. Consolation Points | 1/1 | Complete   | 2026-03-03 | - |
| 8. Consolation Bug Fixes | v1.1 | 0/1 | Not started | - |
