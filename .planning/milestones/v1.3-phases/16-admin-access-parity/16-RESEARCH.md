# Phase 16: Admin Access Parity - Research

**Researched:** 2026-03-04
**Domain:** Frontend route access control, backend CASL authorization, React navigation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Route Access — ProtectedRoute Auto-Include**
- Change ProtectedRoute component so ADMIN automatically passes any `requiredRole` check (superuser pattern)
- ADMIN bypasses ALL role checks — ORGANIZER, PLAYER, any future role
- ADMIN visiting /organizer/dashboard sees OrganizerDashboard (not redirected)
- Simplify existing `requiredRoles={['ORGANIZER', 'ADMIN']}` arrays to single `requiredRole='ORGANIZER'` across all routes — auto-include handles ADMIN
- ADMIN redirects to /admin/dashboard after login (current role-based redirect behavior)
- Full audit of both frontend routes AND backend middleware for any role gaps
- Non-authenticated users redirect to login page (current behavior, no change)

**Mixed-Role Interpretation**
- ADMIN = superuser — no multi-role schema change needed
- Single `role` string field stays: PLAYER, ORGANIZER, or ADMIN
- ADMIN-02 requirement wording should be updated to reflect that ADMIN superuser satisfies the mixed-role intent
- ADMIN can access player-specific pages; show warning banner if no PlayerProfile linked ("You are viewing as admin — no player profile linked")
- Organizer-as-player: verify existing flow works — ORGANIZER with PlayerProfile can register for tournaments, submit results, and see "My Match" on bracket view
- ORGANIZER can self-register for tournaments via player registration page OR organizer registration management — either path should work

**Navigation**
- Add admin-only links (Users, Point Tables) inline in navbar after organizer links
- Visual separator between organizer links and admin-only links (divider or label)
- ADMIN sees admin dashboard link only in nav (not both admin + organizer dashboard)
- ADMIN sees all role nav links: organizer section + admin section + player section
- Rename player "Tournaments" nav link to "Registrations" (currently duplicates the public Tournaments link)

**Endpoint Auth**
- Add CASL `authorize('create', 'Tournament')` middleware to `seedingPlacementRoutes` POST /generate-bracket
- Full endpoint auth audit across all route files — document findings in plan
- Keep bracket structure endpoints (GET /brackets/structure, GET /brackets/seeding) public — read-only, no sensitive data
- Document all endpoints checked and gaps found/fixed

### Claude's Discretion
- Exact styling of admin nav separator (divider vs label)
- Warning banner design for admin on player pages without profile
- Any additional auth gaps found during endpoint audit — fix approach

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADMIN-01 | Admin user can access all organizer functionality (tournament CRUD, draw, results, registration management) | ProtectedRoute superuser pattern + endpoint auth audit covers all organizer-protected routes and actions |
| ADMIN-02 | Mixed-role users (Player+Organizer, Player+Admin, Player+Organizer+Admin) can access all functionalities of their combined roles | Satisfied by ADMIN superuser pattern; organizer-as-player flow already works for ORGANIZER+PlayerProfile users |

</phase_requirements>

## Summary

Phase 16 is an access control correctness fix, not a new feature. The backend is already largely correct — CASL's `can('manage', 'all')` for ADMIN means any `authorize()` call passes. The main gaps are on the frontend: `ProtectedRoute` uses exact-match role checks that block ADMIN from organizer and player routes, and the navbar does not expose admin-only links (Users, Point Tables) for ADMIN users.

One confirmed backend gap exists: `POST /api/v1/seeding/generate-bracket` in `seedingPlacementRoutes.js` has no `isAuthenticated` or `authorize` middleware at all. This is the only route in the system with a state-changing operation completely unprotected. All other write routes correctly use `isAuthenticated` + `authorize()` from the CASL middleware. The `rankingRoutes.js` uses `authorize` imported from `auth.js` (the `hasRole` alias) rather than CASL's `authorize` — this is intentional for ADMIN-only operations and is correct.

The organizer-as-player flow (ORGANIZER with a linked PlayerProfile) already works at the backend level. The frontend currently hides player nav links from ORGANIZER role users, which means they have no navigation path to the `/player/tournaments` registration page or "My Match" navigation in bracket view. The CONTEXT.md decision to show all nav sections for ADMIN also resolves this for the ADMIN-plays-in-tournament scenario.

**Primary recommendation:** Modify `ProtectedRoute` to auto-pass ADMIN for any role check, update `NavBar` to show admin + organizer + player sections for ADMIN users with a separator, add auth middleware to `seedingPlacementRoutes`, and simplify `requiredRoles` arrays in App.jsx to single-role.

## Standard Stack

### Core (already in use — no new dependencies)
| Component | Current Location | Purpose |
|-----------|-----------------|---------|
| React Router DOM | `frontend/src/App.jsx` | Route definitions with `ProtectedRoute` wrapper |
| `ProtectedRoute` | `frontend/src/components/ProtectedRoute.jsx` | Role-gated route access |
| `NavBar` | `frontend/src/components/NavBar.jsx` | Navigation with role-conditional links |
| CASL `authorize` | `backend/src/middleware/authorize.js` | CASL-based route middleware |
| `isAuthenticated` | `backend/src/middleware/auth.js` | Passport.js session check |
| `AuthContext` | `frontend/src/utils/AuthContext.jsx` | User state: `user.role`, `user.playerId` |

No new packages required. All changes are to existing files.

## Architecture Patterns

### Pattern 1: ProtectedRoute Superuser Check
**What:** Insert an early-exit `if (user?.role === 'ADMIN') return children` before any role check logic.
**When to use:** Any time a route has a `requiredRole` or `requiredRoles` constraint.

**Current logic (lines 29-39 of ProtectedRoute.jsx):**
```jsx
// Check role requirements
if (requiredRole && user?.role !== requiredRole) {
  const redirectPath = getRoleBasedPath(user?.role);
  return <Navigate to={redirectPath} replace />;
}

// Check if user has any of the required roles
if (requiredRoles.length > 0 && !requiredRoles.includes(user?.role)) {
  const redirectPath = getRoleBasedPath(user?.role);
  return <Navigate to={redirectPath} replace />;
}
```

**Modified logic:**
```jsx
// ADMIN is superuser — bypasses all role checks
if (user?.role === 'ADMIN') {
  return children;
}

// Check role requirements
if (requiredRole && user?.role !== requiredRole) {
  const redirectPath = getRoleBasedPath(user?.role);
  return <Navigate to={redirectPath} replace />;
}

// Check if user has any of the required roles
if (requiredRoles.length > 0 && !requiredRoles.includes(user?.role)) {
  const redirectPath = getRoleBasedPath(user?.role);
  return <Navigate to={redirectPath} replace />;
}
```

This is the single change point for ADMIN-01 frontend access.

### Pattern 2: App.jsx Route Simplification
**What:** After ProtectedRoute gains ADMIN auto-include, `requiredRoles={['ORGANIZER', 'ADMIN']}` arrays become `requiredRole='ORGANIZER'`. Routes currently using `requiredRoles`:

| Route | Current | Simplified |
|-------|---------|------------|
| `/organizer/players` | `requiredRoles={['ORGANIZER', 'ADMIN']}` | `requiredRole='ORGANIZER'` |
| `/organizer/players/:id` | `requiredRoles={['ORGANIZER', 'ADMIN']}` | `requiredRole='ORGANIZER'` |
| `/organizer/categories` | `requiredRoles={['ORGANIZER', 'ADMIN']}` | `requiredRole='ORGANIZER'` |
| `/organizer/tournaments` | `requiredRoles={['ORGANIZER', 'ADMIN']}` | `requiredRole='ORGANIZER'` |
| `/organizer/tournament/:id/rules` | `requiredRoles={['ORGANIZER', 'ADMIN']}` | `requiredRole='ORGANIZER'` |
| `/organizer/tournament/:id/points` | `requiredRoles={['ORGANIZER', 'ADMIN']}` | `requiredRole='ORGANIZER'` |

Routes using `requiredRole='ORGANIZER'` already (before this fix):
- `/organizer/dashboard` — ADMIN currently blocked here; ProtectedRoute fix unblocks it

Routes using `requiredRole='PLAYER'`:
- `/player/tournaments` — ADMIN currently blocked; ProtectedRoute fix unblocks
- `/player/profile` — ADMIN currently blocked; ProtectedRoute fix unblocks

### Pattern 3: NavBar ADMIN Section
**What:** ADMIN users currently see organizer links (Categories, Tournaments, Players, Doubles Pairs) but not admin-only links (Users, Point Tables), and do not see player links. Add a player section and an admin section with separator.

**Current NavBar structure for ADMIN:**
- Rankings (public, always shown)
- Tournaments (public, shown only for PLAYER or unauthenticated — NOT shown to ADMIN)
- [Organizer section] Categories, Tournaments, Players, Doubles Pairs
- [No admin section]
- [No player section]

**Target NavBar structure for ADMIN:**
- Rankings (public, always shown)
- [Organizer section] Categories, Tournaments, Players, Doubles Pairs
- [Separator/label: "Admin"]
- Users, Point Tables
- [Separator/label: "Player"]
- Registrations (→ /player/tournaments), Player Categories (→ /player/register), Doubles Pairs (→ /player/pairs)

**Separator implementation options (Claude's discretion):**
1. `<li className="nav-item"><hr className="dropdown-divider" /></li>` — Bootstrap divider in a navbar works visually
2. `<li className="navbar-text text-white-50 small px-2">Admin</li>` — Text label as separator (more informative)

Option 2 (text label) is recommended: it's self-documenting in the UI, especially when showing multiple role sections.

**React Bootstrap 2.10 navbar divider pattern:**
```jsx
{/* Visual separator for admin section */}
<li className="navbar-text text-white-50 small px-2" style={{ opacity: 0.6 }}>
  |
</li>
```
Or using a text label:
```jsx
<li className="navbar-text text-muted small px-2">Admin</li>
```

### Pattern 4: Endpoint Auth — seedingPlacementRoutes Fix
**What:** `POST /api/v1/seeding/generate-bracket` has no auth middleware.

**Current (seedingPlacementRoutes.js line 16):**
```js
router.post('/generate-bracket', generateBracket);
```

**Fixed:**
```js
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

router.post(
  '/generate-bracket',
  isAuthenticated,
  authorize('create', 'Tournament'),
  generateBracket
);
```

CASL `can('manage', 'all')` for ADMIN passes `authorize('create', 'Tournament')`. ORGANIZER has `can(['create', 'read', 'update', 'delete'], 'Tournament')` which includes `create`. This is correct for both roles.

### Pattern 5: Admin Warning Banner on Player Pages
**What:** When ADMIN navigates to a player-specific page (e.g., `/player/tournaments`) and `user.playerId` is null, show a contextual warning.

**Implementation approach:**
```jsx
// Inside TournamentRegistrationPage (or any player-specific page)
const { user } = useAuth();

{user?.role === 'ADMIN' && !user?.playerId && (
  <Alert variant="warning">
    You are viewing as admin — no player profile linked. Some player features may not work.
  </Alert>
)}
```

The `user.playerId` is already present in AuthContext from the session deserializer (`playerId: user.playerProfile?.id || null`). No new backend data needed.

### Anti-Patterns to Avoid
- **Don't check `user.role === 'ADMIN' || user.role === 'ORGANIZER'` in NavBar**: After the ProtectedRoute fix, use `user.role === 'ADMIN'` separately in NavBar to render the admin-specific section, not a combined condition.
- **Don't add ADMIN to every `requiredRoles` array**: The ProtectedRoute auto-include makes this unnecessary. Adding ADMIN explicitly after the fix creates redundancy.
- **Don't use `requiredRoles` prop for single-role routes**: Use `requiredRole` (singular) — it's simpler and sufficient after ADMIN auto-include.
- **Don't wrap NavBar player links in a new ProtectedRoute**: NavBar renders inside already-authenticated contexts; role checks in NavBar JSX are sufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permission checking | Custom role comparison logic | CASL `can('manage', 'all')` already on ADMIN | Already correct at backend; just needs frontend to match |
| Session role data | New API endpoint | `user.role` from existing AuthContext | Already serialized from Passport session |
| Admin player profile check | New backend query | `user.playerId` already in AuthContext | Deserializer already flattens it |

## Complete Backend Endpoint Auth Audit

### Route Files — Auth Status

| Route File | Endpoint Pattern | Auth Status | Correct? |
|-----------|-----------------|------------|---------|
| `authRoutes.js` | POST /login, POST /register | Public intentionally | Yes |
| `authRoutes.js` | POST /logout, GET /session | `isAuthenticated` only | Yes |
| `bracketRoutes.js` | GET /structure/:pc, GET /seeding/:pc | Public (read-only) | Yes (locked decision) |
| `bracketPersistenceRoutes` (via tournamentRoutes) | POST /bracket, PATCH /slots, PUT /positions | `isAuthenticated` + `authorize('update','Tournament')` | Yes |
| `categoryRoutes.js` | GET /, GET /:id, GET /:id/stats | Public | Yes |
| `categoryRoutes.js` | POST /, PATCH /:id | `isAuthenticated` + CASL authorize | Yes |
| `categoryRoutes.js` | DELETE /:id | `isAuthenticated` + CASL authorize('delete','Category') | Yes — ORGANIZER `cannot('delete')` so only ADMIN passes |
| `matchRoutes.js` | PATCH /:id/result | `isAuthenticated` only | Yes — controller handles role-based logic internally |
| `pairRoutes.js` | GET /:id, GET /, GET /:id/history | Public | Yes |
| `pairRoutes.js` | POST / | `isAuthenticated` only, controller enforces | Acceptable |
| `pairRoutes.js` | POST /recalculate-seeding/:categoryId | `isAuthenticated` only | Possible gap — no CASL check |
| `playerRoutes.js` | GET /, GET /:id, GET /:id/match-history | Public | Yes |
| `playerRoutes.js` | POST /, GET /check-duplicates | `isAuthenticated` + `authorize('manage','PlayerProfile')` | Yes |
| `playerRoutes.js` | PATCH /:id | `isAuthenticated` only | Acceptable — controller checks ownership |
| `pointTableRoutes.js` | All routes | `isAuthenticated` + `authorize('manage','PointTable')` | Yes — ADMIN only via CASL |
| `rankingRoutes.js` | GET routes | Public | Yes |
| `rankingRoutes.js` | POST /admin/year-rollover, DELETE /archive/:year, POST /recalculate | `isAuthenticated` + `authorize('ADMIN')` from auth.js | Yes — uses `hasRole` alias, ADMIN-only correct |
| `registrationRoutes.js` | POST /, POST /bulk | `isAuthenticated` + CASL authorize | Yes |
| `registrationRoutes.js` | GET /player/:id, GET /category/:id | `isAuthenticated` only | Acceptable |
| `registrationRoutes.js` | POST /pair | `isAuthenticated` only, controller enforces | Acceptable |
| `registrationRoutes.js` | DELETE /pair/:id | `isAuthenticated` only | Acceptable — controller checks pair membership |
| `seedingPlacementRoutes.js` | POST /generate-bracket | **NO AUTH** | **GAP — must fix** |
| `seedingRoutes.js` | GET /:entityType/:entityId/category/:categoryId | Public | Acceptable (read-only scores) |
| `seedingRoutes.js` | POST /bulk | Public — no auth | Potential gap (state-reading, not state-writing) |
| `tournamentRegistrationRoutes.js` | POST /:tournamentId/register | `isAuthenticated` only | Acceptable — controller enforces |
| `tournamentRegistrationRoutes.js` | DELETE /:tournamentId/register | `isAuthenticated` only | Acceptable |
| `tournamentRegistrationRoutes.js` | GET /:tournamentId/registrations | `authorize('read','Tournament')` without isAuthenticated | Quirky — authorize without isAuthenticated works for public CASL |
| `tournamentRegistrationRoutes.js` | DELETE /registrations/:id, PATCH /registrations/:id | `isAuthenticated` + `authorize('update','Tournament')` | Yes |
| `tournamentRoutes.js` | POST /, PATCH /:id, DELETE /:id | `isAuthenticated` + CASL authorize | Yes |
| `tournamentRoutes.js` | POST /:id/copy, PATCH /:id/start, POST /:id/revert | `isAuthenticated` + CASL authorize | Yes |
| `tournamentRoutes.js` | POST /:id/bracket, PATCH /:id/bracket/slots, PUT /:id/bracket/positions | `isAuthenticated` + CASL authorize | Yes |
| `tournamentRoutes.js` | POST /:id/consolation-opt-out | `isAuthenticated` only | Acceptable — controller handles self/organizer |
| `userRoutes.js` | All routes | `isAuthenticated` + `authorize('manage','User')` | Yes — ADMIN only via CASL |

**Confirmed gaps requiring action:**
1. `seedingPlacementRoutes.js` POST /generate-bracket — no auth at all (HIGH priority fix)

**Possible gaps to consider (lower priority, controller-enforced):**
2. `pairRoutes.js` POST /recalculate-seeding — `isAuthenticated` only; no CASL role check (organizer/admin operation)
3. `seedingRoutes.js` POST /bulk — no auth on bulk seeding calculation

**Note on rankingRoutes import:** `rankingRoutes.js` imports `authorize` from `../../middleware/auth.js` (the `hasRole` alias), not from `../../middleware/authorize.js` (CASL). This is intentional — ranking admin operations use role check, not CASL. Both middleware exports work correctly for their respective purposes.

## Common Pitfalls

### Pitfall 1: ProtectedRoute Change Doesn't Fix NavBar
**What goes wrong:** After making ProtectedRoute auto-include ADMIN, ADMIN can navigate directly to `/organizer/dashboard` but the navbar doesn't show any way to get there.
**Why it happens:** NavBar's organizer section currently checks `user.role === 'ORGANIZER' || user.role === 'ADMIN'` — actually this is fine, ADMIN already sees organizer nav links. But ADMIN doesn't see player links or admin-only links (Users, Point Tables).
**How to avoid:** Both ProtectedRoute AND NavBar need updates. Verify by checking what ADMIN sees vs. what they need to access.

### Pitfall 2: Player Profile Warning Shows for ORGANIZER
**What goes wrong:** Warning banner "no player profile linked" appears for ORGANIZER role too, not just ADMIN.
**Why it happens:** Using `!user.playerId` without role check would show the banner to any authenticated user without a player profile.
**How to avoid:** Gate the warning with `user?.role === 'ADMIN' && !user?.playerId`.

### Pitfall 3: `/player/profile` Route Redirect Breaks for ADMIN
**What goes wrong:** The `/player/profile` route in App.jsx is `<Navigate to={/players/${user?.playerId}} replace />`. If ADMIN has no playerId, this redirects to `/players/null`.
**Why it happens:** The route is hardcoded to use `user.playerId` from auth context.
**How to avoid:** After ADMIN can access this route (ProtectedRoute fix), the redirect to `/players/null` will 404. Options:
- Show the warning banner instead of redirecting when `user.playerId` is null
- Guard the redirect: only redirect if `user.playerId` is not null, else show the warning page directly

This requires special handling in the `/player/profile` route definition or the component itself.

### Pitfall 4: NavBar Shows Duplicate "Doubles Pairs" for ADMIN
**What goes wrong:** Both the organizer section and the proposed player section include Doubles Pairs links — ADMIN would see it twice.
**Why it happens:** Both organizer and player sections include `/player/pairs`.
**How to avoid:** The Doubles Pairs link in the player section for ADMIN can be omitted since the organizer section already shows it, OR render only one consolidated list. The organizer section already links to `/player/pairs` so the player section link would be redundant.

### Pitfall 5: Nav "Registrations" rename affects PLAYER label only
**What goes wrong:** Renaming the player `/player/tournaments` link from "Tournaments" to "Registrations" might also accidentally affect the organizer's "Tournaments" link.
**Why it happens:** They're separate JSX blocks but both use `t('nav.tournaments')` translation key.
**How to avoid:** Create a new translation key `t('nav.registrations')` for the player-specific link, or hardcode a distinct label. Do not reuse `t('nav.tournaments')`.

## Code Examples

### ProtectedRoute — ADMIN Superuser Check

```jsx
// frontend/src/components/ProtectedRoute.jsx
const ProtectedRoute = ({ children, requiredRole = null, requiredRoles = [] }) => {
  const { t } = useTranslation();
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (/* loading spinner */);
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ADMIN is superuser — bypasses all role-based route restrictions
  if (user?.role === 'ADMIN') {
    return children;
  }

  if (requiredRole && user?.role !== requiredRole) {
    const redirectPath = getRoleBasedPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user?.role)) {
    const redirectPath = getRoleBasedPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};
```

### App.jsx — Simplify organizer routes

```jsx
// BEFORE (example — same pattern for all 5 organizer routes with requiredRoles):
<ProtectedRoute requiredRoles={['ORGANIZER', 'ADMIN']}>

// AFTER (ProtectedRoute now auto-includes ADMIN):
<ProtectedRoute requiredRole="ORGANIZER">
```

### seedingPlacementRoutes.js — Add auth

```js
import express from 'express';
import { generateBracket } from '../seedingController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = express.Router();

router.post(
  '/generate-bracket',
  isAuthenticated,
  authorize('create', 'Tournament'),
  generateBracket
);

export default router;
```

### NavBar — ADMIN section with player links

```jsx
{/* Admin sees organizer links (already rendered above for ORGANIZER || ADMIN) */}

{/* Admin-only section with separator */}
{user && user.role === 'ADMIN' && (
  <>
    <li className="navbar-text text-white-50 small px-2" style={{ opacity: 0.6 }}>|</li>
    <li className="nav-item">
      <span className="nav-link" onClick={() => navigate('/admin/users')} style={{ cursor: 'pointer' }}>
        Users
      </span>
    </li>
    <li className="nav-item">
      <span className="nav-link" onClick={() => navigate('/admin/point-tables')} style={{ cursor: 'pointer' }}>
        Point Tables
      </span>
    </li>
    <li className="navbar-text text-white-50 small px-2" style={{ opacity: 0.6 }}>|</li>
    <li className="nav-item">
      <span className="nav-link" onClick={() => navigate('/player/tournaments')} style={{ cursor: 'pointer' }}>
        Registrations
      </span>
    </li>
    <li className="nav-item">
      <span className="nav-link" onClick={() => navigate('/player/register')} style={{ cursor: 'pointer' }}>
        {t('nav.categories')}
      </span>
    </li>
  </>
)}

{/* Player Links — shown for PLAYER role */}
{user && user.role === 'PLAYER' && (
  <>
    <li className="nav-item">
      <span className="nav-link" onClick={() => navigate('/player/tournaments')} style={{ cursor: 'pointer' }}>
        Registrations  {/* renamed from t('nav.tournaments') */}
      </span>
    </li>
    {/* ... existing player links ... */}
  </>
)}
```

### Admin warning banner (React Bootstrap Alert)

```jsx
// Add to player-specific pages (TournamentRegistrationPage, PlayerRegistrationPage, etc.)
import { useAuth } from '../utils/AuthContext';

const { user } = useAuth();

// At the top of the page render:
{user?.role === 'ADMIN' && !user?.playerId && (
  <Alert variant="warning" className="mb-3">
    You are viewing as admin — no player profile linked. Some player features may not work.
  </Alert>
)}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `requiredRoles={['ORGANIZER', 'ADMIN']}` arrays | `requiredRole='ORGANIZER'` with ADMIN auto-include | Simpler, future-proof — new roles don't need array updates |
| ADMIN sees only admin dashboard | ADMIN sees dashboard + all organizer actions | Fulfils ADMIN-01 without role schema changes |

## Open Questions

1. **`/player/profile` null redirect for ADMIN**
   - What we know: Route does `<Navigate to={/players/${user?.playerId}} replace />` — if `user.playerId` is null, redirects to `/players/null`
   - What's unclear: Should ADMIN with no player profile see a "no profile" message, or be redirected to create one?
   - Recommendation: Guard the navigate — if `user.playerId` is null, render an inline message or redirect to admin dashboard instead. The warning banner pattern handles this.

2. **`pairRoutes.js` POST /recalculate-seeding**
   - What we know: Only `isAuthenticated` middleware, no CASL role check. This is an ORGANIZER/ADMIN-only operation per the comment.
   - What's unclear: Is this worth fixing in Phase 16 given it's lower risk (miscalculating seeding vs. unauthorized write)?
   - Recommendation: Fix it in the endpoint audit as part of the "document all endpoints checked" deliverable — add `authorize('manage', 'PlayerProfile')` which ORGANIZER has.

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (frontend) / Jest (backend) |
| Config file | `frontend/vite.config.js` (Vitest embedded) / `backend/jest.config.js` |
| Quick run command | `cd backend && npm test -- --testPathPattern=bracketRoutes 2>/dev/null` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| ADMIN-01 | Admin accesses organizer routes without 403 | manual | N/A | Frontend route guards — no automated test infrastructure for React route tests |
| ADMIN-01 | POST /generate-bracket returns 401 without auth | integration | `cd backend && npm test -- --testPathPattern=seedingRoutes` | Requires adding test to existing seedingRoutes.test.js |
| ADMIN-02 | Organizer-as-player can access player registration | manual | N/A | Requires test user with ORGANIZER role + linked PlayerProfile |

### Wave 0 Gaps

- No new test files required for the frontend ProtectedRoute change — this is a pure access control fix with no new component logic to unit test.
- Backend: `seedingPlacementRoutes.js` auth fix should have an integration test verifying 401 when unauthenticated. This test can be added to `backend/__tests__/integration/seedingRoutes.test.js` if it exists, or noted for the planner to add.

None — existing test infrastructure covers backend integration tests. Frontend route access testing is manual.

## Sources

### Primary (HIGH confidence)
- Direct code read of `frontend/src/components/ProtectedRoute.jsx` — confirmed exact role check logic
- Direct code read of `frontend/src/components/NavBar.jsx` — confirmed existing conditional rendering
- Direct code read of `backend/src/middleware/authorize.js` — confirmed ADMIN has `can('manage', 'all')`
- Direct code read of `backend/src/middleware/auth.js` — confirmed `hasRole`/`authorize` alias pattern
- Direct code read of `frontend/src/App.jsx` — confirmed all 6 routes using `requiredRoles` array
- Direct code read of all 15 backend route files — full auth audit completed
- Direct code read of `frontend/src/utils/AuthContext.jsx` — confirmed `user.playerId` in context

### Secondary (MEDIUM confidence)
- CASL `can('manage', 'all')` semantics: documented in CASL documentation; confirmed by `defineAbilitiesFor` implementation in `authorize.js` where ADMIN case uses exactly this

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing files
- Architecture: HIGH — derived directly from reading all relevant source files
- Pitfalls: HIGH — identified from direct code analysis (null playerId redirect, duplicate nav links)
- Backend audit: HIGH — all 15 route files read and assessed

**Research date:** 2026-03-04
**Valid until:** 2026-04-03 (stable codebase, no fast-moving dependencies)
