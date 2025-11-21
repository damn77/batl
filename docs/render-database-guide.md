# Render Database Connection Guide

Guide for connecting to and managing the BATL PostgreSQL database on Render.

## Prerequisites

- Node.js 20+
- Access to Render Dashboard
- Local clone of the BATL repository

## Getting the Database Connection String

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your **batl-db** database
3. Click **Info** tab
4. Copy the **External Database URL**

Example format:
```
postgresql://batl:PASSWORD@dpg-xxx.oregon-postgres.render.com/batl
```

## Seeding the Database

### Step 1: Set Environment Variable

**PowerShell:**
```powershell
$env:DATABASE_URL="postgresql://batl:YOUR_PASSWORD@dpg-xxx.oregon-postgres.render.com/batl"
```

**Bash/Git Bash:**
```bash
export DATABASE_URL="postgresql://batl:YOUR_PASSWORD@dpg-xxx.oregon-postgres.render.com/batl"
```

### Step 2: Navigate to Backend Directory

```bash
cd backend
```

### Step 3: Regenerate Prisma Client

This ensures the client matches the PostgreSQL schema:

```bash
npx prisma generate
```

### Step 4: Run Seed Script

```bash
npx prisma db seed
```

Expected output:
```
🌱 Starting comprehensive database seed...
👥 Creating users with different roles...
✅ Database seed completed successfully!
```

## Useful Commands

### View Database in Prisma Studio

```powershell
$env:DATABASE_URL="postgresql://..."
npx prisma studio
```

Opens a web UI at `http://localhost:5555` to browse/edit data.

### Push Schema Changes

If you modify `schema.prisma` and want to update the remote database:

```powershell
$env:DATABASE_URL="postgresql://..."
npx prisma db push
```

### Reset Database

**Warning:** This deletes all data!

```powershell
$env:DATABASE_URL="postgresql://..."
npx prisma db push --force-reset
npx prisma db seed
```

## Troubleshooting

### Error: URL must start with `file:`

**Cause:** Prisma client was generated with SQLite schema.

**Fix:** Regenerate the client:
```bash
npx prisma generate
```

### Error: Connection refused

**Cause:** External connections may be disabled.

**Fix:** In Render Dashboard → batl-db → Access Control, ensure external connections are allowed.

### Error: Authentication failed

**Cause:** Password contains special characters that need escaping.

**Fix:** URL-encode special characters in the password, or copy the connection string directly from Render Dashboard.

## Default Seed Data

The seed script creates:

| Type | Data |
|------|------|
| **Users** | Admin, Organizer, Player accounts |
| **Player Profiles** | 6 test players with birth dates and genders |
| **Categories** | 10 common tournament categories |

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@batl.example.com` | `ChangeMe123!` |
| Organizer | `organizer@batl.example.com` | `OrgPassword123!` |
| Player | `player@batl.example.com` | `PlayerPass123!` |

**Important:** Change these passwords in production!

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://batl-frontend.onrender.com` |
| `SESSION_SECRET` | Session encryption key | (auto-generated) |
| `ADMIN_EMAIL` | Initial admin email | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Initial admin password | `SecurePassword123!` |
