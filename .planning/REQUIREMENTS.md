# Requirements: BATL

**Defined:** 2026-03-04
**Core Value:** A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group

## v1.3 Requirements

Requirements for v1.3 Manual Draw & QoL milestone. Each maps to roadmap phases.

### Manual Draw

- [x] **DRAW-01**: Organizer can choose "Draw manually" when generating a tournament draw
- [x] **DRAW-02**: Manual draw generates bracket structure with all positions empty (no player auto-placement)
- [x] **DRAW-03**: Organizer can assign a registered player/pair to any empty bracket position from a dropdown
- [x] **DRAW-04**: Position assignment dropdown shows only players/pairs not yet placed in the bracket
- [x] **DRAW-05**: Organizer can clear a filled bracket position back to empty for error correction
- [x] **DRAW-06**: Tournament cannot be started until all registered players/pairs are placed in the bracket

### Tournament Copy

- [x] **COPY-01**: Organizer can create a new tournament by copying an existing tournament's configuration
- [x] **COPY-02**: Copied tournament includes category, rules, format, location, and capacity settings
- [x] **COPY-03**: Copied tournament does not include name, dates, registrations, or draw
- [x] **COPY-04**: Copied tournament is created in SCHEDULED status
- [x] **COPY-05**: Organizer can modify any parameter of the copied tournament after creation

### Tournament Deletion

- [x] **DEL-01**: Organizer can delete a tournament
- [x] **DEL-02**: Deleting a tournament cascades to remove registrations, draw, and match results
- [x] **DEL-03**: User sees a confirmation dialog before deletion with tournament details
- [x] **DEL-04**: Confirmation shows additional highlighted warning for in-progress or completed tournaments
- [x] **DEL-05**: Deleting a completed tournament triggers ranking recalculation for affected categories

### Admin Access Parity

- [x] **ADMIN-01**: Admin user can access all organizer functionality (tournament CRUD, draw, results, registration management)
- [x] **ADMIN-02**: Mixed-role users (Player+Organizer, Player+Admin, Player+Organizer+Admin) can access all functionalities of their combined roles

### Bracket View UX Fixes

- [x] **UX-01**: Middle mouse wheel on bracket view scrolls up/down instead of zooming in/out
- [x] **UX-02**: Submit match modal for pairs shows both pair names at the top of the modal

### Revert to Scheduled

- [x] **REVERT-01**: Organizer can revert a tournament from IN_PROGRESS back to SCHEDULED (COMPLETED tournaments use delete instead)
- [x] **REVERT-02**: Reverting deletes the tournament draw (bracket, rounds, matches)
- [x] **REVERT-03**: Reverting unlocks player registration for the tournament
- [x] **REVERT-04**: Deleting a completed tournament triggers ranking recalculation for affected categories (via DEL-05; completed tournaments cannot be reverted)

## Future Requirements

### Tournament Formats

- **FMT-01**: Group stage visualization and result entry (round-robin matches)
- **FMT-02**: Swiss system pairing and result tracking
- **FMT-03**: Combined format: group stage to knockout with automatic advancement

### Match Guarantees

- **GUAR-01**: MATCH_1 guarantee level (every player gets at least 1 real match)
- **GUAR-02**: UNTIL_PLACEMENT guarantee level (play until final placement determined)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated draw reseeding after manual changes | Adds complexity; manual draw means full organizer control |
| Undo/redo for manual placement | Clear-position covers error correction; full undo is over-engineering |
| Bulk import of bracket positions | Manual placement from dropdown is sufficient for tournament sizes |
| Tournament archival (soft delete) | Hard delete with cascade is simpler and matches user expectations |
| Partial revert (keep registrations, delete draw only) | Full revert to SCHEDULED is cleaner; partial states add complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DRAW-01 | Phase 12 | Complete |
| DRAW-02 | Phase 12 | Complete |
| DRAW-06 | Phase 12 | Complete |
| DRAW-03 | Phase 18 | Complete |
| DRAW-04 | Phase 18 | Complete |
| DRAW-05 | Phase 18 | Complete |
| COPY-01 | Phase 14 | Complete |
| COPY-02 | Phase 14 | Complete |
| COPY-03 | Phase 14 | Complete |
| COPY-04 | Phase 14 | Complete |
| COPY-05 | Phase 14 | Complete |
| DEL-01 | Phase 15 | Complete |
| DEL-02 | Phase 15 | Complete |
| DEL-03 | Phase 15 | Complete |
| DEL-04 | Phase 15 | Complete |
| DEL-05 | Phase 15 | Complete |
| REVERT-01 | Phase 15 | Complete |
| REVERT-02 | Phase 15 | Complete |
| REVERT-03 | Phase 15 | Complete |
| REVERT-04 | Phase 15 | Complete |
| ADMIN-01 | Phase 16 | Complete |
| ADMIN-02 | Phase 16 | Complete |
| UX-01 | Phase 17 | Complete |
| UX-02 | Phase 17 | Complete |

**Coverage:**
- v1.3 requirements: 24 total
- Mapped to phases: 24
- Satisfied: 21
- Pending (gap closure): 3 (DRAW-03, DRAW-04, DRAW-05)
- Unmapped: 0

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 after roadmap creation (v1.3 phases 12–16)*
