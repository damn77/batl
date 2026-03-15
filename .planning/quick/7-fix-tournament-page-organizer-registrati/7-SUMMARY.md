---
phase: quick-7
plan: 01
subsystem: frontend
tags: [bug-fix, organizer, registration, ux]
dependency_graph:
  requires: []
  provides: [filtered-organizer-dropdown, soft-reload-on-registration]
  affects: [OrganizerRegistrationPanel, TournamentViewPage, PlayerListPanel]
tech_stack:
  added: []
  patterns: [useMemo-filter, refreshKey-counter, SWR-mutate]
key_files:
  created: []
  modified:
    - frontend/src/components/OrganizerRegistrationPanel.jsx
    - frontend/src/pages/TournamentViewPage.jsx
    - frontend/src/components/PlayerListPanel.jsx
decisions:
  - useMemo for filteredEntities to avoid recomputing on every render
  - refreshKey counter pattern for PlayerListPanel (plain useEffect, not SWR)
  - mutateTournament() + setRegistrationVersion() combo covers tournament counts + player list
metrics:
  duration: ~10min
  completed: 2026-03-15T12:50:43Z
  tasks_completed: 2
  files_modified: 3
---

# Quick Task 7: Fix Tournament Page Organizer Registration Panel — Summary

**One-liner:** Client-side filtering of registered/ineligible players from organizer dropdown, plus SWR soft-reload replacing full page reload on registration success.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Filter registered and ineligible players from selection list | 022417c | OrganizerRegistrationPanel.jsx |
| 2 | Replace full page reload with soft-reload via SWR mutate | 3c70bee | TournamentViewPage.jsx, PlayerListPanel.jsx |

## What Was Built

### Task 1 — Filtered Player Dropdown

Added `useMemo`-computed `filteredEntities` in `OrganizerRegistrationPanel.jsx` that derives a clean list from the already-loaded `entities` and `registrations` state.

**Singles filtering (two stages):**
1. Build `registeredPlayerIds` Set from registrations where `status !== 'WITHDRAWN'`
2. Age check: extract minimum age from `category.ageGroup` (e.g. `AGE_35` → 35); skip players with missing `birthDate` or age below minimum
3. Gender check: skip players whose `gender` does not match the category gender when it is not `MIXED`

**Doubles filtering:**
- Build `registeredPairIds` Set from non-WITHDRAWN registrations
- No eligibility filtering (pairs were validated at creation time)

The filtered list is passed to `RegistrationForm` as the `entities` prop (raw `entities` still used for waitlist modal which needs all registered entries).

### Task 2 — Soft-Reload After Registration

**TournamentViewPage.jsx:**
- Added `const [registrationVersion, setRegistrationVersion] = useState(0)` counter
- `onRegistrationComplete` now calls `mutateTournament()` (re-fetches SWR tournament data, updating registration count) and `setRegistrationVersion(v => v + 1)` (triggers PlayerListPanel re-fetch)
- Removed `window.location.reload()` entirely

**PlayerListPanel.jsx:**
- Added `refreshKey` prop
- Added `refreshKey` to the `useEffect` dependency array so the component re-fetches registrations whenever the organizer completes a registration

Combined effect: tournament counts update via SWR, player list updates via refreshKey, organizer dropdown updates via OrganizerRegistrationPanel's internal `loadData()` (already called in the `useRegistration` onSuccess callback). No full page reload needed.

## Deviations from Plan

None — plan executed exactly as written. PlayerListPanel was confirmed to use plain `useEffect` (not SWR), so the `refreshKey` counter approach from the plan was the correct path.

## Success Criteria Check

- [x] No `window.location.reload()` in TournamentViewPage.jsx
- [x] OrganizerRegistrationPanel filters entities by registration status AND category eligibility
- [x] Organizer can register 3+ players in succession without page reload (soft-reload only)

## Self-Check

Files created/modified:
- `frontend/src/components/OrganizerRegistrationPanel.jsx` — MODIFIED (useMemo + filteredEntities)
- `frontend/src/pages/TournamentViewPage.jsx` — MODIFIED (registrationVersion + mutateTournament)
- `frontend/src/components/PlayerListPanel.jsx` — MODIFIED (refreshKey prop + dependency)

Commits:
- 022417c — feat(quick-7): filter registered and ineligible players from organizer dropdown
- 3c70bee — feat(quick-7): replace full page reload with soft-reload after organizer registration

## Self-Check: PASSED
