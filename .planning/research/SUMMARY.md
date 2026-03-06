# Project Research Summary

**Project:** BATL v1.4 — UI Rework and Mobile Design
**Domain:** Mobile-first responsive retrofit of an existing React 19 / Bootstrap 5.3 tournament management SPA
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

BATL v1.4 is a targeted mobile-first retrofit of a fully functional desktop web app (v1.3, 11 delivered features). The project involves no new backend API development — the Express/Prisma backend remains entirely unchanged. The work is a frontend-only rework of the React 19 / React Bootstrap 2.10 SPA to make it genuinely usable on phones, which are the primary device for players entering scores at a tennis court. Research confirmed two production bugs (hamburger menu does nothing on mobile, score keyboard shows wrong keypad on iOS) and multiple latent issues (bracket pan blocked by passive touch events, iOS modal clipping, table overflow, desktop-first CSS specificity conflicts). The recommended approach is a sequential 5-phase fix campaign starting with the navigation blocker and ending with the organizer-specific mobile UX.

The stack changes are minimal and surgical: one new production dependency (`react-zoom-pan-pinch`, deferred to v1.4.x pending real-device validation), one dev dependency (`vite-plugin-qrcode`), and native-CSS-only additions for viewport units and safe area insets. Every UI change leans on React Bootstrap 2.10 capabilities that are already installed but unused — specifically `Navbar.Offcanvas`, `Modal fullscreen="sm-down"`, and `Accordion`. The most critical architectural change is status-aware section ordering in `TournamentViewPage`: the bracket must become the hero element when a tournament is `IN_PROGRESS`, and this single change delivers the highest player-side impact of anything in the milestone.

The primary risk is the gap between Chrome DevTools mobile emulation and real device behavior. Passive touch event listeners, iOS Safari modal clipping, and the iOS numeric keyboard are all invisible in DevTools but critical to players in the field. Every phase must include a real-device verification step — this is why dev tooling setup is Phase 0. The secondary risk is CSS specificity conflicts from the existing desktop-first stylesheet: `KnockoutBracket.css` and several panel components use compound selectors that will silently override Bootstrap mobile utilities. The CSS audit must happen before new mobile styles are written, not after.

---

## Key Findings

### Recommended Stack

The existing stack (React 19, Vite 7, React Bootstrap 2.10, Bootstrap 5.3, TanStack React Table 8.21) handles all v1.4 requirements without new libraries for navigation, forms, or layout. Research explicitly rejected third-party navbar libraries, Tailwind CSS, Ionic/Capacitor, and a state management library for mobile nav — all are either unmaintained, conflict with Bootstrap, or are out of scope per PROJECT.md constraints.

**Core technologies:**
- `react-zoom-pan-pinch` 3.7.0: Touch gesture handling for bracket zoom/pan — replaces custom CSS transform hook for pinch-to-zoom; React 17+ compatible, 342 npm dependents; deferred to v1.4.x pending core bracket layout validation on real devices
- `vite-plugin-qrcode` 0.3.0: Dev-only QR code for real-device testing — eliminates "type IP address manually" friction; activates only when `server.host: true` is configured
- `Navbar.Offcanvas` (React Bootstrap 2.10, already installed): Mobile hamburger nav drawer — zero new installation; fixes the known nav collapse bug without Bootstrap JS conflicts
- CSS `svh`/`dvh` units + `env(safe-area-inset-*)`: Modern viewport units and notch/home-indicator padding — 92%+ browser support as of 2026, no polyfill needed
- `inputMode="numeric"` + `type="text"`: Correct integer-first numeric keyboard on iOS Safari — replaces `type="number"` which shows a decimal-first keypad on iPhone

### Expected Features

**Must have (table stakes — v1.4 MVP):**
- Mobile nav that closes after item tap — current nav is silently broken (`data-bs-toggle` without Bootstrap JS)
- Tap targets >= 44px — required by WCAG 2.5.5 and Apple HIG; all `btn-sm` elements fail this today
- Status-aware section ordering on tournament page — bracket must surface as hero for `IN_PROGRESS` tournaments; the current 40-screen scroll is a failure for players at the court
- Bracket auto-scale on mobile load — bracket must fit viewport on first render without requiring the user to find and use the zoom-out button
- Responsive data tables — column hiding on xs/sm prevents horizontal overflow on rankings and player lists
- Forms usable on mobile keyboard — `inputMode="numeric"`, 16px+ input font size, modal footer not clipped by keyboard

**Should have (competitive differentiators — v1.4.x after real-device validation):**
- Pinch-to-zoom bracket — replaces +/- buttons with gesture-native zoom; currently blocked by browser pinch intercept; requires `react-zoom-pan-pinch` integration
- Score stepper buttons (+/-) for set entry — faster and error-safer than typing integers; upgrade after core number input fix is verified
- Full-screen `MatchResultModal` on mobile — single prop `fullscreen="sm-down"` delivers the highest-impact score entry UX improvement

**Defer (v2+):**
- Card-stacking for all tables (high effort over column hiding for marginal gain)
- Offline-tolerant score submission (requires service worker; significant complexity)
- "My Match" status badge on tournament list cards (requires per-card API enrichment)
- Bottom navigation bar (requires routing restructure and different mental model)

### Architecture Approach

This milestone is a CSS-first, prop-adjustment-first rework of the presentation layer. No new pages or backend API contracts are introduced. The core architectural change is a `buildSectionOrder(status, role)` function in `TournamentViewPage.jsx` that returns an ordered section descriptor array — replacing the hardcoded flat stack with status-aware hero promotion. Twelve existing components are modified; two new files are created (`useBreakpoint.js` hook, optional `mobileDetect.js` utility). All component changes are surgical: new props accepted, Bootstrap variants added, CSS breakpoints expanded.

**Major components and their v1.4 responsibility changes:**
1. `NavBar.jsx` — Replace plain `<nav>` + `data-bs-toggle` with React Bootstrap `Navbar.Offcanvas`; switch `onClick/navigate` items to `Nav.Link as={NavLink}` for `collapseOnSelect`
2. `TournamentViewPage.jsx` — Status-aware `buildSectionOrder(status, role)` function; `FormatVisualization` receives `forceExpand` prop; secondary sections default-collapsed on mobile via Accordion
3. `KnockoutBracket.jsx` + `useBracketNavigation.js` — Auto-scale `useEffect` measuring `scrollWidth vs clientWidth`; expose `setScale()` for external control; imperative `addEventListener({passive: false})` for touch pan; `touch-action: pinch-zoom` CSS fix
4. `MatchResultModal.jsx` — `fullscreen="sm-down"`, `scrollable={true}`, `type="text" inputMode="numeric"` on score fields, input height >= 44px
5. `ManualDrawEditor.jsx` — Stacked `Col xs={12}` layout; searchable select for player assignment on mobile
6. `PlayerListPanel.jsx` / `RankingsTable.jsx` — Column hiding via Bootstrap `d-none d-md-table-cell` on non-essential `<th>/<td>` pairs

### Critical Pitfalls

1. **Bootstrap hamburger requires Bootstrap JS (not loaded)** — The `data-bs-toggle="collapse"` pattern in `NavBar.jsx` is inert without the Bootstrap JS bundle, which is not imported and would conflict with React Bootstrap's component model. Fix: replace the plain `<nav>` entirely with React Bootstrap `<Navbar>` components. Must be Phase 1, day one.

2. **React passive touch events block `preventDefault` in bracket pan** — React 17+ registers all touch listeners as passive by default. `e.preventDefault()` in `handleTouchMove` is silently ignored on real iOS/Android devices, causing the page to scroll instead of the bracket panning. This bug does not appear in DevTools emulation. Fix: register touch handlers imperatively with `addEventListener('touchmove', fn, { passive: false })` directly on the DOM node.

3. **Pinch-to-zoom conflicts with browser native zoom** — The custom 2-finger pinch logic in `useBracketNavigation.js` is preempted by the OS on real devices; the entire page zooms instead of the bracket. Fix: remove the 2-finger logic and rely on +/- buttons as primary zoom UX on mobile (already built). If pinch-zoom is required, integrate `react-zoom-pan-pinch` and accept replacing the custom hook — this decision must be made early in Phase 3.

4. **iOS Safari keyboard clips Bootstrap Modal footer** — `overflow: hidden` on `<body>` combined with fixed modal positioning hides the submit button behind the iOS keyboard. Fix: add `scrollable={true}` to all modals with form inputs; use `max-height: 80svh` CSS override; must be verified on a real iPhone, not DevTools.

5. **Desktop-first CSS specificity overrides Bootstrap mobile grid** — Compound selectors in `KnockoutBracket.css` and panel components (e.g. `.bracket-controls-wrapper .btn`) have higher specificity than Bootstrap utility classes. Adding `col-12` on mobile has no visible effect when an existing rule sets `min-width: 200px` without a breakpoint qualifier. Fix: audit all CSS for fixed-pixel `width`, `min-width`, `display`, and `flex-direction` before writing new mobile CSS.

---

## Implications for Roadmap

Based on research, suggested 5-phase structure with a Phase 0 tooling prerequisite:

### Phase 0: Mobile Dev Tooling Setup
**Rationale:** Real-device testing is the verification mechanism for every other phase. Passive events, iOS keyboard behavior, and touch targets are invisible in DevTools. This must be completed on day one so all subsequent work is validated correctly.
**Delivers:** `server.host: true` in vite.config.js; `vite-plugin-qrcode` installed; developer can scan QR code to open app on phone in 30 seconds; viewport meta tag verified (`viewport-fit=cover`).
**Addresses:** Feature 6 (mobile dev tooling)
**Stack:** `vite-plugin-qrcode` 0.3.0 (dev dep only)
**Avoids:** "Looks done but isn't" pitfall — DevTools emulation as primary test method produces false confidence

### Phase 1: Navigation Fix
**Rationale:** The hamburger menu is silently broken on all mobile browsers. It is a prerequisite for testing any other page on mobile — without working nav, there is no way to navigate the app on a phone. Highest impact-to-effort ratio of anything in the milestone. Ship as the first PR.
**Delivers:** Working mobile nav with slide-in Offcanvas drawer; closes after item tap; desktop bar unchanged at lg+; all role-gated links accessible on mobile.
**Addresses:** Feature 3 (mobile nav fix), Table Stakes (nav closes after tap)
**Architecture pattern:** NavBar Offcanvas Drawer (Pattern 2 in ARCHITECTURE.md)
**Avoids:** Pitfall 1 (Bootstrap JS / data-bs-toggle), Anti-pattern 5 (navbar-toggler without Bootstrap JS)

### Phase 2: Tournament Page Status-Aware Layout
**Rationale:** The tournament view page is the primary destination for players during a live tournament. The current flat section stack requires scrolling past registration, logistics, and point tables to reach the bracket. This restructure is the core mobile rework — all other page fixes are secondary to this one.
**Delivers:** `buildSectionOrder(status, role)` in TournamentViewPage; bracket is auto-expanded hero when IN_PROGRESS; secondary sections (info, points, player list) default-collapsed via Accordion; champion banner positioned correctly for COMPLETED tournaments.
**Addresses:** Feature 1 (status-aware visibility), Feature 7 (tournament page, highest-priority component of app-wide pass)
**Architecture pattern:** Status-Aware Layout Ordering (Pattern 3), Accordion for Collapsible Sections (Pattern 4)
**Avoids:** Anti-pattern 4 (making everything an accordion — bracket must never be collapsed when IN_PROGRESS)

### Phase 3: Bracket and Score Entry Mobile UX
**Rationale:** With the bracket promoted to hero, it must be usable on mobile. Auto-scale and correct touch events are prerequisite to the bracket being functional, not just visible. Score entry is the primary player action — form inputs must be touch-safe. These two areas share the `MatchResultModal` boundary, so they are batched into one phase.
**Delivers:** Bracket auto-scales to viewport width on mobile mount; touch pan works on real devices (passive event fix); +/- zoom buttons meet 44px tap target minimum; `MatchResultModal` is full-screen on mobile; score inputs use `inputMode="numeric"`; modal footer visible with keyboard open on real iPhone.
**Addresses:** Feature 2 (bracket mobile UX), Feature 4 (touch-friendly score entry), differentiator bracket gestures
**Architecture pattern:** KnockoutBracket Mobile Touch Refactoring (Pattern 5), MatchResultModal Full-Screen (Pattern 7)
**Avoids:** Pitfall 2 (passive touch events), Pitfall 3 (pinch-zoom vs browser zoom — remove 2-finger logic), Pitfall 4 (iOS keyboard clips modal), Pitfall 8 (wrong iOS keyboard for score entry), Pitfall 9 (modal width at 375px)
**Decision gate:** Decide at start of phase whether pinch-to-zoom is in v1.4 (integrate `react-zoom-pan-pinch`) or deferred to v1.4.x (rely on +/- buttons). Research recommends deferring; confirm by testing +/- button UX on a real device.

### Phase 4: Organizer Mobile Support — Manual Draw
**Rationale:** Organizers primarily use laptops, but courtside tournament management (draw assignment, result corrections) happens on phones. The `ManualDrawEditor` is completely untested on mobile and has documented failure modes: 33-item unfiltered dropdown, adjacent tap targets causing wrong player assignments, and accidental API calls. Comes after the bracket phase because the draw editor is reached via the bracket/tournament flow.
**Delivers:** `ManualDrawEditor` uses stacked single-column layout; per-position player assignment is touch-safe (searchable select or adequate tap targets); `OrganizerRegistrationPanel` collapsible on mobile; result correction via fullscreen modal verified on real device.
**Addresses:** Feature 7 (organizer pages in app-wide responsiveness pass), Pitfall 10 (manual draw editor unusable on mobile)
**Avoids:** Pitfall: organizer takes 15+ minutes to complete draw on phone; accidental API calls from missed tap targets

### Phase 5: App-Wide Responsive Pass
**Rationale:** With the highest-impact pages fixed (nav, tournament view, bracket, modals, draw editor), a systematic pass covers remaining list/table pages. These are lower urgency because they are less frequently used on mobile, but they must not overflow or clip at 375px.
**Delivers:** `TournamentSetupPage`, `CategoryRankingsPage`, `OrganizerDashboard`, `OrganizerPlayersPage`, `PlayerPublicProfilePage`, and `TournamentsListPage` all pass 375px viewport test; tables use column hiding (not card stacking) for v1.4; scrollable tab bars on categories page; consistent 44px tap targets across all interactive elements.
**Addresses:** Feature 5 (responsive tables), Feature 7 (remaining pages in responsiveness pass), Table Stakes (no horizontal overflow on any page)
**Architecture pattern:** Responsive Tables column-hiding (Pattern 6), Bootstrap mobile-first breakpoint strategy (Pattern 1)
**Avoids:** Pitfall 5 (TanStack Table sticky + overflow conflict — do not combine `position: sticky` with `overflow-x: auto`), Pitfall 6 (desktop-first CSS specificity — audit before writing)

### Phase Ordering Rationale

- Phase 0 before everything: Real-device testing is the verification mechanism; setting it up last means every prior fix is unverified.
- Phase 1 before Phase 2: Cannot navigate to the tournament page on mobile without working nav; Phase 1 is the literal unlocker for all subsequent testing.
- Phase 2 before Phase 3: The bracket must be promoted to hero before its touch behavior is optimized — otherwise the improvements are on a component the user must scroll to find.
- Phase 3 before Phase 4: `MatchResultModal` fullscreen is part of Phase 3; the organizer result-correction workflow in Phase 4 depends on the same modal being usable on mobile.
- Phase 5 last: Each list/table page is independent; this phase can be parallelized across pages. These pages are predominantly used on desktop by organizers.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 3 (bracket touch):** The pinch-to-zoom vs. `react-zoom-pan-pinch` decision requires a spike on a real device before committing. Additionally, the passive event listener fix interacts with the BYE toggle `visibility: hidden` layout problem — fixing passive events may surface the BYE vertical whitespace issue as an immediate blocker.
- **Phase 4 (manual draw mobile):** The draw editor may need a fundamentally different mobile UX (bottom-sheet player picker, searchable input) rather than just responsive layout adjustments. PITFALLS.md rates recovery cost as HIGH if this reaches production untested. Budget the HIGH effort path as a contingency.

Phases with standard patterns (skip research-phase):
- **Phase 0 (tooling):** Both changes are config-only; exact code is in STACK.md.
- **Phase 1 (navigation):** React Bootstrap `Navbar.Offcanvas` is official documentation; complete code example is in ARCHITECTURE.md Pattern 2.
- **Phase 2 (tournament page layout):** No new components; `buildSectionOrder` function pattern with example code is in ARCHITECTURE.md Pattern 3.
- **Phase 5 (responsive pass):** Column hiding with `d-none d-md-table-cell` is a documented Bootstrap pattern; per-page work is formulaic once the pattern is established.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack locked by 11 delivered features. New additions verified against npm/GitHub for React 19 compatibility and maintenance status. Alternatives considered and rejected with documented reasoning. |
| Features | HIGH | Direct codebase inspection of every component named. Confirmed production bugs (NavBar.jsx data-bs-toggle, SetsScoreForm type="number") are code-audited, not inferred from general research. |
| Architecture | HIGH | Patterns derived from official Bootstrap 5.3 and React Bootstrap 2.10 docs. Anti-patterns documented with specific file-level reasoning from direct codebase analysis. |
| Pitfalls | HIGH | Code-audited against actual BATL files. Browser behavior claims (passive events, iOS keyboard, 100vh) are documented in MDN and Apple developer resources, not inferred. |

**Overall confidence:** HIGH

### Gaps to Address

- **Pinch-to-zoom final decision:** Research recommends deferring `react-zoom-pan-pinch` to v1.4.x and verifying +/- button UX on a real device first. If +/- proves inadequate during Phase 3 testing, the library integration needs its own spike. This decision point belongs at the start of Phase 3.
- **BYE row height on mobile:** `visibility: hidden` BYE rows waste significant vertical space on mobile but solving it risks breaking connector line positioning. The correct fix — CSS `display: none` with connector recalculation vs. accepting broken connectors at mobile scale — needs a feasibility check within Phase 3 scope.
- **Manual draw mobile UX extent:** Whether Phase 4 requires a new bottom-sheet player picker (HIGH effort, 2-4 days) or whether improved tap targets and a searchable `<select>` are sufficient depends on real-device testing of the current implementation. Budget must allow for both paths.
- **BracketMatch connector lines at auto-scaled fit:** CSS connector lines are positioned assuming a 1:1 render scale. At auto-scaled fit (e.g. 0.4x on a 375px phone for an 8-player bracket), connectors may misalign visually. Not documented in research files — a predictable but unconfirmed visual bug to check in Phase 3.

---

## Sources

### Primary (HIGH confidence)
- BATL codebase direct audit: `frontend/src/components/NavBar.jsx`, `KnockoutBracket.jsx`, `KnockoutBracket.css`, `useBracketNavigation.js`, `TournamentViewPage.jsx`, `TournamentInfoPanel.jsx`, `FormatVisualization.jsx`, `MatchResultModal.jsx`, `SetsScoreForm.jsx`, `RankingsTable.jsx`
- [React Bootstrap 2.10 Navbar docs](https://react-bootstrap.netlify.app/docs/components/navbar/) — `Navbar.Offcanvas`, `collapseOnSelect` confirmed in current docs
- [React Bootstrap 2.10 Offcanvas docs](https://react-bootstrap.netlify.app/docs/components/offcanvas/) — standalone Offcanvas component confirmed
- [Bootstrap 5.3 Breakpoints](https://getbootstrap.com/docs/5.3/layout/breakpoints/) — mobile-first breakpoint values confirmed
- [react-zoom-pan-pinch GitHub releases](https://github.com/BetterTyped/react-zoom-pan-pinch/releases) — v3.7.0 released 2026-01-31, React 17+ peer dep confirmed
- [MDN: touch-action CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) — passive event listener behavior documented
- [MDN: svh/dvh viewport units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage_lengths) — 92%+ browser support
- [Apple HIG: minimum touch target 44x44pt](https://developer.apple.com/design/human-interface-guidelines/layout)
- [WCAG 2.5.5 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)

### Secondary (MEDIUM confidence)
- [New Media Campaigns: mobile-first bracket design](https://www.newmediacampaigns.com/blog/designing-a-tournament-bracket-mobile-first-approach) — 75% of tournament traffic is mobile/tablet
- [LogRocket: Zoom, Pan, Pinch in React](https://blog.logrocket.com/adding-zoom-pan-pinch-react-web-apps/) — pointer event distance tracking pattern
- [DEV Community: Vite dev server on mobile](https://dev.to/bhendi/how-to-open-your-vite-dev-server-on-your-mobile-k1k) — `server.host: true` pattern confirmed
- [vite-plugin-qrcode npm](https://www.npmjs.com/package/vite-plugin-qrcode) — v0.3.0, 7k weekly downloads, actively maintained

### Tertiary (informational)
- [iOS Safari known issues: modal scroll behavior](https://developer.apple.com/forums/thread/119724) — `100vh` and keyboard interaction
- [eDesignify: tap targets and touch zones](https://edesignify.com/blogs/tap-targets-and-touch-zones-mobile-ux-that-works) — 44x44px minimum, 8px spacing between targets

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
