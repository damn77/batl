---
phase: 16-admin-access-parity
plan: 02
subsystem: ui
tags: [react, navbar, role-based-access, admin]

# Dependency graph
requires:
  - phase: 16-admin-access-parity plan 01
    provides: ADMIN superuser bypass in ProtectedRoute enabling ADMIN to reach player routes
provides:
  - NavBar with ADMIN-specific section showing organizer + admin-only + player links with separators
  - Player nav "Registrations" label (renamed from "Tournaments") for /player/tournaments
  - Admin warning banners on player-facing pages when no player profile is linked
  - Safe /player/profile route that shows Alert instead of redirecting to /players/null
affects: [any phase touching NavBar, player pages, or admin navigation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin warning banner pattern: check user?.role === 'ADMIN' && !user?.playerId before showing contextual warning"
    - "NavBar section separator: navbar-text li element with pipe character for visual grouping"

key-files:
  created: []
  modified:
    - frontend/src/components/NavBar.jsx
    - frontend/src/App.jsx
    - frontend/src/pages/TournamentRegistrationPage.jsx
    - frontend/src/pages/PlayerRegistrationPage.jsx
    - frontend/src/pages/PairRegistrationPage.jsx

key-decisions:
  - "Admin player-facing links use hardcoded 'Registrations' label (not t('nav.tournaments')) to avoid affecting other usages of that translation key"
  - "No duplicate Doubles Pairs link in admin section — already present in organizer section which is also shown for ADMIN"
  - "Admin warning banner gated on user?.role === 'ADMIN' only, not ORGANIZER (ORGANIZER has their own player link flow)"
  - "PLAYER section condition remains user.role === 'PLAYER' — ADMIN gets player links via admin-only section instead"

patterns-established:
  - "Admin section separator: <li className='navbar-text text-white-50 small px-2' style={{ opacity: 0.6 }}>|</li>"
  - "Null-safe profile navigation: user?.playerId conditional before Navigate to prevent /players/null"

requirements-completed: [ADMIN-01, ADMIN-02]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 16 Plan 02: NavBar Admin Access Parity Summary

**NavBar restructured with admin-only section (Users, Point Tables, Registrations, Categories) with visual separators, player nav renamed to Registrations, and admin warning banners on all three player pages**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T20:14:38Z
- **Completed:** 2026-03-04T20:17:08Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint — awaiting verification)
- **Files modified:** 5

## Accomplishments
- NavBar shows full navigation for ADMIN: organizer section + pipe separator + Users + Point Tables + pipe separator + Registrations + Categories
- PLAYER section "Tournaments" link renamed to "Registrations" (distinct hardcoded string, not sharing translation key)
- Admin warning banner added to TournamentRegistrationPage, PlayerRegistrationPage, and PairRegistrationPage — shown only when ADMIN role with no player profile
- `/player/profile` route guards against null playerId — shows Alert instead of navigating to `/players/null`

## Task Commits

Each task was committed atomically:

1. **Task 1: NavBar admin sections, player links, and Registrations rename** - `3ec167a` (feat)
2. **Task 2: Admin warning banner on player pages and /player/profile null guard** - `cf252bd` (feat)
3. **Task 3: Verify admin access parity** - awaiting human verification (checkpoint:human-verify)

## Files Created/Modified
- `frontend/src/components/NavBar.jsx` - Added ADMIN-only nav section with pipe separators, renamed PLAYER "Tournaments" to "Registrations"
- `frontend/src/App.jsx` - Added Alert import, null-guard for /player/profile route
- `frontend/src/pages/TournamentRegistrationPage.jsx` - Admin warning banner at top of page content
- `frontend/src/pages/PlayerRegistrationPage.jsx` - Admin warning banner above error/success alerts
- `frontend/src/pages/PairRegistrationPage.jsx` - Admin warning banner as first Row after title

## Decisions Made
- Admin player-facing links use hardcoded "Registrations" label (not `t('nav.tournaments')`) to avoid changing other usages of that translation key per Pitfall 5 from research
- No duplicate Doubles Pairs link in the ADMIN section — the organizer section (also shown for ADMIN) already contains it
- Admin warning banner gated strictly on `user?.role === 'ADMIN'` — not shown for ORGANIZER per plan spec (Pitfall 2)
- PLAYER section condition remains `user.role === 'PLAYER'` — ADMIN gets player links via the separate admin-only section

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- All auto tasks complete, awaiting human verification (Task 3 checkpoint)
- Human verifier should log in as ADMIN and confirm: full navbar sections visible, all pages accessible, warning banners appear, /player/profile shows warning not null redirect
- After verification: phase 16 is complete

---
*Phase: 16-admin-access-parity*
*Completed: 2026-03-04*
