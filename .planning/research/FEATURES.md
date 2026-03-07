# Feature Research

**Domain:** Mobile-first UI rework for amateur tennis league tournament manager (v1.4 milestone)
**Researched:** 2026-03-06
**Confidence:** HIGH (existing codebase fully inspected, web research confirms patterns)

---

## Context: What This Research Covers

This is a subsequent milestone for an existing, functional app (v1.3). The features below are NOT about new backend capabilities. They are about restructuring and hardening the existing React/Bootstrap frontend for mobile use. The app already works on desktop; mobile usage is constrained by known layout, navigation, and UX problems.

**Existing components relevant to this milestone:**
- `NavBar.jsx` — Bootstrap 5 navbar, uses plain `data-bs-toggle` collapse (known mobile bug: nav does not close after item tap)
- `KnockoutBracket.jsx` + `KnockoutBracket.css` — horizontal scroll container with CSS flexbox, zoom/pan via CSS transform; already has the right architecture
- `ExpandableSection.jsx` — reusable collapse wrapper (Bootstrap `<Collapse>`), used by format visualizations today
- `TournamentViewPage.jsx` — renders all sections stacked unconditionally, no status-aware visibility logic
- `TournamentInfoPanel.jsx`, `PlayerListPanel.jsx`, `PointPreviewPanel.jsx` — desktop-only layout with no mobile breakpoints
- TanStack React Table used in rankings and player lists — no responsive stacking behavior today

---

## Table Stakes (Users Expect These)

Features users assume exist in any web app in 2026. Missing these = product feels broken on mobile.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Mobile nav that closes after item tap | Universal web nav behavior; current nav stays open after selection | LOW | Fix: add `expanded`/`onToggle` state to `NavBar.jsx`, or use React Bootstrap's `<Navbar collapseOnSelect>` prop — one prop change |
| Tap targets >= 44px height | Apple HIG / WCAG minimum; small buttons fail on phone | LOW | Audit all `btn-sm` usages; add `min-height: 44px` via global CSS or utility class |
| No horizontal overflow / content clipping | Basic mobile contract; any element wider than viewport = unusable | MEDIUM | Requires viewport audit of every page; Bootstrap grid helps but custom layouts break this |
| Readable text without zooming | Standard mobile usability; base font <14px forces users to pinch-zoom | LOW | Set base font 16px (Bootstrap default is fine; verify no explicit overrides) |
| Status badge / header immediately visible | Users land on tournament page on mobile to check status; scrolling past hero content to find it is a failure | MEDIUM | Requires TournamentViewPage restructure: status-aware hero block at top |
| Forms usable on mobile keyboard | Score entry, registration forms — inputs must not be occluded by keyboard | MEDIUM | `font-size: 16px` on inputs prevents iOS auto-zoom; proper `inputmode` attributes for numeric score fields |

---

## Feature 1: Status-Aware Content Visibility (Collapsing Sections)

**What it is:** Tournament page sections show/hide and reorder based on tournament lifecycle state (SCHEDULED / IN_PROGRESS / COMPLETED).

**Why it's table stakes for mobile:** The tournament page currently renders all sections unconditionally in a fixed order (header, info panel, bracket, consolation opt-out, organizer panel, player list, point preview). On mobile this is a ~40-screen scroll. Players arriving during a live tournament to find their match must scroll past registration info and point tables to reach the bracket.

**Pattern:** Status-driven section priority, not simple show/hide.

| Status | Hero (top of page) | Collapsed by default | Hidden entirely |
|--------|-------------------|---------------------|-----------------|
| SCHEDULED | Registration info, player list | Point preview | Bracket (none yet) |
| IN_PROGRESS | Bracket visualization | Player list (collapsed), info panel (collapsed) | Nothing |
| COMPLETED | Bracket (final state), champion banner | Point preview (collapsed) | Registration UI |

**Implementation approach:** Enhance `TournamentViewPage.jsx` with a `sectionConfig(status)` function that returns ordered, visibility-controlled section descriptors. `ExpandableSection.jsx` already exists and supports `defaultExpanded` — leverage it. Do not build a new accordion system.

**Complexity:** MEDIUM — no new components needed; requires logic restructure in `TournamentViewPage.jsx` and controlled `defaultExpanded` in existing `ExpandableSection` components.

**Dependency:** `ExpandableSection.jsx` (already built). No backend changes.

---

## Feature 2: Bracket Visualization on Mobile Screens

**What it is:** Make the knockout bracket readable and navigable on a phone-sized screen without requiring desktop interaction modes.

**Current state:** The bracket already has horizontal scroll + zoom/pan via CSS transform. The CSS variables set `--bracket-min-scale: 0.25` and `--bracket-match-min-width: 200px`. On a 390px-wide phone, even a 4-player bracket is 400px+ wide and requires horizontal scroll.

**What mobile users actually need:**
1. Default zoom-out on small screens so the whole bracket is visible without scrolling (auto-scale to viewport on load)
2. Pinch-to-zoom using pointer events (current zoom is button-only)
3. "My Match" button prominence — it's built but visually buried
4. Bracket renders well at small scale — match cards must be readable at 0.5x

**Pattern (confirmed by industry):** Mobile sports apps use horizontal swipe-by-round OR zoom/pan. Zoom/pan is already implemented. The missing piece is a responsive initial scale (auto-fit on first render) and touch gesture support for zoom.

**Complexity:** MEDIUM — auto-scale requires reading container width and computing initial transform in `useBracketNavigation.js`; pinch-to-zoom requires pointer event handling (two-finger distance tracking)

**Do NOT do:** Split the bracket into per-round screens or introduce a carousel — too much architectural change and it breaks the visual bracket metaphor that players expect.

**Dependency:** `useBracketNavigation.js`, `KnockoutBracket.css`. No backend changes.

---

## Feature 3: Mobile Navigation Fix

**What it is:** Fix the known bug where the Bootstrap navbar does not collapse after a nav item is tapped on mobile.

**Root cause (confirmed via research):** `NavBar.jsx` currently uses raw `data-bs-toggle="collapse"` on the hamburger button without React state control. When nav items are tapped (they use `onClick` + `navigate()`), Bootstrap's JS collapse does not fire — the menu stays open. React Bootstrap's `<Navbar collapseOnSelect>` + `<Nav.Link>` pattern handles this automatically.

**Fix approach:**
1. Add `collapseOnSelect` and `expanded`/`onToggle` state to the Bootstrap `<Navbar>` in `NavBar.jsx`
2. Convert nav items from `<span onClick>` to `<Nav.Link onClick>` so Bootstrap's collapse-on-select fires correctly
3. Test on actual mobile device — this cannot be verified in desktop DevTools responsive mode

**Complexity:** LOW — a targeted fix to one component, not a rewrite

**Dependency:** None. Can ship independently.

---

## Feature 4: Touch-Friendly Match Result Entry

**What it is:** Match score entry on mobile is the primary player-facing action. Players enter results from a tennis court with a phone in one hand.

**Current state:** `MatchResultModal.jsx` uses `SetsScoreForm.jsx` and `BigTiebreakForm.jsx` — these are modal forms with number inputs. Not audited for mobile.

**What touch-friendly means in practice:**
- Inputs use `inputmode="numeric"` so mobile keyboard shows number pad, not full QWERTY
- Input fields are `min-height: 44px` and padded sufficiently to tap accurately
- Score fields (e.g., 0–7) should use stepper buttons (+/-) or a number wheel, not raw text input, because typing "6" and "4" separately on mobile is error-prone — stepper UX is faster and has built-in validation
- Modal does not get occluded by mobile keyboard (need `position: fixed` with proper viewport units)
- Submit button is always visible without scrolling inside the modal

**Pattern recommendation:** Use `<input type="number" inputMode="numeric" min="0" max="7">` for set scores. Supplement with +/- stepper buttons for the common case (scores 0–7). Keep the full text input as fallback.

**Complexity:** MEDIUM — form component changes, CSS audit, stepper button addition; no API changes

**Dependency:** `MatchResultModal.jsx`, `SetsScoreForm.jsx`, `BigTiebreakForm.jsx`. No backend changes.

---

## Feature 5: Responsive Data Tables on Mobile

**What it is:** Player lists, rankings tables, and registration tables on mobile need a usable format. Wide tables with 5+ columns are unreadable on 390px screens.

**Current situation:** TanStack React Table is used in `RankingsTable.jsx` and `PlayerListPanel.jsx`. These render standard HTML `<table>` elements — they overflow or wrap badly on mobile.

**Industry-standard patterns (two options):**

**Option A — Column hiding:** Hide low-priority columns at mobile breakpoints. Rank + Name remain; Points, Category, Win% collapse. TanStack supports `column.getIsVisible()` with custom media query hooks. This is the fastest to implement.

**Option B — Card stacking:** Convert each table row to a card on mobile (label: value format). Provides full data access but requires a parallel rendering path.

**Recommendation:** Option A for v1.4. Hide columns with a `useMediaQuery` hook (or CSS `@media` on `<td>` / `<th>` directly). Option B is a differentiator for v2.

**Complexity:** LOW for Option A (column visibility), HIGH for Option B (card stacking)

**Dependency:** `RankingsTable.jsx`, `PlayerListPanel.jsx`, TanStack column definitions. No backend changes.

---

## Feature 6: Mobile Dev Testing Tooling

**What it is:** A workflow for developers to test the app on real mobile devices during development.

**Current state:** Vite dev server at `localhost:3001`, no `--host` flag, no network exposure configured.

**What's needed:**
1. `vite.config.js` `server.host: true` (or `'0.0.0.0'`) to expose on local network
2. QR code plugin (`vite-plugin-qrcode` — 7k weekly downloads, actively maintained) to auto-display network URL as QR on dev server start
3. Documentation of the workflow: same Wi-Fi, scan QR, test on device

**Why this matters:** Mobile-specific bugs (nav collapse, keyboard occlusion, touch events) cannot be caught in Chrome DevTools mobile emulation. Real device testing is required. The QR code plugin reduces friction from "look up IP, type it manually" to "scan and go."

**Complexity:** LOW — two config changes (vite.config.js + package.json), one new dev dependency

**Installation:**
```bash
npm install -D vite-plugin-qrcode
```

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { qrcode } from 'vite-plugin-qrcode';

export default defineConfig({
  plugins: [react(), qrcode()],
  server: {
    host: true,  // expose on network
    port: 3001,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }
  }
});
```

**Dependency:** None. Should be done first — enables testing all other mobile features.

---

## Feature 7: App-Wide Mobile Responsiveness Pass

**What it is:** Audit and fix all key pages for mobile breakpoints. Not a redesign — a systematic fix pass.

**Pages requiring attention (from code inspection):**

| Page | Known Issue | Fix Approach |
|------|-------------|--------------|
| `TournamentViewPage.jsx` | All sections stacked, no mobile priority | Status-aware section ordering (Feature 1) |
| `TournamentInfoPanel.jsx` | Two-column layout — unknown mobile behavior | Ensure Bootstrap `col-md` used, not fixed `col-6` |
| `PlayerListPanel.jsx` | Table — overflows on mobile | Column hiding (Feature 5) |
| `RankingsTable.jsx` | Table — overflows on mobile | Column hiding (Feature 5) |
| `TournamentsListPage.jsx` | Card/table list — unknown mobile behavior | Card layout works; verify |
| `CategoryRankingsPage.jsx` | Tabs + table — tabs may overflow | Scrollable tab bar (`overflow-x: auto` on nav) |
| `ManualDrawEditor.jsx` | Dropdown-heavy draw UI for organizers | Verify dropdowns are tap-sized; 44px target |
| `OrganizerDashboard.jsx` | Multiple action buttons per row | Verify button spacing for touch |
| NavBar | Known collapse bug | Feature 3 |

**Complexity:** MEDIUM overall — individual fixes are mostly LOW; the audit takes time but not complex code

**Dependency:** Features 1, 3, and 5 cover the highest-impact items. Remaining pages are secondary.

---

## Differentiators (Competitive Advantage)

These go beyond fixing what's broken and would genuinely improve the mobile experience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Auto-fit bracket on mobile load | Bracket visible without user needing to zoom out first | MEDIUM | Compute initial scale from container width and bracket total width in `useBracketNavigation.js` |
| Pinch-to-zoom bracket | Native gesture instead of +/- buttons | MEDIUM | Two-finger pointer event distance tracking; `touch-action: none` already set in CSS |
| Score stepper buttons (+/-) | Faster and error-safer than typing numbers for set scores | MEDIUM | Replace/augment number inputs with increment/decrement buttons |
| "My Match" badge on tournament card | Player sees their match status from tournament list without entering the detail page | HIGH | Requires API call per tournament card; likely too expensive for v1.4 |
| Offline-tolerant score submission | Submit score even on poor court connectivity; retry on reconnect | HIGH | Service worker / optimistic UI pattern — significant complexity, defer to v2 |

---

## Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Bottom navigation bar (app-style) | Thumb-friendly, Instagram/Spotify pattern | Requires routing restructure and different mental model from the existing nav; Bootstrap Navbar is already accessible and familiar | Fix the hamburger collapse bug; the current top nav works fine once the collapse is fixed |
| Native mobile app (PWA or React Native) | "Better mobile experience" | Out of scope per PROJECT.md constraints; web-first is the stated approach | Responsive web is sufficient; mobile UX issues are fixable without a native app |
| Per-round bracket carousel (swipe between rounds) | Intuitive swiping gesture | Breaks the visual bracket metaphor; players can no longer see how rounds connect; zoom/pan is a better model for tournament brackets specifically | Use zoom/pan (already built) with auto-fit initial scale |
| Real-time live bracket updates (polling) | See results appear without refresh | Polling adds load and complexity; SWR already handles revalidation on refocus | SWR's `revalidateOnFocus` is sufficient for the use case — players check results after walking off court |
| Full card-stacking for all tables | Beautiful mobile table pattern | HIGH implementation cost; requires parallel rendering paths for every table component | Column hiding (Option A) gives 80% of the benefit at 20% of the cost |

---

## Feature Dependencies

```
Mobile Dev Tooling (Feature 6)
    └──enables testing──> All other mobile features

Nav Fix (Feature 3)
    └──independent; ship first for immediate value

Status-Aware Visibility (Feature 1)
    └──requires──> ExpandableSection.jsx (already built)
    └──enhances──> App-Wide Responsiveness Pass (Feature 7)

Bracket Mobile UX (Feature 2)
    └──requires──> useBracketNavigation.js (already built)
    └──enhances──> Status-Aware Visibility (bracket is hero for IN_PROGRESS)

Touch-Friendly Score Entry (Feature 4)
    └──requires──> MatchResultModal.jsx (already built)
    └──independent of bracket and nav changes

Responsive Data Tables (Feature 5)
    └──requires──> TanStack column definitions (already in use)
    └──enhances──> App-Wide Responsiveness Pass (Feature 7)

App-Wide Responsiveness Pass (Feature 7)
    └──depends on──> Features 1, 3, 5 completing first (they cover the hardest cases)
```

### Dependency Notes

- **Feature 6 (tooling) must be first:** Testing without it means developers are guessing about real device behavior. Set up `--host` and QR code before writing any mobile CSS.
- **Feature 3 (nav fix) is highest impact for lowest effort:** The known nav bug affects every page on mobile and can be shipped in isolation as the first PR.
- **Feature 1 (status-aware visibility) gates Feature 7:** The tournament view page restructure is the core of the mobile rework — all other page fixes are secondary.
- **Feature 4 (score entry) is independent:** It has no dependency on nav, bracket, or table work. Can be parallelized.

---

## MVP Definition

### Launch With (v1.4)

- [x] Feature 6: Mobile dev tooling — enables testing everything else; do this day one
- [x] Feature 3: Nav mobile collapse fix — highest impact, lowest effort, fixes known tester-reported bug
- [x] Feature 1: Status-aware tournament page sections — core of the mobile rework
- [x] Feature 7: App-wide responsiveness pass — systematic audit of all key pages
- [x] Feature 2: Bracket auto-scale on mobile load — bracket is the primary destination on IN_PROGRESS tournaments
- [x] Feature 5: Responsive tables (column hiding) — rankings and player lists must be usable on mobile

### Add After Validation (v1.4.x)

- [ ] Feature 4: Touch-friendly score entry (stepper buttons) — current number inputs work; steppers are polish
- [ ] Feature 2 (pinch-to-zoom): Good differentiator; implement after core bracket layout is verified on real devices

### Future Consideration (v2+)

- [ ] Full card-stacking for tables — high effort, minor benefit over column hiding
- [ ] Offline-tolerant score submission — requires service worker; significant complexity
- [ ] "My Match" status on tournament list cards — requires per-card API enrichment

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Mobile dev tooling (QR + host) | LOW (dev only) | LOW | P1 — do first, enables everything |
| Nav collapse fix | HIGH | LOW | P1 — known bug, one file |
| Status-aware section visibility | HIGH | MEDIUM | P1 — core of milestone |
| App-wide responsiveness pass | HIGH | MEDIUM | P1 — breadth coverage |
| Bracket auto-scale on mobile | HIGH | MEDIUM | P1 — primary player view |
| Responsive tables (column hiding) | MEDIUM | LOW | P1 — easy win |
| Touch-friendly score entry (stepper) | MEDIUM | MEDIUM | P2 — polish over function |
| Pinch-to-zoom bracket | MEDIUM | MEDIUM | P2 — gesture UX upgrade |
| Bottom nav bar | LOW | HIGH | P3 — nice-to-have, not justified |
| Card-stacking tables | LOW | HIGH | P3 — over-engineered for the gain |

**Priority key:**
- P1: Must have for v1.4
- P2: Add when P1 is complete and stable
- P3: Defer to v2+

---

## Competitor Feature Analysis

| Feature | Challonge (web) | Tourney App (mobile) | BATL v1.4 Approach |
|---------|----------------|---------------------|---------------------|
| Mobile bracket | Horizontal scroll only, no zoom | Native pinch-zoom, round-by-round | Zoom/pan (already built) + auto-fit initial scale |
| Mobile nav | Top hamburger, collapses on tap | Bottom tabs (native app) | Fix collapse bug in existing top nav |
| Status-aware content | All content always visible | Match-focused views | Status-driven section priority |
| Score entry | Modal form, number inputs | Large tap targets, dedicated UI | Fix inputmode + stepper buttons |
| Data tables on mobile | Horizontal scroll (broken UX) | Not applicable (native views) | Column hiding via TanStack |

---

## Sources

- [Designing a tournament bracket with a mobile-first approach — New Media Campaigns](https://www.newmediacampaigns.com/blog/designing-a-tournament-bracket-mobile-first-approach) — 75% of tournament traffic is mobile/tablet; horizontal swipe-by-round is the dominant native pattern
- [React Bootstrap Navbar docs](https://react-bootstrap.netlify.app/docs/components/navbar/) — `collapseOnSelect` prop is the correct fix for nav items that navigate via `onClick` without using `Nav.Link`
- [vite-plugin-qrcode — svitejs/vite-plugin-qrcode](https://github.com/svitejs/vite-plugin-qrcode) — shows QR on dev server start; only activates when host is exposed to network
- [How to open Vite dev server on your mobile — DEV Community](https://dev.to/bhendi/how-to-open-your-vite-dev-server-on-your-mobile-k1k) — `server.host: true` in vite.config.js exposes to LAN
- [TanStack Table responsive collapse discussion](https://github.com/TanStack/table/discussions/3259) — column visibility API for responsive hiding
- [Mobile UX Best Practices: Tap Targets — edesignify](https://edesignify.com/blogs/tap-targets-and-touch-zones-mobile-ux-that-works) — 44×44px minimum, 8px spacing between targets
- [Adding zoom, pan, and pinch to React — LogRocket](https://blog.logrocket.com/adding-zoom-pan-pinch-react-web-apps/) — pointer event distance tracking for pinch-to-zoom
- [touch-action CSS — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) — `touch-action: none` required on pan/zoom elements to suppress browser default gestures
- [Pinch-to-zoom implementation — MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures) — two-pointer distance delta for scale calculation
- Existing codebase: `NavBar.jsx`, `KnockoutBracket.jsx`, `KnockoutBracket.css`, `ExpandableSection.jsx`, `TournamentViewPage.jsx` (inspected directly)

---

*Feature research for: BATL v1.4 — Mobile-first UI rework*
*Researched: 2026-03-06*
