# Requirements: BATL — Data Seeding Update

**Defined:** 2026-03-03
**Core Value:** A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group

## v1.2 Requirements

Requirements for seed data update. Each maps to roadmap phases.

### Players

- [ ] **PLAY-01**: Main seed adds 18 real male players from data file with approximate DOBs (30-60 years old)
- [ ] **PLAY-02**: Main seed adds 16 real female players from data file with approximate DOBs (30-60 years old)
- [ ] **PLAY-03**: Existing generic players retained alongside real players for test coverage

### Accounts

- [ ] **ACCT-01**: Erich Siebenstich ml. added as ADMIN user account linked to his player profile
- [ ] **ACCT-02**: Rene Parak added as ORGANIZER user account linked to his player profile
- [ ] **ACCT-03**: Existing generic accounts (admin@batl, organizer@batl, player@batl) kept unchanged

### Pairs

- [ ] **PAIR-01**: All 18 mixed doubles pairs from data file created in Mixed Doubles Open category
- [ ] **PAIR-02**: Existing men's and women's doubles pairs updated to use real players where applicable

### Categories & Tournaments

- [ ] **TOURN-01**: All players registered in "Mixed Doubles Open" (no age limit) category
- [ ] **TOURN-02**: No tournament exists in Mixed Doubles Open — rankings start at 0
- [ ] **TOURN-03**: Pre-generated tournaments placed in age-specific categories (35+, 40+, 50+, etc.)
- [ ] **TOURN-04**: Tournament statuses are a mix of SCHEDULED, IN_PROGRESS, and COMPLETED

### Locations

- [ ] **LOC-01**: All tournament locations replaced with "ProSet" across all seed scripts
- [ ] **LOC-02**: Remove unused generic locations (Central Tennis Club, Riverside, etc.)

### Data Quality

- [ ] **DATA-01**: Mock ranking data uses varied/realistic point values instead of linear 1000/900/800
- [ ] **DATA-02**: Tournament count per player varied instead of hardcoded 5

### Script Cleanup

- [ ] **SCRP-01**: Two seed-active-tournament scripts merged into one
- [ ] **SCRP-02**: Knockout test seed updated to use ProSet location and reference real players
- [ ] **SCRP-03**: Merged active tournament seed updated to use ProSet location and reference real players

## Future Requirements

None — this is a self-contained data quality milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated test data generation | Seed scripts are manual — no need for faker/factory libraries |
| Production data migration | This updates dev seed scripts only, not production data |
| New API endpoints | No backend code changes beyond seed scripts |
| Frontend changes | No UI changes needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAY-01 | Phase 9 | Pending |
| PLAY-02 | Phase 9 | Pending |
| PLAY-03 | Phase 9 | Pending |
| ACCT-01 | Phase 9 | Pending |
| ACCT-02 | Phase 9 | Pending |
| ACCT-03 | Phase 9 | Pending |
| PAIR-01 | Phase 9 | Pending |
| PAIR-02 | Phase 9 | Pending |
| TOURN-01 | Phase 9 | Pending |
| TOURN-02 | Phase 9 | Pending |
| TOURN-03 | Phase 9 | Pending |
| TOURN-04 | Phase 9 | Pending |
| LOC-01 | Phase 9 | Pending |
| LOC-02 | Phase 9 | Pending |
| DATA-01 | Phase 9 | Pending |
| DATA-02 | Phase 9 | Pending |
| SCRP-01 | Phase 9 | Pending |
| SCRP-02 | Phase 9 | Pending |
| SCRP-03 | Phase 9 | Pending |

**Coverage:**
- v1.2 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after initial definition*
