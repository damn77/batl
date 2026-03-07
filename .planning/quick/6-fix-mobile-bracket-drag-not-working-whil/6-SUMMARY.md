---
phase: quick-6
plan: 01
subsystem: frontend-bracket
tags: [bugfix, mobile, touch, bracket-navigation]
dependency_graph:
  requires: []
  provides: [mobile-bracket-touch-drag]
  affects: [KnockoutBracket, useBracketNavigation]
tech_stack:
  added: []
  patterns: [callback-ref]
key_files:
  created: []
  modified:
    - frontend/src/hooks/useBracketNavigation.js
    - frontend/src/components/KnockoutBracket.jsx
decisions:
  - Callback ref pattern chosen over MutationObserver for re-attaching touch listeners when viewport mounts
metrics:
  duration: 91s
  completed: "2026-03-07T09:03:33Z"
---

# Quick Task 6: Fix Mobile Bracket Drag Not Working

Callback ref pattern replaces static useRef so touch listeners attach after conditionally-rendered viewport div mounts.

## What Changed

### useBracketNavigation.js

- Removed `containerRef` from hook options (no longer needed)
- Added `viewportNode` state and `viewportNodeRef` stable ref
- Added `setViewportRef` callback ref function that sets both state and ref
- Replaced all `containerRef?.current` references with `viewportNodeRef.current`
- Touch useEffect now depends on `viewportNode` state instead of static `containerRef` object
- When `viewportNode` changes from `null` to a DOM element, touch listeners are attached
- Exported `setViewportRef` in the returned object

### KnockoutBracket.jsx

- Removed `viewportRef = useRef(null)` declaration
- Removed `containerRef: viewportRef` from `useBracketNavigation()` call
- Changed viewport div `ref={viewportRef}` to `ref={navigation.setViewportRef}`

## Root Cause

The viewport div is conditionally rendered (only when `matches.length > 0`). The touch listener `useEffect` ran on initial mount when the ref was still `null`. Since `useRef` object identity never changes, the effect never re-ran when the viewport div appeared in the DOM. The callback ref pattern triggers a state change when the div mounts, which re-triggers the effect.

## Preserved Behavior

- Desktop mouse drag handlers remain as React event props (onMouseDown/Move/Up) on the viewport div
- Viewport width calculation logic (naturalWidth, contentWidth, containerStyle.width) unchanged
- Zoom button and reset functionality unchanged

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 4b42a7e | fix(quick-6): fix mobile touch drag not working on bracket viewport |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Build succeeds with no errors

## Self-Check: PASSED
