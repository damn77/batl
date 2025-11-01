# API Endpoints: User Management System

**Feature**: User Management System
**Date**: 2025-10-30
**Protocol**: REST API over HTTPS
**Format**: JSON
**Authentication**: Session-based (express-session + cookies)

## Overview

This document defines all REST API endpoints for the Battle user management system. All endpoints except public-facing routes require authentication via session cookies.

---

## Base URL

```
Production: https://battle.example.com/api
Development: http://localhost:3000/api
```

---

## Authentication Flow

### Session-Based Authentication
1. Client sends login credentials to `/auth/login`
2. Server validates credentials and creates session
3. Server sets HTTP-only, secure, SameSite=Strict session cookie
4. Client includes cookie automatically in subsequent requests
5. Server validates session on each protected route via middleware
6. Client sends logout request to `/auth/logout` to terminate session

---

## Common Response Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Not authenticated (no session) |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., duplicate email) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific field if applicable",
      "reason": "detailed reason"
    }
  }
}
```

**Example**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "email",
      "reason": "Email format is invalid"
    }
  }
}
```

---

## 1. Authentication Endpoints

### POST /api/auth/login

Authenticate user with email and password.

**Access**: Public

**Rate Limit**: 5 requests per 15 minutes per IP

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "userPassword123"
}
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ORGANIZER",
    "isActive": true,
    "emailVerified": true,
    "lastLoginAt": "2025-10-30T10:30:00Z"
  },
  "session": {
    "expiresAt": "2025-10-30T11:00:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account deactivated
- `429 Too Many Requests`: Rate limit exceeded

**Notes**:
- Sets session cookie in response
- Generic error message "Invalid email or password" prevents email enumeration
- Logs authentication attempt (success/failure) in AuditLog
- Updates User.lastLoginAt on success

---

### POST /api/auth/logout

Terminate current user session.

**Access**: Authenticated users only

**Request Body**: None

**Success Response** (200 OK):
```json
{
  "message": "Logout successful"
}
```

**Error Responses**:
- `401 Unauthorized`: No active session

**Notes**:
- Deletes session from database
- Clears session cookie
- Logs logout event in AuditLog

---

### POST /api/auth/password-reset/request

Request password reset token via email.

**Access**: Public

**Rate Limit**: 3 requests per hour per IP

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response** (200 OK):
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Error Responses**:
- `400 Bad Request`: Missing or invalid email format
- `429 Too Many Requests`: Rate limit exceeded

**Notes**:
- Returns success message even if email doesn't exist (prevents email enumeration)
- Generates 64-character random token, hashes with SHA-256
- Stores hashed token in PasswordResetToken table (expires in 1 hour)
- Sends email with reset link: `https://battle.example.com/reset-password?token={token}`
- Invalidates previous unused tokens for same user
- Logs password reset request in AuditLog

---

### POST /api/auth/password-reset/confirm

Reset password using valid token.

**Access**: Public

**Request Body**:
```json
{
  "token": "64-character-hex-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Password reset successful. Please log in with your new password."
}
```

**Error Responses**:
- `400 Bad Request`: Missing token or password, password doesn't meet requirements
- `401 Unauthorized`: Invalid, expired, or already-used token

**Notes**:
- Validates token: hash matches, not expired, not used
- Validates new password: minimum 8 characters
- Hashes new password with bcrypt (work factor 12)
- Updates User.passwordHash
- Marks token as used (PasswordResetToken.used = true)
- Invalidates all active sessions for user (forces re-login)
- Sends confirmation email to user
- Logs password reset completion in AuditLog

---

### GET /api/auth/session

Check current session status.

**Access**: Authenticated users only

**Request**: None

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ORGANIZER",
    "isActive": true,
    "emailVerified": true
  },
  "session": {
    "expiresAt": "2025-10-30T11:00:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: No active session or session expired

**Notes**:
- Used by frontend to check authentication status
- Refreshes session expiration (updates Session.updatedAt)

---

## 2. User Management Endpoints (Admin Only)

### POST /api/users

Create a new user account (ADMIN creates ORGANIZER accounts).

**Access**: ADMIN only

**Request Body**:
```json
{
  "email": "organizer@example.com",
  "password": "temporaryPassword123",
  "role": "ORGANIZER"
}
```

**Success Response** (201 Created):
```json
{
  "user": {
    "id": "uuid",
    "email": "organizer@example.com",
    "role": "ORGANIZER",
    "isActive": true,
    "emailVerified": false,
    "createdAt": "2025-10-30T10:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid email format, password too weak, invalid role
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User is not ADMIN
- `409 Conflict`: Email already exists

**Notes**:
- Only ADMIN can create ORGANIZER accounts
- Password must meet minimum requirements (8 characters)
- Email verification email sent to new user
- Logs user creation in AuditLog

---

### GET /api/users

List all user accounts (paginated).

**Access**: ADMIN only

**Query Parameters**:
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Results per page
- `role` (string, optional): Filter by role (ADMIN, ORGANIZER, PLAYER)
- `isActive` (boolean, optional): Filter by account status

**Success Response** (200 OK):
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "ORGANIZER",
      "isActive": true,
      "emailVerified": true,
      "createdAt": "2025-10-30T10:30:00Z",
      "lastLoginAt": "2025-10-30T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User is not ADMIN

**Notes**:
- Does not return passwordHash
- Sorted by createdAt descending (newest first)

---

### GET /api/users/:id

Get specific user account details.

**Access**: ADMIN or own account

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ORGANIZER",
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2025-10-30T10:30:00Z",
    "updatedAt": "2025-10-30T11:00:00Z",
    "lastLoginAt": "2025-10-30T11:00:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User is not ADMIN and not requesting own account
- `404 Not Found`: User ID doesn't exist

**Notes**:
- Does not return passwordHash
- Users can only view their own account unless they are ADMIN

---

### PATCH /api/users/:id

Update user account details.

**Access**: ADMIN or own account (limited fields)

**Request Body** (ADMIN):
```json
{
  "email": "newemail@example.com",
  "role": "ORGANIZER",
  "isActive": false
}
```

**Request Body** (Own Account):
```json
{
  "email": "newemail@example.com"
}
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "newemail@example.com",
    "role": "ORGANIZER",
    "isActive": true,
    "emailVerified": false,
    "updatedAt": "2025-10-30T11:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid email format, invalid role
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User ID doesn't exist
- `409 Conflict`: Email already in use

**Notes**:
- Only ADMIN can update role and isActive
- Users can only update their own email
- Email change requires re-verification (emailVerified set to false)
- Logs account update in AuditLog

---

### DELETE /api/users/:id

Delete user account (soft delete - sets isActive=false).

**Access**: ADMIN only

**Success Response** (204 No Content)

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User is not ADMIN or attempting to delete own account
- `404 Not Found`: User ID doesn't exist

**Notes**:
- Soft delete: sets isActive=false (preserves data for audit trail)
- Cannot delete own admin account (prevents lockout)
- Cannot delete last ADMIN account (prevents lockout)
- Cascade deletes sessions and password reset tokens
- PlayerProfile userId set to NULL (preserves tournament history)
- AuditLog userId set to NULL (preserves audit trail)
- Logs account deletion in AuditLog

---

## 3. Player Profile Endpoints

### POST /api/players

Create player profile (without requiring account).

**Access**: ORGANIZER or ADMIN

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+421901234567"
}
```

**Success Response** (201 Created):
```json
{
  "player": {
    "id": "uuid",
    "userId": null,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+421901234567",
    "createdBy": "organizer-user-id",
    "createdAt": "2025-10-30T10:30:00Z"
  },
  "duplicateWarning": null
}
```

**Response with Duplicate Warning** (201 Created):
```json
{
  "player": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+421901234567",
    "createdBy": "organizer-user-id",
    "createdAt": "2025-10-30T10:30:00Z"
  },
  "duplicateWarning": {
    "message": "Similar player profiles exist",
    "matches": [
      {
        "id": "existing-uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "similarity": "exact_name_and_email"
      }
    ]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid name, email format, or phone format
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User is not ORGANIZER or ADMIN

**Notes**:
- Email and phone are optional
- Performs fuzzy name matching to detect potential duplicates
- Does not prevent creation, only warns
- createdBy set to authenticated user ID
- Logs player profile creation in AuditLog

---

### GET /api/players

List player profiles (paginated).

**Access**: ORGANIZER, ADMIN, or own profile (PLAYER)

**Query Parameters**:
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Results per page
- `search` (string, optional): Search by name or email
- `hasAccount` (boolean, optional): Filter by account status

**Success Response** (200 OK):
```json
{
  "players": [
    {
      "id": "uuid",
      "userId": "user-uuid-or-null",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+421901234567",
      "hasAccount": true,
      "createdAt": "2025-10-30T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated (for non-public data)
- `403 Forbidden`: PLAYER role can only view own profile

**Notes**:
- Search supports partial name and email matching
- Sorted by name ascending
- PLAYER role users can only see their linked profile

---

### GET /api/players/:id

Get specific player profile.

**Access**: ORGANIZER, ADMIN, own profile (PLAYER), or PUBLIC (limited fields)

**Success Response** (200 OK - Authenticated):
```json
{
  "player": {
    "id": "uuid",
    "userId": "user-uuid-or-null",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+421901234567",
    "hasAccount": true,
    "createdBy": "organizer-user-id",
    "createdAt": "2025-10-30T10:30:00Z",
    "updatedAt": "2025-10-30T11:00:00Z"
  }
}
```

**Success Response** (200 OK - Public):
```json
{
  "player": {
    "id": "uuid",
    "name": "John Doe",
    "hasAccount": true
  }
}
```

**Error Responses**:
- `403 Forbidden`: PLAYER role accessing another player's profile
- `404 Not Found`: Player ID doesn't exist

**Notes**:
- Public access returns limited fields (name, hasAccount only)
- Contact information hidden from public
- PLAYER role can only access their own linked profile

---

### PATCH /api/players/:id

Update player profile.

**Access**: ORGANIZER, ADMIN, or own profile (PLAYER)

**Request Body**:
```json
{
  "name": "John Updated Doe",
  "email": "johnupdated@example.com",
  "phone": "+421909876543"
}
```

**Success Response** (200 OK):
```json
{
  "player": {
    "id": "uuid",
    "userId": "user-uuid-or-null",
    "name": "John Updated Doe",
    "email": "johnupdated@example.com",
    "phone": "+421909876543",
    "updatedAt": "2025-10-30T11:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid email or phone format
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: PLAYER role updating another player's profile
- `404 Not Found`: Player ID doesn't exist

**Notes**:
- PLAYER role can only update their own linked profile
- ORGANIZER/ADMIN can update any profile
- Logs profile update in AuditLog

---

### POST /api/players/:id/link-account

Link player profile to user account.

**Access**: PLAYER (own profile) or ADMIN

**Request Body**: None (uses authenticated user's account)

**Success Response** (200 OK):
```json
{
  "player": {
    "id": "uuid",
    "userId": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "linkedAt": "2025-10-30T11:30:00Z"
  },
  "message": "Player profile successfully linked to account"
}
```

**Error Responses**:
- `400 Bad Request`: Player profile already linked to an account
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: PLAYER role attempting to link another player's profile
- `404 Not Found`: Player ID doesn't exist
- `409 Conflict`: User account already linked to a different player profile

**Notes**:
- Verifies name/email match before linking
- User can only have one linked player profile
- Player profile can only link to one user account
- Preserves tournament history from organizer-created profile
- Logs account linking in AuditLog

---

## 4. Player Self-Registration Endpoints

### POST /api/auth/register

Player self-registration (creates User account + PlayerProfile).

**Access**: Public

**Request Body**:
```json
{
  "email": "newplayer@example.com",
  "password": "securePassword123",
  "name": "Jane Player",
  "phone": "+421901111111"
}
```

**Success Response** (201 Created):
```json
{
  "user": {
    "id": "uuid",
    "email": "newplayer@example.com",
    "role": "PLAYER",
    "emailVerified": false,
    "createdAt": "2025-10-30T10:30:00Z"
  },
  "player": {
    "id": "uuid",
    "userId": "user-uuid",
    "name": "Jane Player",
    "phone": "+421901111111"
  },
  "existingProfileLinked": false
}
```

**Response with Existing Profile Linked** (201 Created):
```json
{
  "user": {
    "id": "uuid",
    "email": "newplayer@example.com",
    "role": "PLAYER",
    "emailVerified": false,
    "createdAt": "2025-10-30T10:30:00Z"
  },
  "player": {
    "id": "existing-profile-uuid",
    "userId": "user-uuid",
    "name": "Jane Player"
  },
  "existingProfileLinked": true,
  "message": "Account created and linked to existing player profile. Tournament history preserved."
}
```

**Error Responses**:
- `400 Bad Request`: Invalid email, weak password, missing name
- `409 Conflict`: Email already registered

**Notes**:
- Creates User with role=PLAYER
- Checks for existing PlayerProfile with matching name + email
- If found, links to existing profile (preserves tournament history)
- If not found, creates new PlayerProfile
- Sends email verification email
- Logs registration in AuditLog

---

## 5. Authorization / Permission Endpoints

### GET /api/auth/permissions

Get current user's permissions.

**Access**: Authenticated users only

**Success Response** (200 OK):
```json
{
  "role": "ORGANIZER",
  "permissions": [
    {
      "action": "create",
      "subject": "Tournament"
    },
    {
      "action": "read",
      "subject": "Tournament"
    },
    {
      "action": "update",
      "subject": "Tournament"
    },
    {
      "action": "create",
      "subject": "PlayerProfile"
    },
    {
      "action": "read",
      "subject": "PlayerProfile"
    },
    {
      "action": "update",
      "subject": "PlayerProfile"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated

**Notes**:
- Returns role and associated permissions
- Used by frontend to show/hide UI elements based on permissions
- Permissions are based on CASL ability definitions

---

## 6. Health & Status Endpoints

### GET /api/health

Health check endpoint (no authentication required).

**Access**: Public

**Success Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-10-30T11:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

**Notes**:
- Used by monitoring systems
- Checks database connectivity
- Does not require authentication

---

## Frontend Routes to API Mapping

| Frontend Route | API Endpoint(s) | Purpose |
|----------------|-----------------|---------|
| /login | POST /api/auth/login | User login |
| /logout | POST /api/auth/logout | User logout |
| /register | POST /api/auth/register | Player self-registration |
| /forgot-password | POST /api/auth/password-reset/request | Request password reset |
| /reset-password | POST /api/auth/password-reset/confirm | Complete password reset |
| /admin/users | GET /api/users, POST /api/users | Admin user management |
| /admin/users/:id | GET/PATCH/DELETE /api/users/:id | Admin user details |
| /organizer/players | GET /api/players, POST /api/players | Organizer player management |
| /organizer/players/:id | GET/PATCH /api/players/:id | Organizer player details |
| /player/profile | GET/PATCH /api/players/:id | Player own profile |
| /profile | GET/PATCH /api/users/:id | User account settings |

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/login | 5 requests | 15 minutes |
| POST /api/auth/register | 3 requests | 1 hour |
| POST /api/auth/password-reset/request | 3 requests | 1 hour |
| All other endpoints | 100 requests | 15 minutes |

Rate limits are per IP address.

---

## CORS Configuration

**Allowed Origins**:
- Production: `https://battle.example.com`
- Development: `http://localhost:3001`

**Allowed Methods**: GET, POST, PATCH, DELETE, OPTIONS

**Allowed Headers**: Content-Type, Authorization

**Credentials**: Allowed (for session cookies)

---

## Security Headers

All responses include:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'`
- `X-XSS-Protection: 0` (CSP handles XSS protection)

---

## Testing Endpoints

For development/testing only (disabled in production):

### POST /api/test/create-admin

Create test admin user.

**Access**: Development environment only

**Request Body**:
```json
{
  "email": "admin@test.com",
  "password": "testPassword123"
}
```

**Notes**:
- Only available when NODE_ENV=development
- Returns 404 in production

---

## Summary

This API provides:
- **Authentication**: Secure email/password login with session management
- **User Management**: ADMIN can create and manage ORGANIZER accounts
- **Player Profiles**: ORGANIZER can create player profiles without accounts
- **Player Self-Service**: Players can register and link to existing profiles
- **Role-Based Access**: Enforced permissions for ADMIN, ORGANIZER, PLAYER, PUBLIC
- **Security**: Rate limiting, HTTPS, secure cookies, audit logging
- **Performance**: Pagination, indexes, optimized queries

All endpoints follow REST best practices with consistent error handling and response formats.
