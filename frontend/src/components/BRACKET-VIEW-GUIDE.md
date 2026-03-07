# Bracket View Implementation Guide

> **WARNING: Read this document in full before modifying ANY bracket view file.**
> This component has been through multiple rounds of bug fixes where each fix risked reintroducing a previous bug. The invariants listed below are hard-won and must be preserved.

## Files

| File | Purpose |
|------|---------|
| `KnockoutBracket.jsx` | Main bracket component — layout, data, match click handling |
| `KnockoutBracket.css` | All bracket styles including viewport, controls, responsive |
| `useBracketNavigation.js` | Zoom/pan/drag state machine — the most fragile file |
| `BracketMatch.jsx` | Individual match card rendering |
| `BracketControls.jsx` | Zoom +/- buttons, BYE toggle, reset |
| `BracketMyMatch.jsx` | "My Match" navigation for participants |
| `bracketUtils.js` | BYE detection, match finding, viewport constants |
| `bracketColors.js` | Color theme configuration |

## Architecture

```
KnockoutBracket.jsx
  +-- BracketControls (zoom/bye/reset buttons)
  +-- BracketMyMatch (navigate to participant's match)
  +-- .bracket-viewport (ref: setViewportRef callback)
  |     +-- .bracket-viewport-content (style: containerStyle with transform)
  |           +-- .bracket-container (overflow-x: auto)
  |                 +-- .bracket-grid (flex layout, rounds side-by-side)
  |                       +-- BracketRound * N
  |                             +-- BracketMatch * M
  +-- MatchResultModal (score entry on click)
```

### Transform Pipeline

All zoom/pan is done via CSS `transform: translate(Xpx, Ypx) scale(S)` on `.bracket-viewport-content`. The DOM layout is never changed — only the visual transform.

```
User action -> useBracketNavigation -> { translateX, translateY, scale } -> containerStyle.transform
```

## Critical Invariants (DO NOT VIOLATE)

### 1. Viewport Width Calculation

**Location:** `useBracketNavigation.js` lines ~237-252

```js
const naturalWidth = roundCount > 0
  ? roundCount * ROUND_WIDTH + (roundCount - 1) * ROUND_GAP
  : 0;
const el = viewportNodeRef.current;
const vpWidth = el ? el.clientWidth : 0;
const contentWidth = Math.max(naturalWidth, vpWidth);
```

**Rule:** The content width is derived from `roundCount` (a static value) and viewport `clientWidth`. It must NEVER be derived from `scale` or `scrollWidth` of the scaled content. Previous bugs calculated width using scaled dimensions, which caused a feedback loop: zoom out -> content shrinks -> viewport shrinks -> content shrinks more.

**Constants:**
- `ROUND_WIDTH = 253` (measured rendered match box width at 100% zoom)
- `ROUND_GAP = 48` (matches `.bracket-grid gap: 3rem`)

### 2. CSS Overflow and Touch Action

**Location:** `KnockoutBracket.css` `.bracket-viewport`

```css
.bracket-viewport {
  overflow: hidden;
  touch-action: none;
  user-select: none;
}
```

**Rule:** These three properties must stay exactly as-is:
- `overflow: hidden` — NOT `auto` or `scroll`. JS handles all navigation. `overflow: auto` caused the viewport to shrink when dragging on mobile because the browser created a scroll region competing with JS pan.
- `touch-action: none` — NOT `pan-x`, `pan-y`, or `manipulation`. Any other value lets the browser handle some touch gestures, which conflicts with JS touch handlers and causes erratic behavior.
- `user-select: none` — Prevents text selection during drag.

### 3. Touch Listeners Must Be Imperative

**Location:** `useBracketNavigation.js` touch useEffect (~line 178)

```js
el.addEventListener('touchstart', onTouchStart, { passive: false });
el.addEventListener('touchmove', onTouchMove, { passive: false });
```

**Rule:** Touch listeners MUST use `addEventListener` with `{ passive: false }`, NOT React's `onTouchStart`/`onTouchMove` props. React 19 registers synthetic touch listeners as passive by default, which silently ignores `e.preventDefault()`. Without `preventDefault()`, the browser scrolls the page underneath while JS also pans the bracket — causing double-movement and viewport shrinking.

### 4. Callback Ref Pattern for Touch Registration

**Location:** `useBracketNavigation.js` lines ~30-37 and ~178-221

```js
const [viewportNode, setViewportNode] = useState(null);
const setViewportRef = useCallback((node) => {
  viewportNodeRef.current = node;
  setViewportNode(node);
}, []);

// Touch useEffect depends on viewportNode STATE
useEffect(() => {
  const el = viewportNode;
  if (!el) return;
  // ... attach listeners
}, [viewportNode, clampScale]);
```

**Rule:** The viewport div is conditionally rendered (`{matches && matches.length > 0 && (...)}`). A plain `useRef` would be `null` when the effect first runs (before matches load), and the effect would never re-run because ref identity doesn't change. The callback ref sets a STATE variable, which triggers the effect to re-run when the div actually mounts.

**Corollary:** Mouse drag uses React event props (`onMouseDown`, `onMouseMove`, `onMouseUp`) directly on the JSX, which are always current regardless of mount timing. Only touch needs the imperative approach.

### 5. Zoom Centers on Viewport Midpoint

**Location:** `useBracketNavigation.js` `zoomToCenter()`

```js
const newTx = cx - (newScale / oldScale) * (cx - tx);
const newTy = cy - (newScale / oldScale) * (cy - ty);
```

**Rule:** Zoom must adjust translate to keep the viewport center fixed. The `transformOrigin` is `0 0` (top-left), so without this correction, zooming out pushes content into the top-left quadrant leaving empty space. Never change `transformOrigin` to `center center` as a "simpler" fix — it breaks the translate coordinate system.

### 6. Clamp Translate After Every Zoom

**Location:** `useBracketNavigation.js` `clampTranslate()` and `applyTransform()`

**Rule:** After every zoom operation, `clampTranslate()` must run to prevent whitespace gaps:
- Content fits in viewport -> center it
- Content overflows -> prevent edges from pulling away

The clamp reads `.bracket-grid` dimensions directly (not `.bracket-viewport-content`) because `.bracket-container` has `overflow-x: auto` which hides the true content size from `scrollWidth`.

### 7. Wheel Zoom is Removed

**History:** Wheel zoom was removed in commit `e394c9a` because `e.preventDefault()` on wheel events blocked native page scrolling. Zoom is now +/- buttons only. Do NOT re-add `onWheel` handlers.

### 8. Mobile Default Zoom

**Location:** `KnockoutBracket.jsx`

```js
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
const effectiveInitialScale = initialScale === 1.0 && isMobile ? 0.5 : initialScale;
```

**Rule:** Mobile defaults to 50% zoom so more rounds are visible. The min scale (0.25) stays the same — going below that makes text illegible.

## Bug History (Chronological)

| Commit | Bug | Root Cause | Fix |
|--------|-----|------------|-----|
| `e394c9a` | Wheel zoom blocked page scrolling | `e.preventDefault()` on wheel events | Removed wheel zoom entirely, +/- buttons only |
| `09e7d92` | Viewport shrinking when dragging on mobile | `overflow: auto` + `touch-action: pan-x pan-y` let browser scroll compete with JS pan | Changed to `overflow: hidden` + `touch-action: none` |
| `5af3d48` | Zoom pushed content to top-left; browser scrolled during touch drag | 1) `transform-origin: 0 0` without translate compensation; 2) React 19 passive touch listeners | 1) Added `zoomToCenter()` with translate adjustment; 2) Imperative `addEventListener({ passive: false })` |
| `5b095c3` | Whitespace gaps after zooming out | No bounds checking on translate after zoom | Added `clampTranslate()` that centers or clamps content to viewport edges |
| `4b42a7e` | Touch drag not working at all on mobile | Touch `useEffect` ran before conditionally-rendered viewport div existed; ref identity never changed so effect never re-ran | Callback ref pattern: `setViewportRef` sets state, `useEffect` depends on state |

## Failed Approaches (Do Not Retry)

### Auto-Fit Zoom on Mount
**Idea:** Calculate initial scale so 2 rounds are visible: `vpWidth / (2 * ROUND_WIDTH + ROUND_GAP)`.
**Why it failed:** Timing issue — the effect measured viewport width before layout was complete. The calculated scale interacted badly with the content width logic, causing layout instability on mobile.
**Details:** See `frontend/src/hooks/auto-fit-zoom-attempt.md`

### `overflow: auto` on `.bracket-viewport`
**Why it failed:** Creates a browser-managed scroll region that competes with JS pan. On mobile, the browser's scroll handler fires alongside the JS touch handler, causing the visible area to shrink progressively with each drag.

### React `onTouchStart`/`onTouchMove` Props
**Why it failed:** React 19 registers these as passive listeners. `e.preventDefault()` is silently ignored. The browser handles touch gestures (scrolling, zooming) simultaneously with JS pan logic.

### `transform-origin: center center`
**Why it failed:** Makes the translate coordinate system dependent on element size, which changes with scale. All translate calculations assume `0 0` origin. Changing origin would require rewriting all pan/zoom math.

## Testing Checklist

When modifying bracket view code, verify ALL of the following:

### Desktop
- [ ] Bracket renders with correct layout (rounds left-to-right)
- [ ] Mouse drag pans the bracket
- [ ] Zoom +/- buttons work, content stays centered
- [ ] Zoom out doesn't create whitespace gaps
- [ ] Reset button returns to default view
- [ ] BYE toggle hides/shows first-round BYEs
- [ ] Match click opens result modal (for authorized users)

### Mobile (use dev:mobile script + real device or Chrome DevTools mobile emulation)
- [ ] Touch drag pans the bracket
- [ ] Default zoom is 50% (more rounds visible)
- [ ] Zoom +/- buttons work, no viewport shrinking
- [ ] Pinch-to-zoom works
- [ ] No page scroll leaking through during bracket drag
- [ ] Content doesn't progressively shrink with repeated drags
- [ ] Bracket is usable after multiple zoom in/out cycles
