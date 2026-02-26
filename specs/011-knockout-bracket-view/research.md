# Research: Knockout Tournament Bracket View

**Feature**: 011-knockout-bracket-view
**Date**: 2026-01-14
**Status**: Complete

## Research Questions

### 1. CSS Bracket Layout Techniques

**Question**: What is the best approach for creating a triangular tournament bracket layout with proper match positioning?

**Decision**: CSS Grid with dynamic row positioning and pseudo-element connector lines

**Rationale**:
- CSS Grid provides precise control over row/column positioning
- Match vertical centering achievable via `grid-row` spanning
- Connector lines via `::before`/`::after` pseudo-elements
- Better accessibility than canvas/SVG (semantic HTML, keyboard navigation)
- Easier integration with React Bootstrap styling

**Alternatives Considered**:

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| SVG Canvas | Precise lines, scalable | Poor accessibility, complex state management | Accessibility concerns, harder React integration |
| Absolute positioning | Simple concept | Brittle, hard to maintain | Not responsive, manual calculations |
| Canvas 2D | Fast rendering | No accessibility, not SEO friendly | Not suitable for interactive UI |
| react-brackets library | Pre-built solution | External dependency, limited customization | Styling constraints, unnecessary dependency |

**Implementation Notes**:
- Use CSS Grid for round columns: `grid-template-columns: repeat(numRounds, minmax(200px, 1fr))`
- Match positioning: Calculate `grid-row` based on bracket position (2^depth spacing)
- Connector lines: Horizontal lines from match right edge, vertical lines between paired matches
- Existing `KnockoutBracket.css` already has partial implementation to extend

---

### 2. Zoom/Pan Implementation

**Question**: What is the best approach for implementing zoom and pan functionality in React?

**Decision**: CSS Transform with custom React state management

**Rationale**:
- CSS `transform: scale() translate()` is hardware-accelerated
- No external dependencies required
- Simple state: `{ scale, translateX, translateY }`
- Smooth animations via CSS transitions
- Works well with existing React patterns

**Alternatives Considered**:

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| @use-gesture/react | Mature gesture handling | 50KB+ dependency | Over-engineered for this use case |
| react-zoom-pan-pinch | Pre-built solution | External dependency, styling conflicts | Bundle size, limited customization |
| Canvas transformation | Native performance | Requires canvas redraw | Would require complete rewrite |

**Implementation Notes**:
```javascript
// State shape
const [viewport, setViewport] = useState({
  scale: 1,
  translateX: 0,
  translateY: 0
});

// Apply to bracket container
style={{
  transform: `scale(${viewport.scale}) translate(${viewport.translateX}px, ${viewport.translateY}px)`,
  transformOrigin: 'center center',
  transition: 'transform 0.1s ease-out'
}}
```

**Controls**:
- Scroll wheel: Zoom in/out at cursor position
- Click-drag: Pan the view
- Pinch gesture: Mobile zoom
- Reset button: `setViewport({ scale: 1, translateX: 0, translateY: 0 })`

---

### 3. Touch Gesture Handling

**Question**: How to handle touch gestures (pinch-to-zoom, drag-to-pan) without conflicts?

**Decision**: Native browser events with `touch-action` CSS property

**Rationale**:
- Modern browsers handle pinch/drag natively
- `touch-action: none` on bracket container prevents scroll conflicts
- `onTouchStart`, `onTouchMove`, `onTouchEnd` for custom handling
- No external library needed

**Implementation Notes**:
```css
.bracket-viewport {
  touch-action: none; /* Prevent browser zoom/scroll */
  overflow: hidden;
  cursor: grab;
}

.bracket-viewport.dragging {
  cursor: grabbing;
}
```

**Gesture Mapping**:
- 1 finger drag: Pan
- 2 finger pinch: Zoom
- Double tap: Reset view (or zoom to 2x)

---

### 4. BYE Match Handling

**Question**: How to identify and toggle first-round BYE matches?

**Decision**: Filter by round number and match status

**Rationale**:
- First-round BYEs are identifiable by `roundNumber === 1` and `isBye === true`
- Toggle state stored in component state
- CSS class controls visibility: `.bye-match.hidden { display: none }`
- Later-round BYEs excluded from toggle logic

**Implementation Notes**:
```javascript
// Identify first-round BYEs
const isFirstRoundBye = (match) =>
  match.roundNumber === 1 && match.isBye === true;

// Render logic
{matches.map(match => (
  <BracketMatch
    key={match.id}
    match={match}
    hidden={showByes === false && isFirstRoundBye(match)}
  />
))}
```

---

### 5. "My Match" Navigation Logic

**Question**: How to determine and navigate to the current user's relevant match?

**Decision**: Query matches for user's player profile, prioritize by status

**Rationale**:
- User context provides `currentUser.playerProfileId`
- Filter matches where user is participant
- Priority: SCHEDULED > IN_PROGRESS > COMPLETED
- Calculate viewport transform to center on target match(es)

**Implementation Notes**:
```javascript
const findMyMatch = (matches, playerProfileId) => {
  const myMatches = matches.filter(m =>
    m.player1Id === playerProfileId || m.player2Id === playerProfileId
  );

  // Find next unplayed match
  const nextMatch = myMatches.find(m => m.status === 'SCHEDULED');
  if (nextMatch) return nextMatch;

  // Find last played match (eliminated or won)
  return myMatches.filter(m => m.status === 'COMPLETED').pop();
};

const navigateToMatch = (match) => {
  // Calculate center position of match element
  // Animate viewport to center on match
  // Also show predecessor matches if space allows
};
```

---

### 6. Color Configuration

**Question**: How to make bracket colors configurable without requiring code changes?

**Decision**: JavaScript configuration module with HEX values

**Rationale**:
- JavaScript modules can be hot-reloaded in development
- TypeScript/JSDoc support for IDE autocomplete
- No YAML parsing library needed
- Environment variables can override defaults

**Implementation Notes**:
```javascript
// frontend/src/config/bracketColors.js
export const bracketColors = {
  // Match backgrounds
  topPlayer: '#f0f0f0',      // Light grey
  bottomPlayer: '#ffffff',   // White
  winner: '#d1e7dd',         // Light green
  error: '#f8d7da',          // Light red

  // Match borders
  scheduled: '#6c757d',
  inProgress: '#0d6efd',
  completed: '#198754',

  // Connector lines
  connector: '#dee2e6',

  // UI controls
  controlActive: '#0d6efd',
  controlInactive: '#6c757d'
};

// Usage in components
import { bracketColors } from '../config/bracketColors';
```

---

### 7. Existing Data Structures

**Question**: What data structures are available from existing features?

**Findings**:

**From tournamentViewService.js** (Feature 005):
- `useMatches(tournamentId, filters, enabled)` - Fetches matches for a bracket
- Match object includes: `id`, `roundId`, `player1`, `player2`, `matchResult`, `status`

**From bracketService.js** (Feature 009):
- `getBracketByPlayerCount(playerCount)` - Returns bracket structure
- Structure includes: `bracketSize`, `structure`, `preliminaryMatches`, `byes`

**From seedingPlacementService.js** (Feature 010):
- `generateBracket(categoryId, playerCount)` - Returns seeded bracket positions

**Data Integration Strategy**:
- Use existing `useMatches` hook for match data
- Bracket structure from API provides round/match counts
- Player positions from seeding service
- No new backend APIs required

---

## Summary

All research questions resolved. Key decisions:

1. **Layout**: CSS Grid with pseudo-element connectors
2. **Zoom/Pan**: CSS Transform with React state
3. **Touch**: Native events with `touch-action: none`
4. **BYE Toggle**: Filter by round and status
5. **My Match**: Query by playerProfileId, prioritize by status
6. **Colors**: JavaScript config module
7. **Data**: Leverage existing Feature 005/009/010 services

No external dependencies required. Implementation can proceed with Phase 1 design artifacts.