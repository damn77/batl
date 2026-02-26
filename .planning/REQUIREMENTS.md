# Requirements: BATL — Amateur Tennis League Manager

**Defined:** 2026-02-26
**Core Value:** A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Match Results

- [ ] **MATCH-01**: Any player participating in a match can submit the match result using a format-aware score entry form that shows the correct inputs based on the tournament's scoring rules (sets, match score, or tiebreak-only)
- [ ] **MATCH-02**: Any player participating in a match can update a previously submitted result, as long as the organizer has not yet modified it
- [ ] **MATCH-03**: Organizer can submit or update the match result for any match at any time
- [ ] **MATCH-04**: Once the organizer modifies a match result, players can no longer update it (organizer-locked)
- [ ] **MATCH-05**: Organizer can enter a result for special outcomes (walkover, forfeit, no-show)

### Tournament Lifecycle

- [ ] **LIFE-01**: Organizer can start a tournament, transitioning it from SCHEDULED to IN_PROGRESS status
- [ ] **LIFE-02**: Starting a tournament automatically closes player registration
- [ ] **LIFE-03**: When the final match result of a tournament is confirmed, the tournament status automatically transitions to COMPLETED
- [ ] **LIFE-04**: When a knockout match result is confirmed, the winner is automatically placed in the correct next-round match slot in the bracket

### Player Statistics

- [ ] **STATS-01**: Player can view their full match history showing tournament name, category, opponent name, score, and match outcome (win/loss)
- [ ] **STATS-02**: Player match history is publicly visible on their player profile page

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Match Results

- **MATCH-V2-01**: Result edit history — log of who changed what and when, visible to organizer

### Tournament Lifecycle

- **LIFE-V2-01**: Organizer can force-complete a tournament even when some matches have no result (handles abandoned tournaments)

### Group Stage

- **GROUP-V2-01**: Organizer can generate a round-robin match schedule from registered players in a group-format tournament
- **GROUP-V2-02**: Group standings table updates automatically as match results are confirmed, applying tiebreaker rules (wins → head-to-head → sets % → games % → alphabetical)
- **GROUP-V2-03**: In a combined format (Group + Knockout) tournament, top N players from each group are automatically advanced into the knockout bracket when the group stage completes

### Swiss System

- **SWISS-V2-01**: Organizer can generate next-round pairings for a Swiss format tournament, pairing players by score while avoiding rematches
- **SWISS-V2-02**: Organizer can advance to the next round after all matches in the current round have results
- **SWISS-V2-03**: Final Swiss standings are displayed after all configured rounds complete

### Player Statistics

- **STATS-V2-01**: Player can view their win/loss record per category per season
- **STATS-V2-02**: Player can view their head-to-head record against specific opponents

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time live scoring (point-by-point) | Requires dedicated scorer at courtside; adds hardware requirement with no proportional v1 payoff |
| Email / push notifications | Infrastructure cost; in-app status is sufficient for v1 |
| Player-to-player messaging | WhatsApp replaced by structured content (results, schedules), not chat |
| Mobile app (native iOS/Android) | Web-first; responsive web covers mobile use cases |
| Waitlist auto-promotion | Registration already has capacity limits; auto-promotion is a v2 quality-of-life feature |
| Payment integration | Entry fees tracked but no online payment in v1 |
| Multiple leagues / federation hierarchy | Single-league scope for v1 |
| ELO / rating system (separate from rankings) | Feature 008 rankings already handles player performance tracking |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MATCH-01 | Phase 1 | Pending |
| MATCH-02 | Phase 1 | Pending |
| MATCH-03 | Phase 1 | Pending |
| MATCH-04 | Phase 1 | Pending |
| MATCH-05 | Phase 1 | Pending |
| LIFE-01 | Phase 2 | Pending |
| LIFE-02 | Phase 2 | Pending |
| LIFE-03 | Phase 2 | Pending |
| LIFE-04 | Phase 2 | Pending |
| STATS-01 | Phase 3 | Pending |
| STATS-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation*
