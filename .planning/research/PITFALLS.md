# Pitfalls Research

**Domain:** Mobile-first responsive design retrofit — adding mobile-first layout to an existing desktop-first Bootstrap 5 / React 19 app
**Researched:** 2026-03-06
**Confidence:** HIGH (code-audited against actual BATL codebase + Bootstrap/touch event documented behavior)

---

## Critical Pitfalls

### 1. Bootstrap Navbar Collapse Requires Bootstrap JS Bundle — Not Loaded in This App

**What goes wrong:**
The `NavBar.jsx` uses Bootstrap's `data-bs-toggle="collapse"` and `data-bs-target="#navbarNav"` attributes to toggle the mobile hamburger menu. These attributes are Bootstrap JavaScript directives. If the Bootstrap JS bundle is not imported (only Bootstrap CSS via React Bootstrap), the hamburger button renders but does nothing on click — the menu never opens. This is the known mobile navigation display bug reported by the tester.

**Why it happens:**
React Bootstrap 2.10 is a component library that re-implements Bootstrap components as React components. It does NOT ship Bootstrap's vanilla JavaScript. The `<nav>` in `NavBar.jsx` is plain HTML markup using Bootstrap CSS classes and `data-bs-*` attributes — it is not using React Bootstrap's `<Navbar>` component. Plain `data-bs-*` attributes need Bootstrap JS to function.

**How to avoid:**
Two valid fixes — pick one:
- **Preferred:** Replace the plain `<nav>` with React Bootstrap's `<Navbar>`, `<Navbar.Toggle>`, and `<Navbar.Collapse>` components, which handle collapse state in React without Bootstrap JS.
- **Alternative:** Import Bootstrap JS bundle alongside Bootstrap CSS (adds weight and potential conflicts with React Bootstrap's own event handling).

The React Bootstrap `<Navbar>` approach is the correct fix for this app because it keeps the event handling in React state.

**Warning signs:**
- Hamburger icon appears on mobile but tapping it has no effect
- No JavaScript errors in console (the data-bs attributes silently do nothing)
- Desktop navigation works fine (collapse is never triggered)

**Phase to address:** Phase 1 (navigation fix — prerequisite for all mobile work)

---

### 2. touch-action: pan-x pan-y on Bracket Viewport Conflicts with Single-Finger Pan

**What goes wrong:**
`KnockoutBracket.css` sets `touch-action: pan-x pan-y` on `.bracket-viewport`. The `useBracketNavigation.js` hook calls `e.preventDefault()` in `handleTouchMove` to prevent browser scrolling while panning the bracket. However, `preventDefault()` on a touch event only works if the event listener is registered as `{ passive: false }`. React's synthetic event system registers touch events as passive by default in React 17+. This means `preventDefault()` in `handleTouchMove` is silently ignored — the browser still scrolls the page instead of panning the bracket on single-finger touch.

**Why it happens:**
React moved to passive touch listeners by default for performance. The code was likely written expecting active listeners. The `touch-action` CSS partially compensates but does not fully prevent page scroll when the browser overrides it.

**How to avoid:**
Register the touch event handlers directly on the DOM element using `addEventListener` with `{ passive: false }`, bypassing React's synthetic event system for this specific case:

```javascript
useEffect(() => {
  const el = viewportRef.current;
  if (!el) return;
  el.addEventListener('touchmove', handleTouchMove, { passive: false });
  el.addEventListener('touchstart', handleTouchStart, { passive: false });
  return () => {
    el.removeEventListener('touchmove', handleTouchMove);
    el.removeEventListener('touchstart', handleTouchStart);
  };
}, [handleTouchMove, handleTouchStart]);
```

Remove the corresponding `onTouchMove` and `onTouchStart` from the JSX once the imperative listeners are in place.

**Warning signs:**
- Page scrolls vertically when attempting to pan the bracket on a real iOS/Android device
- `[Violation] Added non-passive event listener to a scroll-blocking event` in Chrome DevTools console
- Pan works correctly in desktop browser DevTools mobile emulation (emulation does not enforce passive listener rules the same way real devices do)

**Phase to address:** Phase where bracket touch pan is tested on a real device (bracket mobile UX phase)

---

### 3. pinch-zoom gesture conflicts with browser's native pinch-to-zoom

**What goes wrong:**
`useBracketNavigation.js` implements custom pinch-zoom (2-finger scale gesture) via `handleTouchMove` when `e.touches.length === 2`. On iOS Safari and Chrome for Android, the browser intercepts 2-finger pinch gestures to zoom the viewport before the app's touch handlers fire. The app's pinch-zoom logic never runs on real devices — instead the entire page zooms.

**Why it happens:**
Without `user-scalable=no` in the viewport meta tag, browsers reserve pinch gestures for native zoom. Even with `touch-action: pan-x pan-y`, a 2-finger pinch typically triggers OS-level zoom.

**How to avoid:**
Two complementary fixes:
1. Add `user-scalable=no` or `maximum-scale=1` to the viewport meta tag in `index.html` **only if** pinch-to-zoom in the bracket is a required feature. This disables native zoom app-wide, which is an accessibility concern.
2. Better approach: Drop custom pinch-zoom from the bracket entirely. Provide +/- buttons (already implemented in `BracketControls.jsx`) as the only zoom mechanism on mobile. Remove the 2-finger logic from `handleTouchMove`. This avoids the conflict entirely and is more accessible.

The current BATL design already has explicit zoom buttons — the custom pinch gesture is a nice-to-have, not the primary zoom UX. Removing it and relying on buttons is the pragmatic path.

**Warning signs:**
- On real iOS/Android: 2-finger gestures zoom the page, not the bracket
- DevTools emulation shows pinch-zoom working (emulation lets apps intercept pinch)
- App zooms to 400% and user cannot zoom back out easily

**Phase to address:** Bracket touch UX phase — decide early whether to drop pinch or accept the accessibility tradeoff

---

### 4. Bootstrap Modal scroll-lock conflicts with iOS Safari viewport height

**What goes wrong:**
React Bootstrap's `<Modal>` adds `modal-open` class to `<body>` which sets `overflow: hidden` to prevent background scroll while the modal is open. On iOS Safari, this causes the body to jump to the top and the modal content to clip at the bottom of the initial viewport height, hiding the submit button. The "rubber band" overscroll effect also means users can accidentally dismiss the keyboard, resizing the viewport mid-modal and causing re-layout.

**Why it happens:**
iOS Safari's viewport height (`100vh`) includes the browser chrome (address bar, bottom navigation). When the keyboard opens inside a modal, `100vh` does not shrink — the keyboard overlays the modal instead of pushing it up. The fixed-positioned modal ends up with its footer behind the keyboard.

**How to avoid:**
- Set `Modal` `scrollable={true}` on all modals so `Modal.Body` gets its own scroll, keeping the footer visible.
- Avoid `position: fixed` heights in modal content. Use `max-height: 80svh` (svh = small viewport height, supported in iOS 15.4+) on `.modal-dialog` via CSS override to account for keyboard.
- For the `MatchResultModal` specifically: the score form must remain fully visible when the number keypad opens. Test on a real iPhone, not just DevTools.

**Warning signs:**
- Submit button not visible when keyboard is open on iPhone
- Page jumps to top when modal opens on iOS Safari
- User has to scroll inside the modal to reach the save button

**Phase to address:** Modal mobile UX phase — also applies to `LoginModal`, `RegisterModal`, `CreatePlayerModal`

---

### 5. TanStack Table with Bootstrap `responsive` prop cuts off sticky columns on mobile

**What goes wrong:**
`RankingsTable.jsx` uses `<Table responsive>` (Bootstrap) which wraps the table in a div with `overflow-x: auto`. This creates a new stacking context. Any `position: sticky` column (e.g. a pinned rank column) fails — it sticks to the overflow container, not the viewport, making it appear broken or invisible on small screens.

**Why it happens:**
`overflow: auto` on a parent element prevents `position: sticky` from sticking to the viewport. This is a CSS spec behavior — sticky positioning needs an overflow: visible ancestor to work as expected.

**How to avoid:**
- Do not combine `position: sticky` with `overflow-x: auto` parents. Choose one.
- For mobile rankings: instead of sticky columns, hide lower-priority columns (tournament count, seeding score) on small screens using Bootstrap's `d-none d-md-table-cell` utilities on `<th>` and `<td>`.
- Consider a "card mode" fallback for very small screens: render each row as a stacked card rather than a table row.

**Warning signs:**
- Rank badge column disappears or doesn't stick when scrolling horizontally on mobile
- Horizontal scroll makes name column hard to read without a sticky reference

**Phase to address:** Responsive tables phase — apply consistently across `RankingsTable`, `GroupStandingsTable`, any organizer management tables

---

### 6. Desktop-first CSS specificity overrides mobile breakpoint rules

**What goes wrong:**
The existing CSS (especially `KnockoutBracket.css`) is written desktop-first: base styles assume large screen, then `@media (max-width: 768px)` patches are applied. When adding mobile-first Bootstrap grid to existing pages, the existing desktop base styles (often with higher specificity due to `.component > .child` selectors) override Bootstrap's `col-12` mobile grid. The page looks correct on desktop but breaks on mobile because the existing styles win.

**Why it happens:**
Bootstrap's grid classes have low specificity (single class). Existing component CSS that targets elements with compound selectors (e.g. `.bracket-controls-wrapper .btn`) beats Bootstrap's responsive utilities even when the intent is for Bootstrap to control layout on mobile.

**How to avoid:**
- Audit all existing component CSS for compound selectors that set `width`, `min-width`, `display`, `flex-direction`, or `float`. These are the selectors most likely to override Bootstrap grid.
- When refactoring existing components to mobile-first, convert existing `max-width` media queries to `min-width` (mobile-first direction) and audit the cascade.
- Use `!important` sparingly and only as a temporary marker — it signals a cascade problem that must be fixed properly.
- The `bracket-round { min-width: 160px }` at 768px and `min-width: 140px` at 576px are correct but the `bracket-grid { gap: 3rem }` base style will still push content off screen on 375px phones with 3+ rounds.

**Warning signs:**
- Elements have fixed pixel widths wider than the mobile viewport
- `overflow-x: scroll` appearing on `<body>` unexpectedly (horizontal page scroll)
- Chrome DevTools shows a Bootstrap `col-12` class but the element renders narrower than expected

**Phase to address:** App-wide responsive pass phase — audit before writing new CSS

---

### 7. `visibility: hidden` BYE matches still consume layout space — breaks mobile bracket height

**What goes wrong:**
`KnockoutBracket.css` hides BYE matches with `visibility: hidden` (not `display: none`) on `.match-wrapper.bye-hidden`. This preserves the bracket layout structure — the hidden elements still take up height. On desktop with zoom/pan this is fine. On mobile at 100% scale, a 16-player bracket with 8 BYEs in round 1 results in a very tall first column even when BYEs are "hidden", requiring excessive vertical scrolling.

**Why it happens:**
The `visibility: hidden` approach was chosen intentionally to maintain connector line positioning. On desktop with scrollable/zoomable viewport this is a non-issue. On mobile where the bracket renders at 1:1 scale without zoom, the wasted vertical space is significant.

**How to avoid:**
For mobile (≤576px breakpoint), consider switching BYE-hidden elements to `display: none` and recalculate connector lines without them. Alternatively, on mobile, default to showing only completed/scheduled matches and collapse BYE slots with a height of 0.

The trade-off: connector lines will break if BYE rows are removed from the layout flow. The phase implementing mobile bracket improvements must decide: accept broken connectors on mobile, or redesign connector rendering for mobile.

**Warning signs:**
- Bracket first round is extremely tall on mobile even with BYE toggle off
- User must scroll past many invisible elements to reach the next round
- The bracket feels "broken" because there's whitespace with no visible matches

**Phase to address:** Bracket mobile UX phase (after navigation fix, before organizer mobile work)

---

### 8. `SetsScoreForm` uses `type="number"` inputs — broken on mobile for score entry

**What goes wrong:**
`SetsScoreForm.jsx` uses `<Form.Control type="number">` for score entry. On iOS Safari, `type="number"` shows a decimal keypad by default, requiring users to tap the decimal to get to integers, and shows spinner arrows on desktop that users accidentally tap. On Android, the number keypad behavior is inconsistent. The form layout uses Bootstrap `Row`/`Col` with `xs={1}` through `xs={4}` proportions — on a 375px screen this results in the set number column being ~37px wide (too narrow for touch targets) and the score inputs being ~148px (acceptable but tight).

**Why it happens:**
`type="number"` was chosen for correct HTML semantics but the mobile keyboard UX is not optimal for small integer entry (0-7 for sets, 0-99 for tiebreaks).

**How to avoid:**
- Use `type="text"` with `inputMode="numeric"` and `pattern="[0-9]*"`. This forces the numeric keypad on iOS without the decimal-first behavior, and works correctly on Android.
- Increase touch target size of score inputs: minimum 44x44px per Apple HIG / WCAG 2.5.5. The current `size="sm"` Bootstrap inputs are approximately 28px tall — too small.
- Consider a stepper component (+/- buttons) for the 0-7 range instead of a text input — much easier for one-handed use on a phone.

**Warning signs:**
- iOS users report having to type `.` then backspace to enter an integer score
- Users accidentally submit wrong scores due to tiny tap targets
- Score entry is the primary mobile use case (players entering results at the court) — any friction here is high impact

**Phase to address:** Score entry / form mobile UX phase — this is the highest user-impact mobile improvement after navigation

---

### 9. React Bootstrap Modal `size="lg"` is wider than 375px mobile viewport

**What goes wrong:**
`MatchResultModal` uses `<Modal size="lg">`. Bootstrap's `modal-lg` has a `max-width: 800px` on screens above 576px. Below 576px, Bootstrap modals use `max-width: 500px` — still wider than a 375px iPhone screen in portrait mode. The modal gets `margin: 0.5rem` on mobile (Bootstrap default) and may render at 100% - 1rem width, which is correct. However, the `SetsScoreForm` inside the modal has the 5-column layout (Set | P1 | P2 | Tiebreak) which becomes cramped at ~350px modal width. Player name columns in `<option>` elements of the special outcome `<select>` will overflow for long doubles pair names.

**Why it happens:**
The modal content was designed for the desktop form size without a separate mobile layout consideration.

**How to avoid:**
- Remove `size="lg"` from `MatchResultModal`. Default modal size (max-width: 500px on md+) is sufficient for score entry.
- In `SetsScoreForm`, replace the 4-column layout with a 2-row layout on mobile: player name row, then score row. Use `d-flex flex-column` on mobile, `d-flex flex-row` on md+.
- Test doubles pair name truncation — names like "Novotný / Šimkovič" can be 20+ characters and overflow a 160px column.

**Warning signs:**
- Horizontal scroll appears inside the modal on mobile
- Column widths clip player names
- The modal title for doubles matches (which stacks both pair names vertically) extends very tall and pushes score form below the fold

**Phase to address:** Modal mobile UX phase

---

### 10. Manual Draw Editor (`ManualDrawEditor.jsx`) is organizer-critical but completely untested on mobile

**What goes wrong:**
The manual draw editor assigns players to bracket positions via dropdowns, one position at a time. Each assignment immediately calls the API. On mobile, the dropdowns list all players plus "TBD" — with 32 players in a category, the dropdown scrolls 33 items. Selecting the correct player on a small touchscreen while the bracket visualization is above is tedious. There is no progressive disclosure or search-to-filter.

**Why it happens:**
The manual draw was built for organizer desktop use. Mobile was not a requirement when it was implemented.

**How to avoid:**
- For mobile, replace the per-position `<select>` with a searchable dropdown (e.g., use `<datalist>` for native mobile search, or a simple `<input>` + filtered `<option>` list).
- Consider a mobile-specific draw UX: show positions as cards, tap a card to open a player selection sheet (bottom drawer pattern).
- At minimum, increase the dropdown `<select>` height and font-size on mobile to improve tap accuracy.

**Warning signs:**
- Organizer reports taking 15+ minutes to complete a manual draw on phone due to dropdown misselection
- Wrong player assigned because of adjacent touch targets
- API called multiple times per position due to accidental selections

**Phase to address:** Organizer mobile support phase

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep plain `<nav>` markup and add Bootstrap JS bundle | Quick fix for hamburger | Bootstrap JS + React Bootstrap conflict risks; 45KB extra JS | Never — use React Bootstrap Navbar instead |
| `@media (max-width: 768px)` patches on existing desktop CSS | Non-breaking changes | Cascading specificity wars; mobile styles always fight desktop defaults | Acceptable only as temporary fix in an isolated component |
| `user-scalable=no` in viewport meta | Stops pinch-zoom conflicts | Violates WCAG 1.4.4 (Text Resize), breaks accessibility for low-vision users | Never for production app |
| `visibility: hidden` BYE rows (current approach) | Preserves connector lines | Wasted vertical space on mobile; confusing whitespace | Acceptable on desktop; fix for mobile specifically |
| DevTools emulation as primary mobile test | Fast iteration | Misses passive event issues, iOS Safari scroll behavior, real touch targets | Development iteration only — always test on real device before phase complete |
| `type="number"` for score inputs | Correct semantics | Wrong keyboard on iOS, spinner arrows on desktop | Use `type="text" inputMode="numeric"` instead |

---

## Integration Gotchas

Common mistakes when connecting these specific component areas.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| React Bootstrap Navbar + existing route-based nav links | Wrap `<span onClick>` nav items in `<Nav.Link as="span">` but forget to close Navbar on item click (mobile menu stays open) | Add `setExpanded(false)` in each nav item onClick, using `expanded` state on `<Navbar>` |
| Bootstrap Modal + iOS keyboard | Modal body clips below keyboard; fixed modal footer is hidden | Set `scrollable={true}` on Modal; use `svh` units for max-height override |
| TanStack Table + Bootstrap `responsive` wrapper | `position: sticky` columns broken by `overflow: auto` container | Hide columns on mobile with `d-none d-md-table-cell` instead of sticky |
| CSS Transform (bracket zoom) + browser passive touch events | `e.preventDefault()` in React synthetic touch handlers ignored | Register imperative `addEventListener(..., { passive: false })` directly on DOM node |
| MatchResultModal doubles title + mobile width | Long pair names overflow modal header | Use `text-truncate` or limit names to 20 chars with ellipsis |

---

## Performance Traps

Patterns that work at small scale but degrade on mobile.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Bracket viewport CSS transform on every touch move | Janky pan on mid-range Android phones | Ensure `will-change: transform` is set; use `transform3d` to force GPU compositing | Phones with less than 3GB RAM, or brackets with 32+ matches |
| SWR refetch on bracket match mutation + global mutate for consolation | Double re-render of full bracket on mobile after result submit | Already using SWR key-based invalidation — ensure `refreshKey` doesn't trigger on every render | Not a problem now; watch if bracket renders become more complex |
| Bootstrap 5 CSS loaded twice (via CDN + npm import) | Double CSS parsing, flash of unstyled content | Import Bootstrap CSS once via npm in Vite; never add CDN link | Day 1 of adding Bootstrap CDN for JS bundle |
| `flexRender` on every TanStack Table cell re-render | Slow rankings table scroll on mobile with 100+ rows | Memoize columns array with `useMemo` (already done in RankingsTable) | 200+ row tables on low-end Android |

---

## UX Pitfalls

Common user experience mistakes specific to this domain's mobile retrofit.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Hidden nav on mobile: player doesn't know where Registrations link went | Player cannot find their tournaments on phone | Ensure all role-specific links are visible in collapsed mobile menu; test each role's nav on phone |
| Bracket horizontal scroll without scroll indicator | Player doesn't know they can scroll to see later rounds | Keep `.scroll-indicator` element; ensure it's visible on mobile (currently fade-on-hover, which doesn't work on touch) |
| Zoom controls too small on mobile | Player cannot tap +/- accurately | Minimum 44x44px touch targets for BracketControls buttons |
| "Drag to pan" hint text — meaningless on touch devices | Player doesn't know how to navigate bracket | Change hint to "Swipe to pan" on touch devices (detect via `navigator.maxTouchPoints > 0`) |
| ExpandableSection accordion — small chevron tap target | Sections won't expand on phone without precise tap | Ensure full header row is the tap target, not just the icon |
| Score form inside modal: number inputs too close together | Player accidentally taps adjacent set's score | Increase gap between set rows in `SetsScoreForm` on mobile; min 8px gap between inputs |

---

## "Looks Done But Isn't" Checklist

Things that appear complete in DevTools but are missing on real devices.

- [ ] **NavBar mobile menu:** Opens in DevTools emulation — verify on real iOS Safari (needs React Bootstrap Navbar component, not data-bs-* attributes)
- [ ] **Bracket pan:** Works in DevTools emulation — verify on real Android/iOS (passive event listener issue will not show in DevTools)
- [ ] **Score entry keyboard:** `type="number"` shows numeric input in DevTools — verify on real iPhone (decimal-first keypad is real device only)
- [ ] **Modal footer visible with keyboard open:** Modal appears full-screen in DevTools — verify on iPhone with iOS keyboard covering bottom 40% of screen
- [ ] **Tournament list page:** Cards look fine in DevTools — verify on 375px iPhone SE width (narrowest common phone)
- [ ] **Bracket first round height with BYE toggle off:** Correct in DevTools — verify actual scroll distance on 16-player bracket with 8 BYEs on phone
- [ ] **Manual draw dropdowns:** Selectable in DevTools — verify 33-item dropdown is usable with fat fingers on Android
- [ ] **Doubles player names in modal:** Display correctly at 600px — verify "Šimkovič / Novotný" doesn't overflow at 375px modal width

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Bootstrap JS bundle added for hamburger, causes conflicts with React Bootstrap | MEDIUM | Remove BS JS bundle import; replace `<nav>` with React Bootstrap `<Navbar>` (2-4 hours) |
| touch-action / passive event not working on real device | LOW | Switch from React synthetic events to imperative addEventListener with passive: false (1-2 hours) |
| iOS keyboard clips modal footer | LOW | Add `scrollable={true}` to Modal + CSS height override (30 minutes per modal) |
| Horizontal overflow on page from fixed-width components | MEDIUM | Audit all `min-width` and `width` pixel values in component CSS; add `max-width: 100%` overrides (2-4 hours) |
| Score form unusable on mobile with number inputs | LOW | Change `type="number"` to `type="text" inputMode="numeric"` app-wide (30 minutes) |
| Manual draw editor completely unusable on mobile | HIGH | Requires new mobile-specific UX for draw assignment; not fixable with CSS alone (2-4 days) |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Bootstrap hamburger menu broken (no JS) | Phase 1: Navigation fix | Open nav on real iPhone, all links accessible and menu closes after navigation |
| Passive touch events: pan doesn't work | Phase 2: Bracket mobile UX | Pan bracket on real Android/iOS without page scroll |
| Pinch-zoom conflicts with browser zoom | Phase 2: Bracket mobile UX | 2-finger gestures don't zoom page; +/- buttons work on mobile |
| BYE rows waste vertical space on mobile | Phase 2: Bracket mobile UX | 16-player bracket with BYE toggle off fits within 2 screen heights on iPhone |
| iOS keyboard clips modal footer | Phase 3: Modal mobile UX | Submit button visible on iPhone while keyboard is open |
| Modal large size + doubles names overflow | Phase 3: Modal mobile UX | Match result modal renders correctly at 375px |
| SetsScoreForm number input keyboard | Phase 3: Modal mobile UX | Tapping score field shows integer-first numpad on iPhone |
| Desktop-first CSS specificity | Phase 4: App-wide responsive pass | No horizontal page scroll on any page at 375px |
| TanStack Table sticky + overflow conflict | Phase 4: App-wide responsive pass | Rankings table readable on 375px, rank column always visible |
| Manual draw on mobile | Phase 5: Organizer mobile support | Organizer can complete full draw assignment on phone in < 10 minutes |
| Score inputs touch targets too small | Phase 3: Modal mobile UX | All interactive elements ≥ 44x44px (verify with DevTools accessibility audit) |

---

## Sources

- BATL codebase audit: `frontend/src/components/NavBar.jsx`, `KnockoutBracket.css`, `useBracketNavigation.js`, `MatchResultModal.jsx`, `SetsScoreForm.jsx`, `RankingsTable.jsx` (2026-03-06)
- Bootstrap 5 documentation: Navbar collapse requires Bootstrap JS bundle; `data-bs-*` attributes are JS directives https://getbootstrap.com/docs/5.3/components/navbar/
- React Bootstrap 2.x documentation: Navbar component with React state; no Bootstrap JS dependency https://react-bootstrap.github.io/docs/components/navbar
- MDN Web Docs: `touch-action` CSS property; passive event listeners https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- React docs: Passive event listeners and `preventDefault` in synthetic events https://react.dev/reference/react-dom/components/common#handling-touch-events
- Apple Human Interface Guidelines: minimum touch target 44x44pt https://developer.apple.com/design/human-interface-guidelines/layout
- WCAG 2.5.5 Target Size https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- iOS Safari known issues: `100vh` includes browser chrome, modal scroll behavior https://developer.apple.com/forums/thread/119724
- MDN: `svh` (small viewport height) unit, supported in Safari 15.4+ https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage_lengths

---
*Pitfalls research for: mobile-first responsive retrofit of existing Bootstrap React app*
*Researched: 2026-03-06*
