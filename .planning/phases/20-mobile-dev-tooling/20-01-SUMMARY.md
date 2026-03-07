---
phase: 20-mobile-dev-tooling
plan: "01"
subsystem: infra
tags:
  - vite
  - mobile
  - dev-tooling
  - qrcode
  - viewport

# Dependency graph
requires: []
provides:
  - mobile-dev-qrcode
  - viewport-fit-cover
  - proxy-first-api-routing-for-mobile
affects:
  - 21-nav-bar
  - 22-layout
  - 23-bracket
  - 24-organizer
  - 25-mobile-polish

tech-stack:
  added:
    - vite-plugin-qrcode (devDependency)
  patterns:
    - "--host CLI flag drives QR activation, not server.host config"
    - "VITE_API_URL commented out so Vite proxy handles mobile API routing"
    - "viewport-fit=cover added permanently (dev + production)"

key-files:
  created: []
  modified:
    - frontend/vite.config.js
    - frontend/package.json
    - frontend/index.html
    - frontend/.env.development

key-decisions:
  - "QR plugin added to vite config unconditionally; --host flag drives activation via CLI, not config-level host property"
  - "VITE_API_URL commented out in .env.development so Vite proxy handles /api requests — mobile devices must not resolve localhost themselves"
  - "safe-area-inset CSS env() variables deferred to Phase 25 — only meta tag updated here"

patterns-established:
  - "Mobile dev: run dev:mobile to get QR code; regular dev unchanged (localhost only)"
  - "API routing: proxy-first pattern for local dev — never hardcode VITE_API_URL pointing at localhost"

requirements-completed: [TOOL-01, TOOL-02]

# Metrics
duration: ~30min
completed: 2026-03-06
---

# Phase 20 Plan 01: Mobile Dev Tooling Summary

**vite-plugin-qrcode with dev:mobile npm script, proxy-first API routing fix, and viewport-fit=cover — developer scans QR code to test on real device in under 30 seconds**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-06T17:26:44Z
- **Completed:** 2026-03-06
- **Tasks:** 3 (2 auto + 1 human-verify, approved by user)
- **Files modified:** 4

## Accomplishments
- `npm run dev:mobile` prints a QR code in the terminal and binds Vite to all network interfaces
- Scanning the QR code on a phone opens the app; API calls work through the Vite proxy
- `npm run dev` continues to work exactly as before (localhost only, no QR)
- viewport meta tag updated with viewport-fit=cover for future Phase 25 safe-area CSS work

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vite-plugin-qrcode, add dev:mobile script, update vite config** - `938893a` (feat)
2. **Task 2: Add viewport-fit=cover to index.html** - `70c77c3` (feat)
3. **Task 3 fix: Comment out VITE_API_URL so mobile proxy works** - `c9eefd9` (fix)

**Plan metadata (pre-verification docs):** `afbf895` (docs: complete mobile dev tooling plan — awaiting Task 3 verification)

## Files Created/Modified
- `frontend/vite.config.js` - Added vite-plugin-qrcode import and plugin
- `frontend/package.json` - Added dev:mobile script (`vite --host`), installed vite-plugin-qrcode devDep
- `frontend/index.html` - Updated viewport meta tag to include viewport-fit=cover
- `frontend/.env.development` - Commented out VITE_API_URL so Vite proxy handles mobile API routing

## Decisions Made
1. **QR plugin in config, not conditionally** — `qrcode()` plugin added unconditionally; the plugin only outputs a QR code when a network URL is available (i.e., when `--host` is used). No `server.host` set in config — that is the CLI flag's job.
2. **safe-area-inset CSS deferred** — Only the meta tag was updated. Safe-area CSS `env()` variables are Phase 25 work.
3. **VITE_API_URL must be absent for local dev** — When VITE_API_URL is set to `http://localhost:3000`, axios bypasses the Vite proxy entirely. Mobile devices then try to call localhost on their own loopback interface (the phone itself), which fails. Commenting it out restores proxy-first routing through Vite.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Commented out VITE_API_URL in .env.development**
- **Found during:** Task 3 verification (mobile device test)
- **Issue:** VITE_API_URL was set to `http://localhost:3000` in .env.development. On mobile devices, `localhost` resolves to the phone itself, not the dev machine. API calls bypassed the Vite proxy and failed with network errors.
- **Fix:** Commented out the VITE_API_URL line so the Vite proxy (`/api` -> `http://localhost:3000`) handles all API routing.
- **Files modified:** `frontend/.env.development`
- **Verification:** User confirmed API calls work from mobile device after fix
- **Committed in:** `c9eefd9`

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix was necessary for mobile API calls to work. No scope creep.

## Issues Encountered
- VITE_API_URL in .env.development caused mobile devices to call `localhost:3000` (their own loopback) instead of routing through the Vite proxy. Commented out to restore proxy-first routing.

## User Setup Required
None — no external service configuration required. The dev:mobile script works on any machine with a network interface. Phone must be on the same Wi-Fi network as the dev machine.

## Next Phase Readiness
- Mobile dev tooling is fully operational — developers can test on real devices by scanning a QR code
- Phase 21 (NavBar fix) can proceed immediately
- viewport-fit=cover is in place for Phase 25 safe-area-inset CSS work

## Self-Check: PASSED

Files:
- frontend/vite.config.js: contains `qrcode` — VERIFIED
- frontend/package.json: contains `dev:mobile` — VERIFIED
- frontend/index.html: contains `viewport-fit=cover` — VERIFIED
- frontend/.env.development: VITE_API_URL commented out — VERIFIED

Commits:
- 938893a: feat(20-01): install vite-plugin-qrcode and add dev:mobile script — VERIFIED
- 70c77c3: feat(20-01): add viewport-fit=cover to viewport meta tag — VERIFIED
- c9eefd9: fix(20-01): comment out VITE_API_URL so mobile proxy works — VERIFIED

---
*Phase: 20-mobile-dev-tooling*
*Completed: 2026-03-06*
