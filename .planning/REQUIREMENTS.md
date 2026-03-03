# Requirements: BATL v1.1 — Consolation Brackets

**Defined:** 2026-02-28
**Core Value:** A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group

## v1.1 Requirements

Requirements for consolation bracket support (MATCH_2 guarantee level). Each maps to roadmap phases.

### Configuration

- [x] **CONF-01**: Organizer can set Match Guarantee (None / MATCH_2) when creating or editing a knockout tournament

### Draw Generation

- [x] **DRAW-01**: When the main bracket is drawn, the system automatically generates the consolation bracket structure (mirror draw: loser of Main Match N vs loser of Main Match N+1)
- [x] **DRAW-02**: Consolation bracket match slots populate with actual players as main bracket matches complete

### Lifecycle

- [x] **LIFE-01**: When a main bracket match completes, the loser is automatically routed to their consolation slot if their real-match count is less than 2
- [x] **LIFE-02**: BYE matches and walkovers (no-shows/`CANCELLED` outcome matches) are excluded from the "real matches played" count for consolation eligibility
- [x] **LIFE-03**: Consolation bracket winners automatically advance through consolation rounds (same mechanism as main bracket)
- [x] **LIFE-04**: Tournament auto-completes only when all brackets (main + consolation) are fully played
- [x] **LIFE-05**: Player/pair can opt out of consolation participation at any time; opt-out is treated as an automatic forfeit (opponent advances without playing)

### Visualization

- [x] **VIEW-01**: Tournament page displays the consolation bracket alongside the main bracket
- [x] **VIEW-02**: Participants can enter and view results for consolation bracket matches using the existing result modal
- [x] **VIEW-03**: Consolation matches waiting for main bracket outcomes show TBD players and are blocked from result entry

### Points

- [x] **PTS-01**: Point calculation awards consolation bracket points based on the last consolation round the player won (player must win at least 1 consolation match to receive consolation points)
- [x] **PTS-02**: Consolation point tables (`isConsolation=true`) are pre-seeded with values from `notes/013-bracket-points-rules.md` and are admin-editable via the existing Point Tables admin UI

## Future Requirements (v1.2+)

### Guarantee Levels

- **GUAR-01**: MATCH_1 guarantee level — at least 1 real match (edge case: BYE players who lose their first match enter consolation)
- **GUAR-02**: UNTIL_PLACEMENT guarantee — play until bracket placement is fully determined (2 consolation stages)

### Other Formats

- **GROUP-01**: Group stage visualization and result entry (round-robin)
- **SWISS-01**: Swiss system pairing and result tracking
- **COMBO-01**: Combined format: group stage → knockout with automatic advancement

### Player Experience

- **STATS-01**: Win/loss record per category per season, head-to-head view
- **ORG-01**: Organizer dashboard with active tournaments, pending result confirmations
- **AUDIT-01**: Result edit history — log of who changed what and when

## Out of Scope

| Feature | Reason |
|---------|--------|
| MATCH_1 / UNTIL_PLACEMENT guarantee levels | More edge cases; MATCH_2 covers the primary use case. Defer to v1.2. |
| Multiple consolation stages | Required only for UNTIL_PLACEMENT; deferred with that feature |
| Group/Swiss consolation brackets | Format not yet implemented; consolation only for Knockout in v1.1 |
| Real-time live scoring | Results entered after matches, not during |
| Push/email notifications | In-app only |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONF-01 | Phase 4 | Complete |
| DRAW-01 | Phase 4 | Complete |
| DRAW-02 | Phase 5.2 | Complete |
| LIFE-01 | Phase 5 | Complete |
| LIFE-02 | Phase 5 | Complete |
| LIFE-03 | Phase 5.2 | Complete |
| LIFE-04 | Phase 5 | Complete |
| LIFE-05 | Phase 8 | Complete |
| VIEW-01 | Phase 6 | Complete |
| VIEW-02 | Phase 6 | Complete |
| VIEW-03 | Phase 6 | Complete |
| PTS-01 | Phase 8 | Complete |
| PTS-02 | Phase 7 | Complete |

**Coverage:**
- v1.1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-03-03 — PTS-01, LIFE-05 reset to Pending → Phase 8 (3rd audit gap closure)*
