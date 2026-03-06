---
phase: 21-navigation-fix
plan: 01
subsystem: ui
tags: [react-bootstrap, offcanvas, navbar, mobile, i18n]

# Dependency graph
requires:
  - phase: 20-mobile-dev-tooling
    provides: dev:mobile script with QR code for real-device testing
provides:
  - React Bootstrap Offcanvas mobile drawer navigation (no Bootstrap JS)
  - React Bootstrap Dropdown language switcher (no Bootstrap JS)
  - 150ms snappy offcanvas animation via CSS custom property
affects: [22-layout, 23-bracket-touch, 24-organizer-mobile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Navbar.Offcanvas with collapseOnSelect + eventKey for auto-close on link tap"
    - "ADMIN accordion placed outside Nav to prevent collapseOnSelect interference"
    - "Controlled Offcanvas state via show/setShow with handleClose/handleToggle"

key-files:
  created:
    - frontend/src/index.css
  modified:
    - frontend/src/components/NavBar.jsx
    - frontend/src/components/LanguageSwitcher.jsx
    - frontend/src/main.jsx

key-decisions:
  - "Accordion placed as sibling to Nav (outside Nav element) so Accordion.Header clicks don't trigger collapseOnSelect and close the drawer prematurely"
  - "Desktop ADMIN links rendered in a separate d-none d-lg-flex Nav so accordion only shows on mobile"
  - "Nav.Link elements use onClick + handleNav(path) pattern — no href to avoid full page reload"

patterns-established:
  - "All Nav.Link elements must have unique eventKey for collapseOnSelect to work correctly"
  - "React Bootstrap components only — zero data-bs-toggle attributes (no Bootstrap JS dependency)"

requirements-completed:
  - NAV-01
  - NAV-02
  - NAV-03

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 21 Plan 01: Navigation Fix Summary

**React Bootstrap Offcanvas mobile nav drawer replacing broken data-bs-toggle collapse — auto-close on tap, role-gated sections, admin accordion, 150ms animation**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-06T19:41:22Z
- **Completed:** 2026-03-06T19:42:42Z
- **Tasks:** 1 of 2 (Task 2 is human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- LanguageSwitcher converted from raw Bootstrap dropdown to React Bootstrap Dropdown (no Bootstrap JS)
- NavBar fully replaced with Navbar.Offcanvas drawer: hamburger opens slide-in panel from right
- Auto-close on nav link tap via eventKey + collapseOnSelect pattern
- Role-gated drawer sections: ADMIN Accordion (3 sections), ORGANIZER muted header, PLAYER muted header
- Drawer footer: user role badge + email + logout, or login/register buttons + language switcher
- Desktop lg+ breakpoint: ADMIN inline links via d-none d-lg-flex Nav (unchanged behavior)
- index.css with 150ms offcanvas animation override for snappy mobile feel

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix LanguageSwitcher and refactor NavBar to Offcanvas** - `11d5d18` (feat)
2. **Task 2: Verify mobile navigation on real device** - checkpoint:human-verify (pending)

## Files Created/Modified
- `frontend/src/components/NavBar.jsx` - React Bootstrap Navbar.Offcanvas with role-gated drawer sections
- `frontend/src/components/LanguageSwitcher.jsx` - React Bootstrap Dropdown (no Bootstrap JS)
- `frontend/src/index.css` - 150ms offcanvas animation override
- `frontend/src/main.jsx` - Added import for index.css

## Decisions Made
- Accordion placed as sibling to Nav (not nested inside) — prevents Accordion.Header clicks from triggering collapseOnSelect and closing the drawer unexpectedly
- Separate `d-none d-lg-flex` Nav for desktop ADMIN links — Accordion only appears on mobile (d-lg-none)
- Nav.Link uses onClick + handleNav(path) — avoids href full-page reloads

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Mobile hamburger drawer ready for real-device verification (Task 2 checkpoint)
- After human-verify approval, phase 21 is complete and phase 22 (layout) can begin
- Run `npm run dev:mobile` in frontend directory and scan QR code with phone to verify

---
*Phase: 21-navigation-fix*
*Completed: 2026-03-06*
