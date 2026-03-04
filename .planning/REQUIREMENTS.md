# Requirements: BATL

**Defined:** 2026-03-04
**Core Value:** A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group

## v1.3 Requirements

Requirements for v1.3 Manual Draw & QoL milestone. Each maps to roadmap phases.

### Manual Draw

- [ ] **DRAW-01**: Organizer can choose "Draw manually" when generating a tournament draw
- [ ] **DRAW-02**: Manual draw generates bracket structure with all positions empty (no player auto-placement)
- [ ] **DRAW-03**: Organizer can assign a registered player/pair to any empty bracket position from a dropdown
- [ ] **DRAW-04**: Position assignment dropdown shows only players/pairs not yet placed in the bracket
- [ ] **DRAW-05**: Organizer can clear a filled bracket position back to empty for error correction
- [ ] **DRAW-06**: Tournament cannot be started until all registered players/pairs are placed in the bracket

### Tournament Copy

- [ ] **COPY-01**: Organizer can create a new tournament by copying an existing tournament's configuration
- [ ] **COPY-02**: Copied tournament includes category, rules, format, location, and capacity settings
- [ ] **COPY-03**: Copied tournament does not include name, dates, registrations, or draw
- [ ] **COPY-04**: Copied tournament is created in SCHEDULED status
- [ ] **COPY-05**: Organizer can modify any parameter of the copied tournament after creation

### Tournament Deletion

- [ ] **DEL-01**: Organizer can delete a tournament
- [ ] **DEL-02**: Deleting a tournament cascades to remove registrations, draw, and match results
- [ ] **DEL-03**: User sees a confirmation dialog before deletion with tournament details
- [ ] **DEL-04**: Confirmation shows additional highlighted warning for in-progress or completed tournaments
- [ ] **DEL-05**: Deleting a completed tournament triggers ranking recalculation for affected categories

### Admin Access Parity

- [ ] **ADMIN-01**: Admin user can access all organizer functionality (tournament CRUD, draw, results, registration management)
- [ ] **ADMIN-02**: Mixed-role users (Player+Organizer, Player+Admin, Player+Organizer+Admin) can access all functionalities of their combined roles

### Revert to Scheduled

- [ ] **REVERT-01**: Organizer can revert a tournament from IN_PROGRESS or COMPLETED back to SCHEDULED
- [ ] **REVERT-02**: Reverting deletes the tournament draw (bracket, rounds, matches)
- [ ] **REVERT-03**: Reverting unlocks player registration for the tournament
- [ ] **REVERT-04**: Reverting a completed tournament triggers ranking recalculation for affected categories

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
| DRAW-01 | — | Pending |
| DRAW-02 | — | Pending |
| DRAW-03 | — | Pending |
| DRAW-04 | — | Pending |
| DRAW-05 | — | Pending |
| DRAW-06 | — | Pending |
| COPY-01 | — | Pending |
| COPY-02 | — | Pending |
| COPY-03 | — | Pending |
| COPY-04 | — | Pending |
| COPY-05 | — | Pending |
| DEL-01 | — | Pending |
| DEL-02 | — | Pending |
| DEL-03 | — | Pending |
| DEL-04 | — | Pending |
| DEL-05 | — | Pending |
| ADMIN-01 | — | Pending |
| ADMIN-02 | — | Pending |
| REVERT-01 | — | Pending |
| REVERT-02 | — | Pending |
| REVERT-03 | — | Pending |
| REVERT-04 | — | Pending |

**Coverage:**
- v1.3 requirements: 22 total
- Mapped to phases: 0
- Unmapped: 22

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 after initial definition*
