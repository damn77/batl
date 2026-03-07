---
phase: 21-navigation-fix
plan: 01
subsystem: ui
tags: [react-bootstrap, offcanvas, navbar, mobile, i18n, cors]

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
    - "Desktop controls outside Offcanvas.Body in container-fluid d-none d-lg-flex div"
    - "Drawer footer marked d-lg-none to prevent desktop duplication"
    - "LanguageSwitcher: drop=down + absolute positioning for Offcanvas clipping fix"

key-files:
  created:
    - frontend/src/index.css
  modified:
    - frontend/src/components/NavBar.jsx
    - frontend/src/components/LanguageSwitcher.jsx
    - frontend/src/main.jsx
    - backend/src/index.js

key-decisions:
  - "Accordion placed as sibling to Nav (outside Nav element) so Accordion.Header clicks don't trigger collapseOnSelect and close the drawer prematurely"
  - "Desktop ADMIN links rendered in a separate d-none d-lg-flex Nav so accordion only shows on mobile"
  - "Nav.Link elements use onClick + handleNav(path) pattern — no href to avoid full page reload"
  - "Desktop controls (LanguageSwitcher + auth) moved outside Navbar.Offcanvas into container-fluid d-none d-lg-flex section to fix desktop layout regression"
  - "LanguageSwitcher: drop=down + position:absolute to prevent clipping when rendered inside Offcanvas"
  - "CORS whitelist extended with 192.168.x.x LAN IP pattern for mobile dev testing (development only)"

patterns-established:
  - "All Nav.Link elements must have unique eventKey for collapseOnSelect to work correctly"
  - "React Bootstrap components only — zero data-bs-toggle attributes (no Bootstrap JS dependency)"

requirements-completed:
  - NAV-01
  - NAV-02
  - NAV-03

# Metrics
duration: 45min
completed: 2026-03-06
---

# Phase 21 Plan 01: Navigation Fix Summary

**React Bootstrap Offcanvas mobile nav replacing broken data-bs-toggle collapse — verified on real device with role-gated sections, admin accordion, language switcher, and desktop layout fix**

## Performance

- **Duration:** ~45 min (including real-device verification)
- **Started:** 2026-03-06T19:41:22Z
- **Completed:** 2026-03-06
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 5

## Accomplishments
- LanguageSwitcher converted from raw Bootstrap dropdown to React Bootstrap Dropdown (no Bootstrap JS), with drop=down + absolute positioning fix for Offcanvas clipping
- NavBar fully replaced with Navbar.Offcanvas drawer: hamburger opens slide-in panel from right
- Auto-close on nav link tap via eventKey + collapseOnSelect pattern — verified on real device
- Role-gated drawer sections: ADMIN Accordion (3 sections), ORGANIZER muted header, PLAYER muted header — all verified
- Drawer footer (d-lg-none): user role badge + email + logout, or login/register buttons + language switcher
- Desktop controls moved outside Offcanvas.Body into d-none d-lg-flex section — desktop navbar layout restored
- index.css with 150ms offcanvas animation override for snappy mobile feel
- Backend CORS extended with 192.168.x.x LAN IP pattern for mobile dev testing

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix LanguageSwitcher and refactor NavBar to Offcanvas** - `11d5d18` (feat)
2. **Task 2: Verification fixes from real-device testing** - `4617f15` (fix)

**Plan metadata:** `3a34de8` (docs: complete navigation-fix plan — awaiting human-verify checkpoint)

## Files Created/Modified
- `frontend/src/components/NavBar.jsx` - React Bootstrap Navbar.Offcanvas with role-gated sections, ADMIN accordion, desktop d-none d-lg-flex controls outside Offcanvas
- `frontend/src/components/LanguageSwitcher.jsx` - React Bootstrap Dropdown with drop=down + absolute positioning for Offcanvas compatibility
- `frontend/src/index.css` - 150ms offcanvas animation override
- `frontend/src/main.jsx` - Added import for index.css
- `backend/src/index.js` - 192.168.x.x LAN IP in CORS whitelist for mobile dev testing

## Decisions Made
- Accordion placed as sibling to Nav (not nested inside) — prevents Accordion.Header clicks from triggering collapseOnSelect and closing the drawer unexpectedly
- Separate d-none d-lg-flex Nav for desktop ADMIN links — Accordion only appears on mobile (d-lg-none)
- Nav.Link uses onClick + handleNav(path) — avoids href full-page reloads
- Desktop controls (LanguageSwitcher + auth) moved outside Navbar.Offcanvas into container-fluid — fixes desktop regression where controls appeared inside mobile drawer
- LanguageSwitcher: drop=down + position:absolute to prevent dropdown clipping in Offcanvas overflow context
- CORS: 192.168.x.x LAN pattern added for mobile device testing (development only)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed desktop navbar layout regression**
- **Found during:** Task 2 (real-device verification)
- **Issue:** LanguageSwitcher and auth buttons were inside Offcanvas.Body, rendering in mobile drawer and breaking desktop navbar layout
- **Fix:** Moved desktop controls to d-none d-lg-flex div outside Navbar.Offcanvas; drawer footer marked d-lg-none
- **Files modified:** frontend/src/components/NavBar.jsx
- **Verification:** Desktop shows inline navbar controls; mobile shows drawer footer only
- **Committed in:** 4617f15

**2. [Rule 1 - Bug] Fixed LanguageSwitcher dropdown clipping in Offcanvas**
- **Found during:** Task 2 (real-device verification)
- **Issue:** Dropdown menu hidden/clipped by Offcanvas overflow container
- **Fix:** Added drop="down" and inline style { transform: 'translateY(0)', top: '0', position: 'absolute' }
- **Files modified:** frontend/src/components/LanguageSwitcher.jsx
- **Verification:** Language dropdown opens correctly inside mobile drawer
- **Committed in:** 4617f15

**3. [Rule 2 - Missing Critical] Added LAN CORS allowance for mobile dev testing**
- **Found during:** Task 2 (real-device verification)
- **Issue:** Mobile device requests from 192.168.x.x blocked by CORS, preventing real-device API calls
- **Fix:** Added 192.168.x.x LAN IP pattern to backend CORS whitelist (development only)
- **Files modified:** backend/src/index.js
- **Verification:** Mobile device can reach backend API during dev:mobile sessions
- **Committed in:** 4617f15

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical)
**Impact on plan:** All fixes discovered during real-device verification directly caused by Task 1 implementation. No scope creep.

## Issues Encountered
- Desktop layout broken initially because Offcanvas.Body renders inline at lg+, causing controls to appear twice. Resolved by separating mobile/desktop control sections.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Mobile navigation fully functional — hamburger, auto-close, role-gated sections, language switcher all verified on real device
- Desktop navbar behavior unchanged at lg+ breakpoint
- Ready for Phase 22 (Tournament View Layout restructure)
- Mobile testing workflow (dev:mobile QR + CORS LAN IP) fully operational

---
*Phase: 21-navigation-fix*
*Completed: 2026-03-06*
