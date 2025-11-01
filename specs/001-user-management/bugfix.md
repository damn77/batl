# Bugfix Documentation: User Management System

**Feature**: 001-user-management
**Last Updated**: 2025-11-01
**Status**: Active Development

This document tracks all bugs discovered during implementation and their resolutions for the User Management System feature.

---

## Table of Contents

1. [Phase 5 Issues](#phase-5-issues)
   - Issue #1: SQLite Prisma Query Mode Compatibility
   - Issue #4: Missing Unique Constraint on Player Profile Email
2. [Phase 4/5 Issues](#phase-45-issues)
   - Issue #2: Duplicate Email Validation Error Handling
3. [Database Management Issues](#database-management-issues)
   - Issue #3: Stale Session References After Database Reset
4. [Phase 7.5 Issues (Modal-Based Login UX)](#phase-75-issues-modal-based-login-ux)
   - Issue #5: CORS Configuration Port Mismatch
   - Issue #6: Duplicate Session API Calls
   - Issue #7: Modal Dependency Loop
   - Issue #8: Logout Race Condition with ProtectedRoute

---

## Phase 5 Issues

### Issue #1: SQLite Prisma Query Mode Compatibility

**Discovered**: 2025-10-31 during Phase 5 (User Story 3 - Player Profile Creation) implementation
**Severity**: High - Application crash
**Impact**: Duplicate detection feature completely non-functional

**Symptoms**:
- Prisma query error when checking for duplicate player profiles
- Error message: `Invalid 'prisma.playerProfile.findMany()' invocation: Unknown argument 'mode'. Did you mean 'lte'?`
- Error occurred in `findDuplicates()` and `findMatchingProfile()` functions

**Root Cause**:
- Used Prisma's `mode: 'insensitive'` option for case-insensitive string matching
- This option is only supported by PostgreSQL and MongoDB, **NOT SQLite**
- SQLite doesn't support case-insensitive mode through Prisma's API

**Affected Files**:
- `backend/src/services/playerService.js` - Lines 147, 160, 249, 254

**Solution**:
Removed all instances of `mode: 'insensitive'` from Prisma queries:

```javascript
// ❌ BEFORE (caused error):
where: {
  name: {
    equals: name.trim(),
    mode: 'insensitive'  // Not supported in SQLite
  }
}

// ✅ AFTER (works with SQLite):
where: {
  name: {
    equals: name.trim()  // SQLite LIKE is case-insensitive by default
  }
}
```

**Files Modified**:
- `backend/src/services/playerService.js`:
  - `findDuplicates()` function
  - `findMatchingProfile()` function

---

### Issue #4: Missing Unique Constraint on Player Profile Email

**Discovered**: 2025-10-31 during Phase 5 (Player Profile Creation) testing
**Severity**: High - Data integrity violation
**Impact**: Multiple player profiles can be created with the same email address

**Symptoms**:
- System allows creating multiple player profiles with identical email addresses
- Example: Two different "John Smith" profiles both with `test@test.com`
- No error or warning when creating duplicate email

**Root Cause**:
- `PlayerProfile.email` field in Prisma schema lacked `@unique` constraint
- Email was marked as optional (`String?`) but not unique

**Solution**:
Added `@unique` constraint to email field:

```prisma
// ❌ BEFORE (allowed duplicates):
model PlayerProfile {
  email String?  // No unique constraint
}

// ✅ AFTER (enforces uniqueness):
model PlayerProfile {
  email String? @unique  // Email must be unique if provided
}
```

**Note**: SQLite allows multiple `NULL` values with `@unique` constraint, which is perfect for our use case.

**Files Modified**:
- `backend/prisma/schema.prisma`: Line 82 (added `@unique` to email)

---

## Phase 4/5 Issues

### Issue #2: Duplicate Email Validation Error Handling

**Discovered**: 2025-10-31 during user registration testing
**Severity**: Medium - Poor user experience
**Impact**: Users receive generic error messages instead of field-specific validation errors

**Symptoms**:
- Creating user with duplicate email showed generic "Failed to create user" error
- Error appeared as page-level alert instead of inline field validation
- Error details only shown in development mode, not production
- Frontend didn't highlight the email field as invalid

**Root Cause**:
1. Backend: Prisma unique constraint violations (P2002) weren't explicitly handled
2. Backend: Error details only included in development mode
3. Frontend: Error handling didn't check for CONFLICT status code
4. Frontend: Only checked `errorDetails.field` but not error code or message content

**Solution**:

**Backend Enhancement** (`errorHandler.js`):
```javascript
// Added Prisma P2002 error detection and translation
if (err.code === 'P2002' && err.meta?.target) {
  status = 409;
  code = 'CONFLICT';
  const field = Array.isArray(err.meta.target) ? err.meta.target[0] : err.meta.target;

  if (field === 'email') {
    message = 'Email already registered';
    details = { field: 'email' };
  } else {
    message = `A record with this ${field} already exists`;
    details = { field };
  }
}

// Always include field-level details (removed dev-only restriction)
if (details) {
  errorResponse.error.details = details;
}
```

**Frontend Enhancement** (`CreateUserModal.jsx`):
```javascript
// Handle email-specific errors more robustly
const errorData = err.response?.data?.error;
const errorMessage = errorData?.message || 'Failed to create user';
const errorCode = errorData?.code;
const errorDetails = errorData?.details;

if (errorDetails?.field === 'email' ||
    (errorCode === 'CONFLICT' && errorMessage.toLowerCase().includes('email'))) {
  setValidationErrors({ email: errorMessage });
} else {
  setError(errorMessage);
}
```

**Files Modified**:
- `backend/src/middleware/errorHandler.js`: Lines 9-64
- `frontend/src/components/CreateUserModal.jsx`: Lines 90-106

---

## Database Management Issues

### Issue #3: Stale Session References After Database Reset

**Discovered**: 2025-10-31 during database reset testing
**Severity**: Medium - Prevents login after database reset
**Impact**: Users cannot login after running `prisma migrate reset` until sessions are manually cleared

**Symptoms**:
- Login attempt fails with error: `User not found` (500 Internal Server Error)
- Error occurs in `deserializeUser` function
- User credentials are correct and exist in database
- Error happens even on first login attempt after database reset

**Root Cause**:
1. File-based sessions stored in `backend/sessions/` directory
2. `npx prisma migrate reset` only deletes database, **not session files**
3. Existing session files contain user IDs from deleted database
4. Express tries to deserialize existing session before allowing new login
5. Original code threw error when user ID not found, blocking login

**Solution**:

**1. Improved Error Handling** (`auth.js`):
```javascript
// ❌ BEFORE (threw error):
if (!user) {
  return done(new Error('User not found'));  // Blocks login!
}

// ✅ AFTER (gracefully handles):
if (!user) {
  // User no longer exists (deleted or database reset)
  // Return false to clear invalid session instead of throwing error
  console.warn(`Session references non-existent user ID: ${id}`);
  return done(null, false);  // Clears session, allows new login
}
```

**2. Database Reset Script** (`package.json`):
```json
{
  "scripts": {
    "db:reset": "npm run db:clear-sessions && prisma migrate reset",
    "db:clear-sessions": "node -e \"const fs = require('fs'); const path = require('path'); const dir = './sessions'; if (fs.existsSync(dir)) { fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f))); console.log('Sessions cleared'); } else { console.log('No sessions directory'); }\""
  }
}
```

**Files Modified**:
- `backend/src/middleware/auth.js`: Lines 51-81
- `backend/package.json`: Added `db:reset` and `db:clear-sessions` scripts

---

## Phase 7.5 Issues (Modal-Based Login UX)

### Issue #5: CORS Configuration Port Mismatch

**Discovered**: 2025-11-01 during Phase 7.5 (Modal-Based Login) testing
**Severity**: High - Complete feature blockage
**Impact**: Frontend cannot communicate with backend API

**Symptoms**:
- CORS error in browser console: `Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource`
- Error message: `CORS header 'Access-Control-Allow-Origin' does not match 'http://localhost:3001'`
- API calls return 401 or fail completely
- Frontend running on port 3003, backend configured for port 3001

**Root Cause**:
- Backend CORS configuration hardcoded to `http://localhost:3001`
- Frontend Vite dev server auto-incremented to port 3003 (because 3001 and 3002 were already in use)
- CORS origin mismatch prevented API requests

**Affected Files**:
- `backend/src/index.js` - Line 26 (CORS configuration)

**Solution**:
Updated CORS configuration to dynamically allow any localhost port in development:

```javascript
// ❌ BEFORE (hardcoded port):
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// ✅ AFTER (dynamic ports in development):
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // In production, only allow specific frontend URL
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigin = process.env.FRONTEND_URL;
      if (origin === allowedOrigin) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }

    // In development, allow any localhost port
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));
```

**Benefits**:
- ✅ Works with any localhost port in development (3001, 3002, 3003, etc.)
- ✅ Maintains security in production (specific origin only)
- ✅ No manual configuration needed when port changes
- ✅ Allows Postman/mobile testing (no origin)

**Files Modified**:
- `backend/src/index.js`: Lines 24-51 (CORS configuration)

---

### Issue #6: Duplicate Session API Calls

**Discovered**: 2025-11-01 during Phase 7.5 testing
**Severity**: Low - Performance inefficiency
**Impact**: Two 401 calls to `/api/auth/session` on every page load for unauthenticated users

**Symptoms**:
- Console shows 2x identical 401 responses: `GET http://localhost:3000/api/auth/session`
- Both return: `{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}`
- Happens on every page load/refresh for unauthenticated users

**Root Cause**:
- React 18 StrictMode in development causes double-mounting of components
- `AuthContext` useEffect runs twice during component mount
- No guard to prevent duplicate session checks
- `hasCheckedAuth` ref needed but was missing

**Affected Files**:
- `frontend/src/utils/AuthContext.jsx` - Lines 16-37 (useEffect for session check)

**Solution**:
Added `useRef` guard to prevent duplicate session checks:

```javascript
// Added ref to track if auth has been checked
const hasCheckedAuth = useRef(false);

useEffect(() => {
  // Prevent duplicate calls in React StrictMode
  if (hasCheckedAuth.current) return;
  hasCheckedAuth.current = true;

  checkAuthStatus();

  // ... rest of useEffect
}, []);
```

**Benefits**:
- ✅ Only one session check API call on page load
- ✅ Eliminates unnecessary 401 responses
- ✅ Improves performance and reduces server load
- ✅ Works correctly in React StrictMode

**Files Modified**:
- `frontend/src/utils/AuthContext.jsx`: Lines 14-20 (added useRef guard)

---

### Issue #7: Modal Dependency Loop

**Discovered**: 2025-11-01 during Phase 7.5 testing
**Severity**: Critical - Modal completely non-functional
**Impact**: Login/Register modals open and immediately close, preventing authentication

**Symptoms**:
- Click "Login" button → Modal opens briefly then immediately closes
- Console logs show: `[ModalContext] openLoginModal called` followed immediately by `[ModalContext] closeModal called`
- Modal never visible long enough for user interaction
- Happens every time modal open is triggered

**Root Cause**:
- `closeModal` function had `activeModal` in its dependency array
- When modal opened, `activeModal` changed from `null` to `'login'`
- This caused `closeModal` function reference to change
- App.jsx useEffect depended on `closeModal` and `user`
- Changing `closeModal` reference triggered App.jsx useEffect
- App.jsx useEffect called `closeModal()` → modal closed immediately

**Dependency Chain**:
```
1. Click Login → openLoginModal()
2. activeModal changes: null → 'login'
3. closeModal function gets new reference (depends on activeModal)
4. App.jsx useEffect fires (depends on closeModal)
5. App.jsx calls closeModal()
6. Modal closes immediately
```

**Affected Files**:
- `frontend/src/utils/ModalContext.jsx` - Lines 29-33 (closeModal function)
- `frontend/src/App.jsx` - Lines 25-30 (useEffect with closeModal dependency)

**Solution**:
Removed `activeModal` from `closeModal` dependencies and used functional setState:

```javascript
// ❌ BEFORE (dependency loop):
const closeModal = useCallback(() => {
  console.log('[ModalContext] closeModal called, current modal:', activeModal);
  setActiveModal(null);
}, [activeModal]); // ← activeModal dependency caused loop

// ✅ AFTER (stable reference):
const closeModal = useCallback(() => {
  setActiveModal((prevModal) => {
    console.log('[ModalContext] closeModal called, current modal:', prevModal);
    return null;
  });
}, []); // No dependencies - function reference never changes
```

**Benefits**:
- ✅ `closeModal` function reference is now stable
- ✅ App.jsx useEffect only fires when `user` actually changes
- ✅ Modals open and stay open until explicitly closed
- ✅ No more dependency loops

**Files Modified**:
- `frontend/src/utils/ModalContext.jsx`: Lines 29-35 (closeModal with functional setState)

---

### Issue #8: Logout Race Condition with ProtectedRoute

**Discovered**: 2025-11-01 during Phase 7.5 testing
**Severity**: High - Breaks logout flow
**Impact**: Login modal opens automatically after logout, confusing users

**Symptoms**:
- User clicks "Logout" from admin dashboard
- Successfully logs out (session destroyed)
- Redirected to `/rankings` page
- Login modal **automatically opens** without user interaction
- Console shows: `[PublicRankingsPage] modalParam from URL: login`

**Root Cause - Race Condition**:
1. User on `/admin/dashboard` (wrapped in `ProtectedRoute`)
2. Clicks Logout → `logout()` sets `isAuthenticated = false` and calls `navigate('/rankings')`
3. **BUT** `AdminDashboard` component still mounted for a moment
4. `ProtectedRoute` detects `!isAuthenticated` and redirects to `/login` (line 22-24)
5. `ProtectedRoute` redirect happens **faster** than logout navigation
6. `/login` redirects to `/rankings?modal=login` (backward compatibility)
7. `PublicRankingsPage` sees `modal=login` parameter and opens modal

**Race Condition Sequence**:
```
Time  | Action
------|-------
T0    | User on /admin/dashboard, isAuthenticated=true
T1    | User clicks Logout
T2    | logout() sets isAuthenticated=false
T3    | logout() calls navigate('/rankings')
T4    | ProtectedRoute sees !isAuthenticated
T5    | ProtectedRoute redirects to /login  ← WINS THE RACE
T6    | /login redirects to /rankings?modal=login
T7    | Login modal opens unexpectedly
```

**Affected Files**:
- `frontend/src/utils/AuthContext.jsx` - Lines 77-86 (logout function)
- `frontend/src/components/ProtectedRoute.jsx` - Lines 22-24 (redirect logic)
- `frontend/src/pages/LoginPage.jsx` - Lines 10-11 (backward compatibility redirect)

**Solution**:
Use `window.location.replace()` instead of React Router's `navigate()` to perform full page reload:

```javascript
// ❌ BEFORE (race condition):
const logout = () => {
  setUser(null);
  setIsAuthenticated(false);
  navigate('/rankings', { replace: true, state: null });
  // ProtectedRoute still has time to intercept!
};

// ✅ AFTER (full page reload):
const logout = () => {
  console.log('[AuthContext] logout() called');
  console.log('[AuthContext] Current URL:', window.location.href);
  setUser(null);
  setIsAuthenticated(false);
  // Use window.location to avoid race condition with ProtectedRoute redirect
  // This ensures a clean navigation without triggering /login redirect
  window.location.replace('/rankings');
};
```

**Why This Works**:
- `window.location.replace()` performs a full page reload
- Completely unmounts all React components (including `ProtectedRoute`)
- Loads `/rankings` fresh from the server
- No race condition possible - navigation is immediate and complete
- No URL parameters carried over

**Benefits**:
- ✅ Logout always goes directly to `/rankings` without modal
- ✅ No race condition with `ProtectedRoute`
- ✅ Clean slate - all React state cleared
- ✅ No URL parameter pollution

**Trade-offs**:
- ⚠️ Full page reload is slightly slower than React Router navigation
- ⚠️ Loses any in-memory state (acceptable for logout)
- ✅ More reliable and predictable behavior

**Files Modified**:
- `frontend/src/utils/AuthContext.jsx`: Lines 77-86 (logout using window.location.replace)

**Additional Improvements Made**:
1. Added logging to `PublicRankingsPage` to track URL parameters
2. Reset `hasProcessedModal` ref on unmount to prevent state pollution
3. Added cleanup function to reset ref when no modal parameter present

---

## Summary of Phase 7.5 Bugfixes

The Modal-Based Login UX enhancement revealed several interconnected issues that were resolved systematically:

1. **CORS Port Mismatch** → Dynamic port handling in development
2. **Duplicate API Calls** → `useRef` guard in AuthContext
3. **Modal Dependency Loop** → Functional setState with stable reference
4. **Logout Race Condition** → Full page reload using `window.location.replace()`

**Key Lessons**:
- React hooks dependency arrays require careful management
- Race conditions can occur between React Router and component lifecycle
- Sometimes platform APIs (`window.location`) are more reliable than framework abstractions
- Comprehensive logging is essential for debugging complex state flows

---

## Testing Checklist

When deploying or testing user management features:

### Phase 1-5 (Core Features)
- [ ] Test duplicate player profile creation with exact name match
- [ ] Test duplicate player profile creation with case variations
- [ ] Test duplicate email registration (user accounts)
- [ ] Test duplicate player profile email - should show "Email already registered"
- [ ] Verify error messages show on correct form fields
- [ ] Test in production mode (not just development)
- [ ] Verify database unique constraints are enforced
- [ ] Test fuzzy name matching for duplicate detection
- [ ] Test login after database reset (should work without manual session cleanup)
- [ ] Verify `npm run db:reset` clears sessions automatically
- [ ] Test that deactivated users cannot maintain active sessions
- [ ] Test player profiles with null emails (multiple should be allowed)

### Phase 7.5 (Modal-Based Login)
- [ ] Test login modal opens when clicking "Login" button
- [ ] Test register modal opens when clicking "Register" button
- [ ] Test modal closes on successful login
- [ ] Test modal closes on ESC key
- [ ] Test modal closes on backdrop click
- [ ] Test logout from admin dashboard - should NOT open login modal
- [ ] Test logout from organizer dashboard - should NOT open login modal
- [ ] Test logout from player profile - should NOT open login modal
- [ ] Verify only 1 session check API call on page load (not 2)
- [ ] Test backend on different ports (3001, 3002, 3003) - CORS should work
- [ ] Test `/login` direct link - should redirect to rankings and open modal
- [ ] Test `/register` direct link - should redirect to rankings and open modal
- [ ] Test modal switching (Login ↔ Register) within modal
- [ ] Verify no console errors during modal operations
- [ ] Test on page refresh - modal should NOT auto-open

---

## Database-Specific Considerations

### SQLite Limitations

**Known Limitations**:
1. No support for Prisma `mode: 'insensitive'` in queries
2. LIKE operator is case-insensitive by default (for ASCII only)
3. No native full-text search capabilities
4. Limited concurrent write operations
5. File-based sessions don't scale across multiple server instances

**Mitigations Applied**:
1. Removed `mode: 'insensitive'` from all queries
2. Normalize emails to lowercase before storage
3. Added comments documenting SQLite-specific behavior
4. Use `contains` for fuzzy matching (leverages LIKE operator)
5. Created `npm run db:reset` script for clean database resets

**Production Recommendations**:
- Consider PostgreSQL for production deployment if:
  - Case-sensitive searching is required
  - High concurrency is needed
  - Full-text search is needed
  - Better `mode: 'insensitive'` support is desired
  - Database-backed sessions are preferred

---

## Prevention Strategies

### For Future Development

1. **Always test with actual database engine early** - Don't assume Prisma features work across all databases
2. **Add unique constraints during schema design** - Don't add them as afterthoughts
3. **Test validation errors in production mode** - Dev mode may hide issues
4. **Use `npm run db:reset` for development** - Don't use `prisma migrate reset` directly
5. **Be cautious with React hooks dependencies** - Test for dependency loops
6. **Log extensively during debugging** - Use console.trace() to track call stacks
7. **Test logout from all protected routes** - Race conditions may vary by route
8. **Consider platform APIs for critical operations** - Sometimes simpler is better
9. **Test CORS with multiple ports** - Frontend port may change in development
10. **Always validate with browser DevTools** - Check Network tab and Console

---

## Additional Resources

- Prisma Database Features: https://www.prisma.io/docs/reference/database-reference/database-features
- React 18 StrictMode: https://react.dev/reference/react/StrictMode
- CORS Specification: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- React Router useNavigate: https://reactrouter.com/en/main/hooks/use-navigate

---

**Document Version**: 1.0
**Last Reviewed**: 2025-11-01
**Next Review**: After Phase 8 completion