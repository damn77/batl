# Requirements: BATL

**Defined:** 2026-03-06
**Core Value:** A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group

## v1.4 Requirements

Requirements for UI Rework & Mobile Design milestone. Each maps to roadmap phases.

### Mobile Dev Tooling

- [x] **TOOL-01**: Developer can access the app on a mobile device by scanning a QR code from the terminal
- [x] **TOOL-02**: Vite dev server is accessible from other devices on the local network

### Navigation

- [x] **NAV-01**: User can open and navigate the mobile hamburger menu on all mobile browsers
- [x] **NAV-02**: Mobile navigation drawer closes automatically after selecting a menu item
- [x] **NAV-03**: All role-gated navigation links (admin, organizer, player) are accessible on mobile

### Tournament View Layout

- [x] **LAYOUT-01**: User sees the bracket as the primary (hero) element when tournament is IN_PROGRESS
- [x] **LAYOUT-02**: Secondary sections (registration info, format/rules, point tables, player list) are collapsed by default on mobile for IN_PROGRESS tournaments
- [x] **LAYOUT-03**: User can expand/collapse individual secondary sections on the tournament page
- [x] **LAYOUT-04**: Section ordering adapts based on tournament status (SCHEDULED shows registration first, IN_PROGRESS shows bracket first, COMPLETED shows champion/results first)
- [x] **LAYOUT-05**: Champion banner displays prominently for COMPLETED tournaments

### Bracket Mobile UX

- [x] **BRKT-01**: Bracket auto-scales to fit the viewport width on initial mobile load
- [x] **BRKT-02**: User can pan the bracket via touch drag on real mobile devices (passive event fix)
- [x] **BRKT-03**: Zoom in/out buttons meet 44px minimum tap target size
- [x] **BRKT-04**: Bracket controls (zoom, reset, BYE toggle) are accessible and usable on mobile screens

### Score Entry

- [x] **SCORE-01**: Match result modal displays fullscreen on mobile devices (sm-down)
- [x] **SCORE-02**: Score inputs show the correct numeric keyboard on iOS (inputMode="numeric")
- [x] **SCORE-03**: Modal submit button remains visible when the mobile keyboard is open
- [x] **SCORE-04**: Score input fields meet 44px minimum tap target height

### Organizer Mobile

- [x] **ORG-01**: Organizer can submit and correct match results on a mobile device
- [x] **ORG-02**: Result correction modal is fullscreen and touch-friendly on mobile

### App-Wide Responsive

- [x] **RESP-01**: No page exhibits horizontal overflow at 375px viewport width
- [x] **RESP-02**: Data tables use column hiding on mobile to prevent overflow (rankings, player lists, tournament lists)
- [x] **RESP-03**: All interactive elements (buttons, links, form controls) meet 44px minimum tap target size
- [x] **RESP-04**: Tournament list page is usable on mobile devices
- [x] **RESP-05**: Category rankings page is usable on mobile devices
- [x] **RESP-06**: Player profile page is usable on mobile devices
- [x] **RESP-07**: Organizer pages (dashboard, players, tournament setup) are usable on mobile devices
- [x] **RESP-08**: Light visual refresh applied: consistent spacing, typography, and color improvements

## Future Requirements

### Deferred to v1.4.x

- **BRKT-D01**: User can pinch-to-zoom the bracket on mobile (requires react-zoom-pan-pinch integration, real-device validation)
- **SCORE-D01**: Score entry uses stepper buttons (+/-) instead of typing integers
- **ORG-D01**: Manual bracket draw is fully usable on mobile (bottom-sheet player picker)

### Deferred to v2+

- **RESP-D01**: Data tables use card-stacking layout on mobile (high effort over column hiding)
- **NOTIF-D01**: "My Match" status badge on tournament list cards
- **NAV-D01**: Bottom navigation bar for mobile (requires routing restructure)
- **OFFLINE-D01**: Offline-tolerant score submission (service worker)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replace Bootstrap with Tailwind | Existing 15-feature codebase built on Bootstrap; migration cost exceeds value |
| Native mobile app (Ionic/Capacitor) | Responsive web covers mobile use cases per PROJECT.md |
| State management library for mobile | React hooks sufficient; no Redux/Zustand needed |
| Offline support | Requires service worker infrastructure; deferred to v2+ |
| Bottom navigation bar | Requires routing restructure; Offcanvas drawer is sufficient for v1.4 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOOL-01 | Phase 20 | Complete |
| TOOL-02 | Phase 20 | Complete |
| NAV-01 | Phase 21 | Complete |
| NAV-02 | Phase 21 | Complete |
| NAV-03 | Phase 21 | Complete |
| LAYOUT-01 | Phase 22 | Complete |
| LAYOUT-02 | Phase 22 | Complete |
| LAYOUT-03 | Phase 22 | Complete |
| LAYOUT-04 | Phase 22 | Complete |
| LAYOUT-05 | Phase 22 | Complete |
| BRKT-01 | Phase 23 | Complete |
| BRKT-02 | Phase 23 | Complete |
| BRKT-03 | Phase 23 | Complete |
| BRKT-04 | Phase 23 | Complete |
| SCORE-01 | Phase 23 | Complete |
| SCORE-02 | Phase 23 | Complete |
| SCORE-03 | Phase 23 | Complete |
| SCORE-04 | Phase 23 | Complete |
| ORG-01 | Phase 24 | Complete |
| ORG-02 | Phase 24 | Complete |
| RESP-01 | Phase 25 | Complete |
| RESP-02 | Phase 25 | Complete |
| RESP-03 | Phase 25 | Complete |
| RESP-04 | Phase 25 | Complete |
| RESP-05 | Phase 25 | Complete |
| RESP-06 | Phase 26 | Complete |
| RESP-07 | Phase 25 | Complete |
| RESP-08 | Phase 25 | Complete |

**Coverage:**
- v1.4 requirements: 28 total
- Satisfied: 27
- Pending (Phase 26): 1
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation*
