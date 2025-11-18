# Research: Tournament View

**Feature**: 005-tournament-view
**Date**: 2025-11-13
**Status**: Complete

This document resolves all NEEDS CLARIFICATION and NEEDS RESEARCH items from the Technical Context and addresses open questions from the spec.

---

## R1: Bracket Visualization Library

**Question**: Which library should we use for bracket visualization - brackets-viewer.js or alternatives?

### Evaluation Criteria
1. Compatibility with our data model (Bracket, Round, Match)
2. Support for multiple bracket types (MAIN, CONSOLATION, PLACEMENT)
3. Responsive and mobile-friendly
4. Active maintenance and community support
5. Customization flexibility
6. Bundle size and performance

### Options Evaluated

#### Option 1: brackets-viewer.js
- **Repository**: https://github.com/Drarig29/brackets-viewer.js
- **Companion**: brackets-manager.js (bracket data management)
- **Pros**:
  - Specifically designed for tournament brackets
  - Supports single/double elimination
  - SVG-based rendering (scalable, zoomable)
  - Active maintenance (last update 2024)
  - Comprehensive documentation
  - TypeScript support
- **Cons**:
  - Requires data transformation (uses specific JSON format)
  - Large bundle size (~50KB minified)
  - Opinionated styling (requires CSS overrides)
  - Limited customization for match display
- **Data Model Fit**: ⚠️ MODERATE
  - Expects specific structure: `{id, opponent1, opponent2, status}`
  - Our Match model needs transformation layer
  - Supports bracket types but not our exact BracketType enum

#### Option 2: Custom React Component (CSS Grid/Flexbox)
- **Approach**: Build bracket tree using React components + CSS Grid
- **Pros**:
  - Full control over styling and behavior
  - Perfect fit with our data model (no transformation)
  - Smaller bundle size (no external library)
  - Easy to customize match display
  - Responsive design using Bootstrap utilities
- **Cons**:
  - More development time required
  - Need to handle bracket layout algorithm ourselves
  - Potential bugs in bracket positioning
  - No built-in zoom/pan functionality
- **Data Model Fit**: ✅ PERFECT (we design it to fit)

#### Option 3: react-tournament-bracket
- **Repository**: https://github.com/moodysalem/react-tournament-bracket
- **Pros**:
  - Simple React component
  - Responsive SVG rendering
  - Lightweight (~20KB)
- **Cons**:
  - Abandoned (last update 2020)
  - Limited bracket type support (single elimination only)
  - No TypeScript support
  - Minimal documentation
- **Data Model Fit**: ❌ POOR (single elimination only)

### Decision: Custom React Component

**Rationale**:
1. **Data Model Alignment**: Custom component perfectly fits our existing Bracket/Round/Match models without transformation overhead
2. **Flexibility**: Full control over styling, layout, and match display to match our design requirements
3. **Bundle Size**: Smaller than brackets-viewer.js (no external dependency)
4. **Learning Curve**: Team already familiar with React + CSS Grid
5. **Future Extensions**: Easy to add custom features (e.g., rule complexity indicators, match status colors)

**Implementation Approach**:
- Use CSS Grid for bracket layout (responsive, clean)
- Recursive React component for rounds: `<BracketRound>` nests `<BracketMatch>` components
- Bootstrap utilities for responsiveness
- SVG or HTML for match connectors (lines between rounds)
- Horizontal scroll for large brackets on mobile

**Tradeoff Accepted**: No built-in zoom/pan. We'll implement horizontal scroll instead, which is simpler and mobile-friendly.

**Alternatives Considered**: brackets-viewer.js rejected because transformation overhead and bundle size outweigh benefits for our use case.

---

## R2: Data Fetching & Caching Library

**Question**: Should we use React Query or SWR for data fetching and caching?

### Evaluation Criteria
1. Caching strategy (stale-while-revalidate)
2. Bundle size
3. API simplicity
4. React 19 compatibility
5. TypeScript support
6. Community adoption

### Options Evaluated

#### Option 1: TanStack React Query (formerly React Query)
- **Version**: v5 (latest)
- **Pros**:
  - Comprehensive caching with configurable TTL
  - Built-in request deduplication
  - Automatic background refetching
  - DevTools for debugging
  - Excellent TypeScript support
  - Large community (40k+ GitHub stars)
  - React 19 compatible
- **Cons**:
  - Larger bundle size (~13KB minified)
  - Steeper learning curve
  - More configuration options (can be overwhelming)
- **Bundle Size**: ~13KB minified + gzipped

#### Option 2: SWR (Stale-While-Revalidate)
- **Version**: v2 (latest)
- **Pros**:
  - Smaller bundle size (~5KB minified)
  - Simpler API (less configuration)
  - Built-in request deduplication
  - Automatic revalidation on focus/reconnect
  - React 19 compatible
  - Developed by Vercel (trusted team)
- **Cons**:
  - Less comprehensive caching options
  - No built-in DevTools
  - Smaller community than React Query
- **Bundle Size**: ~5KB minified + gzipped

#### Option 3: Plain fetch with custom caching
- **Approach**: Use native fetch() with custom cache implementation
- **Pros**:
  - No external dependency
  - Full control over caching logic
- **Cons**:
  - Reinventing the wheel
  - Need to implement deduplication, revalidation, error handling
  - More code to maintain
  - Potential bugs

### Decision: SWR

**Rationale**:
1. **Simplicity**: Tournament view is read-only with simple caching needs. SWR's minimal API is sufficient.
2. **Bundle Size**: 5KB vs 13KB is significant for a single-page feature
3. **Use Case Fit**: SWR's automatic revalidation on window focus is perfect for tournament view (users can leave tab open and see updates when they return)
4. **Team Familiarity**: Simpler API means faster development
5. **Performance**: Smaller bundle = faster page load (aligns with < 2s goal)

**Implementation Notes**:
- Use SWR's `useSWR` hook for all API calls
- Configure caching TTL: 30 seconds for tournament data, 60 seconds for standings
- Enable revalidation on focus for live tournament updates (future enhancement)
- Use SWR's `mutate` for manual cache invalidation if needed

**Alternatives Considered**: React Query rejected because its advanced features (DevTools, complex caching strategies) are overkill for this read-only page.

---

## R3: Open Questions from Spec

### Q1: Rules Modal Format
**Question**: Should the rules modal display full JSON or formatted view?

**Decision**: Formatted/simplified view with expandable "Show JSON" option

**Rationale**:
- Primary users (public, players) don't need to see raw JSON
- Formatted view is more user-friendly and accessible
- Advanced users (organizers, developers) can expand to see JSON if needed
- Aligns with accessibility requirements (WCAG AA)

**Implementation**:
- Default: Tabbed modal with Format, Scoring, Overrides tabs (human-readable)
- Accordion section at bottom: "Advanced: View Raw Configuration" (collapsed by default)

---

### Q2: Large Bracket Handling (128+ players)
**Question**: How to handle very large brackets in terms of visualization?

**Decision**: Horizontal scroll with visual indicators

**Rationale**:
- Zoom controls add complexity and confuse mobile users
- Paginated bracket sections break visual continuity
- Horizontal scroll is intuitive and works on all devices (swipe on mobile)
- Minimap overview is overkill for < 256 players

**Implementation**:
- CSS: `overflow-x: auto` on bracket container
- Visual indicators: "← Scroll to see more →" message
- Responsive: On desktop, show full width; on mobile, enable horizontal scroll
- Performance: Virtualization not needed for < 256 players (all match elements render fast)

---

### Q3: Player List Filtering/Searching
**Question**: Should we support filtering/searching players in the player list?

**Decision**: Add search box only if player count > 50

**Rationale**:
- Most tournaments have < 50 players (no search needed)
- Search adds complexity and UI clutter
- Conditional rendering keeps UI clean for small tournaments

**Implementation**:
- Check `tournamentRegistrations.length > 50`
- If true, render `<Form.Control type="search" placeholder="Search players..." />`
- Filter by player name (case-insensitive substring match)

---

### Q4: Bracket Zoom Functionality
**Question**: Should bracket visualization support zoom in/out?

**Decision**: No zoom controls. Use horizontal scroll instead.

**Rationale**: (See Q2 - same reasoning)

**Tradeoff**: Users cannot zoom in on specific matches. If this becomes a user complaint, we can add pinch-to-zoom on mobile (CSS: `touch-action: pinch-zoom`).

---

### Q5: Navigation Breadcrumb
**Question**: Do we need a "back to tournament list" breadcrumb?

**Decision**: Yes, add breadcrumb navigation

**Rationale**:
- Improves UX (users can navigate back easily)
- Standard web pattern (users expect breadcrumbs)
- Accessibility benefit (clear navigation path)

**Implementation**:
```jsx
<Breadcrumb>
  <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
  <Breadcrumb.Item href="/tournaments">Tournaments</Breadcrumb.Item>
  <Breadcrumb.Item active>{tournament.name}</Breadcrumb.Item>
</Breadcrumb>
```

---

### Q6: Match Details on Click
**Question**: Should clicking on a match open a detailed match view?

**Decision**: Out of scope for initial version

**Rationale**:
- Tournament view is already feature-rich (7 FRs)
- Match detail view would require new page/modal (scope creep)
- Can be added as future enhancement (Feature 006: Match Details)

**Implementation**: Add to "Future Enhancements" section in spec. Do not implement in this feature.

---

### Q7: External Rules Link Behavior
**Question**: Should external rules link (rulesUrl) open in new tab or same tab?

**Decision**: New tab with security attributes

**Rationale**:
- Users don't want to lose tournament view context
- Security best practice: `rel="noopener noreferrer"` prevents reverse tabnabbing
- Standard web pattern for external links

**Implementation**:
```jsx
{tournament.rulesUrl && (
  <a href={tournament.rulesUrl} target="_blank" rel="noopener noreferrer">
    View External Rules
  </a>
)}
```

---

### Q8: Waitlist Promotion History
**Question**: Should tournament view show promotion/demotion history for waitlisted players?

**Decision**: No for public view. Future enhancement for organizer-only view.

**Rationale**:
- Public users don't need this level of detail
- TournamentRegistration model already has `promotedBy`, `promotedAt`, `demotedBy`, `demotedAt` fields
- Can be added as organizer-specific feature later

**Implementation**: Do not display promotion history. Show only current status (REGISTERED, WAITLISTED, etc.).

---

## Summary of Decisions

| Item | Decision | Impact |
|------|----------|--------|
| Bracket Library | Custom React Component (CSS Grid) | +Dev time, -Bundle size, +Flexibility |
| Data Fetching | SWR | -Bundle size, +Simplicity, -DevTools |
| Rules Modal | Formatted view + expandable JSON | +UX, +Accessibility |
| Large Brackets | Horizontal scroll | +Mobile UX, -Zoom capability |
| Player Search | Conditional (> 50 players) | +Performance, +Clean UI |
| Bracket Zoom | No | +Simplicity, -Advanced feature |
| Breadcrumb | Yes | +UX, +Accessibility |
| Match Details | Out of scope | +Focus, -Feature richness |
| External Rules | New tab with security | +Security, +UX |
| Waitlist History | No (public view) | +Privacy, +Simplicity |

---

## Next Steps

Phase 1 (Design & Contracts):
1. Generate `data-model.md` - No new models needed (all data exists)
2. Generate API contracts in `/contracts/`
3. Generate `quickstart.md` - End-to-end walkthrough
4. Update agent context with SWR dependency

All research items resolved. Ready to proceed to Phase 1.
