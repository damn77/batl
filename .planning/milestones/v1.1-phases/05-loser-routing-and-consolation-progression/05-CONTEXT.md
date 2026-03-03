# Phase 5: Loser Routing and Consolation Progression - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

When main bracket match results are submitted, losers are automatically placed into their consolation bracket slots if they have not yet played 2 real matches. Consolation winners auto-advance through consolation rounds using the same mechanism as main bracket advancement. The tournament does not complete until all brackets (main + consolation) are fully played. Players/pairs can opt out of consolation at any time before their next consolation match is played.

</domain>

<decisions>
## Implementation Decisions

### Opt-out mechanics
- Either the organizer or the player (logged-in, self-service) can record a consolation opt-out
- Opt-out is allowed any time before the player's next consolation match is played (can be pre-tournament or mid-consolation)
- For doubles: opt-out is pair-level — if one partner opts out, the whole pair withdraws from consolation
- Pre-placement opt-out: if a player opts out before their main bracket match is resolved (before they would be placed in consolation), the system records the opt-out flag and skips consolation placement when it would normally trigger; the consolation opponent receives a walkover/auto-advance

### Real-match counting rules
- **Counts as 0 real matches**: BYE, CANCELLED, FORFEIT (no-show)
- **Counts as 1 real match for both players**: RETIRED (match started but player couldn't finish; partial score recorded)
- **New outcome type required**: RETIRED — match started but one player retired mid-match; records a partial score; the retiring player (loser) is automatically opted out of consolation
- **Threshold for consolation eligibility**: < 2 real matches → routed to consolation; ≥ 2 real matches → not routed

### Consolation slot timing and population
- Consolation placement is **synchronous** with main bracket result submission (same database transaction)
- Partially populated consolation match: one slot filled, other slot shows TBD (match is not playable until both slots are filled or a BYE is detected)
- Consolation slot conflict (slot already occupied when system tries to place a player): reject with error code `CONSOLATION_SLOT_CONFLICT`; do not silently overwrite
- Consolation winner auto-advance reuses the **same mechanism** as main bracket auto-advance (no separate implementation)

### Seeded player / unfillable slot edge case
- When a seeded player has a R1 BYE in main bracket and wins their R2 match:
  - Their R2 opponent has played 2 real matches (R1 win + R2 loss) → not eligible for consolation
  - The R1 BYE position produces no loser → the paired consolation slot is also empty
  - Result: both slots of the corresponding consolation match are permanently unfillable
- System must detect this condition after each main bracket result: if a consolation match will never have a second player (both slots confirmed empty/skipped), mark the consolation match as a BYE and auto-advance the waiting consolation player downstream

### Tournament state during completion
- Tournament status stays **IN_PROGRESS** while consolation is ongoing (no intermediate status when main bracket finishes)
- Organizer actions dependent on final results (e.g., Calculate Points) are **blocked** until tournament status is COMPLETED
- Tournament auto-completes (status → COMPLETED) when all matches across all brackets are in a terminal state: COMPLETED, CANCELLED, or FORFEITED
- MATCH_2 tournaments use **round-based point awards** (furthest round reached per player/pair), not exact placement positions (1st/2nd/3rd/4th); this is consistent with the existing FINAL_ROUND point calculation method in Feature 008

</decisions>

<specifics>
## Specific Ideas

- The RETIRED outcome needs a partial score input — the match result form will need to support entering a partial score alongside the RETIRED result type
- "Real match" is defined as competitive play that actually started; BYE/FORFEIT/CANCELLED are all non-competitive
- The seeded player BYE + 2-match-opponent scenario should be treated as a first-class automated path, not an edge case requiring manual organizer intervention

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-loser-routing-and-consolation-progression*
*Context gathered: 2026-03-01*
