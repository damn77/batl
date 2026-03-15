---
phase: quick-9
plan: 1
subsystem: backend/session, frontend/apiClient
tags: [bug-fix, session, auth, windows]
one_liner: "Fixed first-login failure by removing retries:0 from session-file-store and cleaning stale session files on server start; guarded false session-expired event on initial /auth/session 401"
key-files:
  modified:
    - backend/src/index.js
    - frontend/src/services/apiClient.js
decisions:
  - "Removed retries:0 from SessionFileStore to restore default 5-retry backoff, which handles Windows EBUSY/EPERM on concurrent file access"
  - "Added stale session cleanup in startServer() before app.listen() to prevent destroy-fails-on-stale-file scenario entirely"
  - "Guarded session-expired dispatch in apiClient with URL check: GET /auth/session 401 is not an expiration — it is expected on every server restart"
metrics:
  duration: ~5min
  completed: 2026-03-15
  tasks: 2
  files: 2
---

# Quick Task 9: Fix Login Always Failing on First Attempt

## Summary

Fixed a Windows-specific bug where the first login after server start always returned 500. The root cause was `retries: 0` in the `SessionFileStore` config combined with stale session files: Passport's `req.session.regenerate()` calls `store.destroy(oldSessionId)` on the stale file, which fails immediately on Windows EBUSY/EPERM with no retries. The second login succeeded because the stale file was already gone.

A secondary issue caused a false `session-expired` event to fire on every page load: `apiClient` was dispatching `session-expired` on ANY 401, including the expected 401 from the initial GET /auth/session check.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix session-file-store config and add startup cleanup | c00ac81 | backend/src/index.js |
| 2 | Guard session-expired event against initial checkSession 401 | 665c2d0 | frontend/src/services/apiClient.js |

## Changes Made

### Task 1 — backend/src/index.js

1. Removed `retries: 0` from the `SessionFileStore` constructor. Default is 5 retries with exponential backoff, which handles transient Windows file locking without failing immediately.

2. Added stale session file cleanup in `startServer()` after `prisma.$connect()` and before `initializePointTableCache()`. Uses `readdir`/`unlink` from `node:fs/promises` (already available in Node 20+). Silently ignores `ENOENT` (sessions directory does not exist yet). Logs count of cleared files when any are present.

3. Added `import { readdir, unlink } from 'node:fs/promises'` and `import { join } from 'node:path'` to support the cleanup.

### Task 2 — frontend/src/services/apiClient.js

Modified the 401 handler in the response interceptor to skip `session-expired` dispatch when the failing request is `GET /auth/session`. This endpoint always returns 401 on first load when no session exists — that is correct behavior, not a session expiration. The `AuthContext.checkAuthStatus()` already handles this 401 via its own catch block.

`session-expired` still fires for all other 401 responses, preserving the session expiration detection behavior for authenticated users.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `backend/src/index.js` modified — `retries: 0` removed, cleanup code added
- [x] `frontend/src/services/apiClient.js` modified — `isSessionCheck` guard added
- [x] Task 1 commit: c00ac81 exists
- [x] Task 2 commit: 665c2d0 exists
- [x] Backend module loads without syntax errors
- [x] Frontend builds successfully (`vite build` exits 0)

## Self-Check: PASSED
