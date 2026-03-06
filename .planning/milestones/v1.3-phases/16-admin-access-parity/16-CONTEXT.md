# Phase 16: Admin Access Parity - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify and fix all gaps where admin users cannot access organizer functionality. Validate that ADMIN is a superuser who can access everything. Verify organizer-as-player flow works. Fix navigation gaps and missing endpoint auth. No multi-role schema changes — ADMIN = superuser satisfies ADMIN-02.

</domain>

<decisions>
## Implementation Decisions

### Route Access — ProtectedRoute Auto-Include
- Change ProtectedRoute component so ADMIN automatically passes any `requiredRole` check (superuser pattern)
- ADMIN bypasses ALL role checks — ORGANIZER, PLAYER, any future role
- ADMIN visiting /organizer/dashboard sees OrganizerDashboard (not redirected)
- Simplify existing `requiredRoles={['ORGANIZER', 'ADMIN']}` arrays to single `requiredRole='ORGANIZER'` across all routes — auto-include handles ADMIN
- ADMIN redirects to /admin/dashboard after login (current role-based redirect behavior)
- Full audit of both frontend routes AND backend middleware for any role gaps
- Non-authenticated users redirect to login page (current behavior, no change)

### Mixed-Role Interpretation
- ADMIN = superuser — no multi-role schema change needed
- Single `role` string field stays: PLAYER, ORGANIZER, or ADMIN
- ADMIN-02 requirement wording should be updated to reflect that ADMIN superuser satisfies the mixed-role intent
- ADMIN can access player-specific pages; show warning banner if no PlayerProfile linked ("You are viewing as admin — no player profile linked")
- Organizer-as-player: verify existing flow works — ORGANIZER with PlayerProfile can register for tournaments, submit results, and see "My Match" on bracket view
- ORGANIZER can self-register for tournaments via player registration page OR organizer registration management — either path should work

### Navigation
- Add admin-only links (Users, Point Tables) inline in navbar after organizer links
- Visual separator between organizer links and admin-only links (divider or label)
- ADMIN sees admin dashboard link only in nav (not both admin + organizer dashboard)
- ADMIN sees all role nav links: organizer section + admin section + player section
- Rename player "Tournaments" nav link to "Registrations" (currently duplicates the public Tournaments link)

### Endpoint Auth
- Add CASL `authorize('create', 'Tournament')` middleware to `seedingPlacementRoutes` POST /generate-bracket
- Full endpoint auth audit across all route files — document findings in plan
- Keep bracket structure endpoints (GET /brackets/structure, GET /brackets/seeding) public — read-only, no sensitive data
- Document all endpoints checked and gaps found/fixed

### Claude's Discretion
- Exact styling of admin nav separator (divider vs label)
- Warning banner design for admin on player pages without profile
- Any additional auth gaps found during endpoint audit — fix approach

</decisions>

<specifics>
## Specific Ideas

- Player nav has "Tournaments" appearing twice — the one leading to registration/scheduled tournaments should be renamed to "Registrations"
- Organizer-as-player scenario: an organizer who plays in their own tournament should see both organizer controls and player features (My Match) on the bracket view
- The auto-include pattern in ProtectedRoute prevents future route definitions from accidentally excluding admin

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProtectedRoute` component (`frontend/src/components/ProtectedRoute.jsx`): Supports both `requiredRole` (singular) and `requiredRoles` (array) — modify to auto-include ADMIN
- CASL `defineAbilitiesFor` (`backend/src/middleware/authorize.js`): ADMIN already has `can('manage', 'all')` — backend should already pass
- NavBar component (`frontend/src/components/NavBar.jsx`): Already conditionally shows organizer links for ADMIN via `user.role === 'ORGANIZER' || user.role === 'ADMIN'`

### Established Patterns
- CASL-based authorization: Most routes use `authorize('action', 'Subject')` from `authorize.js`
- Exception: `rankingRoutes.js` uses `hasRole('ADMIN')` from `auth.js` — different pattern but correct (ADMIN-only ops)
- Frontend role checks: Mix of `requiredRole` (singular exact match) and `requiredRoles` (array includes check)

### Integration Points
- `ProtectedRoute` used by all protected routes in `App.jsx` — single change point
- `NavBar.jsx` role conditionals — add admin section and player section for ADMIN users
- `seedingPlacementRoutes.js` — add auth middleware import and usage
- Post-login redirect logic — verify ADMIN routes to /admin/dashboard

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-admin-access-parity*
*Context gathered: 2026-03-04*
