# Stack Research

**Domain:** Amateur tennis league tournament management — mobile-first UI rework and responsive design
**Researched:** 2026-03-06
**Confidence:** HIGH (extending a stable, well-defined stack; new additions are narrow and well-scoped)

---

## Existing Stack (Do Not Change)

Locked by 15 delivered features across v1.0–v1.3. Not re-researched here.

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js (ES Modules) | 20+ |
| Framework | Express | 5.1.0 |
| ORM | Prisma | current |
| Database | PostgreSQL | current |
| Frontend | React | 19 |
| Build | Vite | 7 |
| UI | React Bootstrap | 2.10 |
| Tables | TanStack React Table | 8.21 |
| Date Inputs | React DatePicker | 8.8 |
| Auth | Passport.js (local) + CASL | current |
| Validation | Joi | 18.x |
| Testing (BE) | Jest | 30.2.0 |
| Testing (FE) | Vitest | current |
| Data fetching | SWR | 2.3.x |

---

## New Additions for v1.4 Mobile Rework

### 1. Touch Gesture Handling for Bracket Navigation — `react-zoom-pan-pinch` (HIGH CONFIDENCE)

**Recommendation:** Add `react-zoom-pan-pinch` 3.7.0 to replace the current custom CSS transform + mouse drag implementation in `KnockoutBracket.jsx`.

**Why:** The bracket already has zoom/pan via `useBracketNavigation.js` with CSS transforms and manual pointer event handling. On mobile, this breaks down — pinch-to-zoom conflicts with browser scroll, touch event coordinates differ from mouse coordinates, and the current `touch-action: pan-x pan-y` does not support pinch gestures. `react-zoom-pan-pinch` wraps all of this in a battle-tested TransformWrapper/TransformComponent pair that handles pinch, double-tap zoom, panning, and wheel scroll uniformly across desktop and mobile.

**Version:** 3.7.0 (released 2026-01-31, latest)
**Confidence:** HIGH — actively maintained, 342+ dependents, touch-focused API, no React 19-specific blockers found
**Peer deps:** React 17+ (React 19 compatible)

**Integration point:** Replace the `bracket-viewport` div and `useBracketNavigation.js` hook with `TransformWrapper` + `TransformComponent` from this library. The existing `BracketControls.jsx` zoom in/out buttons wire to `useTransformContext()` provided by the library. Custom state management for zoom level is eliminated.

**Alternative:** `@use-gesture/react` 10.3.1 — lower level, requires pairing with `react-spring` for animation. More control, more code. Only use if react-zoom-pan-pinch proves incompatible with the existing CSS connector line architecture.

```bash
cd frontend && npm install react-zoom-pan-pinch
```

---

### 2. Mobile Dev Workflow — Vite `server.host` + `vite-plugin-qrcode` (HIGH CONFIDENCE)

**Recommendation:** Two complementary additions:

**2a. `server.host: true` in `vite.config.js`** — exposes the dev server on all network interfaces so real mobile devices on the same Wi-Fi can access it. No npm install needed, just a config change.

```js
// vite.config.js
export default defineConfig({
  server: {
    host: true,       // binds to 0.0.0.0, exposes network URL in terminal
    port: 3001,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }
  }
});
```

**2b. `vite-plugin-qrcode` 0.3.0** — prints a QR code to the browser tab on dev server start. Scan with phone camera to open the app immediately. Zero configuration. Dev-only (does not affect production build).

**Why:** Score entry is a core player use case. Players use mobile browsers in the field (per PROJECT.md constraints). Testing on real devices during development requires exposing the dev server to the network. The QR code eliminates manually typing the IP address on every device.

**Confidence:** HIGH — standard Vite pattern, plugin well-maintained (0.3.0 released ~3 months ago)

```bash
cd frontend && npm install --save-dev vite-plugin-qrcode
```

```js
// vite.config.js
import { qrcode } from 'vite-plugin-qrcode';

export default defineConfig({
  plugins: [react(), qrcode()],
  server: { host: true, port: 3001, ... }
});
```

---

### 3. Mobile Navigation — React Bootstrap Offcanvas Navbar (NO NEW LIBRARY)

**Recommendation:** Refactor `NavBar.jsx` to use React Bootstrap's built-in `Navbar.Offcanvas` (available in React Bootstrap 2.10, already installed). Do NOT add any third-party navbar library.

**Why:** The NavBar currently has 12+ nav items across roles. On mobile, the Bootstrap collapse toggler produces a long vertical list that takes over the screen. The BATL mobile nav bug reported by tester is caused by this. React Bootstrap 2.10 ships `Navbar.Offcanvas` which renders a slide-in drawer — proper mobile nav with a close button, backdrop, and keyboard trap.

**How it works:**
```jsx
<Navbar expand="lg" bg="primary" variant="dark">
  <Container fluid>
    <Navbar.Brand>BATL</Navbar.Brand>
    <Navbar.Toggle aria-controls="offcanvasNavbar" />
    <Navbar.Offcanvas id="offcanvasNavbar" placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Menu</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        {/* existing nav items */}
      </Offcanvas.Body>
    </Navbar.Offcanvas>
  </Container>
</Navbar>
```

**Confidence:** HIGH — documented in React Bootstrap 2.10 official docs, no third-party dependency needed
**Known issue (historical):** GitHub issue #6309 described offcanvas navbar not showing items with the `expand` prop. This was resolved in React Bootstrap 2.x. Current 2.10.10 works correctly.

---

### 4. CSS Viewport & Safe Area — Modern CSS Units (NO NEW LIBRARY)

**Recommendation:** Add CSS custom properties and utility classes to a global `mobile.css` file using modern viewport units. No library needed — native CSS.

**Why:** On mobile, `100vh` overestimates viewport height on iOS Safari because it does not account for the browser chrome (address bar, bottom toolbar). This causes fixed-height panels (bracket viewport, form pages) to be clipped. Modern CSS units fix this.

**Units to use:**

| Unit | Meaning | Use When |
|------|---------|----------|
| `svh` | Small viewport height — includes browser chrome | Fixed headers, footers, full-screen containers |
| `dvh` | Dynamic viewport height — adjusts as chrome hides/shows | Scrollable content areas |
| `100svh` instead of `100vh` | Prevents clipping on iOS Safari | Any full-height layout element |

**Safe area insets (notch/home indicator):**
```css
/* In global CSS or component styles */
.page-container {
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* viewport meta required in index.html */
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

**Confidence:** HIGH — browser support for `svh`/`dvh` is 92%+ globally as of 2025; safe area insets are iOS standard

---

### 5. Touch-Friendly Form Inputs — Bootstrap Utilities (NO NEW LIBRARY)

**Recommendation:** Use Bootstrap 5.3's existing `form-control-lg` size class and `min-height` touch target adjustments via CSS. No new form library.

**Why:** BATL forms (score entry, registration) need touch-friendly inputs for mobile players entering results in the field. Bootstrap 5.3 already ships `form-control-lg` which sets `padding: 0.5rem 1rem` and `font-size: 1.25rem` — sufficient tap target size (44px+). The rule is simple: all interactive form elements on mobile pages get `size="lg"` or the `form-control-lg` class.

**Pattern:**
```jsx
<Form.Control size="lg" type="number" min="0" max="7" inputMode="numeric" />
```

The `inputMode="numeric"` attribute triggers the numeric keyboard on mobile — critical for score entry.

**Confidence:** HIGH — Bootstrap 5.3 built-in, no additional dependency

---

## Alternatives Considered and Rejected

| What | Why Rejected | Use Instead |
|------|-------------|-------------|
| `@use-gesture/react` for bracket | Requires writing gesture state machine from scratch; react-zoom-pan-pinch is purpose-built for this | `react-zoom-pan-pinch` |
| `react-swipeable` | Handles swipe events only (directional swipe); does not handle pinch-to-zoom for bracket navigation | `react-zoom-pan-pinch` |
| Tailwind CSS | Stack is Bootstrap; replacing or mixing frameworks adds CSS conflict risk with no v1.4 payoff | Stay with Bootstrap 5.3 |
| `react-bootstrap-navbar-offcanvas` (third-party) | Unmaintained (no updates in 12+ months); React Bootstrap 2.10 has native offcanvas support | `Navbar.Offcanvas` from React Bootstrap |
| `hammerjs` / `interact.js` | Both unmaintained or low activity; use-gesture and react-zoom-pan-pinch have superseded them | `react-zoom-pan-pinch` |
| Ionic / Capacitor | Full native mobile framework; out of scope per PROJECT.md ("Mobile app — web-first; responsive web covers mobile use cases") | Responsive Bootstrap CSS |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Replacing Bootstrap with Tailwind | Would require rewriting every component; 43,500 LOC affected; no v1.4 justification | Bootstrap 5.3 + custom CSS |
| `100vh` for full-height layouts | Clips content on iOS Safari when browser chrome is visible | `100svh` with `dvh` fallback |
| New mobile-specific component library (Antd Mobile, MUI) | Conflicts with Bootstrap; doubles CSS payload | React Bootstrap + Bootstrap utilities |
| Separate mobile/desktop component trees | Doubles maintenance burden; use responsive classes instead | Bootstrap responsive breakpoints |
| Adding a state management library for mobile nav | React Bootstrap Offcanvas is self-contained | `Navbar.Offcanvas` built-in |

---

## Installation Summary

```bash
# Frontend production dependency (bracket touch gestures)
cd frontend && npm install react-zoom-pan-pinch

# Frontend dev dependency (mobile device QR access during development)
cd frontend && npm install --save-dev vite-plugin-qrcode
```

No backend changes required.

---

## Version Compatibility

| Package | Version | React 19 | Vite 7 | Bootstrap 5.3 | Notes |
|---------|---------|----------|--------|---------------|-------|
| react-zoom-pan-pinch | 3.7.0 | Compatible (React 17+) | Compatible | N/A | Jan 2026 release; no known React 19 blockers |
| vite-plugin-qrcode | 0.3.0 | N/A | Compatible | N/A | Dev-only; does not affect runtime |
| Navbar.Offcanvas | React Bootstrap 2.10.10 (already installed) | Compatible | N/A | Bootstrap 5.3 required | Zero new installation |
| CSS svh/dvh units | Native CSS | N/A | N/A | N/A | 92%+ browser support; no polyfill needed for 2026 targets |

---

## Sources

- [react-zoom-pan-pinch GitHub Releases](https://github.com/BetterTyped/react-zoom-pan-pinch/releases) — confirmed v3.7.0 released 2026-01-31
- [react-zoom-pan-pinch npm](https://www.npmjs.com/package/react-zoom-pan-pinch) — 342 dependents, React 17+ peer dep
- [vite-plugin-qrcode npm](https://www.npmjs.com/package/vite-plugin-qrcode) — v0.3.0, active maintenance
- [vite-plugin-qrcode GitHub](https://github.com/svitejs/vite-plugin-qrcode) — svitejs org, stable
- [React Bootstrap Navbar docs](https://react-bootstrap.netlify.app/docs/components/navbar/) — Navbar.Offcanvas confirmed in current docs
- [React Bootstrap Offcanvas docs](https://react-bootstrap.netlify.app/docs/components/offcanvas/) — standalone Offcanvas component
- [Vite server.host discussion](https://github.com/vitejs/vite/discussions/3396) — confirmed `host: true` pattern
- [Modern Viewport Units guide](https://medium.com/@tharunbalaji110/understanding-mobile-viewport-units-a-complete-guide-to-svh-lvh-and-dvh-0c905d96e21a) — svh/dvh/lvh explained
- [Bootstrap 5.3 Breakpoints](https://getbootstrap.com/docs/5.3/layout/breakpoints/) — MEDIUM confidence (existing stack, not re-researched)

---
*Stack research for: v1.4 UI Rework & Mobile Design*
*Researched: 2026-03-06*
