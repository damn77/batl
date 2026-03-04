---
phase: quick
plan: 1
subsystem: tournament-management
tags: [validation, backend, frontend, i18n, ux]
dependency_graph:
  requires: []
  provides: [backdated-tournament-creation]
  affects: [tournament-setup-page, tournament-service]
tech_stack:
  added: []
  patterns: [conditional-warning-alert, helper-function]
key_files:
  created: []
  modified:
    - backend/src/services/tournamentService.js
    - frontend/src/pages/TournamentSetupPage.jsx
    - frontend/src/i18n/locales/en.json
    - frontend/src/i18n/locales/sk.json
decisions:
  - "Warn rather than block: show yellow Alert when past date selected instead of preventing selection"
  - "Place warning after DatePicker row and before Club Name field in both modals for contextual relevance"
  - "Default start date changed from tomorrow to today to match use case of recording same-day events"
metrics:
  duration: "~2.5 minutes"
  completed_date: "2026-03-04"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 4
---

# Quick Plan 1: Allow Backdated Tournament Start Dates — Summary

**One-liner:** Removed future-date enforcement from backend `createTournament()` and replaced frontend `minDate` restriction with a conditional warning Alert in both create/edit modals.

## What Was Built

Organizers can now create tournaments with past start dates. A yellow warning banner appears when the selected start date is in the past, informing the organizer the tournament will be recorded as a backdated event. Future-dated tournaments work identically to before.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove future-date enforcement from backend and frontend | 7609975 | tournamentService.js, TournamentSetupPage.jsx, en.json, sk.json |

## Changes Made

### Backend (`backend/src/services/tournamentService.js`)

- Removed `const now = new Date()` variable
- Removed the `if (start < now)` block that threw `INVALID_START_DATE` (400 error)
- End-date validation (`end < start` throws `INVALID_DATE_RANGE`) is preserved

### Frontend (`frontend/src/pages/TournamentSetupPage.jsx`)

- Changed `handleCreateClick()` default dates from `tomorrow` to `new Date()` (today)
- Removed `tomorrow` variable entirely
- Removed `minDate={new Date()}` from Create Modal start date DatePicker
- Removed `minDate={new Date()}` from Edit Modal start date DatePicker
- Added `isPastDate(date)` helper function (compares midnight-normalized dates)
- Added `{isPastDate(formData.startDate) && <Alert variant="warning">...</Alert>}` in Create Modal (after DatePicker row, before Club Name field)
- Added same warning Alert in Edit Modal at the same position

### Translations

- `frontend/src/i18n/locales/en.json`: Added `"warnings": { "pastStartDate": "The start date is in the past. This tournament will be created as a backdated event." }`
- `frontend/src/i18n/locales/sk.json`: Added `"warnings": { "pastStartDate": "Datum zaciatku je v minulosti. Turnaj bude vytvoreny ako spatne datovana udalost." }`

## Verification Results

| Check | Expected | Result |
|-------|----------|--------|
| `grep -c "INVALID_START_DATE" tournamentService.js` | 0 | 0 |
| `grep -c "minDate={new Date()}" TournamentSetupPage.jsx` | 0 | 0 |
| `grep -c "isPastDate" TournamentSetupPage.jsx` | >= 3 | 3 |
| `grep -c "pastStartDate" en.json` | 1 | 1 |
| `grep -c "pastStartDate" sk.json` | 1 | 1 |
| Backend module loads | OK | OK |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `backend/src/services/tournamentService.js` — modified, INVALID_START_DATE removed
- `frontend/src/pages/TournamentSetupPage.jsx` — modified, isPastDate helper + warning Alerts added
- `frontend/src/i18n/locales/en.json` — modified, warnings.pastStartDate added
- `frontend/src/i18n/locales/sk.json` — modified, warnings.pastStartDate added
- Commit 7609975 exists on branch `q001-tournament-start-date-validation-fix`
