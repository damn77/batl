# Phase 21: Navigation Fix - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can open, navigate, and close the mobile menu on any mobile browser. Replace the broken raw-HTML Bootstrap hamburger menu with React Bootstrap Navbar.Offcanvas. Desktop navigation bar is unchanged at lg+ breakpoint.

</domain>

<decisions>
## Implementation Decisions

### Core approach
- Replace raw HTML Bootstrap markup (`data-bs-toggle="collapse"`) with React Bootstrap `Navbar.Offcanvas` and `collapseOnSelect`
- This is the locked decision from STATE.md — no Bootstrap JS dependency needed

### Drawer behavior
- Backdrop enabled — tapping outside the drawer closes it
- Page scroll locked while drawer is open
- Faster animation (~150ms) instead of default Bootstrap ~300ms for snappier, app-like feel
- Slide-in direction: Claude's discretion

### Menu item grouping
- Links grouped with small muted section headers (e.g., "Organizer", "Admin") and dividers between groups
- Public links (Rankings, Tournaments) sit at the top of the drawer without a section label
- ADMIN role: collapsible sub-sections for the multiple role groups (organizer links, admin-only links, player-facing links) to manage ~10 total links
- Non-admin roles (ORGANIZER ~5 links, PLAYER ~4 links): sections always expanded, no collapsible behavior needed

### User info placement
- Logged-in: role badge + email + logout button anchored at bottom of drawer (footer area)
- Logged-out: login and register buttons at bottom of drawer (same position, consistent)
- Language switcher moves inside the drawer on mobile (near user info at bottom), keeping navbar header clean (brand + hamburger only)

### Claude's Discretion
- Slide-in direction (left vs right)
- Exact section header styling and divider appearance
- Transition CSS for the ~150ms animation override
- How collapseOnSelect interacts with the Offcanvas close behavior

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard React Bootstrap Offcanvas implementation with the decisions above.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/NavBar.jsx`: Current navbar with all role-gated link logic — refactor in place
- `frontend/src/utils/AuthContext.js`: `useAuth()` hook provides `user` with `role` field
- `frontend/src/utils/ModalContext.js`: `useModal()` provides `openLoginModal`, `openRegisterModal`
- `frontend/src/components/LanguageSwitcher.jsx`: Standalone component, moves into drawer on mobile

### Established Patterns
- React Router `useNavigate()` for all navigation (no `<a>` tags or `<Link>` components in current nav)
- `useTranslation()` for i18n — nav labels use translation keys (`t('nav.rankings')`, etc.)
- Role-gating via conditional rendering on `user.role` (ADMIN, ORGANIZER, PLAYER)
- ADMIN sees organizer links + admin-only links + player-facing links (superuser pattern)

### Integration Points
- NavBar rendered at app root level — change is self-contained to this one component
- No backend changes needed
- Desktop lg+ breakpoint must remain unchanged

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-navigation-fix*
*Context gathered: 2026-03-06*
