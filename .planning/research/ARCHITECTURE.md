# Architecture Research

**Domain:** Mobile-first UI rework — React Bootstrap 2.10 / Bootstrap 5.3, responsive layout restructure
**Researched:** 2026-03-06
**Confidence:** HIGH (direct codebase analysis + official Bootstrap 5.3 / React Bootstrap docs)

---

## Standard Architecture

This is a subsequent-milestone document. No new backend services are introduced. The milestone restructures the **frontend presentation layer** of an established React 19 SPA. All backend API contracts (001–011) remain unchanged.

### System Overview — What Changes in v1.4

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React 19 Frontend (v1.4 changes)              │
│                                                                       │
│  BEFORE (desktop-first):                                              │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  NavBar (expand-lg, no offcanvas, email visible at all sizes) │    │
│  └──────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  TournamentViewPage:                                          │    │
│  │    TournamentHeader                                           │    │
│  │    TournamentInfoPanel (always open, 2-col lg layout)        │    │
│  │    FormatVisualization (collapsible, never hero on mobile)   │    │
│  │    OrganizerRegistrationPanel                                 │    │
│  │    PlayerListPanel                                            │    │
│  │    PointPreviewPanel                                          │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  AFTER (mobile-first):                                                │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  NavBar (offcanvas drawer on mobile, full bar on lg+)        │    │
│  └──────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  TournamentViewPage (status-aware layout):                    │    │
│  │    TournamentHeader (always)                                  │    │
│  │    [IN_PROGRESS] FormatVisualization (bracket hero, top)     │    │
│  │    TournamentInfoPanel (collapsible accordion)               │    │
│  │    [ORGANIZER] OrganizerRegistrationPanel (accordion)        │    │
│  │    PlayerListPanel (accordion or tab)                        │    │
│  │    PointPreviewPanel (accordion, low priority)               │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  KnockoutBracket (refactored for touch):                             │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Mobile: auto-fit scale, larger tap targets, pinch native    │    │
│  │  Desktop: existing zoom/pan with keyboard shortcuts          │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                        No backend changes
┌─────────────────────────────────────────────────────────────────────┐
│  Express 5.1 API Server — unchanged from v1.3                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities — New vs Modified

| Component | Status | Responsibility Change |
|-----------|--------|----------------------|
| `NavBar.jsx` | MODIFIED | Add `Navbar.Offcanvas` for mobile; `expand="lg"` keeps desktop bar intact |
| `TournamentViewPage.jsx` | MODIFIED | Status-aware section ordering; bracket is hero when IN_PROGRESS |
| `TournamentInfoPanel.jsx` | MODIFIED | Default collapsed on mobile (Collapse), switch to `Accordion` variant |
| `FormatVisualization.jsx` | MODIFIED | Auto-expand when tournament is IN_PROGRESS (remove manual expand requirement on mobile) |
| `KnockoutBracket.jsx` | MODIFIED | Add pinch-zoom fallback via `touch-action: pinch-zoom`; larger tap targets; auto-scale on mount |
| `KnockoutBracket.css` | MODIFIED | Mobile breakpoints for bracket-round min-width, match height, control layout |
| `BracketControls.jsx` | MODIFIED | Touch-friendly button sizing (min 44px tap targets); reorder controls for mobile first |
| `MatchResultModal.jsx` | MODIFIED | Full-screen modal on mobile (`fullscreen="sm-down"`); larger form inputs |
| `ManualDrawEditor.jsx` | MODIFIED | Stacked single-column layout on mobile; larger dropdown touch targets |
| `PlayerListPanel.jsx` | MODIFIED | Collapsible on mobile; table → card list on xs |
| `TournamentHeader.jsx` | MODIFIED | Stack badges vertically on xs; reduce font sizes |
| `OrganizerDashboard.jsx` | MODIFIED | Replace `col-md-4` grid cards with functional nav links; add quick-action layout |
| `useBracketNavigation.js` | MODIFIED | Add `wheel` event for trackpad pinch; improve pinch-zoom accuracy |

---

## Recommended Project Structure

The mobile rework is CSS-first and prop-adjustment-first. No new files are required for most changes. New files are needed only for the mobile dev tooling and possibly a shared `MobileCard` utility component.

```
frontend/src/
├── components/
│   ├── NavBar.jsx                  # MODIFIED: offcanvas drawer on mobile
│   ├── KnockoutBracket.jsx         # MODIFIED: touch-first, auto-scale
│   ├── KnockoutBracket.css         # MODIFIED: mobile breakpoints expanded
│   ├── BracketControls.jsx         # MODIFIED: 44px tap targets
│   ├── BracketMatch.jsx            # MODIFIED: larger touch area on mobile
│   ├── MatchResultModal.jsx        # MODIFIED: fullscreen on sm-down
│   ├── ManualDrawEditor.jsx        # MODIFIED: single-column stacked on mobile
│   ├── PlayerListPanel.jsx         # MODIFIED: collapsible + card view on xs
│   ├── TournamentHeader.jsx        # MODIFIED: responsive badge stacking
│   ├── TournamentInfoPanel.jsx     # MODIFIED: Accordion wrapper for mobile
│   ├── FormatVisualization.jsx     # MODIFIED: auto-expand for IN_PROGRESS
│   └── OrganizerRegistrationPanel.jsx  # MODIFIED: collapsible on mobile
│
├── pages/
│   ├── TournamentViewPage.jsx      # MODIFIED: status-aware layout logic
│   ├── TournamentSetupPage.jsx     # MODIFIED: responsive table → card list
│   ├── CategoryRankingsPage.jsx    # MODIFIED: responsive table
│   ├── OrganizerDashboard.jsx      # MODIFIED: functional quick-action layout
│   └── PlayerProfilePage.jsx       # MODIFIED: responsive layout
│
├── hooks/
│   ├── useBracketNavigation.js     # MODIFIED: wheel event, pinch improvement
│   └── useBreakpoint.js            # NEW: `useBreakpoint()` hook for JS-based
│                                   #   breakpoint detection when CSS alone
│                                   #   is insufficient
│
└── utils/
    └── mobileDetect.js             # NEW (optional): UA-based touch device
                                    #   detection for bracket auto-scale
```

### Structure Rationale

- **No new pages needed:** All changes are within existing page structure. Adding new routes would fragment the experience.
- **`useBreakpoint.js` is optional but useful:** Bootstrap handles 95% of cases via CSS. The hook is needed only for JS-side logic (e.g., starting the bracket at a different scale on mobile).
- **CSS changes are co-located:** `KnockoutBracket.css` keeps all bracket styles in one file. Do not create a separate `KnockoutBracket.mobile.css`.
- **No Redux or global state additions:** The existing React hook + context pattern handles all state. A `useBreakpoint` hook is local to the component that needs it.

---

## Architectural Patterns

### Pattern 1: Bootstrap 5.3 Breakpoint Strategy

**What:** Mobile-first CSS using Bootstrap's six breakpoints. Apply base styles for xs (< 576px), then override with `sm:`, `md:`, `lg:` utilities for larger screens. Never write desktop-first CSS with `max-width` overrides.

**When to use:** All responsive layout decisions. The BATL target is "players on phones at the court" (xs, sm) and "organizers on laptops" (lg, xl).

**Trade-offs:**
- Pro: Consistent with Bootstrap's mobile-first philosophy. Works with existing React Bootstrap components without custom overrides.
- Con: Some existing components were written desktop-first (e.g., `TournamentInfoPanel` with `Col lg={6}` but no xs handling). These need a targeted audit pass, not a full rewrite.

**Bootstrap 5.3 Breakpoints:**
```
xs: < 576px   — phones (primary target for players)
sm: >= 576px  — large phones / small tablets
md: >= 768px  — tablets
lg: >= 992px  — laptops (primary target for organizers)
xl: >= 1200px — desktops
```

**Example — TournamentInfoPanel two-column fix:**
```jsx
// BEFORE (desktop-first, no mobile column handling):
<Col lg={6} className="mb-4 mb-lg-0">...</Col>
<Col lg={6}>...</Col>

// AFTER (mobile-first — full width on mobile, side-by-side on lg+):
<Col xs={12} lg={6} className="mb-3 mb-lg-0">...</Col>
<Col xs={12} lg={6}>...</Col>
```

**Source:** [Bootstrap 5.3 Breakpoints](https://getbootstrap.com/docs/5.3/layout/breakpoints/)

---

### Pattern 2: NavBar Offcanvas Drawer (mobile hamburger)

**What:** Replace the current `navbar-collapse` behavior (inline dropdown) with `Navbar.Offcanvas` from React Bootstrap. The navbar becomes a slide-in drawer on mobile. At `lg+` it renders as the standard horizontal bar with no change.

**When to use:** The current NavBar has 8-12 nav items depending on role. On mobile, an inline collapse that stacks all items is difficult to use — a drawer is standard.

**Trade-offs:**
- Pro: React Bootstrap's `Navbar.Offcanvas` is built-in. No third-party library needed. `expand="lg"` prop handles the breakpoint automatically.
- Pro: Drawer closes when a nav item is selected (`collapseOnSelect`). Works with React Router `<Link>` via the existing `onClick/navigate` pattern.
- Con: The existing `NavBar.jsx` uses `onClick/navigate` instead of `<NavLink>` components. `collapseOnSelect` requires `Nav.Link` components with `href` or `eventKey`. This means the NavBar implementation needs a refactor to use proper React Router `NavLink` components inside `Nav.Link`.
- Con: `placement="end"` (right-side drawer) is the Bootstrap 5.3 default for navbar offcanvas. This is standard and expected by mobile users.

**Example refactored NavBar structure:**
```jsx
<Navbar expand="lg" className="navbar-dark bg-primary">
  <Container fluid>
    <Navbar.Brand onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
      BATL
    </Navbar.Brand>
    <Navbar.Toggle aria-controls="offcanvasNavbar" />
    <Navbar.Offcanvas
      id="offcanvasNavbar"
      placement="end"
      restoreFocus={false}
    >
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Menu</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Nav className="flex-grow-1">
          <Nav.Link as={NavLink} to="/rankings">Rankings</Nav.Link>
          {/* role-gated links */}
        </Nav>
        {/* auth buttons */}
      </Offcanvas.Body>
    </Navbar.Offcanvas>
  </Container>
</Navbar>
```

**Source:** [React Bootstrap Navbar](https://react-bootstrap.netlify.app/docs/components/navbar/), [React Bootstrap Offcanvas](https://react-bootstrap.netlify.app/docs/components/offcanvas/)

---

### Pattern 3: Status-Aware Layout Ordering in TournamentViewPage

**What:** The sections of `TournamentViewPage` are reordered based on `tournament.status`. When a tournament is `IN_PROGRESS`, the bracket is the primary content — it moves to the top, above info/logistics details. When `SCHEDULED`, registration info and player list are primary.

**When to use:** Any page with multiple sections where the user's task depends on tournament status. The "scroll past a collapsed FormatVisualization to see registration info" problem is a mobile pain point unique to this page.

**Trade-offs:**
- Pro: Zero API changes. Pure React render-order logic.
- Pro: Reuses the existing `FormatVisualization` with a prop change (`defaultExpanded={true}` when IN_PROGRESS).
- Con: Conditional section ordering makes the JSX more complex. Use a helper function or constants array to define the order, not nested ternaries.

**Recommended implementation pattern:**
```jsx
// Status-aware section ordering — no ternary nesting
const sections = buildSectionOrder(tournament.status, user?.role);

// sections = [
//   { key: 'bracket',      Component: FormatVisualization,         priority: 1 },
//   { key: 'info',         Component: TournamentInfoPanel,         priority: 2 },
//   { key: 'optout',       Component: ConsolationOptOutPanel,      priority: 3 },
//   { key: 'registration', Component: OrganizerRegistrationPanel,  priority: 4 },
//   { key: 'players',      Component: PlayerListPanel,             priority: 5 },
//   { key: 'points',       Component: PointPreviewPanel,           priority: 6 },
// ]

return (
  <>
    {sections.map(({ key, Component, props }) => (
      <Row key={key} className="mt-3">
        <Col><Component {...props} /></Col>
      </Row>
    ))}
  </>
);
```

---

### Pattern 4: Accordion for Collapsible Sections (not custom Collapse)

**What:** Use React Bootstrap's `Accordion` component for sections that should be collapsed by default on mobile. The existing `TournamentInfoPanel` uses a custom `Collapse` with a manual button. The Accordion gives this pattern built-in for free with proper accessibility.

**When to use:** Any panel that is "secondary" information on mobile — tournament details, point preview, player list on the view page.

**Trade-offs:**
- Pro: Accordion is accessible (ARIA roles), animates correctly, and handles multiple-open behavior. No JS state management needed.
- Pro: `defaultActiveKey` can be set based on status (e.g., bracket open by default when IN_PROGRESS, info closed).
- Con: Accordion styling conflicts with Bootstrap's Card-within-Card pattern that `TournamentInfoPanel` currently uses. The Panel will need minor visual adjustment.
- Con: Not every section needs to become an accordion item. Overusing accordion creates a "nothing is immediately visible" problem. Use for sections with 3+ fields, not for single-action panels.

**Example:**
```jsx
// Accordion wrapping secondary sections on mobile
<Accordion defaultActiveKey={tournament.status === 'IN_PROGRESS' ? null : '0'}>
  <Accordion.Item eventKey="0">
    <Accordion.Header>Tournament Details</Accordion.Header>
    <Accordion.Body>
      <TournamentInfoPanel tournament={tournament} />
    </Accordion.Body>
  </Accordion.Item>
</Accordion>
```

---

### Pattern 5: KnockoutBracket Mobile Touch Refactoring

**What:** The existing `useBracketNavigation.js` hook already handles `touchstart/touchmove/touchend` for pan, and two-finger pinch for zoom. The gaps are: (1) `touch-action: none` in the viewport CSS prevents native browser scroll on the page while inside the bracket, (2) the initial scale on mobile should auto-fit the bracket rather than default to 1.0, and (3) tap targets on `BracketMatch` components are 120px tall which is acceptable but buttons in `BracketControls` need auditing for 44px minimum.

**Do not replace the custom hook with `react-zoom-pan-pinch`** — the existing implementation is functional and well-tested. Targeted fixes are the right approach.

**When to use:** Specifically for the KnockoutBracket viewport. The existing drag/pinch implementation is sound; the mobile gaps are fixable within the existing architecture.

**Trade-offs:**
- Pro: No new library dependency. Fixes are surgical.
- Con: Auto-scale-on-mount requires knowing the bracket's rendered width, which is only available after the first render. Use a `useEffect` with a `ResizeObserver` or `getBoundingClientRect()` on the container ref.

**Touch-action fix:**
```css
/* CURRENT (blocks page scroll when finger starts on bracket): */
.bracket-viewport {
  touch-action: pan-x pan-y; /* allows scroll but not pinch */
}

/* RECOMMENDED: Use pinch-zoom to allow native pinch gesture */
.bracket-viewport {
  touch-action: pinch-zoom; /* allows pinch-to-zoom natively, blocks pan-to-scroll */
}

/* OR: Accept JS-only control for the bracket (current approach is fine if page scroll outside works) */
.bracket-viewport {
  touch-action: none; /* full JS control — acceptable if the bracket has its own scroll */
  overflow: auto;
}
```

**Auto-scale on mobile (useEffect pattern):**
```javascript
// In KnockoutBracket.jsx, after matches load
useEffect(() => {
  if (!containerRef.current || !matches?.length) return;
  const isMobile = window.innerWidth < 768;
  if (!isMobile) return;

  const bracketWidth = containerRef.current.scrollWidth;
  const viewportWidth = containerRef.current.clientWidth;
  if (bracketWidth > viewportWidth) {
    const fitScale = viewportWidth / bracketWidth * 0.95; // 5% margin
    navigation.setScale(Math.max(0.25, fitScale)); // clamp to min
  }
}, [matches]);
```

**Tap target audit (BracketControls):**
```jsx
// Ensure all buttons meet 44px minimum (Apple HIG / WCAG 2.5.5)
<Button size="sm" style={{ minWidth: 44, minHeight: 44 }}>+</Button>
// OR use Bootstrap's btn-lg on mobile:
<Button size={isMobile ? 'lg' : 'sm'}>+</Button>
```

---

### Pattern 6: Responsive Tables → Card Lists on xs

**What:** TanStack React Table renders as `<table>` elements that overflow horizontally on mobile. For list pages (`TournamentSetupPage`, `CategoryRankingsPage`, `OrganizerPlayersPage`), the pattern is: render table on md+, render card list on xs/sm.

**When to use:** Any page with a data table that has 4+ columns. The bracket and match result table are excluded (they have custom rendering).

**Trade-offs:**
- Pro: Cards are naturally touch-friendly. Each row becomes a tappable card with key fields visible.
- Pro: Uses `d-none d-md-block` / `d-block d-md-none` Bootstrap utilities — no JS needed.
- Con: Duplicate rendering (table + card list) doubles the JSX. Use a `MobileCard` wrapper component to avoid repeating card structure.
- Con: The card list cannot sort columns (no header). Acceptable for list pages where the default sort (date desc, name asc) is the mobile use case.

**Example structure:**
```jsx
{/* Table view — md and above */}
<div className="d-none d-md-block">
  <Table striped hover responsive>
    {/* existing TanStack table */}
  </Table>
</div>

{/* Card list — xs and sm */}
<div className="d-md-none">
  {tournaments.map(t => (
    <Card key={t.id} className="mb-2" onClick={() => navigate(`/tournaments/${t.id}`)}>
      <Card.Body className="py-2">
        <div className="d-flex justify-content-between align-items-start">
          <strong>{t.name}</strong>
          <Badge bg={STATUS_VARIANTS[t.status]}>{t.status}</Badge>
        </div>
        <small className="text-muted">{t.category?.name} · {formatDate(t.startDate)}</small>
      </Card.Body>
    </Card>
  ))}
</div>
```

---

### Pattern 7: MatchResultModal Full-Screen on Mobile

**What:** The existing `MatchResultModal` opens as a centered modal dialog. On xs screens (375px phones), a centered modal with score entry forms is difficult to use. Bootstrap 5.3 supports `fullscreen="sm-down"` prop on the `Modal` component to make it fill the screen on small devices.

**When to use:** Any modal with form inputs on mobile. The score entry UX is the most critical touch interaction in the app.

**Trade-offs:**
- Pro: Single prop change. No layout restructuring needed.
- Pro: Full-screen gives more space for the score entry forms and large "Submit" button.
- Con: Full-screen modals need an explicit close button (not backdrop click). React Bootstrap's fullscreen modal adds this automatically.

**Example:**
```jsx
<Modal
  show={!!selectedMatch}
  onHide={onClose}
  fullscreen="sm-down"  // full screen on phones, centered dialog on tablets+
  centered
>
  {/* existing modal content */}
</Modal>
```

---

## Data Flow

### Mobile Layout Decision Flow

```
TournamentViewPage renders
    ↓
tournament.status?
    ├── 'SCHEDULED'
    │   Order: Header → Info (open) → BracketGen → PlayerList → Points
    │
    ├── 'IN_PROGRESS'
    │   Order: Header → Bracket (auto-expanded hero) → ConsolationOptOut
    │          → Info (collapsed accordion) → OrganizerPanel
    │          → PlayerList (collapsed) → Points (collapsed)
    │
    └── 'COMPLETED'
        Order: Header → Champion banner → Bracket (collapsed, results viewable)
               → Info (collapsed) → PlayerList → Points
```

### NavBar State Flow (Mobile)

```
User on mobile (< lg breakpoint)
    ↓
Bootstrap renders: [BATL logo] [hamburger button]
    ↓
User taps hamburger
    ↓
Navbar.Offcanvas opens (placement="end" — slides from right)
    ↓
User taps nav link
    ↓
React Router navigates
collapseOnSelect → Offcanvas closes automatically
```

### Bracket Touch Interaction Flow

```
User lands on TournamentViewPage (IN_PROGRESS, mobile)
    ↓
FormatVisualization auto-expands (no manual expand needed)
    ↓
KnockoutBracket mounts
    ↓
useEffect: measure bracket width vs viewport
    If bracketWidth > viewport: setScale(fitScale)
    ↓
User sees bracket fitted to screen
    ↓
Single finger drag → pans bracket
Two finger pinch → zooms bracket
Tap on match card → opens MatchResultModal (fullscreen on mobile)
    ↓
User submits score → form optimized for touch (large inputs, clear labels)
```

---

## Component Integration Points

### New vs Modified Components

| Component | New/Modified | Integration Notes |
|-----------|-------------|-------------------|
| `NavBar.jsx` | MODIFIED | Requires switching from raw `<nav>` to React Bootstrap `Navbar` with `Navbar.Offcanvas`. The existing `onClick/navigate` pattern must change to `Nav.Link as={NavLink}` for `collapseOnSelect` to work. |
| `TournamentViewPage.jsx` | MODIFIED | Section ordering logic. No new API calls. `FormatVisualization` gets a `forceExpand={status === 'IN_PROGRESS'}` prop. |
| `FormatVisualization.jsx` | MODIFIED | Accept `forceExpand` prop. When true, `setIsExpanded(true)` on mount. The existing lazy-load logic (`isExpanded && bracket`) still works. |
| `TournamentInfoPanel.jsx` | MODIFIED | Wrap in Accordion when `defaultCollapsed` prop passed, or refactor internal `Collapse` to be collapsed-by-default. |
| `KnockoutBracket.jsx` | MODIFIED | Add auto-scale `useEffect`. Pass `fullscreen="sm-down"` to `MatchResultModal`. |
| `useBracketNavigation.js` | MODIFIED | Expose `setScale()` for external control (auto-scale effect). Add `wheel` event for trackpad pinch-to-zoom. |
| `BracketControls.jsx` | MODIFIED | Increase button size on mobile (44px min). Reorder: +/- zoom are primary; BYE toggle is secondary. |
| `MatchResultModal.jsx` | MODIFIED | Add `fullscreen="sm-down"`. Audit form input sizes (Bootstrap `form-control-lg` on mobile). |
| `ManualDrawEditor.jsx` | MODIFIED | Stacked `Col xs={12}` layout. Each slot gets its own Card row. |
| `PlayerListPanel.jsx` | MODIFIED | Add collapsible wrapper + card view on xs. |
| `useBreakpoint.js` | NEW | `const { isMobile, isTablet } = useBreakpoint()` — uses `window.matchMedia`. Optional; only create if 3+ components need JS-side breakpoint checks. |

---

## Suggested Build Order (Phase Dependencies)

### Phase 1: Navigation Fix (Prerequisite — known bug)

Fix first because it affects every page. Broken mobile nav is a blocker for testing anything else on mobile.

1. Refactor `NavBar.jsx` to `Navbar.Offcanvas` with `expand="lg"`
2. Switch nav items to `Nav.Link as={NavLink}` for `collapseOnSelect`
3. Test all role-gated nav items (ADMIN, ORGANIZER, PLAYER)
4. Verify desktop layout unchanged at lg+

### Phase 2: TournamentViewPage Restructure

Highest user impact. Players use this page on mobile at the court.

1. Add `forceExpand` prop to `FormatVisualization`
2. Implement status-aware section ordering in `TournamentViewPage`
3. Default-collapse `TournamentInfoPanel` on mobile (Accordion or prop)
4. Default-collapse `PlayerListPanel` on mobile
5. Default-collapse `PointPreviewPanel` on mobile
6. Champion banner positioning

### Phase 3: Bracket Mobile UX

Depends on Phase 2 (bracket is already visible as hero; now optimize its touch behavior).

1. Add auto-scale `useEffect` to `KnockoutBracket`
2. Expose `setScale` from `useBracketNavigation` for external control
3. Audit and fix `touch-action` CSS on `.bracket-viewport`
4. Increase tap targets in `BracketControls` to 44px minimum
5. Add `fullscreen="sm-down"` to `MatchResultModal`
6. Audit `MatchResultModal` form inputs for touch ergonomics (input size, spacing)

### Phase 4: Organizer Mobile — Manual Draw + Result Corrections

Depends on Phase 3 (modal is fullscreen). Organizer workflows on mobile.

1. Refactor `ManualDrawEditor` to single-column stacked layout on xs
2. Test manual draw workflow on mobile viewport
3. Audit `OrganizerRegistrationPanel` — collapsible on mobile
4. Test result correction (organizer edit) via fullscreen modal on mobile

### Phase 5: App-wide Responsive Pass

Targets the remaining list/table pages. Can be done in parallel by sub-task if needed.

1. `TournamentSetupPage` — table to card list on xs, filter controls responsive
2. `CategoryRankingsPage` — table responsive, rankings tabs usable on mobile
3. `OrganizerDashboard` — replace placeholder `coming soon` cards with functional navigation links
4. `OrganizerPlayersPage` — table to card list on xs
5. `PlayerPublicProfilePage` — responsive audit
6. `TournamentsListPage` — responsive audit

### Phase 6: Visual Refresh + Dev Tooling

No dependency. Can be done in any order after Phase 1.

1. Mobile dev tooling: browser-sync, device testing setup, viewport meta tag verification
2. Typography and spacing pass (Bootstrap spacing utilities, `fs-` classes)
3. Color and visual refinements (consistent Bootstrap semantic colors)

---

## Anti-Patterns

### Anti-Pattern 1: `max-width` Overrides for Mobile

**What people do:** Write desktop styles first, then add `@media (max-width: 768px)` overrides for mobile.

**Why it's wrong:** Bootstrap is mobile-first. Adding `max-width` overrides fights Bootstrap's cascade. The existing `KnockoutBracket.css` already has some mobile overrides — this pattern should not be extended.

**Do this instead:** Write base styles for xs, extend with `@media (min-width: ...)`. For Bootstrap utilities, use `col-xs-12 col-lg-6` not `col-12` with a `max-width` override.

---

### Anti-Pattern 2: JS-Based Device Detection for Layout

**What people do:** Use `navigator.userAgent` or `window.innerWidth` checks in render to conditionally render mobile vs desktop JSX trees.

**Why it's wrong:** Creates SSR/hydration mismatches, re-renders on resize, and is unnecessary when Bootstrap CSS handles it via breakpoints. It also creates two separate code paths that diverge over time.

**Do this instead:** Use Bootstrap `d-none d-md-block` / `d-md-none` utilities for show/hide. Reserve `useBreakpoint.js` for cases where the JS logic genuinely differs (e.g., auto-scale on bracket mount), not for layout decisions.

---

### Anti-Pattern 3: Replacing KnockoutBracket with a Library

**What people do:** See the bracket touch complexity and replace the custom implementation with `react-zoom-pan-pinch` or similar.

**Why it's wrong:** The existing `useBracketNavigation` hook is 230 lines, well-structured, and the touch handlers already work. The gaps are specific: auto-scale, trackpad pinch, tap target sizes. A full replacement introduces untested behavior for the consolation bracket, highlight system, "My Match" navigation, and BYE toggle — all of which are implemented in the existing components.

**Do this instead:** Targeted additions to the existing hook: expose `setScale`, add `wheel` event handler, fix `touch-action` CSS. Total change is ~30 lines.

---

### Anti-Pattern 4: Making Everything an Accordion

**What people do:** Wrap every section of TournamentViewPage in an Accordion to "organize" the page.

**Why it's wrong:** An accordion that defaults everything collapsed requires the user to expand each section before seeing any content. On a tournament day, the player needs to see their bracket immediately — not tap to expand it.

**Do this instead:** Only collapse genuinely secondary content. The bracket (when IN_PROGRESS) is primary — never collapsed. Tournament logistics info is secondary — collapsed by default on mobile. Point preview is tertiary — collapsed. Player list depends on status (open when SCHEDULED, collapsed when IN_PROGRESS).

---

### Anti-Pattern 5: Assuming `navbar-toggler` Works Without Bootstrap JS

**What people do:** Keep the existing `data-bs-toggle="collapse"` on the hamburger button and expect it to work.

**Why it's wrong:** React Bootstrap recommends against mixing raw Bootstrap JavaScript with React components — the `data-bs-toggle` approach requires Bootstrap's JS bundle, which conflicts with React Bootstrap's component-based approach. The current `NavBar.jsx` uses `data-bs-toggle="collapse"` which may be the source of the known mobile nav bug.

**Do this instead:** Use `Navbar.Toggle` from React Bootstrap. It integrates with the `Navbar.Offcanvas` component's state through React's component model, no Bootstrap JS needed.

---

## Scaling Considerations

This milestone does not change scale characteristics. The frontend is a SPA served as static assets.

| Scale | Consideration |
|-------|---------------|
| Current (0-200 concurrent mobile users) | CSS-only responsive is zero-cost. Bootstrap utilities add no runtime overhead. |
| Bracket render on low-end phones | CSS transforms are GPU-accelerated. The bracket viewport already uses `will-change: transform`. No change needed. For very large brackets (128 players = 7 rounds), consider adding a round-count-based initial scale calculation. |
| NavBar at high-role-count | The offcanvas approach handles any number of nav items gracefully — they scroll inside the drawer. The current flat list approach does not. |

---

## Integration Points

### Preserved API Contracts

All existing API endpoints remain unchanged. This milestone is frontend-only.

| API Consumer | Existing | Change |
|-------------|----------|--------|
| `TournamentViewPage` → `tournamentViewService` | SWR hooks unchanged | None |
| `FormatVisualization` → `useFormatStructure` | Lazy load unchanged | None — `forceExpand` prop triggers existing fetch |
| `KnockoutBracket` → `useMatches` | SWR unchanged | None |
| `MatchResultModal` → `matchService` | Unchanged | None |

### Internal Component Boundary Changes

| Boundary | Current | After v1.4 |
|----------|---------|------------|
| `TournamentViewPage` → `FormatVisualization` | `mutateTournament` prop only | Add `forceExpand={isInProgress}` prop |
| `KnockoutBracket` → `useBracketNavigation` | Hook returns state + handlers | Add `setScale` action to hook return |
| `TournamentViewPage` → `TournamentInfoPanel` | No props for collapse state | Add `defaultCollapsed={isMobile}` or use responsive Accordion wrapper in page |
| `NavBar` → React Router | `onClick/navigate` | Switch to `Nav.Link as={NavLink}` for collapseOnSelect |

---

## Sources

- Direct analysis of `frontend/src/components/NavBar.jsx` — confirmed `data-bs-toggle="collapse"` pattern (Bootstrap JS dependency, source of known mobile nav bug)
- Direct analysis of `frontend/src/components/KnockoutBracket.jsx` + `KnockoutBracket.css` — confirmed existing touch handlers, `touch-action: pan-x pan-y`, 120px match height
- Direct analysis of `frontend/src/hooks/useBracketNavigation.js` — confirmed pinch zoom exists but no `wheel` event handler
- Direct analysis of `frontend/src/pages/TournamentViewPage.jsx` — confirmed flat, non-status-aware layout
- Direct analysis of `frontend/src/components/TournamentInfoPanel.jsx` — confirmed custom Collapse with open-by-default
- Direct analysis of `frontend/src/components/FormatVisualization.jsx` — confirmed always-manual expand, no auto-expand for IN_PROGRESS
- [Bootstrap 5.3 Breakpoints](https://getbootstrap.com/docs/5.3/layout/breakpoints/)
- [Bootstrap 5.3 Navbar](https://getbootstrap.com/docs/5.3/components/navbar/)
- [Bootstrap 5.3 Offcanvas](https://getbootstrap.com/docs/5.3/components/offcanvas/)
- [React Bootstrap Navbar docs](https://react-bootstrap.netlify.app/docs/components/navbar/)
- [React Bootstrap Offcanvas docs](https://react-bootstrap.netlify.app/docs/components/offcanvas/)
- [React Bootstrap Breakpoints](https://react-bootstrap.netlify.app/docs/layout/breakpoints/)
- [LogRocket: Zoom, Pan, Pinch in React](https://blog.logrocket.com/adding-zoom-pan-pinch-react-web-apps/)

---

*Architecture research for: BATL v1.4 — mobile-first UI rework, React Bootstrap 2.10 / Bootstrap 5.3*
*Researched: 2026-03-06*
