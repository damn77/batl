# Data Model: User Management System

**Feature**: User Management System
**Date**: 2025-10-30
**Database**: SQLite via Prisma ORM
**Status**: Complete

## Overview

This document defines the data model for the BATL user management system, including entities, relationships, validation rules, and database schema. The model supports four user role types (ADMIN, ORGANIZER, PLAYER, PUBLIC) with email/password authentication and role-based access control.

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────┐
│   User          │──────→│   Role       │
│                 │  1:1   │              │
│ - id            │       │ - ADMIN      │
│ - email         │       │ - ORGANIZER  │
│ - passwordHash  │       │ - PLAYER     │
│ - role          │       │ - PUBLIC     │
│ - createdAt     │       └──────────────┘
│ - lastLoginAt   │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│   Session       │
│                 │
│ - id            │
│ - userId        │
│ - expiresAt     │
│ - createdAt     │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│   User          │──┐    │  PlayerProfile  │
│                 │  │    │                 │
└─────────────────┘  │    │ - id            │
                     └───→│ - userId (null) │ 0..1:1
                       │   │ - name          │
                       │   │ - email         │
                       │   │ - phone         │
                       │   │ - createdBy     │
                       │   │ - createdAt     │
                       │   └─────────────────┘

┌─────────────────┐       ┌─────────────────────────┐
│   User          │──────→│  PasswordResetToken     │
│                 │  1:N   │                         │
└─────────────────┘       │ - id                    │
                           │ - userId                │
                           │ - tokenHash             │
                           │ - expiresAt             │
                           │ - used                  │
                           │ - createdAt             │
                           └─────────────────────────┘

┌─────────────────┐       ┌─────────────────────────┐
│   User          │──────→│  AuditLog               │
│                 │  1:N   │                         │
└─────────────────┘       │ - id                    │
                           │ - userId                │
                           │ - action                │
                           │ - entityType            │
                           │ - entityId              │
                           │ - changes               │
                           │ - ipAddress             │
                           │ - userAgent             │
                           │ - timestamp             │
                           └─────────────────────────┘
```

---

## Entity Definitions

### 1. User

Represents authenticated users with accounts (ADMIN, ORGANIZER, or PLAYER with account).

**Fields**:
- **id** (String, UUID): Primary key, unique identifier
- **email** (String): Email address, unique, required, validated format
- **passwordHash** (String): bcrypt hash of password (work factor 12), required
- **role** (Enum): One of ADMIN, ORGANIZER, PLAYER, required
- **isActive** (Boolean): Account status (true = active, false = deactivated), default true
- **emailVerified** (Boolean): Email verification status, default false
- **createdAt** (DateTime): Account creation timestamp, auto-generated
- **updatedAt** (DateTime): Last update timestamp, auto-updated
- **lastLoginAt** (DateTime, nullable): Last successful login timestamp

**Relationships**:
- One-to-many with Session (cascade delete)
- One-to-many with PasswordResetToken (cascade delete)
- One-to-one with PlayerProfile (optional, nullable)
- One-to-many with AuditLog

**Validation Rules**:
- Email must match RFC 5322 format
- Password must be at least 8 characters before hashing
- Role must be one of: ADMIN, ORGANIZER, PLAYER
- Email must be unique (case-insensitive)

**Indexes**:
- Primary: id
- Unique: email (case-insensitive)
- Index: role (for role-based queries)
- Index: isActive (for active user queries)

---

### 2. PlayerProfile

Represents tournament participants. Can exist independently without a linked User account (organizer-created profiles) or be linked to a User account (player-created accounts).

**Fields**:
- **id** (String, UUID): Primary key, unique identifier
- **userId** (String, UUID, nullable): Foreign key to User, null if no account
- **name** (String): Full name, required
- **email** (String, nullable): Contact email, not necessarily unique (can be same for multiple profiles)
- **phone** (String, nullable): Contact phone number
- **createdBy** (String, UUID): Foreign key to User who created this profile (organizer or self)
- **createdAt** (DateTime): Profile creation timestamp, auto-generated
- **updatedAt** (DateTime): Last update timestamp, auto-updated

**Relationships**:
- Many-to-one with User via userId (optional, nullable, no cascade delete - preserve profile when user deleted)
- Many-to-one with User via createdBy (required, no cascade delete - preserve profile when organizer deleted)

**Validation Rules**:
- Name must be at least 2 characters
- Email must match RFC 5322 format if provided
- Phone must match E.164 format if provided
- If userId is set, must reference existing User with role PLAYER

**Indexes**:
- Primary: id
- Index: userId (for linking to accounts)
- Index: name (for search queries)
- Composite index: (name, email) for duplicate detection

**Business Rules**:
- Player profiles can be created by ORGANIZER users without requiring account
- When PLAYER creates account, link to existing profile if name + email match
- Preserve player profile and tournament history when user account deleted
- createdBy tracks who created the profile (organizer or self-registration)

---

### 3. Session

Represents an authenticated user's active connection. Used for server-side session management.

**Fields**:
- **id** (String): Session identifier (random 128-bit), primary key
- **userId** (String, UUID): Foreign key to User, required
- **data** (JSON): Serialized session data (user info, permissions, etc.)
- **expiresAt** (DateTime): Session expiration timestamp, required
- **createdAt** (DateTime): Session creation timestamp, auto-generated
- **updatedAt** (DateTime): Last activity timestamp, auto-updated

**Relationships**:
- Many-to-one with User (cascade delete when user deleted)

**Validation Rules**:
- Session ID must be cryptographically random
- expiresAt must be in the future when created
- userId must reference existing User

**Indexes**:
- Primary: id
- Index: userId (for user session lookup)
- Index: expiresAt (for cleanup queries)

**Business Rules**:
- Sessions expire after 30 minutes of inactivity
- User can have multiple concurrent sessions (different devices)
- Sessions are invalidated immediately on logout
- Sessions are invalidated when password is changed
- Expired sessions are automatically cleaned up by scheduled job

---

### 4. PasswordResetToken

Represents a password reset request with time-limited, single-use token.

**Fields**:
- **id** (String, UUID): Primary key, unique identifier
- **userId** (String, UUID): Foreign key to User, required
- **tokenHash** (String): SHA-256 hash of the reset token, required
- **expiresAt** (DateTime): Token expiration timestamp (1 hour from creation), required
- **used** (Boolean): Whether token has been used, default false
- **usedAt** (DateTime, nullable): Timestamp when token was used
- **createdAt** (DateTime): Token creation timestamp, auto-generated

**Relationships**:
- Many-to-one with User (cascade delete when user deleted)

**Validation Rules**:
- tokenHash must be SHA-256 hash (64 hex characters)
- expiresAt must be exactly 1 hour after createdAt
- userId must reference existing User

**Indexes**:
- Primary: id
- Unique: tokenHash
- Index: userId (for user token lookup)
- Index: expiresAt (for cleanup queries)
- Composite index: (tokenHash, used, expiresAt) for reset verification

**Business Rules**:
- Tokens expire after 1 hour
- Tokens are single-use (used flag set to true after successful reset)
- Maximum 3 active (unused, unexpired) tokens per user at a time
- Used or expired tokens are cleaned up by scheduled job
- New password reset requests invalidate previous unused tokens

---

### 5. AuditLog

Represents a record of authentication and authorization events for security monitoring and forensics.

**Fields**:
- **id** (String, UUID): Primary key, unique identifier
- **userId** (String, UUID, nullable): Foreign key to User (null for failed login attempts with unknown user)
- **action** (String): Action performed (e.g., LOGIN_SUCCESS, LOGIN_FAILED, PASSWORD_RESET, ACCOUNT_CREATED)
- **entityType** (String, nullable): Type of entity affected (e.g., User, PlayerProfile)
- **entityId** (String, UUID, nullable): ID of affected entity
- **changes** (JSON, nullable): Structured data about what changed
- **ipAddress** (String): IP address of request
- **userAgent** (String, nullable): User agent string from request
- **timestamp** (DateTime): Event timestamp, auto-generated

**Relationships**:
- Many-to-one with User (no cascade delete - preserve audit log when user deleted)

**Validation Rules**:
- action must be from predefined enum of audit events
- ipAddress must be valid IPv4 or IPv6 format
- timestamp must be in the past or present

**Indexes**:
- Primary: id
- Index: userId (for user activity queries)
- Index: action (for filtering by action type)
- Index: timestamp (for time-range queries)
- Composite index: (userId, timestamp) for user activity timeline

**Business Rules**:
- Log all authentication events (login, logout, password reset)
- Log all authorization failures (access denied)
- Log all sensitive operations (account creation, role changes, profile updates)
- Retain audit logs indefinitely (or per compliance requirements)
- Audit logs are append-only (no updates or deletes)

---

## Prisma Schema

```prisma
// schema.prisma

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Enums
enum Role {
  ADMIN
  ORGANIZER
  PLAYER
}

// Models

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  role          Role
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  // Relationships
  sessions            Session[]
  passwordResetTokens PasswordResetToken[]
  playerProfile       PlayerProfile?       @relation("PlayerAccount")
  createdProfiles     PlayerProfile[]      @relation("ProfileCreator")
  auditLogs           AuditLog[]

  @@index([role])
  @@index([isActive])
}

model PlayerProfile {
  id        String   @id @default(uuid())
  userId    String?  @unique
  name      String
  email     String?
  phone     String?
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  user    User? @relation("PlayerAccount", fields: [userId], references: [id], onDelete: SetNull)
  creator User  @relation("ProfileCreator", fields: [createdBy], references: [id], onDelete: NoAction)

  @@index([userId])
  @@index([name])
  @@index([name, email])
}

model Session {
  id        String   @id
  userId    String
  data      String   // JSON serialized
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  used      Boolean   @default(false)
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  // Relationships
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@index([tokenHash, used, expiresAt])
}

model AuditLog {
  id         String    @id @default(uuid())
  userId     String?
  action     String
  entityType String?
  entityId   String?
  changes    String?   // JSON serialized
  ipAddress  String
  userAgent  String?
  timestamp  DateTime  @default(now())

  // Relationships
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([timestamp])
  @@index([userId, timestamp])
}
```

---

## Data Validation Rules

### User Entity

**Email Validation**:
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  throw new Error('Invalid email format');
}
```

**Password Validation** (before hashing):
```javascript
const passwordMinLength = 8;
const passwordMaxLength = 128;

if (password.length < passwordMinLength) {
  throw new Error(`Password must be at least ${passwordMinLength} characters`);
}
if (password.length > passwordMaxLength) {
  throw new Error(`Password must be at most ${passwordMaxLength} characters`);
}
```

**Role Validation**:
```javascript
const validRoles = ['ADMIN', 'ORGANIZER', 'PLAYER'];
if (!validRoles.includes(role)) {
  throw new Error('Invalid role');
}
```

### PlayerProfile Entity

**Name Validation**:
```javascript
const nameMinLength = 2;
const nameMaxLength = 100;

if (name.length < nameMinLength || name.length > nameMaxLength) {
  throw new Error(`Name must be between ${nameMinLength} and ${nameMaxLength} characters`);
}
```

**Phone Validation** (if provided):
```javascript
// E.164 format: +[country code][number]
const phoneRegex = /^\+[1-9]\d{1,14}$/;
if (phone && !phoneRegex.test(phone)) {
  throw new Error('Invalid phone format (use E.164: +[country code][number])');
}
```

### Session Entity

**Session ID Generation**:
```javascript
const crypto = require('crypto');
const sessionId = crypto.randomBytes(16).toString('hex'); // 128-bit random
```

**Expiration Validation**:
```javascript
const sessionDurationMs = 30 * 60 * 1000; // 30 minutes
const expiresAt = new Date(Date.now() + sessionDurationMs);
```

### PasswordResetToken Entity

**Token Generation & Hashing**:
```javascript
const crypto = require('crypto');

// Generate token
const token = crypto.randomBytes(32).toString('hex'); // 64 hex characters

// Hash for storage
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

// Set expiration (1 hour)
const expiresAt = new Date(Date.now() + 3600000);
```

---

## State Transitions

### User Account Lifecycle

```
[New] --register--> [Active, EmailVerified=false]
[Active, EmailVerified=false] --verify--> [Active, EmailVerified=true]
[Active] --deactivate--> [Inactive]
[Inactive] --reactivate--> [Active]
[Active|Inactive] --delete--> [Deleted] (soft delete via isActive=false)
```

### Session Lifecycle

```
[Created] --login--> [Active]
[Active] --activity--> [Active] (updatedAt refreshed)
[Active] --30min idle--> [Expired]
[Active] --logout--> [Terminated]
[Active] --password change--> [Invalidated]
[Expired|Terminated|Invalidated] --cleanup--> [Deleted]
```

### Password Reset Token Lifecycle

```
[Created] --request--> [Active, used=false]
[Active] --1 hour--> [Expired, used=false]
[Active] --reset success--> [Used, used=true]
[Active] --new request--> [Invalidated]
[Used|Expired|Invalidated] --cleanup--> [Deleted]
```

---

## Database Constraints & Indexes

### Unique Constraints
- User.email (case-insensitive unique)
- PasswordResetToken.tokenHash (unique)
- PlayerProfile.userId (unique, nullable)

### Foreign Key Constraints
- Session.userId → User.id (CASCADE delete)
- PasswordResetToken.userId → User.id (CASCADE delete)
- PlayerProfile.userId → User.id (SET NULL on delete - preserve profile)
- PlayerProfile.createdBy → User.id (NO ACTION on delete - preserve history)
- AuditLog.userId → User.id (SET NULL on delete - preserve audit trail)

### Indexes for Performance
- User: email, role, isActive
- PlayerProfile: userId, name, (name, email) composite
- Session: userId, expiresAt
- PasswordResetToken: userId, expiresAt, (tokenHash, used, expiresAt) composite
- AuditLog: userId, action, timestamp, (userId, timestamp) composite

---

## Migration Strategy

### Initial Migration

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init_user_management

# Seed initial admin user
npx prisma db seed
```

### Seed Script (create first admin)

```javascript
// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@batl.example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: passwordHash,
      role: 'ADMIN',
      isActive: true,
      emailVerified: true
    }
  });

  console.log('Seed admin user created:', admin.email);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
```

---

## Data Retention & Cleanup

### Automated Cleanup Jobs

**Session Cleanup** (run hourly):
```sql
DELETE FROM Session WHERE expiresAt < datetime('now');
```

**Password Reset Token Cleanup** (run daily):
```sql
DELETE FROM PasswordResetToken
WHERE expiresAt < datetime('now') OR used = true;
```

**Audit Log Retention** (run monthly):
```sql
-- Keep last 12 months only (adjust per compliance requirements)
DELETE FROM AuditLog
WHERE timestamp < datetime('now', '-12 months');
```

### Manual Data Operations

**Soft Delete User** (preserve audit trail):
```sql
UPDATE User SET isActive = false, updatedAt = datetime('now')
WHERE id = ?;
```

**Hard Delete User** (GDPR compliance, cascade to sessions/tokens, preserve audit log):
```sql
-- Sessions and PasswordResetTokens cascade automatically
-- PlayerProfile userId set to NULL
-- AuditLog userId set to NULL
DELETE FROM User WHERE id = ?;
```

---

## Summary

This data model provides:
- **Flexible User Management**: Accounts for ADMIN, ORGANIZER, PLAYER with optional player profiles
- **Security**: Password hashing, session management, audit logging, token expiration
- **Data Integrity**: Foreign keys, unique constraints, validation rules
- **Performance**: Strategic indexes for common queries
- **Scalability**: Clear migration path from SQLite to PostgreSQL
- **Compliance**: Audit logging, data retention policies, GDPR-compliant deletion

All entities are designed to support the functional requirements from the specification while maintaining data consistency and security.
