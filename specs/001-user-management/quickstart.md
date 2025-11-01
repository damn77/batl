# Quickstart Guide: User Management System

**Feature**: User Management System for BATL Tennis Tournament Platform
**Date**: 2025-10-30
**Audience**: Developers and QA testers

## Overview

This guide provides end-to-end walkthroughs demonstrating how the user management system works across all user roles: ADMIN, ORGANIZER, PLAYER, and PUBLIC. Each scenario maps to user stories from the specification.

---

## Table of Contents

1. [Initial Setup](#1-initial-setup)
2. [P1 Scenario: Admin Authentication and Management](#2-p1-scenario-admin-authentication-and-management)
3. [P2 Scenario: Organizer Account Management](#3-p2-scenario-organizer-account-management)
4. [P2 Scenario: Player Profile Creation Without Accounts](#4-p2-scenario-player-profile-creation-without-accounts)
5. [P3 Scenario: Player Self-Service Account Creation](#5-p3-scenario-player-self-service-account-creation)
6. [P3 Scenario: Public Access to Tournament Information](#6-p3-scenario-public-access-to-tournament-information)
7. [Common Operations](#7-common-operations)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Initial Setup

### Prerequisites

- Node.js v20+ installed
- SQLite database initialized with migrations
- Environment variables configured
- Backend server running on `http://localhost:3000`
- Frontend server running on `http://localhost:3001`

### Environment Configuration

Create `.env` file in backend directory:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=file:../data/batl.db
SESSION_SECRET=your-32-character-or-longer-secret-here
FRONTEND_URL=http://localhost:3001

# Email configuration (for password resets)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@batl.example.com
SMTP_PASS=your-smtp-password
```

### Database Initialization

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run Prisma migrations
npx prisma migrate dev --name init_user_management

# Seed initial admin user
npx prisma db seed

# Start backend server
npm run dev
```

### Seed Admin Credentials

Default admin user created by seed script:
- **Email**: `admin@batl.example.com`
- **Password**: `ChangeMe123!`
- **Role**: ADMIN

⚠️ **IMPORTANT**: Change default admin password immediately after first login!

---

## 2. P1 Scenario: Admin Authentication and Management

**User Story**: Admin logs in and manages core system settings.

### Step 1: Admin Login

**Frontend**: Navigate to `http://localhost:3001/login`

**UI Actions**:
1. Enter email: `admin@batl.example.com`
2. Enter password: `ChangeMe123!`
3. Click "Login" button

**API Call**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@batl.example.com",
    "password": "ChangeMe123!"
  }' \
  -c cookies.txt
```

**Expected Response** (200 OK):
```json
{
  "user": {
    "id": "admin-uuid",
    "email": "admin@batl.example.com",
    "role": "ADMIN",
    "isActive": true,
    "emailVerified": true,
    "lastLoginAt": "2025-10-30T10:00:00Z"
  },
  "session": {
    "expiresAt": "2025-10-30T10:30:00Z"
  }
}
```

**Result**:
- Session cookie set in browser (HTTP-only, Secure, SameSite=Strict)
- Redirected to `/admin/dashboard`
- User.lastLoginAt updated in database
- AuditLog entry created: `LOGIN_SUCCESS`

### Step 2: Access Admin Dashboard

**Frontend**: Automatically redirected to `http://localhost:3001/admin/dashboard`

**API Call** (Session validation):
```bash
curl -X GET http://localhost:3000/api/auth/session \
  -b cookies.txt
```

**Expected Response** (200 OK):
```json
{
  "user": {
    "id": "admin-uuid",
    "email": "admin@batl.example.com",
    "role": "ADMIN",
    "isActive": true,
    "emailVerified": true
  },
  "session": {
    "expiresAt": "2025-10-30T10:30:00Z"
  }
}
```

**Result**:
- Admin dashboard displays user management options
- Session expiration refreshed (30 minutes from last activity)

### Step 3: Admin Logout

**Frontend**: Click "Logout" button in navigation

**API Call**:
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

**Expected Response** (200 OK):
```json
{
  "message": "Logout successful"
}
```

**Result**:
- Session deleted from database
- Session cookie cleared
- Redirected to `/login`
- AuditLog entry created: `LOGOUT`

---

## 3. P2 Scenario: Organizer Account Management

**User Story**: Admin creates organizer account, organizer logs in and accesses tournament features.

### Step 1: Admin Creates Organizer Account

**Prerequisites**: Admin is logged in

**Frontend**: Navigate to `http://localhost:3001/admin/users` → Click "Create User"

**UI Actions**:
1. Enter email: `organizer@batl.example.com`
2. Enter temporary password: `TempPass123!`
3. Select role: `ORGANIZER`
4. Click "Create Account" button

**API Call**:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "organizer@batl.example.com",
    "password": "TempPass123!",
    "role": "ORGANIZER"
  }'
```

**Expected Response** (201 Created):
```json
{
  "user": {
    "id": "organizer-uuid",
    "email": "organizer@batl.example.com",
    "role": "ORGANIZER",
    "isActive": true,
    "emailVerified": false,
    "createdAt": "2025-10-30T10:05:00Z"
  }
}
```

**Result**:
- Organizer account created in database
- Email verification sent to `organizer@batl.example.com`
- Success message displayed to admin
- AuditLog entry created: `USER_CREATED` by ADMIN

### Step 2: Organizer Login

**Frontend**: Organizer navigates to `http://localhost:3001/login`

**UI Actions**:
1. Enter email: `organizer@batl.example.com`
2. Enter password: `TempPass123!`
3. Click "Login" button

**API Call**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@batl.example.com",
    "password": "TempPass123!"
  }' \
  -c organizer-cookies.txt
```

**Expected Response** (200 OK):
```json
{
  "user": {
    "id": "organizer-uuid",
    "email": "organizer@batl.example.com",
    "role": "ORGANIZER",
    "isActive": true,
    "emailVerified": false,
    "lastLoginAt": "2025-10-30T10:10:00Z"
  },
  "session": {
    "expiresAt": "2025-10-30T10:40:00Z"
  }
}
```

**Result**:
- Session created and cookie set
- Redirected to `/organizer/dashboard`
- User.lastLoginAt updated
- AuditLog entry created: `LOGIN_SUCCESS`

### Step 3: Organizer Attempts Admin Access (Authorization Test)

**Frontend**: Organizer tries to navigate to `http://localhost:3001/admin/users`

**API Call**:
```bash
curl -X GET http://localhost:3000/api/users \
  -b organizer-cookies.txt
```

**Expected Response** (403 Forbidden):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Insufficient permissions.",
    "details": {
      "requiredRole": "ADMIN",
      "userRole": "ORGANIZER"
    }
  }
}
```

**Result**:
- Access denied (ORGANIZER cannot access ADMIN routes)
- Redirected to `/organizer/dashboard`
- AuditLog entry created: `ACCESS_DENIED`

---

## 4. P2 Scenario: Player Profile Creation Without Accounts

**User Story**: Organizer creates player profiles for tournament registration without requiring accounts.

### Step 1: Organizer Creates Player Profile

**Prerequisites**: Organizer is logged in

**Frontend**: Navigate to `http://localhost:3001/organizer/players` → Click "Add Player"

**UI Actions**:
1. Enter name: `Martin Novak`
2. Enter email (optional): `martin.novak@example.com`
3. Enter phone (optional): `+421901234567`
4. Click "Create Player" button

**API Call**:
```bash
curl -X POST http://localhost:3000/api/players \
  -H "Content-Type: application/json" \
  -b organizer-cookies.txt \
  -d '{
    "name": "Martin Novak",
    "email": "martin.novak@example.com",
    "phone": "+421901234567"
  }'
```

**Expected Response** (201 Created):
```json
{
  "player": {
    "id": "player-uuid",
    "userId": null,
    "name": "Martin Novak",
    "email": "martin.novak@example.com",
    "phone": "+421901234567",
    "createdBy": "organizer-uuid",
    "createdAt": "2025-10-30T10:15:00Z"
  },
  "duplicateWarning": null
}
```

**Result**:
- Player profile created without User account (userId = null)
- Profile available for tournament registration
- Success message displayed
- AuditLog entry created: `PLAYER_PROFILE_CREATED`

### Step 2: Organizer Creates Duplicate Player (Warning Test)

**Frontend**: Organizer tries to create another player with same name and email

**UI Actions**:
1. Enter name: `Martin Novak`
2. Enter email: `martin.novak@example.com`
3. Click "Create Player" button

**API Call**:
```bash
curl -X POST http://localhost:3000/api/players \
  -H "Content-Type: application/json" \
  -b organizer-cookies.txt \
  -d '{
    "name": "Martin Novak",
    "email": "martin.novak@example.com"
  }'
```

**Expected Response** (201 Created with Warning):
```json
{
  "player": {
    "id": "new-player-uuid",
    "userId": null,
    "name": "Martin Novak",
    "email": "martin.novak@example.com",
    "createdBy": "organizer-uuid",
    "createdAt": "2025-10-30T10:16:00Z"
  },
  "duplicateWarning": {
    "message": "Similar player profiles exist",
    "matches": [
      {
        "id": "player-uuid",
        "name": "Martin Novak",
        "email": "martin.novak@example.com",
        "similarity": "exact_name_and_email"
      }
    ]
  }
}
```

**Result**:
- New profile created (system allows duplicates)
- Warning banner displayed showing potential duplicate
- Organizer can choose to delete duplicate or keep both
- AuditLog entry created: `PLAYER_PROFILE_CREATED` with duplicate warning

### Step 3: Organizer Searches for Player

**Frontend**: Enter "Martin" in search box on `/organizer/players`

**API Call**:
```bash
curl -X GET 'http://localhost:3000/api/players?search=Martin&page=1&limit=20' \
  -b organizer-cookies.txt
```

**Expected Response** (200 OK):
```json
{
  "players": [
    {
      "id": "player-uuid",
      "userId": null,
      "name": "Martin Novak",
      "email": "martin.novak@example.com",
      "phone": "+421901234567",
      "hasAccount": false,
      "createdAt": "2025-10-30T10:15:00Z"
    },
    {
      "id": "new-player-uuid",
      "userId": null,
      "name": "Martin Novak",
      "email": "martin.novak@example.com",
      "hasAccount": false,
      "createdAt": "2025-10-30T10:16:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

**Result**:
- Both "Martin Novak" profiles displayed
- Organizer can select correct one for tournament registration

---

## 5. P3 Scenario: Player Self-Service Account Creation

**User Story**: Player creates their own account and links to existing profile.

### Step 1: Player Self-Registration

**Frontend**: Player navigates to `http://localhost:3001/register`

**UI Actions**:
1. Enter email: `martin.novak@example.com`
2. Enter password: `MySecurePass123!`
3. Enter name: `Martin Novak`
4. Enter phone (optional): `+421901234567`
5. Click "Create Account" button

**API Call**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "martin.novak@example.com",
    "password": "MySecurePass123!",
    "name": "Martin Novak",
    "phone": "+421901234567"
  }'
```

**Expected Response** (201 Created):
```json
{
  "user": {
    "id": "player-user-uuid",
    "email": "martin.novak@example.com",
    "role": "PLAYER",
    "emailVerified": false,
    "createdAt": "2025-10-30T10:20:00Z"
  },
  "player": {
    "id": "player-uuid",
    "userId": "player-user-uuid",
    "name": "Martin Novak",
    "phone": "+421901234567"
  },
  "existingProfileLinked": true,
  "message": "Account created and linked to existing player profile. Tournament history preserved."
}
```

**Result**:
- User account created with role=PLAYER
- Existing PlayerProfile found (matching name + email)
- PlayerProfile.userId updated to link to new User account
- Tournament history preserved
- Email verification sent
- Redirected to `/player/profile`
- AuditLog entries: `USER_REGISTERED`, `PLAYER_PROFILE_LINKED`

### Step 2: Player Login

**Frontend**: Player navigates to `http://localhost:3001/login`

**UI Actions**:
1. Enter email: `martin.novak@example.com`
2. Enter password: `MySecurePass123!`
3. Click "Login" button

**API Call**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "martin.novak@example.com",
    "password": "MySecurePass123!"
  }' \
  -c player-cookies.txt
```

**Expected Response** (200 OK):
```json
{
  "user": {
    "id": "player-user-uuid",
    "email": "martin.novak@example.com",
    "role": "PLAYER",
    "isActive": true,
    "emailVerified": false,
    "lastLoginAt": "2025-10-30T10:25:00Z"
  },
  "session": {
    "expiresAt": "2025-10-30T10:55:00Z"
  }
}
```

**Result**:
- Session created and cookie set
- Redirected to `/player/profile`
- Can view tournament history and rankings
- AuditLog entry: `LOGIN_SUCCESS`

### Step 3: Player Updates Profile

**Frontend**: Navigate to `http://localhost:3001/player/profile` → Click "Edit Profile"

**UI Actions**:
1. Update phone: `+421909876543`
2. Click "Save Changes" button

**API Call**:
```bash
curl -X PATCH http://localhost:3000/api/players/player-uuid \
  -H "Content-Type: application/json" \
  -b player-cookies.txt \
  -d '{
    "phone": "+421909876543"
  }'
```

**Expected Response** (200 OK):
```json
{
  "player": {
    "id": "player-uuid",
    "userId": "player-user-uuid",
    "name": "Martin Novak",
    "email": "martin.novak@example.com",
    "phone": "+421909876543",
    "updatedAt": "2025-10-30T10:30:00Z"
  }
}
```

**Result**:
- PlayerProfile updated
- Changes reflected in all tournaments
- Success message displayed
- AuditLog entry: `PLAYER_PROFILE_UPDATED`

### Step 4: Player Attempts Organizer Access (Authorization Test)

**Frontend**: Player tries to navigate to `http://localhost:3001/organizer/players`

**API Call**:
```bash
curl -X GET http://localhost:3000/api/players \
  -b player-cookies.txt
```

**Expected Response** (403 Forbidden):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Insufficient permissions.",
    "details": {
      "requiredRole": ["ORGANIZER", "ADMIN"],
      "userRole": "PLAYER"
    }
  }
}
```

**Result**:
- Access denied (PLAYER cannot access ORGANIZER routes)
- Redirected to `/player/profile`
- AuditLog entry: `ACCESS_DENIED`

---

## 6. P3 Scenario: Public Access to Tournament Information

**User Story**: Public visitor views tournament results and rankings without authentication.

### Step 1: Public Views Tournament Results

**Frontend**: Public visitor navigates to `http://localhost:3001/tournaments/123/results`

**API Call** (No cookies - unauthenticated):
```bash
curl -X GET http://localhost:3000/api/tournaments/123/results
```

**Expected Response** (200 OK):
```json
{
  "tournament": {
    "id": "123",
    "name": "BATL Summer Championships 2025",
    "category": "Men Singles",
    "date": "2025-08-15",
    "status": "completed"
  },
  "results": [
    {
      "rank": 1,
      "playerName": "Martin Novak",
      "points": 100
    },
    {
      "rank": 2,
      "playerName": "Jan Horvath",
      "points": 75
    }
  ]
}
```

**Result**:
- Tournament results displayed
- Player names visible (public information)
- Contact information hidden (email, phone not included)
- No authentication required

### Step 2: Public Views Category Rankings

**Frontend**: Navigate to `http://localhost:3001/rankings/men-singles`

**API Call** (No cookies):
```bash
curl -X GET http://localhost:3000/api/rankings/men-singles
```

**Expected Response** (200 OK):
```json
{
  "category": "Men Singles",
  "rankings": [
    {
      "rank": 1,
      "playerName": "Martin Novak",
      "totalPoints": 450,
      "tournaments": 5
    },
    {
      "rank": 2,
      "playerName": "Jan Horvath",
      "totalPoints": 380,
      "tournaments": 4
    }
  ],
  "lastUpdated": "2025-10-30T10:00:00Z"
}
```

**Result**:
- Rankings displayed without authentication
- Player names and points visible
- Contact information hidden

### Step 3: Public Attempts to Register for Tournament (Redirect Test)

**Frontend**: Click "Register" button on tournament page

**Result**:
- Redirected to `/login` with message: "Please log in or create an account to register for tournaments"
- After login, redirected back to tournament registration page

---

## 7. Common Operations

### Password Reset Flow

**Step 1: Request Password Reset**

**Frontend**: Click "Forgot Password?" on login page

**UI Actions**:
1. Enter email: `organizer@batl.example.com`
2. Click "Send Reset Link" button

**API Call**:
```bash
curl -X POST http://localhost:3000/api/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@batl.example.com"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Result**:
- Password reset token generated and stored (expires in 1 hour)
- Email sent with reset link: `http://localhost:3001/reset-password?token=<64-char-hex>`
- Generic success message (prevents email enumeration)
- AuditLog entry: `PASSWORD_RESET_REQUESTED`

**Step 2: Complete Password Reset**

**Frontend**: Click link in email → Navigate to reset page

**UI Actions**:
1. Enter new password: `NewSecurePass456!`
2. Confirm new password: `NewSecurePass456!`
3. Click "Reset Password" button

**API Call**:
```bash
curl -X POST http://localhost:3000/api/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "64-character-hex-token-from-email",
    "newPassword": "NewSecurePass456!"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Password reset successful. Please log in with your new password."
}
```

**Result**:
- Password updated in database (bcrypt hash)
- Token marked as used
- All active sessions invalidated (user must re-login)
- Confirmation email sent
- Redirected to `/login`
- AuditLog entry: `PASSWORD_RESET_COMPLETED`

### Session Expiration

**Scenario**: User idle for 30 minutes

**API Call**:
```bash
curl -X GET http://localhost:3000/api/auth/session \
  -b cookies.txt
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "Your session has expired. Please log in again."
  }
}
```

**Result**:
- Session cookie invalid
- Redirected to `/login`
- Must authenticate again

### Rate Limiting

**Scenario**: 6 failed login attempts in 15 minutes

**API Call** (6th attempt):
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }'
```

**Expected Response** (429 Too Many Requests):
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many login attempts. Please try again later.",
    "retryAfter": 900
  }
}
```

**Result**:
- Further login attempts blocked for 15 minutes
- Error message displayed
- AuditLog entry: `RATE_LIMIT_EXCEEDED`

---

## 8. Troubleshooting

### Problem: "Invalid email or password" error on correct credentials

**Possible Causes**:
1. Account not yet created (check database)
2. Password was changed recently
3. Account deactivated (isActive=false)

**Solution**:
```bash
# Check if user exists
npx prisma studio
# Navigate to User table, search by email
# Verify isActive=true and passwordHash exists
```

### Problem: "Session expired" immediately after login

**Possible Causes**:
1. Session cookie not being set (check HTTPS/secure flag)
2. Clock skew between client and server
3. SESSION_SECRET mismatch

**Solution**:
- Verify HTTPS in production (secure cookies require HTTPS)
- Check `sameSite` setting in session configuration
- Verify SESSION_SECRET environment variable

### Problem: Player account not linking to existing profile

**Possible Causes**:
1. Name/email mismatch (case-sensitive)
2. Profile already linked to another account
3. Multiple profiles with same name

**Solution**:
- Manual linking via ADMIN:
```bash
curl -X POST http://localhost:3000/api/players/player-uuid/link-account \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt
```

### Problem: Password reset email not received

**Possible Causes**:
1. SMTP configuration incorrect
2. Email in spam folder
3. Token expired (1 hour limit)

**Solution**:
- Check SMTP environment variables
- Verify email service logs
- Request new reset token

---

## Summary

This quickstart demonstrates:
- ✅ **P1 (MVP)**: Admin authentication and dashboard access
- ✅ **P2 (Enhanced)**: Organizer account creation and player profile management
- ✅ **P3 (Future)**: Player self-registration with profile linking and public access
- ✅ **Authorization**: Role-based access control enforcement
- ✅ **Security**: Password hashing, session management, rate limiting
- ✅ **Audit**: All actions logged for security monitoring

All user stories from the specification are validated through these end-to-end flows.
