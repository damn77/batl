---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/hooks/useBracketNavigation.js
  - frontend/src/components/KnockoutBracket.jsx
autonomous: true
requirements: [QUICK-6]
must_haves:
  truths:
    - "Touch drag works on mobile to pan the bracket viewport"
    - "Desktop mouse drag continues to work identically"
    - "Zoom buttons and reset still function correctly"
    - "Viewport width calculation logic is unchanged"
  artifacts:
    - path: "frontend/src/hooks/useBracketNavigation.js"
      provides: "Callback ref pattern that triggers touch listener re-attachment when viewport mounts"
    - path: "frontend/src/components/KnockoutBracket.jsx"
      provides: "Uses callback ref from hook instead of plain useRef for viewport"
  key_links:
    - from: "frontend/src/components/KnockoutBracket.jsx"
      to: "frontend/src/hooks/useBracketNavigation.js"
      via: "setViewportRef callback ref replaces viewportRef useRef"
      pattern: "setViewportRef"
---

<objective>
Fix mobile touch drag on the knockout bracket viewport. Touch listeners are never attached because the useEffect that registers them runs before the conditionally-rendered viewport div mounts, and the ref object identity never changes to trigger a re-run.

Purpose: Restore mobile bracket panning so users on phones/tablets can drag the bracket.
Output: Two modified files with callback ref pattern that re-attaches touch listeners when the viewport DOM node becomes available.
</objective>

<execution_context>
@C:/Users/erich/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/erich/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/hooks/useBracketNavigation.js
@frontend/src/components/KnockoutBracket.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add callback ref pattern to useBracketNavigation and wire it in KnockoutBracket</name>
  <files>frontend/src/hooks/useBracketNavigation.js, frontend/src/components/KnockoutBracket.jsx</files>
  <action>
**In useBracketNavigation.js:**

1. Add a `viewportNode` state variable: `const [viewportNode, setViewportNode] = useState(null);`

2. Create a callback ref function that sets both the state AND a stable ref for synchronous reads:
```js
const viewportNodeRef = useRef(null);
const setViewportRef = useCallback((node) => {
  viewportNodeRef.current = node;
  setViewportNode(node);
}, []);
```

3. Replace ALL usages of `containerRef?.current` throughout the hook with `viewportNodeRef.current`. This includes:
   - `clampTranslate` (line 54): `const el = viewportNodeRef.current;`
   - `zoomToCenter` (line 94): `const el = viewportNodeRef.current;`
   - `centerOnElement` (line 127-128): use `viewportNodeRef.current`
   - Width calculation (line 231): `const el = viewportNodeRef.current;`

4. Update the touch useEffect (lines 168-211) dependency array from `[containerRef, clampScale]` to `[viewportNode, clampScale]`. Change `const el = containerRef?.current;` at line 169 to `const el = viewportNode;`. This is the KEY fix — when `viewportNode` changes from null to the DOM element, this effect re-runs and attaches touch listeners.

5. Remove `containerRef` from the hook's destructured options parameter entirely. The hook no longer needs it.

6. Add `setViewportRef` to the returned object.

**CRITICAL: Do NOT change lines 227-242** (the `naturalWidth`, `contentWidth`, `containerStyle.width` calculation block). Only change the `el` source from `containerRef?.current` to `viewportNodeRef.current` on what is currently line 231.

**In KnockoutBracket.jsx:**

1. Remove `const viewportRef = useRef(null);` (line 128).

2. Update the `useBracketNavigation` call (lines 131-135) to remove `containerRef: viewportRef`:
```js
const navigation = useBracketNavigation({
  initialScale,
  roundCount: rounds?.length || 0
});
```

3. Destructure `setViewportRef` from navigation (or access as `navigation.setViewportRef`).

4. Replace `ref={viewportRef}` on the viewport div (line 307) with `ref={navigation.setViewportRef}`.

No other changes to KnockoutBracket.jsx.
  </action>
  <verify>
    <automated>cd D:/Workspace/BATL && npx vite build --mode development 2>&1 | tail -5</automated>
  </verify>
  <done>
    - useBracketNavigation exports `setViewportRef` callback ref
    - Touch useEffect depends on `viewportNode` state, not a static ref object
    - KnockoutBracket uses `navigation.setViewportRef` as the viewport div's ref
    - Width calculation logic (naturalWidth, contentWidth, containerStyle.width) is unchanged
    - Mouse drag handlers (onMouseDown/Move/Up) remain as React event props on the viewport div
    - Build succeeds with no errors
  </done>
</task>

</tasks>

<verification>
1. Build succeeds: `cd frontend && npx vite build`
2. Desktop: Mouse drag on bracket viewport still pans correctly
3. Mobile: Touch drag on bracket viewport now pans (touch listeners attach after conditional render)
4. Zoom buttons: +/- buttons and reset still work
5. Viewport does not shrink when dragging or zooming
</verification>

<success_criteria>
- Mobile touch drag works on the bracket viewport (touch listeners attached after matches load)
- Desktop mouse drag behavior unchanged
- Zoom/reset controls unchanged
- Viewport width calculation unchanged (no regression on the shrinking bug)
- Clean build with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/6-fix-mobile-bracket-drag-not-working-whil/6-SUMMARY.md`
</output>
