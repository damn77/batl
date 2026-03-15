# Phase 25: App-Wide Responsive Pass - Research

**Researched:** 2026-03-15
**Domain:** CSS responsive design, Bootstrap 5 utilities, TanStack React Table column visibility, React component card layouts
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual refresh scope**
- Full light refresh: spacing, typography, AND subtle color/button improvements
- Establish CSS custom properties (design tokens) in :root for --spacing-xs/sm/md/lg, --font-size-sm/base/lg, --color-muted etc.
- Override Bootstrap defaults globally — tighter card padding, smaller form margins, better density everywhere (both desktop and mobile)
- Primary pain point: too much whitespace across the app — tighten everything up
- Scope: RESP-04 through RESP-07 pages (tournament list, rankings, player profile, organizer pages) PLUS dashboard pages (Admin, Organizer)
- Other pages (login, register, admin point tables) get responsive/overflow fixes but skip the visual polish pass

**Table mobile strategy**
- Tournament list and player lists: card layout on mobile (each item as a card, stacked vertically)
- Rankings tables: keep tabular format with column hiding (rank, name, points are essential columns)
- Card layout triggers at sm-down breakpoint (max-width: 575.98px)
- Column hiding also at sm-down breakpoint for consistency

**Dashboard pages (Admin, Organizer)**
- Replace current prototype content with meaningful layout
- Show: activity feed (recent registrations, recent results) plus quick links to main work pages
- Should serve as landing pages that route users to their primary tasks
- Must be mobile-friendly (cards stack vertically on mobile)

**Tournament list page (RESP-04)**
- Card layout on mobile: each tournament as a card showing name, date, status, category
- Tap card to navigate to tournament view
- Cards stack vertically

**Category rankings page (RESP-05)**
- Keep tabular format on mobile with column hiding
- Essential columns: rank, name/player, points
- Hide non-essential columns (tournament count, win rate, etc.) at sm-down

**Player profile page (RESP-06)**
- Prioritize key info: name, category, ranking shown prominently
- Collapse secondary info (registration history, stats) into expandable sections on mobile
- Stack layout vertically on mobile

**Organizer pages (RESP-07)**
- Dashboard: activity feed + quick links (see dashboard decision above)
- Players page: card layout on mobile (player cards stacked)
- Tournament setup: ensure forms don't overflow, stack side-by-side inputs vertically

**Global CSS approach**
- Single new global stylesheet (e.g., app.css) imported in main.jsx
- Contains: design tokens (:root custom properties), global responsive rules, per-page overrides via class selectors
- Primary breakpoint: @media (max-width: 575.98px) — consistent with Phase 23/24 convention
- Overrides Bootstrap defaults for tighter spacing globally (applies to both desktop and mobile)

**44px tap targets (RESP-03)**
- Apply consistently at sm-down breakpoint per Phase 23 convention
- Covers buttons, links, form controls across all pages in scope
- Phase 23 already established the pattern in KnockoutBracket.css and MatchResultModal.css — extend globally

### Claude's Discretion
- Exact design token values (spacing scale, font sizes, color palette adjustments)
- Which specific columns to hide per ranking table type
- Card layout design details (shadows, borders, badge placement)
- Dashboard activity feed implementation (what data to pull from existing APIs)
- Whether to create a shared responsive Card component or use per-page CSS

### Deferred Ideas (OUT OF SCOPE)
- Full page refresh on player registration page breaking workflow — bug fix, separate from responsive pass
- Logout taking several seconds with redirect delay before user can login again — bug fix, separate from responsive pass
- Card-stacking layout for ALL data tables on mobile (RESP-D01) — deferred to v2+ per REQUIREMENTS.md
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RESP-01 | No page exhibits horizontal overflow at 375px viewport width | Global `max-width: 100%; overflow-x: hidden` on body/containers; audit each page's table/wide elements |
| RESP-02 | Data tables use column hiding on mobile to prevent overflow (rankings, player lists, tournament lists) | TanStack Table `columnVisibility` state + `useWindowSize` or CSS media query approach; Bootstrap `d-none d-sm-table-cell` on non-essential `<th>/<td>` pairs |
| RESP-03 | All interactive elements meet 44px minimum tap target size | Global `@media (max-width: 575.98px)` rule targeting `.btn, .form-control, .form-select, .list-group-item-action` with `min-height: 44px` |
| RESP-04 | Tournament list page is usable on mobile devices | Card layout on mobile: conditional render `d-none d-sm-block` on table, `d-sm-none` on card list; each card shows name/date/status/category |
| RESP-05 | Category rankings page is usable on mobile devices | TanStack column visibility for `tournamentCount`; category sidebar stacks above table on mobile via Bootstrap grid |
| RESP-06 | Player profile page is usable on mobile devices | Remove `col-md-8 mx-auto` centering that may overflow on small; React Bootstrap Accordion (established Phase 22 pattern) for collapsible sections |
| RESP-07 | Organizer pages (dashboard, players, tournament setup) are usable on mobile | Dashboard content replacement + card layout for players page + form stacking for tournament setup |
| RESP-08 | Light visual refresh: consistent spacing, typography, color improvements | CSS custom property design tokens in `:root`; Bootstrap variable overrides; global `app.css` densifying whitespace |
</phase_requirements>

---

## Summary

Phase 25 is a pure CSS/React frontend pass — no backend changes. The work falls into four distinct categories: (1) horizontal overflow elimination across all pages, (2) table-to-card conversion for list pages on mobile, (3) TanStack column hiding for rankings tables, and (4) a global design-token-based visual refresh to tighten spacing.

The project has established a consistent pattern across Phases 23 and 24: `@media (max-width: 575.98px)` for mobile overrides, `min-height: 44px` for tap targets applied via scoped CSS classes, and Bootstrap `d-none d-sm-*` utilities for conditional rendering. Phase 25 extends these patterns globally and adds new mobile layouts where tables cannot simply be scrolled.

The codebase is on React 19 + Bootstrap 5.3 + React Bootstrap 2.10. TanStack React Table 8.21 is already in use in `RankingsTable.jsx` and `CategoryManagementPage.jsx` but neither uses the column visibility API yet — that is the key new pattern to introduce. The global stylesheet `app.css` does not yet exist; it needs to be created and imported in `main.jsx`.

**Primary recommendation:** Implement in page-by-page waves — global CSS tokens + overflow fixes first (RESP-01, RESP-03, RESP-08), then table mobile layouts (RESP-02, RESP-04), then per-page polish (RESP-05, RESP-06, RESP-07).

---

## Standard Stack

### Core (already installed — no new dependencies needed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Bootstrap | 5.3.8 | CSS framework, breakpoints, utilities | `d-none d-sm-block`, `d-sm-none`, `gap-*`, `p-*` utilities |
| React Bootstrap | 2.10.10 | React component wrappers | `Accordion`, `Card`, `Row`, `Col` — already used |
| TanStack React Table | 8.21.3 | Data table with column visibility API | `columnVisibility` state, `onColumnVisibilityChange` |
| React 19 | 19.2.0 | Component framework | `useState` for window-size or CSS approach for column hiding |

### No new dependencies needed
All required tools are already installed. The entire phase is CSS + existing library features. Do NOT add new libraries for responsive behavior.

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
frontend/src/
├── app.css              # NEW — global design tokens + responsive rules (imported in main.jsx)
├── index.css            # EXISTING — keep offcanvas rule only
├── main.jsx             # MODIFY — add `import './app.css'` after bootstrap import
├── pages/
│   ├── TournamentsListPage.jsx    # RESP-04: card layout on mobile
│   ├── CategoryRankingsPage.jsx   # RESP-05: column hiding, stacked layout
│   ├── PlayerProfilePage.jsx      # RESP-06: accordion collapse, stacked form
│   ├── OrganizerDashboard.jsx     # RESP-07: replace prototype content
│   ├── AdminDashboard.jsx         # RESP-07: replace prototype content
│   ├── OrganizerPlayersPage.jsx   # RESP-07: card layout on mobile
│   └── TournamentSetupPage.jsx    # RESP-07: form stacking fix
└── components/
    └── RankingsTable.jsx          # RESP-05: add columnVisibility prop
```

### Pattern 1: Global app.css Design Tokens
**What:** Single stylesheet with CSS custom properties + Bootstrap default overrides + global responsive rules
**When to use:** Always — imported once, applies everywhere

```css
/* Source: CSS Custom Properties spec + Bootstrap 5 variable override docs */

/* ---- Design Tokens ---- */
:root {
  /* Spacing scale (tighter than Bootstrap defaults) */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 0.75rem;   /* 12px */
  --spacing-lg: 1rem;      /* 16px */
  --spacing-xl: 1.5rem;    /* 24px */

  /* Typography */
  --font-size-sm: 0.8125rem;   /* 13px — denser than Bootstrap's 0.875rem */
  --font-size-base: 0.9375rem; /* 15px — slightly tighter */
  --font-size-lg: 1.0625rem;   /* 17px */

  /* Colors (supplement Bootstrap) */
  --color-muted: #6c757d;
  --color-surface: #f8f9fa;
  --color-border: #dee2e6;
}

/* ---- Global Density Overrides ---- */
/* Tighter card padding (Bootstrap default is 1rem = 16px) */
.card-body {
  padding: var(--spacing-lg);  /* 16px */
}
.card-header {
  padding: var(--spacing-sm) var(--spacing-lg);
}

/* Tighter form group margins */
.mb-3 {
  margin-bottom: var(--spacing-lg) !important;
}

/* ---- Global 44px Tap Targets (mobile only) ---- */
@media (max-width: 575.98px) {
  .btn,
  .form-control,
  .form-select,
  .list-group-item-action,
  .nav-link,
  .page-link {
    min-height: 44px;
  }
  /* Inline/small buttons that should NOT be stretched */
  .btn-sm.no-stretch {
    min-height: unset;
  }
}

/* ---- Global Overflow Prevention ---- */
body {
  overflow-x: hidden;
}
.container, .container-fluid {
  max-width: 100%;
}
/* Prevent any table from overflowing its parent */
table {
  width: 100%;
}
```

### Pattern 2: Table → Card Mobile Layout (Bootstrap display utilities)
**What:** Render table on sm+ screens, render card list on xs screens using Bootstrap `d-none` / `d-sm-none` / `d-sm-block`
**When to use:** TournamentsListPage, OrganizerPlayersPage

```jsx
{/* Source: Bootstrap 5.3 display utilities docs */}
{/* Desktop: Table */}
<div className="d-none d-sm-block">
  <Table hover responsive>
    {/* ... full columns ... */}
  </Table>
</div>

{/* Mobile: Cards */}
<div className="d-sm-none">
  {items.map(item => (
    <div
      key={item.id}
      className="card mb-2"
      onClick={() => navigate(`/tournaments/${item.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className="card-body py-2">
        <div className="d-flex justify-content-between align-items-start">
          <strong>{item.name}</strong>
          <Badge bg={statusVariant}>{item.status}</Badge>
        </div>
        <div className="text-muted small mt-1">
          {item.category?.name} · {formatDate(item.endDate)}
        </div>
      </div>
    </div>
  ))}
</div>
```

**Key detail:** `d-none d-sm-block` hides on xs, shows sm+. `d-sm-none` shows on xs only. These are Bootstrap 5 utilities — confirm they are available (they are, in Bootstrap 5.3.8).

### Pattern 3: TanStack Column Visibility for Rankings Table
**What:** Pass `columnVisibility` state to `useReactTable`; use a `useIsMobile` hook or CSS media query to drive it
**When to use:** `RankingsTable.jsx` — hide `tournamentCount` column on mobile

```jsx
// Source: TanStack Table v8 docs — columnVisibility
import { useReactTable, getCoreRowModel, flexRender, getSortedRowModel } from '@tanstack/react-table';
import { useState, useEffect } from 'react';

const RankingsTable = ({ data, onRowClick }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 576);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 576);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const columnVisibility = isMobile
    ? { tournamentCount: false }
    : {};

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // ... render unchanged
};
```

**Alternative (simpler, no JS):** Add `className="d-none d-sm-table-cell"` to `<th>` and every `<td>` for `tournamentCount`. However, since RankingsTable uses TanStack's `flexRender` to render all cells from column definitions, the JS `columnVisibility` approach is cleaner and does not require modifying cell render logic.

**Essential columns to keep:** `rank`, `name`, `totalPoints`
**Columns to hide on mobile:** `tournamentCount`

### Pattern 4: Player Profile Accordion Collapse (RESP-06)
**What:** Wrap secondary sections (tournament history, stats) in React Bootstrap `Accordion` at mobile breakpoint
**When to use:** `PlayerProfilePage.jsx` — the profile card is already in `col-md-8 mx-auto`; on mobile this is fine (it stretches to full width)

The primary fix for PlayerProfilePage is:
1. Remove `col-md-8 mx-auto` if it clips on small screens (it should not, but verify no `min-width` is set)
2. Add accordion wrapper for "Tournament History" card (already a separate card at bottom)
3. Form inputs in edit mode already stack vertically — verify no `d-flex gap-2` causes horizontal overflow

### Pattern 5: Bootstrap Grid Stacking (forms)
**What:** `Col` responsive props to stack side-by-side inputs at mobile
**When to use:** `TournamentSetupPage` form, `CategoryRankingsPage` sidebar + table layout

```jsx
{/* Source: Bootstrap 5 Grid docs */}
{/* Desktop: side by side. Mobile: stacked */}
<Row>
  <Col xs={12} md={6}>
    <Form.Control ... />
  </Col>
  <Col xs={12} md={6}>
    <Form.Select ... />
  </Col>
</Row>

{/* CategoryRankingsPage sidebar fix */}
{/* Currently: Col md={3} and Col md={9} — on mobile these are both full width already (Bootstrap default) */}
{/* Issue: category list buttons have no min-height on mobile */}
```

### Pattern 6: Dashboard Content Replacement
**What:** Replace prototype alert + disabled cards with useful activity feed + quick links
**When to use:** `AdminDashboard.jsx`, `OrganizerDashboard.jsx`

Structure (for Organizer dashboard):
```jsx
<Container className="mt-3">
  {/* Quick Links row */}
  <Row className="g-2 mb-4">
    <Col xs={12} sm={6} md={4}>
      <Card className="h-100">
        <Card.Body className="d-flex flex-column">
          <Card.Title>Players</Card.Title>
          <Card.Text className="text-muted small flex-grow-1">Manage player profiles</Card.Text>
          <Button variant="primary" onClick={() => navigate('/organizer/players')}>
            Go to Players
          </Button>
        </Card.Body>
      </Card>
    </Col>
    {/* ... tournaments, rankings cards */}
  </Row>

  {/* Activity Feed */}
  <h5>Recent Activity</h5>
  <ListGroup variant="flush">
    {/* recent registrations from existing API — GET /api/v1/registrations with limit */}
  </ListGroup>
</Container>
```

**Activity feed data sources (existing APIs only):**
- Recent registrations: `GET /api/v1/registrations` — already used in `RegistrationForm.jsx`
- Recent tournaments: `GET /api/v1/tournaments` — already used throughout
- No new API endpoints needed

### Anti-Patterns to Avoid
- **Adding `overflow-x: hidden` on a positioned parent:** Can clip dropdown menus and modals. Only apply to `body` and specific containers.
- **Using `overflow-x: scroll` on a table container:** Creates a horizontal scroll bar rather than hiding columns — violates RESP-02 intent for rankings tables.
- **Setting `min-height: 44px` globally without breakpoint guard:** Will make desktop buttons chunky. Always scope to `@media (max-width: 575.98px)`.
- **Hardcoding `width` on form controls:** Any `style={{ width: 'auto' }}` on Form.Select (as in `CategoryRankingsPage`) can overflow at 375px — use `className="w-auto"` + verify it still fits within container.
- **`!important` overuse:** Bootstrap uses specificity, not `!important`. Use class overrides or CSS specificity before reaching for `!important`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Column visibility on resize | Custom visibility manager | TanStack `columnVisibility` state | Built-in, reactive, handles re-renders correctly |
| Mobile breakpoint detection in JS | Manual window.innerWidth checks everywhere | Single `useIsMobile` hook or CSS approach | Centralizes the breakpoint value (576px) |
| Collapsible sections | Custom show/hide toggle components | React Bootstrap `Accordion` | Already in use from Phase 22; handles animation, accessibility |
| Responsive grid stacking | CSS float hacks | Bootstrap `Row`/`Col` with responsive props | Already in codebase; `xs={12} md={6}` is the standard |
| Design tokens | Hardcoded values scattered in JSX | CSS custom properties in `:root` | Lockstep decision from CONTEXT.md |

**Key insight:** This phase requires zero new libraries. Every pattern needed (Bootstrap utilities, TanStack column visibility, React Bootstrap Accordion) is already installed and partially in use.

---

## Common Pitfalls

### Pitfall 1: Bootstrap `d-none d-sm-block` Applied Only to Table Wrapper
**What goes wrong:** Developer hides the `<Table>` wrapper but forgets a sibling element (e.g., "Showing N of M" count text) that still renders with a wide layout, causing overflow.
**Why it happens:** The overflow comes from a different DOM subtree than the table.
**How to avoid:** After adding card/table conditional render, test each page at 375px with DevTools and scroll horizontally. Look for non-table elements too.
**Warning signs:** DevTools shows `<p>` or `<div>` with a wider natural width than viewport.

### Pitfall 2: `Form.Select style={{ width: 'auto' }}` Overflows on Mobile
**What goes wrong:** `CategoryRankingsPage` has `<Form.Select style={{ width: 'auto' }}>` for year selector. At 375px, if the parent flex container has been narrowed, this can overflow.
**Why it happens:** `width: auto` respects content width, which may exceed available space in flex containers.
**How to avoid:** Change to `className="w-auto"` and ensure the flex parent has `flex-wrap: wrap` or `overflow: hidden`.

### Pitfall 3: 44px Min-Height Breaks Button Groups
**What goes wrong:** Applying `min-height: 44px` globally to `.btn` can distort Bootstrap `ButtonGroup` components with multiple small inline buttons.
**Why it happens:** ButtonGroup aligns buttons in a row; tall individual buttons create awkward stacked appearance.
**How to avoid:** Scope the tap-target rule carefully. The existing `MatchResultModal.css` uses `.match-result-modal .modal-footer .btn` — a scoped selector. For the global rule, use `.btn:not(.btn-sm)` or add `no-stretch` class exclusion.

### Pitfall 4: TanStack Column Visibility with Dynamic Column Definitions
**What goes wrong:** If `columns` array is defined inside the component body without `useMemo`, a new array is created on every render, causing TanStack Table to re-initialize unnecessarily when visibility state changes.
**Why it happens:** TanStack Table is sensitive to referential equality of column definitions.
**How to avoid:** Wrap `columns` definition in `useMemo` when adding visibility state.

```jsx
const columns = useMemo(() => [...], [t]); // t from useTranslation
```

### Pitfall 5: CategoryRankingsPage Category Sidebar on Mobile
**What goes wrong:** The sidebar (`Col md={3}`) renders as full-width on mobile automatically via Bootstrap — but the `<button>` list items inside it have no min-height, so they are tiny tap targets.
**Why it happens:** Bootstrap's `list-group-item-action` has padding but no min-height guarantee.
**How to avoid:** Include `.list-group-item-action` in the global 44px tap target rule.

### Pitfall 6: Dashboard Activity Feed Causing Layout Reflow
**What goes wrong:** Dashboard fetches activity data on mount; if the loading state is not handled, the page jumps/reflows when data arrives.
**Why it happens:** Unguarded `undefined.map()` or missing loading skeleton.
**How to avoid:** Always render an empty array fallback (`data || []`) and show a spinner or skeleton during load.

---

## Code Examples

### Verified: TanStack React Table columnVisibility (v8)
```jsx
// Source: TanStack Table v8.21 — column visibility state
// https://tanstack.com/table/v8/docs/api/features/column-visibility

const [columnVisibility, setColumnVisibility] = useState({});

const table = useReactTable({
  data,
  columns,
  state: {
    columnVisibility,
    // ...other state
  },
  onColumnVisibilityChange: setColumnVisibility,
  getCoreRowModel: getCoreRowModel(),
});

// To hide a column programmatically:
// columnVisibility = { tournamentCount: false }
// Column ID must match accessorKey or id in column definition
```

### Verified: Bootstrap 5.3 Display Utilities
```html
<!-- Source: Bootstrap 5.3 display utilities -->
<!-- d-none = display: none at all sizes -->
<!-- d-sm-block = display: block at sm (576px+) -->
<!-- d-sm-none = display: none at sm+ (i.e., show only on xs) -->

<div class="d-none d-sm-block">Desktop table</div>
<div class="d-sm-none">Mobile cards</div>
```

### Verified: CSS Custom Properties + Bootstrap Variable Override Pattern
```css
/* Source: Bootstrap 5.3 docs — customize with CSS variables */
/* Override Bootstrap component variables AFTER bootstrap import */

:root {
  /* Bootstrap uses its own --bs-* variables */
  --bs-card-spacer-y: 0.75rem;    /* was 1rem */
  --bs-card-spacer-x: 0.75rem;
  --bs-card-cap-padding-y: 0.5rem; /* was 0.5rem — already tight */
  --bs-card-cap-padding-x: 0.75rem;

  /* Custom app tokens */
  --spacing-sm: 0.5rem;
  --spacing-md: 0.75rem;
  --spacing-lg: 1rem;
}
```

**Important:** Bootstrap 5 uses CSS custom properties internally for most components. Overriding `--bs-card-spacer-*` in `:root` updates all cards globally without needing any selector specificity tricks.

### Verified: React Bootstrap Accordion for Collapsible Sections
```jsx
// Source: React Bootstrap 2.10 docs — Accordion
// Used in Phase 22 in TournamentViewPage

import { Accordion } from 'react-bootstrap';

// Flush variant removes border/background
<Accordion defaultActiveKey={null}>
  <Accordion.Item eventKey="tournament-history">
    <Accordion.Header>Tournament History</Accordion.Header>
    <Accordion.Body>
      {/* collapsible content */}
    </Accordion.Body>
  </Accordion.Item>
</Accordion>
```

### Verified: Established 44px Tap Target Pattern (from Phase 23)
```css
/* Source: frontend/src/components/KnockoutBracket.css line 542-580 */
/* Frontend confirmed pattern — extend globally */

@media (max-width: 576px) {
  .bracket-controls .btn {
    min-height: 44px;
    min-width: 44px;
    font-size: 1rem;
  }
}

/* Global extension — same pattern, broader selector */
@media (max-width: 575.98px) {
  .btn {
    min-height: 44px;
    font-size: 1rem;
  }
  .form-control,
  .form-select {
    min-height: 44px;
    font-size: 1rem;
  }
  .list-group-item-action {
    min-height: 44px;
    display: flex;
    align-items: center;
  }
}
```

**Note on breakpoint value:** KnockoutBracket.css uses `max-width: 576px` (no decimal). MatchResultModal.css uses `max-width: 575.98px`. Bootstrap uses `575.98px` officially to avoid overlap with the sm breakpoint at exactly 576px. Use `575.98px` for consistency with MatchResultModal (the more recent file).

---

## Page-by-Page Overflow Audit

Based on code review:

### TournamentsListPage (RESP-04)
- Current: Plain Bootstrap `<Table hover responsive>` with 3 columns (Tournament, Category, End Date)
- Problem: `responsive` prop on Bootstrap Table adds `overflow-x: auto` — this creates horizontal scroll on overflow, but the user decision is to use cards instead
- Fix: Conditional card/table render using `d-none d-sm-block` / `d-sm-none`
- Card shows: name (link), category badge, date

### CategoryRankingsPage (RESP-05)
- Current: `<Row>` with `<Col md={3}>` sidebar and `<Col md={9}>` content — Bootstrap auto-stacks on mobile (correct)
- Problem 1: `form.Select style={{ width: 'auto' }}` — potential overflow
- Problem 2: RankingsTable has `tournamentCount` column — no column hiding
- Problem 3: Category sidebar buttons — no 44px height
- Fix: Column visibility on RankingsTable + fix width on Form.Select + tap target on list buttons

### PlayerProfilePage (RESP-06)
- Current: `col-md-8 mx-auto` — on mobile this becomes full width (Bootstrap default), so no overflow issue
- Problem 1: Multiple `mb-3` form groups create excessive spacing
- Problem 2: Tournament History card is a separate card with no collapse
- Fix: Accordion wrapper for Tournament History + density CSS token reduction

### OrganizerPlayersPage (RESP-07)
- Current: `<Table striped bordered hover responsive>` with 6 columns (name, email, phone, account status, created, actions)
- Problem: 6 columns at 375px — even with `responsive` (scroll), the email/phone/created columns are very wide
- Fix: Card layout on mobile showing name, account badge, view button

### TournamentSetupPage (RESP-07)
- Current: `<Table responsive hover>` with 7 columns (name, category, location, dates, players, status, actions)
- Problem: 7 columns — definitely overflows at 375px
- Fix: Card layout on mobile (same dual-render pattern as tournament list)
- Form modals: DatePicker may need width fix; `Col md={4}` and `Col md={8}` filter row already stacks on mobile

### AdminDashboard / OrganizerDashboard (RESP-07)
- Current: Prototype content with disabled "Coming Soon" buttons and feature checklist
- Fix: Replace with activity feed + quick links grid

### PublicRankingsPage
- Current: Custom navbar + player list (likely a table)
- Status: Gets overflow fix (RESP-01) but not the full polish pass
- Note: Uses raw Bootstrap classes (`navbar`, `container`, `card`) — not React Bootstrap components

### Pages that only need overflow check (no polish):
- `LoginPage`, `RegisterPage`, `TournamentRegistrationPage`, `TournamentRulesSetupPage`, `AdminUsersPage`, `admin/PointTablesPage`

---

## State of the Art

| Old Approach | Current Approach | When | Impact |
|--------------|-----------------|------|--------|
| Bootstrap `table-responsive` for all mobile tables | Conditional card/table render for list pages | Established industry practice 2020+ | Card layout is far more usable on mobile than scroll tables |
| Hard-coded spacing in component styles | CSS custom property design tokens in `:root` | Bootstrap 5 (2021+) uses this natively | Consistent, overridable spacing with one edit |
| `window.resize` event listeners directly | `useIsMobile` hook encapsulating the listener | Standard React hook practice | Avoids listener leaks; single source of breakpoint truth |
| TanStack column defs defined inline | `useMemo` for column definitions | TanStack v8 best practice | Prevents unnecessary table re-initialization |

---

## Open Questions

1. **Dashboard activity feed: which endpoints to use**
   - What we know: `/api/v1/registrations` and `/api/v1/tournaments` exist and are used in other pages
   - What's unclear: Whether either endpoint supports `limit` or `sortBy=createdAt` for "recent" queries
   - Recommendation: Planner should check `registrationService.js` and `tournamentService.js` for available params; if recent-sorted fetch isn't available, fall back to fetching the first page and displaying it as-is

2. **`PublicRankingsPage` navbar custom vs NavBar component**
   - What we know: `PublicRankingsPage` renders its own `<nav>` with raw Bootstrap classes, not the shared `<NavBar>` component
   - What's unclear: Whether the custom nav overflows or clips at 375px (two buttons in the navbar header)
   - Recommendation: Planner should add this page to the overflow fix scope; the custom nav buttons should get 44px min-height

3. **`TournamentSetupPage` modal forms with DatePicker**
   - What we know: The create/edit modal contains `DatePicker` from `react-datepicker` 8.8.0
   - What's unclear: Whether the DatePicker calendar popup causes horizontal overflow inside the modal on mobile
   - Recommendation: Planner should include a specific check for the DatePicker at 375px; `react-datepicker` has a `withPortal` prop for mobile that renders the calendar in a portal to avoid overflow

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — frontend has no test framework configured |
| Config file | None (no vitest.config.*, jest.config.*, or similar in frontend/) |
| Quick run command | N/A — visual/manual testing via browser DevTools |
| Full suite command | N/A |

**Note:** The frontend `package.json` has no test script, no vitest, no jest. The backend uses Jest 30.2.0 but that is irrelevant for frontend CSS/layout changes. Phase 25 is entirely visual/layout work with no logic to unit test.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| RESP-01 | No horizontal overflow at 375px | manual | N/A | DevTools mobile emulation: iPhone SE (375px) |
| RESP-02 | Table column hiding on mobile | manual | N/A | Resize browser to 375px, verify tournamentCount hidden |
| RESP-03 | 44px tap targets on all interactive elements | manual | N/A | DevTools inspect computed height of buttons/inputs |
| RESP-04 | Tournament list usable on mobile | manual | N/A | Card layout visible at 375px, tap navigates |
| RESP-05 | Rankings page usable on mobile | manual | N/A | Category selector and table both visible and usable |
| RESP-06 | Player profile usable on mobile | manual | N/A | Profile data readable, edit form works without overflow |
| RESP-07 | Organizer pages usable on mobile | manual | N/A | All 4 organizer pages: dashboard, players, tournament setup |
| RESP-08 | Visual refresh applied | manual | N/A | Desktop comparison: tighter spacing, consistent typography |

### Sampling Rate
- **Per task commit:** Open each modified page at 375px in DevTools and confirm no horizontal scrollbar
- **Per wave merge:** Full mobile review of all modified pages (iPhone SE emulation in Chrome DevTools)
- **Phase gate:** All 8 RESP requirements verified manually before `/gsd:verify-work`

### Wave 0 Gaps
None — no test infrastructure needed for this phase. All validation is manual visual inspection.

---

## Sources

### Primary (HIGH confidence)
- `frontend/src/components/KnockoutBracket.css` — established 44px tap target pattern (lines 542-580)
- `frontend/src/components/MatchResultModal.css` — established `max-width: 575.98px` mobile breakpoint
- `frontend/src/main.jsx` — import order (bootstrap before index.css)
- `frontend/package.json` — confirmed installed libraries and versions
- All page source files — direct code review of current layout and overflow risks

### Secondary (MEDIUM confidence)
- Bootstrap 5.3 display utilities docs — `d-none d-sm-block` behavior (industry standard, HIGH confidence in practice)
- TanStack React Table v8 `columnVisibility` state API — in use in project (`useReactTable` confirmed in RankingsTable.jsx and CategoryManagementPage.jsx)
- React Bootstrap 2.10 `Accordion` — used in Phase 22 per STATE.md

### Tertiary (LOW confidence)
- Bootstrap CSS variable override behavior (`--bs-card-spacer-y`) — standard documented approach, but exact values for "tighter" density are at Claude's Discretion per CONTEXT.md

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed from package.json
- Architecture: HIGH — direct code review of every file to be modified
- Pitfalls: HIGH — identified from direct inspection of the actual code to be changed
- Design token values: LOW/Discretion — intentionally left open per CONTEXT.md

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable libraries, no fast-moving dependencies)
