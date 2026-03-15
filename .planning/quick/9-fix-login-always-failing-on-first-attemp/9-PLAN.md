---
phase: quick-9
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/index.js
  - frontend/src/services/apiClient.js
autonomous: true
requirements: [FIX-LOGIN-FIRST-ATTEMPT]

must_haves:
  truths:
    - "First login attempt after server start succeeds"
    - "Session is properly created and persisted on login"
    - "Stale session files from previous runs do not cause errors"
  artifacts:
    - path: "backend/src/index.js"
      provides: "Session store fix and stale session cleanup"
    - path: "frontend/src/services/apiClient.js"
      provides: "Guard against session-expired event on initial checkSession 401"
  key_links:
    - from: "backend/src/index.js"
      to: "session-file-store"
      via: "SessionFileStore config"
      pattern: "new SessionFileStore"
---

<objective>
Fix login always failing on first attempt after server start.

Purpose: After starting the server, the first login attempt consistently returns an error. The second attempt with the same credentials always works. This is caused by session-file-store misconfiguration and stale session files from previous server runs.

Output: Reliable login on first attempt after server start.
</objective>

<context>
@.planning/STATE.md
@backend/src/index.js
@backend/src/api/authController.js
@backend/src/middleware/auth.js
@frontend/src/services/apiClient.js
</context>

<diagnostics>
## Root Cause Analysis

**Primary cause: session-file-store `retries: 0` + stale session files on Windows**

The login flow in Passport 0.7.0 calls `req.session.regenerate()` during `req.logIn()`. This calls `store.destroy(sessionID)` followed by `store.generate()`. On the first request after server start:

1. Browser sends stale `connect.sid` cookie from previous server session
2. Session middleware loads the stale session file via `store.get()`
3. Passport authenticates correctly via `passport.authenticate('local')`
4. `req.logIn()` calls `req.session.regenerate()` which calls `store.destroy(oldSessionId)`
5. On Windows, `fs.remove()` on the stale file can fail with EBUSY/EPERM if the file was just read
6. With `retries: 0`, the destroy fails immediately (default is 5 retries with 50-100ms backoff)
7. `express-session`'s `Store.prototype.regenerate` passes the destroy error to the callback
8. Passport propagates the error to `req.logIn(user, (err) => { if (err) return next(err); })`
9. Error handler returns 500 to the client

On the second attempt, the stale session file is already gone (destroyed on first attempt despite the error), so destroy is a no-op and login succeeds.

**Secondary concern: apiClient dispatches `session-expired` on initial checkSession 401**

When the app loads, `AuthContext.checkAuthStatus()` calls GET /auth/session. If no session exists (always true after server restart), this returns 401. The apiClient interceptor dispatches `session-expired` on ANY 401, which is incorrect for the initial session check -- it should only fire when a previously valid session expires.
</diagnostics>

<tasks>

<task type="auto">
  <name>Task 1: Fix session-file-store config and add startup cleanup</name>
  <files>backend/src/index.js</files>
  <action>
Make two changes to `backend/src/index.js`:

1. **Remove `retries: 0` from SessionFileStore config** (line ~109). The default is 5 retries with exponential backoff (50-100ms), which handles transient Windows file locking. With `retries: 0`, any momentary EBUSY/EPERM from concurrent file access fails immediately. Simply remove the `retries: 0` line -- the default of 5 is correct.

2. **Add stale session cleanup in `startServer()`** before `app.listen()`. After `prisma.$connect()` and before `initializePointTableCache()`, add a session cleanup step that removes all files in the `./sessions` directory. This ensures no stale session files from previous server runs can interfere. Use `fs/promises` (already available in Node 20+):

```javascript
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

// Inside startServer(), after prisma.$connect():
// Clean stale session files from previous server runs
const sessionsDir = './sessions';
try {
  const files = await readdir(sessionsDir);
  await Promise.all(files.map(f => unlink(join(sessionsDir, f))));
  if (files.length > 0) {
    console.log(`Cleared ${files.length} stale session file(s)`);
  }
} catch (err) {
  if (err.code !== 'ENOENT') {
    console.warn('Warning: Could not clean session directory:', err.message);
  }
}
```

This ensures a clean slate on every server start, preventing the destroy-fails-on-stale-file scenario entirely.
  </action>
  <verify>
    <automated>cd backend && node -e "import('./src/index.js').then(() => console.log('Module loads OK'))" 2>&1 | head -5</automated>
  </verify>
  <done>
    - `retries: 0` removed from SessionFileStore constructor options
    - `startServer()` cleans stale session files before listening
    - Server starts without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Guard session-expired event against initial checkSession 401</name>
  <files>frontend/src/services/apiClient.js</files>
  <action>
In `frontend/src/services/apiClient.js`, modify the 401 handler in the response interceptor (lines 74-78) to NOT dispatch `session-expired` for the initial `/auth/session` check. The `session-expired` event should only fire when a previously authenticated session expires, not on the initial unauthenticated session check.

Change the 401 block from:
```javascript
if (status === 401) {
  window.dispatchEvent(new CustomEvent('session-expired'));
}
```

To:
```javascript
if (status === 401) {
  // Only dispatch session-expired for non-auth-check requests.
  // The initial GET /auth/session on app load always returns 401
  // when no session exists -- that is not a session expiration.
  const isSessionCheck = error.config?.url?.endsWith('/auth/session') && error.config?.method === 'get';
  if (!isSessionCheck) {
    window.dispatchEvent(new CustomEvent('session-expired'));
  }
}
```

This prevents the false `session-expired` event on initial page load. The AuthContext already handles the 401 from checkSession correctly via its own catch block. The `session-expired` event should only fire when an authenticated API call (not the session check itself) returns 401, indicating the session has actually expired.
  </action>
  <verify>
    <automated>cd frontend && npx vite build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - `session-expired` event no longer fires on initial GET /auth/session 401
    - `session-expired` still fires for all other 401 responses (actual session expirations)
    - Frontend builds without errors
  </done>
</task>

</tasks>

<verification>
1. Start the backend server: `cd backend && npm run dev`
2. Open the frontend in a browser (fresh tab or after clearing cookies)
3. Login with valid credentials -- should succeed on first attempt
4. Stop the server, restart it
5. Login again -- should succeed on first attempt (stale sessions cleaned)
6. Verify that session expiration still works: wait 30+ minutes or manually delete the session file, then make an API call -- should redirect to login
</verification>

<success_criteria>
- First login attempt after server start succeeds consistently
- No 500 errors from session regeneration on Windows
- Stale session files are cleaned on every server start
- Session expiration detection still works for authenticated users
</success_criteria>

<output>
After completion, create `.planning/quick/9-fix-login-always-failing-on-first-attemp/9-SUMMARY.md`
</output>
