---
phase: 03-player-statistics
plan: 02
subsystem: ui
tags: [react, react-bootstrap, react-router, player-profile, match-history, tournaments]

# Dependency graph
requires:
  - phase: 03-01
    provides: "GET /api/v1/players/:id/match-history backend endpoint"
  - phase: 02-01
    provides: "Tournament lifecycle and bracket data consumed by TournamentsListPage"
provides:
  - "Public player profile page at /players/:id — Profile + Match History tabs, no auth required"
  - "Match history table with category filter, sortable columns, pagination, W/L badges"
  - "Completed tournaments list page at /tournaments (public)"
  - "Tournaments navbar link visible to visitors and players"
  - "PlayerPublicProfilePage merged with PlayerProfilePage — own profile detects isOwnProfile and shows edit form"
  - "Player name links in PlayerListPanel navigate to /players/:id"
  - "Clickable tournament names in MatchHistoryTab link to /tournaments/:id"
  - "Server-side sort by tournament name and date in match history"
affects:
  - phase: 03-03
  - "BracketMatch player name links (singles only)"
  - "RankingsTable player name links"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isOwnProfile detection via user.playerId === id for unified public/private profile page"
    - "Accumulated category deduplication pattern: seenIds Set updated inside filter for intra-batch dedup"
    - "Server-side sort via sortBy/sortOrder query params — sent from frontend toggle state"

key-files:
  created:
    - frontend/src/services/playerService.js
    - frontend/src/components/MatchHistoryTab.jsx
    - frontend/src/pages/PlayerPublicProfilePage.jsx
    - frontend/src/pages/TournamentsListPage.jsx
  modified:
    - frontend/src/App.jsx
    - frontend/src/components/NavBar.jsx
    - frontend/src/components/PlayerListPanel.jsx
    - frontend/src/pages/TournamentViewPage.jsx
    - backend/src/api/playerController.js
    - backend/src/services/playerService.js

key-decisions:
  - "PlayerProfilePage merged into PlayerPublicProfilePage: /player/profile redirects to /players/:id, isOwnProfile flag controls edit mode vs read-only public view"
  - "Server-side sort added to match history (sortBy/sortOrder params) so pagination stays correct across all pages"
  - "Category deduplication uses a Set updated inside the batch filter (not just pre-batch) to block intra-page duplicates"
  - "Tournaments breadcrumb in TournamentViewPage now routes completed tournaments to /tournaments for non-organizer users"

patterns-established:
  - "isOwnProfile pattern: compare user.playerId === id param to gate private fields/actions within public profile page"
  - "Accumulated category list: built from paginated match history responses with Set-based dedup covering same-batch duplicates"

requirements-completed:
  - STATS-01
  - STATS-02

# Metrics
duration: 30min
completed: 2026-02-28
---

# Phase 03 Plan 02: Player Statistics Frontend Summary

**Public player profile at /players/:id with paginated match history, sortable columns, and completed tournaments list at /tournaments — merges private and public profile into one page**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-02-28T14:30:00Z
- **Completed:** 2026-02-28T15:00:00Z
- **Tasks:** 3 (2 auto + 1 human-verify with post-checkpoint enhancements)
- **Files modified:** 10

## Accomplishments

- Public player profile page at `/players/:id` with tabbed layout (Profile + Match History), no authentication required
- Match history table with category filter dropdown, clickable sortable columns (Tournament, Date), W/L badges, 20-per-page pagination
- Completed tournaments list at `/tournaments` accessible to all visitors with links to bracket views
- PlayerPublicProfilePage merged with PlayerProfilePage: `/player/profile` redirects to `/players/:id`, own profile shows edit form and private fields
- Player names in PlayerListPanel link to `/players/:id` for singles; doubles members link individually
- Tournaments breadcrumb in TournamentViewPage corrected to use role-aware routing (`/tournaments` for visitors/players, `/organizer/tournaments` for organizers)

## Task Commits

Each task was committed atomically:

1. **Task 1: Frontend playerService + MatchHistoryTab component** - `781f1b5` (feat)
2. **Task 2: PlayerPublicProfilePage, TournamentsListPage, App routes, NavBar link** - `beff184` (feat)
3. **Task 3: Human verify (approved) — post-checkpoint enhancements:**
   - `124de3f` fix(03-02): fix Tournaments breadcrumb link in TournamentViewPage
   - `64ad5e5` fix(03-02): deduplicate categories within same batch in MatchHistoryTab
   - `98713c1` feat(03-02): add tournament links and match date to MatchHistoryTab
   - `609d5f6` feat(03-02): add server-side sort by tournament name and date to match history
   - `9b20566` feat(03-02): link player names to public profiles in PlayerListPanel
   - `e6a6ca7` feat(03-02): merge PlayerProfilePage into PlayerPublicProfilePage

## Files Created/Modified

- `frontend/src/services/playerService.js` - Added `getPlayerMatchHistory()` and `getPublicPlayerProfile()` with sortBy/sortOrder support
- `frontend/src/components/MatchHistoryTab.jsx` - Match history table: category filter, sortable columns, W/L badges, tournament links, date column, pagination
- `frontend/src/pages/PlayerPublicProfilePage.jsx` - Public/own profile with isOwnProfile detection; merged from PlayerProfilePage; /player/profile redirect
- `frontend/src/pages/TournamentsListPage.jsx` - Completed tournaments list with name, category, date, and links to bracket views
- `frontend/src/App.jsx` - Added `/players/:id` and `/tournaments` public routes; removed old PlayerProfilePage import
- `frontend/src/components/NavBar.jsx` - Added Tournaments link visible to visitors and PLAYER role users
- `frontend/src/components/PlayerListPanel.jsx` - Singles names link to /players/:id; doubles members link individually
- `frontend/src/pages/TournamentViewPage.jsx` - Fixed breadcrumb: completed tournaments link to /tournaments, role-aware routing
- `backend/src/api/playerController.js` - Added sortBy/sortOrder validation for match history endpoint
- `backend/src/services/playerService.js` - Added sortBy/sortOrder Prisma orderBy support

## Decisions Made

- **PlayerProfilePage merged into PlayerPublicProfilePage**: Rather than maintaining two separate pages for public vs. own profile, `PlayerPublicProfilePage` detects `isOwnProfile` (via `user.playerId === id`) and conditionally shows edit form and private fields. `/player/profile` redirects to `/players/:id`.
- **Server-side sort**: Column header sort toggles send `sortBy` and `sortOrder` query params to the backend so paginated results remain correctly ordered across page boundaries.
- **Category dedup via intra-batch Set update**: The original implementation only checked already-accumulated categories, allowing the same category to appear multiple times if it appeared multiple times in a single page of results. Fixed by updating `seenIds` inside the filter callback.
- **Tournaments breadcrumb routing**: TournamentViewPage breadcrumb was hardcoded; updated to route completed tournaments to `/tournaments` (public list) for non-organizer users, preserving `/organizer/tournaments` for organizers and admins.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed intra-batch category deduplication in MatchHistoryTab**
- **Found during:** Task 3 (human verification)
- **Issue:** Category filter dropdown accumulated duplicate entries when the same category appeared multiple times within a single page of match results
- **Fix:** Updated the `seenIds` Set inside the filter callback so duplicates within the same batch are also caught
- **Files modified:** `frontend/src/components/MatchHistoryTab.jsx`
- **Committed in:** `64ad5e5`

**2. [Rule 1 - Bug] Fixed Tournaments breadcrumb link in TournamentViewPage**
- **Found during:** Task 3 (human verification)
- **Issue:** Breadcrumb linked back to a role-specific path that non-logged-in users could not access; completed tournaments lacked a valid back link
- **Fix:** Role-aware breadcrumb routing: completed → `/tournaments`; player → `/player/tournaments`; organizer/admin → `/organizer/tournaments`
- **Files modified:** `frontend/src/pages/TournamentViewPage.jsx`
- **Committed in:** `124de3f`

### Enhancements Applied During Verification

**3. [Rule 2 - Enhancement] Added tournament links and date column to MatchHistoryTab**
- **Found during:** Task 3 (human verification)
- **Issue:** Tournament names were plain text; no date column — both fields were already in the API response
- **Fix:** Wrapped tournament names in `<Link to="/tournaments/:id">`; added Date column with completedAt formatted date
- **Files modified:** `frontend/src/components/MatchHistoryTab.jsx`
- **Committed in:** `98713c1`

**4. [Rule 2 - Enhancement] Added server-side sort by tournament name and date**
- **Found during:** Task 3 (human verification)
- **Issue:** Sortable columns needed to be server-side to maintain correct ordering across paginated results
- **Fix:** Added sortBy/sortOrder query params in frontend service; backend controller validates and passes through to Prisma orderBy
- **Files modified:** `frontend/src/components/MatchHistoryTab.jsx`, `frontend/src/services/playerService.js`, `backend/src/api/playerController.js`, `backend/src/services/playerService.js`
- **Committed in:** `609d5f6`

**5. [Rule 2 - Enhancement] Linked player names in PlayerListPanel to public profiles**
- **Found during:** Task 3 (human verification)
- **Issue:** PlayerListPanel showed plain text names; IDs were already in the API response
- **Fix:** Singles names link to `/players/:id`; doubles pair members each link individually
- **Files modified:** `frontend/src/components/PlayerListPanel.jsx`
- **Committed in:** `9b20566`

**6. [Rule 2 - Enhancement] Merged PlayerProfilePage into PlayerPublicProfilePage**
- **Found during:** Task 3 (human verification)
- **Issue:** Two separate profile pages created maintenance overhead and inconsistent experience; own profile had no match history tab
- **Fix:** `isOwnProfile` detection gates private fields and edit form; `/player/profile` redirects to `/players/:id`; Match History tab available on own profile
- **Files modified:** `frontend/src/pages/PlayerPublicProfilePage.jsx`, `frontend/src/App.jsx`
- **Committed in:** `e6a6ca7`

---

**Total deviations:** 2 auto-fixed bugs + 4 enhancements applied during verification
**Impact on plan:** Bug fixes necessary for correctness. Enhancements improved usability using data already available in API responses — no scope creep. Profile page merge eliminated duplicate code.

## Issues Encountered

None — all issues discovered during verification were resolved via deviation rules without blocking progress.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All public navigation paths complete: visitor can reach `/` → `/rankings` → `/tournaments` → `/tournaments/:id` → player profile without logging in
- Match history fully functional with filter, sort, and pagination
- Player public profile serves both public visitors and own-profile edit flow
- Phase 3 Plan 03 (clickable player name links in BracketMatch and RankingsTable) already committed alongside this plan — those links are live

---
*Phase: 03-player-statistics*
*Completed: 2026-02-28*

## Self-Check: PASSED

- FOUND: .planning/phases/03-player-statistics/03-02-SUMMARY.md
- FOUND: frontend/src/services/playerService.js
- FOUND: frontend/src/components/MatchHistoryTab.jsx
- FOUND: frontend/src/pages/PlayerPublicProfilePage.jsx
- FOUND: frontend/src/pages/TournamentsListPage.jsx
- FOUND: 781f1b5 (Task 1 commit)
- FOUND: beff184 (Task 2 commit)
- FOUND: 124de3f, 64ad5e5, 98713c1, 609d5f6, 9b20566, e6a6ca7 (post-checkpoint commits)
