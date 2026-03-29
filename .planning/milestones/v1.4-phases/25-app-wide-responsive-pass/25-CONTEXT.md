# Phase 25: App-Wide Responsive Pass - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Every key page in the app is usable at 375px viewport width with no horizontal overflow. Data tables adapt for mobile. All interactive elements meet 44px tap targets. Light visual refresh applied for consistent spacing, typography, and color. No backend changes.

</domain>

<decisions>
## Implementation Decisions

### Visual refresh scope
- Full light refresh: spacing, typography, AND subtle color/button improvements
- Establish CSS custom properties (design tokens) in :root for --spacing-xs/sm/md/lg, --font-size-sm/base/lg, --color-muted etc.
- Override Bootstrap defaults globally — tighter card padding, smaller form margins, better density everywhere (both desktop and mobile)
- Primary pain point: too much whitespace across the app — tighten everything up
- Scope: RESP-04 through RESP-07 pages (tournament list, rankings, player profile, organizer pages) PLUS dashboard pages (Admin, Organizer)
- Other pages (login, register, admin point tables) get responsive/overflow fixes but skip the visual polish pass

### Table mobile strategy
- Tournament list and player lists: card layout on mobile (each item as a card, stacked vertically)
- Rankings tables: keep tabular format with column hiding (rank, name, points are essential columns)
- Card layout triggers at sm-down breakpoint (max-width: 575.98px)
- Column hiding also at sm-down breakpoint for consistency

### Dashboard pages (Admin, Organizer)
- Replace current prototype content with meaningful layout
- Show: activity feed (recent registrations, recent results) plus quick links to main work pages
- Should serve as landing pages that route users to their primary tasks
- Must be mobile-friendly (cards stack vertically on mobile)

### Tournament list page (RESP-04)
- Card layout on mobile: each tournament as a card showing name, date, status, category
- Tap card to navigate to tournament view
- Cards stack vertically

### Category rankings page (RESP-05)
- Keep tabular format on mobile with column hiding
- Essential columns: rank, name/player, points
- Hide non-essential columns (tournament count, win rate, etc.) at sm-down

### Player profile page (RESP-06)
- Prioritize key info: name, category, ranking shown prominently
- Collapse secondary info (registration history, stats) into expandable sections on mobile
- Stack layout vertically on mobile

### Organizer pages (RESP-07)
- Dashboard: activity feed + quick links (see dashboard decision above)
- Players page: card layout on mobile (player cards stacked)
- Tournament setup: ensure forms don't overflow, stack side-by-side inputs vertically

### Global CSS approach
- Single new global stylesheet (e.g., app.css) imported in main.jsx
- Contains: design tokens (:root custom properties), global responsive rules, per-page overrides via class selectors
- Primary breakpoint: @media (max-width: 575.98px) — consistent with Phase 23/24 convention
- Overrides Bootstrap defaults for tighter spacing globally (applies to both desktop and mobile)

### 44px tap targets (RESP-03)
- Apply consistently at sm-down breakpoint per Phase 23 convention
- Covers buttons, links, form controls across all pages in scope
- Phase 23 already established the pattern in KnockoutBracket.css and MatchResultModal.css — extend globally

### Claude's Discretion
- Exact design token values (spacing scale, font sizes, color palette adjustments)
- Which specific columns to hide per ranking table type
- Card layout design details (shadows, borders, badge placement)
- Dashboard activity feed implementation (what data to pull from existing APIs)
- Whether to create a shared responsive Card component or use per-page CSS

</decisions>

<specifics>
## Specific Ideas

- "Too much whitespace" is the primary visual complaint — density should increase noticeably
- Dashboard pages currently have prototype content — should be replaced with useful activity feed + quick links for each role
- Card layout for tournament list on mobile — show name, date, status, category per card
- Player profile should prioritize name/category/ranking, collapse secondary info
- Maintain consistency with Phase 23/24 mobile patterns (575.98px breakpoint, 44px targets)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RankingsTable.jsx`: Uses TanStack React Table — column visibility API available for responsive column hiding
- `CategoryManagementPage.jsx`: Also uses TanStack React Table — same column hiding approach
- `MatchResultModal.css`: Has @media (max-width: 575.98px) responsive rules — established pattern
- `KnockoutBracket.css`: Has @media mobile rules — established pattern for 44px tap targets
- `index.css`: Currently minimal (1 rule for offcanvas animation) — global stylesheet will complement this

### Established Patterns
- Phase 23: CSS-only 44px tap targets at sm-down breakpoint
- Phase 23/24: Bootstrap display utilities (d-none, d-sm-block) for responsive element swaps
- Phase 22: React Bootstrap Accordion (flush, alwaysOpen) for collapsible sections
- TanStack React Table column visibility API for programmatic column show/hide
- React Bootstrap responsive props (fullscreen="sm-down", etc.)

### Integration Points
- `main.jsx`: Import point for new global stylesheet
- All page components in `frontend/src/pages/`: Each needs responsive review
- `frontend/src/components/RankingsTable.jsx`: Column hiding integration point
- Dashboard pages (AdminDashboard.jsx, OrganizerDashboard.jsx): Content replacement
- 10 pages use Table/table elements — all candidates for responsive treatment

</code_context>

<deferred>
## Deferred Ideas

- Full page refresh on player registration page breaking workflow — bug fix, separate from responsive pass
- Logout taking several seconds with redirect delay before user can login again — bug fix, separate from responsive pass
- Card-stacking layout for ALL data tables on mobile (RESP-D01) — deferred to v2+ per REQUIREMENTS.md

</deferred>

---

*Phase: 25-app-wide-responsive-pass*
*Context gathered: 2026-03-15*
