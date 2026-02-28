# Phase 3: Player Statistics - Research

**Researched:** 2026-02-28
**Domain:** React 19 frontend UI (tabs, tables, pagination, routing) + Express 5 backend (new API endpoint for match history)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Match history presentation**
- Table layout (not cards): columns are tournament name, category, opponent, score, W/L outcome
- Default sort: most recent matches first
- Filter by category: dropdown to show matches for one category at a time
- Pagination: 20 matches per page

**Profile page integration**
- New "Match History" tab on the existing player profile page
- No win/loss summary above the table — just the table itself
- Tab is fully public — no login required to view any player's history
- Player names in the knockout bracket and in the rankings table become clickable links to their profile page

**BYE and special outcomes**
- BYE matches are excluded from history entirely (not real matches)
- Pending matches (no result yet): shown in the table with score displayed as "-" and no W/L badge
- Walkovers, forfeits, no-shows: show the outcome label ("Walkover", "Forfeit", "No-show") in the score column instead of a score; W/L badge still applies

**Empty state**
- Simple text message when a player has no matches: "No matches played yet."

**Completed tournaments list (navigation enabler)**
- New public `/tournaments` page listing completed tournaments
- Each row shows: tournament name, category, date, link to bracket/results
- Navigation link in the main navbar visible to all visitors (logged in or not)
- This is the primary path for visitors to discover players and reach profile pages

### Claude's Discretion
- Exact table column widths and responsive behavior on mobile
- W/L badge styling (color/shape — consistent with existing BATL badge patterns)
- Pagination control placement and style
- Category filter dropdown placement relative to the table

### Deferred Ideas (OUT OF SCOPE)
- A richer tournament history page with winner display, participant count, and detailed stats — the /tournaments page in this phase is intentionally minimal (navigation enabler only)
- Win/loss summary stats (overall record, per-category breakdown, win percentage) — user chose not to include in this phase
- Filtering by date range or tournament
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STATS-01 | Player can view their full match history showing tournament name, category, opponent name, score, and match outcome (win/loss) | New GET /api/v1/players/:id/match-history endpoint; new MatchHistoryTab component in profile page |
| STATS-02 | Player match history is publicly visible on their player profile page | Public profile route /players/:id (already exists); public tab on profile page requiring no auth |
</phase_requirements>

---

## Summary

Phase 3 delivers two public-facing features: (1) a match history tab on player profile pages, and (2) a completed tournaments list page. Both are primarily frontend work with one new backend endpoint needed.

The existing codebase already has all the foundational pieces: player profile pages (both own `/player/profile` and organizer view `/organizer/players/:id`), a public `GET /api/v1/players/:id` endpoint, a `GET /api/v1/tournaments` endpoint that supports `status` filtering, and match data stored in the `Match` table with a `result` JSON field. What is needed is a dedicated `GET /api/v1/players/:id/match-history` endpoint (backend), a new `MatchHistoryTab` component, a new public `PlayerPublicProfilePage`, a new `TournamentsListPage`, and routing/navbar changes.

The critical technical challenge is the match history query: it must join Match → Tournament → Category to produce the display rows, determine the opponent (the "other" player or pair), parse the `result` JSON to extract the score and winner, and exclude BYE matches (`isBye: true`). The result JSON schema is already established: `{ winner: 'PLAYER1'|'PLAYER2', submittedBy: 'ORGANIZER'|'PLAYER', sets: [...], outcome: null|'WALKOVER'|'FORFEIT'|'NO_SHOW' }`.

**Primary recommendation:** Add one new backend endpoint `GET /api/v1/players/:id/match-history` that does the match join + result parsing server-side, returning display-ready rows to the frontend. Avoid doing this assembly in the frontend.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.x | Frontend components | Project standard |
| React Bootstrap | 2.10 | UI components (Tab, Table, Badge, Pagination, Form.Select) | Project standard |
| React Router DOM | (existing) | New routes `/tournaments`, `/players/:id` | Project standard |
| Express 5.1.0 | 5.1.0 | New backend route on playerRoutes.js | Project standard |
| Prisma ORM | (existing) | Match history query with joins | Project standard |
| SWR | (existing, used in tournamentViewService) | Data fetching with caching | Project standard for read-heavy pages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Bootstrap Pagination | (part of react-bootstrap 2.10) | 20 matches/page pagination control | For match history table |
| React Bootstrap Nav/Tabs | (part of react-bootstrap 2.10) | Profile page tab switching | Match History tab |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline pagination state | TanStack Table pagination | No new deps needed; 20/page is simple enough to do manually |
| SWR for match history | useState + useEffect | SWR is already used in the project (tournamentViewService.js); use it for consistency |

**Installation:** No new packages required. All needed libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
├── api/
│   ├── routes/playerRoutes.js          # Add GET /:id/match-history route
│   └── playerController.js             # Add getMatchHistoryHandler
├── services/
│   └── playerService.js                # Add getPlayerMatchHistory() function

frontend/src/
├── pages/
│   ├── PlayerPublicProfilePage.jsx     # New: public profile with tabs (accessible to anyone)
│   └── TournamentsListPage.jsx         # New: completed tournaments list
├── components/
│   └── MatchHistoryTab.jsx             # New: match history table with filter + pagination
├── services/
│   └── playerService.js                # Add getPlayerMatchHistory() function
└── App.jsx                             # Add /players/:id and /tournaments routes
```

### Pattern 1: Server-Side Match History Assembly

**What:** The backend builds the complete display row for each match, including opponent name, score string, and W/L label. This avoids sending raw result JSON to the frontend and keeps the parsing logic in one place.

**When to use:** When a query requires joining multiple tables and transforming data (result JSON → score string), it is always better to do this on the server.

**Example — Prisma query for match history:**
```javascript
// Source: project codebase analysis of Match schema + existing getMatches pattern
const matches = await prisma.match.findMany({
  where: {
    OR: [{ player1Id: playerId }, { player2Id: playerId }],
    isBye: false,
    NOT: { status: 'CANCELLED' }
  },
  include: {
    player1: { select: { id: true, name: true } },
    player2: { select: { id: true, name: true } },
    tournament: {
      select: {
        id: true,
        name: true,
        endDate: true,
        category: { select: { id: true, name: true } }
      }
    }
  },
  orderBy: { completedAt: 'desc' }  // most recent first; nulls (pending) last
});
```

**Result JSON parsing — score formatting:**
```javascript
// Source: matchResultService.js — canonical result JSON format is:
// { winner: 'PLAYER1'|'PLAYER2', submittedBy: 'ORGANIZER'|'PLAYER', sets: [...], outcome: null|'WALKOVER'|'FORFEIT'|'NO_SHOW' }

function formatScore(result, playerId, player1Id) {
  if (!result) return '-';  // pending match

  const parsed = JSON.parse(result);

  if (parsed.outcome) {
    // Special outcomes: Walkover, Forfeit, No-show
    const labels = { WALKOVER: 'Walkover', FORFEIT: 'Forfeit', NO_SHOW: 'No-show' };
    return labels[parsed.outcome] || parsed.outcome;
  }

  // Regular score: format as "6-4, 7-5" from sets array
  if (parsed.sets && parsed.sets.length > 0) {
    return parsed.sets.map(s => {
      const p1Score = s.player1Score;
      const p2Score = s.player2Score;
      const isRequestingPlayer1 = playerId === player1Id;
      // Return from perspective of requesting player
      return isRequestingPlayer1 ? `${p1Score}-${p2Score}` : `${p2Score}-${p1Score}`;
    }).join(', ');
  }

  return '-';
}

function determineOutcome(result, playerId, player1Id) {
  if (!result) return null;  // pending — no badge
  const parsed = JSON.parse(result);
  const winnerIsPlayer1 = parsed.winner === 'PLAYER1';
  const requestingPlayerIsPlayer1 = playerId === player1Id;
  const won = winnerIsPlayer1 === requestingPlayerIsPlayer1;
  return won ? 'W' : 'L';
}
```

### Pattern 2: Public Profile Page as New Route

**What:** Rather than making the existing `/player/profile` (auth-required, shows edit controls) public, create a new `PlayerPublicProfilePage` at route `/players/:id`. This is the clean separation already established by the codebase (PlayerProfilePage = own profile, PlayerDetailPage = organizer view).

**When to use:** When a route must be accessible to unauthenticated visitors AND show different content than the auth-protected version.

**Route:** `<Route path="/players/:id" element={<PlayerPublicProfilePage />} />`

**No ProtectedRoute wrapper** — fully public.

### Pattern 3: Tab Pattern (React Bootstrap Nav.Tabs)

**What:** React Bootstrap `<Tab.Container>` with `<Nav>` tabs. The "Match History" tab is the second tab; a first tab shows profile info (public view, read-only).

**Example — React Bootstrap tabs pattern (consistent with existing CategoryRankingsPage nav pattern):**
```jsx
// Source: React Bootstrap 2.10 — Nav.Tabs pattern used in CategoryRankingsPage
import { Tab, Nav } from 'react-bootstrap';

<Tab.Container defaultActiveKey="profile">
  <Nav variant="tabs" className="mb-3">
    <Nav.Item><Nav.Link eventKey="profile">Profile</Nav.Link></Nav.Item>
    <Nav.Item><Nav.Link eventKey="matches">Match History</Nav.Link></Nav.Item>
  </Nav>
  <Tab.Content>
    <Tab.Pane eventKey="profile">
      {/* read-only profile info */}
    </Tab.Pane>
    <Tab.Pane eventKey="matches">
      <MatchHistoryTab playerId={playerId} />
    </Tab.Pane>
  </Tab.Content>
</Tab.Container>
```

### Pattern 4: Client-Side Pagination for 20/page

**What:** The API returns all matches (or a paginated slice). The frontend tracks `currentPage` and slices the array, OR the API accepts `page` and `limit` query parameters. Server-side pagination is preferred for large datasets.

**Recommendation:** Use server-side pagination. The API endpoint accepts `?page=1&limit=20&categoryId=...`. This is consistent with the existing `listTournaments` service which already supports `page` and `limit`.

**Pagination UI — React Bootstrap `<Pagination>`:**
```jsx
// Source: React Bootstrap 2.10 Pagination component
import { Pagination } from 'react-bootstrap';

<Pagination className="mt-3">
  <Pagination.Prev disabled={page === 1} onClick={() => setPage(p => p - 1)} />
  {/* Render page items */}
  <Pagination.Next disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
</Pagination>
```

### Pattern 5: Clickable Player Names (Rankings Table + Bracket)

**What:** Player name cells in `RankingsTable` and `BracketMatch` become `<Link to={/players/${playerId}}>` elements from react-router-dom.

**In RankingsTable.jsx** — the `name` column cell renderer:
```jsx
// Source: react-router-dom Link, playerId available as entry.player.id or entry.pair.player1.id
import { Link } from 'react-router-dom';

cell: info => {
  const entry = info.row.original;
  if (entry.entityType === 'PLAYER') {
    return (
      <Link to={`/players/${entry.player?.id}`}>{entry.player?.name || 'Unknown'}</Link>
    );
  }
  // PAIR: link each player individually
  // ...
}
```

**In BracketMatch.jsx** — the `player-name` span becomes a Link when player has an id:
```jsx
// Source: BracketMatch.jsx — player1/player2 have { id, name } shape from getMatches service
<Link to={`/players/${match.player1?.id}`} className="player-name-link">
  {getPlayerName(match.player1, match.pair1, isDoubles)}
</Link>
```

### Pattern 6: Completed Tournaments List

**What:** A new `TournamentsListPage` at route `/tournaments` that calls the existing `GET /api/v1/tournaments?status=COMPLETED` endpoint. No new backend endpoint needed — the `listTournaments` service already supports `status` filter.

**Navbar change:** Add a "Tournaments" link visible to all users (including non-logged-in). The existing navbar conditionally shows links by role; a non-role-conditional item is added before role-specific sections.

**Example:**
```jsx
// NavBar.jsx — add before role-conditional blocks
<li className="nav-item">
  <span className="nav-link" onClick={() => navigate('/tournaments')} style={{ cursor: 'pointer' }}>
    Tournaments
  </span>
</li>
```

### Anti-Patterns to Avoid

- **Reusing the existing `/player/profile` route for public access:** That page requires PLAYER role auth and shows edit controls. Create a separate `PlayerPublicProfilePage` at `/players/:id`.
- **Parsing result JSON in the frontend:** The `result` field is a raw JSON string. Parse and format server-side in the new API endpoint; return display-ready fields.
- **Filtering BYE matches in the frontend:** The `isBye: true` filter belongs in the Prisma `where` clause, not the frontend display layer.
- **Hardcoding score perspective:** Score must be shown from the viewed player's perspective (their score first). This requires knowing whether the player is player1 or player2 in each match.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab navigation | Custom tab state with div show/hide | React Bootstrap `Tab.Container` + `Nav.Tabs` | Already used in CategoryRankingsPage pattern; built-in accessibility, active state |
| Pagination UI | Custom prev/next buttons | React Bootstrap `<Pagination>` | Handles edge cases (first/last page disabled), styling |
| API caching | Custom fetch + useState | SWR (already installed) | Project already uses SWR in tournamentViewService; handles loading/error/revalidation |
| Score formatting | Custom regex parsing | Server-side formatted `score` string in API response | Keeps formatting logic in one place; frontend just renders the string |

---

## Common Pitfalls

### Pitfall 1: Score Perspective (Player1 vs Player2)
**What goes wrong:** The score `6-4, 7-5` shown from player1's perspective looks like a win, but if the viewed player IS player2, it should display `4-6, 5-7` (loss).
**Why it happens:** The `result` JSON stores scores as `player1Score` and `player2Score` absolutely, not relative to the viewed player.
**How to avoid:** In the backend endpoint, when building each history row, determine whether the requested player is player1 or player2, then format the score from their perspective.
**Warning signs:** Test with a player who played as player2 — their wins will show inverted scores.

### Pitfall 2: Pending Matches (No Result)
**What goes wrong:** Matches with `status: 'SCHEDULED'` or `'IN_PROGRESS'` have `result: null`. Attempting to parse `JSON.parse(null)` throws.
**Why it happens:** Only COMPLETED matches have a result JSON.
**How to avoid:** Guard `if (!result) return '-'` before parsing. Show "-" for score and omit W/L badge.
**Warning signs:** JS TypeError in score formatting function.

### Pitfall 3: The PlayerProfilePage vs PlayerPublicProfilePage Route
**What goes wrong:** Making `/player/profile` public breaks the existing PLAYER-protected route, or sharing the component leads to messy conditional rendering.
**Why it happens:** The existing `PlayerProfilePage` fetches `req.user.playerId` from auth context and shows edit controls.
**How to avoid:** Create a new `PlayerPublicProfilePage` at `/players/:id` that takes the player ID from URL params and only shows read-only info + match history tab.
**Warning signs:** The public profile renders edit buttons, or unauthenticated visitors get redirected to login.

### Pitfall 4: BYE Matches in the History Query
**What goes wrong:** BYE matches (`isBye: true`) appear in match history. They have `player2Id: null` and no real opponent.
**Why it happens:** BYE records are created by the bracket generation and stored as real Match rows.
**How to avoid:** Add `isBye: false` to the Prisma `where` clause in the match history query.
**Warning signs:** History shows rows with "null" opponent or empty score.

### Pitfall 5: Navbar "Tournaments" Link Route Conflict
**What goes wrong:** The new `/tournaments` public route conflicts with the organizer's existing `/organizer/tournaments` navigation entry, causing the wrong page to be reached via the navbar.
**Why it happens:** The navbar conditionally navigates to `/organizer/tournaments` for organizers. The new `/tournaments` is a separate public route.
**How to avoid:** The navbar "Tournaments" link for public visitors goes to `/tournaments` (new page). For organizers/admins, the existing `nav.tournaments` link continues to go to `/organizer/tournaments`. The `/tournaments` route is separate from `/organizer/tournaments`.
**Warning signs:** Organizers land on the read-only list instead of their management page when clicking "Tournaments".

### Pitfall 6: Doubles Match Opponent Resolution
**What goes wrong:** For doubles tournaments, `player1Id` and `player2Id` are the representative players of each pair. The "opponent" display should show the pair names, not individual player names.
**Why it happens:** The match history query returns `player1` and `player2` profile names, but in doubles context these are only the pair representatives.
**How to avoid:** In Phase 3, the CONTEXT.md decisions say "opponent name" for the table column. For SINGLES matches, the opponent is `player1.name` or `player2.name`. For DOUBLES matches, look up `pair1` and `pair2` to get both pair members' names. Include pair relations in the Prisma query. The column can display "A / B" for doubles opponents.
**Warning signs:** Doubles match rows show only one player per side instead of a pair.

---

## Code Examples

Verified patterns from official sources:

### New Backend Endpoint: GET /api/v1/players/:id/match-history

```javascript
// Source: project codebase patterns (playerRoutes.js, matchResultService.js, tournamentService.js)
// Add to playerRoutes.js:
router.get('/:id/match-history', getMatchHistoryHandler);

// playerController.js:
export const getMatchHistoryHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const categoryId = req.query.categoryId || null;

    const result = await getPlayerMatchHistory({ playerId: id, page, limit, categoryId });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Player not found' }
      });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// playerService.js:
export async function getPlayerMatchHistory({ playerId, page = 1, limit = 20, categoryId = null }) {
  // Verify player exists
  const player = await prisma.playerProfile.findUnique({ where: { id: playerId }, select: { id: true, name: true } });
  if (!player) return null;

  const where = {
    OR: [{ player1Id: playerId }, { player2Id: playerId }],
    isBye: false,
    NOT: { status: 'CANCELLED' }
  };

  if (categoryId) {
    where.tournament = { categoryId };
  }

  const total = await prisma.match.count({ where });

  const matches = await prisma.match.findMany({
    where,
    include: {
      player1: { select: { id: true, name: true } },
      player2: { select: { id: true, name: true } },
      pair1: { include: { player1: { select: { id: true, name: true } }, player2: { select: { id: true, name: true } } } },
      pair2: { include: { player1: { select: { id: true, name: true } }, player2: { select: { id: true, name: true } } } },
      tournament: { select: { id: true, name: true, endDate: true, category: { select: { id: true, name: true } } } }
    },
    orderBy: [
      { completedAt: 'desc' },  // completed matches first (most recent)
      { createdAt: 'desc' }      // pending matches after
    ],
    skip: (page - 1) * limit,
    take: limit
  });

  const rows = matches.map(match => {
    const isPlayer1 = match.player1Id === playerId;
    const opponent = isPlayer1 ? match.player2 : match.player1;
    const opponentPair = isPlayer1 ? match.pair2 : match.pair1;

    const opponentName = opponentPair
      ? `${opponentPair.player1.name} / ${opponentPair.player2.name}`
      : (opponent?.name || 'TBD');

    const score = formatMatchScore(match.result, isPlayer1);
    const outcome = determineMatchOutcome(match.result, isPlayer1);

    return {
      matchId: match.id,
      tournamentId: match.tournament.id,
      tournamentName: match.tournament.name,
      category: match.tournament.category,
      opponentName,
      score,        // "6-4, 7-5" or "-" or "Walkover"
      outcome,      // "W", "L", or null (pending)
      completedAt: match.completedAt
    };
  });

  return {
    matches: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}
```

### React Bootstrap Tab Pattern (from project patterns)

```jsx
// Source: React Bootstrap 2.10 — consistent with CategoryRankingsPage Nav.Tabs usage
import { Tab, Nav } from 'react-bootstrap';

// In PlayerPublicProfilePage:
<Tab.Container defaultActiveKey="profile">
  <Nav variant="tabs" className="mb-3">
    <Nav.Item>
      <Nav.Link eventKey="profile">Profile</Nav.Link>
    </Nav.Item>
    <Nav.Item>
      <Nav.Link eventKey="matches">Match History</Nav.Link>
    </Nav.Item>
  </Nav>
  <Tab.Content>
    <Tab.Pane eventKey="profile">
      {/* Player name, gender, etc. — read-only public view */}
    </Tab.Pane>
    <Tab.Pane eventKey="matches">
      <MatchHistoryTab playerId={id} />
    </Tab.Pane>
  </Tab.Content>
</Tab.Container>
```

### W/L Badge (consistent with existing Badge usage)

```jsx
// Source: React Bootstrap 2.10 Badge — consistent with existing RegistrationStatusBadge pattern
import { Badge } from 'react-bootstrap';

// outcome: "W" | "L" | null
{outcome && (
  <Badge bg={outcome === 'W' ? 'success' : 'danger'} pill>
    {outcome}
  </Badge>
)}
```

### TournamentsListPage uses existing listTournaments service

```javascript
// Source: tournamentService.js — listTournaments already accepts status filter
// No new backend endpoint needed
import apiClient from './apiClient.js';

export async function listCompletedTournaments({ page = 1, limit = 20 } = {}) {
  const response = await apiClient.get(`/v1/tournaments?status=COMPLETED&page=${page}&limit=${limit}`);
  return response.data.data;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PlayerProfilePage is auth-only (PLAYER role) | New public PlayerPublicProfilePage at /players/:id | Phase 3 | Public profiles become accessible without login |
| No public tournament list for visitors | New /tournaments page with COMPLETED filter | Phase 3 | Visitors can discover completed tournaments and find player profiles |
| Player names in bracket/rankings are plain text | Player names become clickable links to /players/:id | Phase 3 | Navigation discovery path from tournament bracket → player profile |

**Deprecated/outdated:**
- The "Tournament History" placeholder card in `PlayerProfilePage` (line 387-395) — replace with real data in `PlayerPublicProfilePage`.
- The "Tournament participation tracking will be available" placeholder in `PlayerDetailPage` — remains as-is (out of scope for this phase, that's an organizer view).

---

## Open Questions

1. **Does the public profile page show the player's full name, gender, and other profile fields, or just name?**
   - What we know: CONTEXT.md says "Tab is fully public — no login required to view any player's history". The profile tab content is not explicitly specified.
   - What's unclear: Whether sensitive fields (email, phone, birth date) should be hidden on the public profile.
   - Recommendation: Show only `name` (and optionally category registrations). The existing `getPlayerHandler` already has `isPublic` logic that limits returned fields for unauthenticated callers — reuse this pattern.

2. **Where should the completed-at date come from for sort order — `completedAt` or `tournament.endDate`?**
   - What we know: `Match.completedAt` is set when the result is submitted. Pending matches have `completedAt: null`.
   - What's unclear: Whether pending matches should appear at top or bottom of the list.
   - Recommendation: Sort by `completedAt DESC NULLS LAST` so pending (no result yet) matches appear after all completed matches. The Prisma `orderBy` shown in examples above handles this.

3. **Should the /tournaments public list page show IN_PROGRESS tournaments as well, or only COMPLETED?**
   - What we know: CONTEXT.md says "completed tournaments list" and "link to bracket/results" implies tournament is finished.
   - What's unclear: Whether visitors should be able to see ongoing tournaments.
   - Recommendation: Show COMPLETED only per the locked decision. A future phase can expand to include IN_PROGRESS.

---

## Sources

### Primary (HIGH confidence)
- Project codebase — `backend/prisma/schema.prisma` — Match model with result JSON format, isBye field, player1Id/player2Id relations
- Project codebase — `backend/src/services/matchResultService.js` — Canonical result JSON schema: `{ winner, submittedBy, sets, outcome }`
- Project codebase — `backend/src/services/tournamentService.js` — `listTournaments` supports `status` filter; `getMatches` includes `player1`/`player2` with `{ id, name }`
- Project codebase — `backend/src/api/routes/playerRoutes.js` — Existing player routes pattern for adding `/:id/match-history`
- Project codebase — `frontend/src/pages/PlayerProfilePage.jsx` — Existing profile page to understand what already exists
- Project codebase — `frontend/src/App.jsx` — Router to understand route additions needed
- Project codebase — `frontend/src/components/NavBar.jsx` — Navbar modification pattern
- Project codebase — `frontend/src/components/RankingsTable.jsx` — Table/TanStack pattern; location for clickable player name links
- Project codebase — `frontend/src/components/BracketMatch.jsx` — Location for clickable player name links in bracket
- Project codebase — `frontend/src/services/tournamentViewService.js` — SWR hook pattern used across the project

### Secondary (MEDIUM confidence)
- React Bootstrap 2.10 official docs — Tab.Container, Nav.Tabs, Pagination, Badge components (patterns verified from existing usage in codebase)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire stack already in use, no new dependencies
- Architecture: HIGH — all patterns derived from existing codebase; new endpoint follows established playerRoutes.js pattern
- Pitfalls: HIGH — all pitfalls derived from direct code inspection of result JSON format, Match schema, and existing auth patterns

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable stack, no fast-moving libraries)
