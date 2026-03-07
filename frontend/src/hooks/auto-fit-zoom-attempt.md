# Auto-Fit Zoom Attempt (Reverted)

## Goal
On mobile, the default 100% zoom shows only ~1 match box width. The goal was to auto-calculate an initial zoom scale so at least 2 rounds are visible on load.

## Approach
- Added `calcAutoFitScale(vpWidth, roundCount, minScale)` function that calculates `vpWidth / (2 * ROUND_WIDTH + ROUND_GAP)` capped at 1.0
- On mount, a `useEffect` measures the viewport width and sets the initial scale to the auto-fit value
- The reset button was updated to return to the auto-fit scale instead of hardcoded 1.0
- `initialScale` prop default changed from `1.0` to `undefined` so the auto-fit logic activates when no explicit scale is provided

## What Broke
- Broke the mobile version (specifics TBD — likely a timing/render issue with the effect measuring viewport width before layout is complete, or the calculated scale interacting badly with the content width logic)

## Files Changed
- `frontend/src/hooks/useBracketNavigation.js` — added constants, `calcAutoFitScale`, auto-fit effect, updated reset
- `frontend/src/components/KnockoutBracket.jsx` — changed `initialScale` default from `1.0` to `undefined`

## Key Values
- `ROUND_WIDTH = 253` (measured rendered match box width)
- `ROUND_GAP = 48` (3rem gap between rounds)
- `MIN_VISIBLE_ROUNDS = 2`
- Example: 375px mobile → `375 / 554 ≈ 0.68x`
