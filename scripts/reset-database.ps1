# Reset Database Script
# This script performs a clean database reset by:
# 1. Stopping any running Node.js processes (backend server)
# 2. Deleting the database files
# 3. Recreating the database schema
# 4. Seeding the database with test data

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATL Database Reset Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the project root directory (parent of scripts/)
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$dataPath = Join-Path $projectRoot "backend\data"
$dbFile = Join-Path $dataPath "battle.db"
$dbJournal = Join-Path $dataPath "battle.db-journal"

Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host "Backend path: $backendPath" -ForegroundColor Gray
Write-Host "Database path: $dbFile" -ForegroundColor Gray
Write-Host ""

# Step 1: Stop any running Node.js processes
Write-Host "[1/4] Stopping Node.js processes..." -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "  Found $($nodeProcesses.Count) Node.js process(es). Stopping..." -ForegroundColor Gray
        $nodeProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Host "  Node.js processes stopped." -ForegroundColor Green
    } else {
        Write-Host "  No Node.js processes running." -ForegroundColor Gray
    }
} catch {
    Write-Host "  Warning: Could not stop Node.js processes: $_" -ForegroundColor Yellow
}

# Step 2: Delete database files
Write-Host ""
Write-Host "[2/4] Deleting database files..." -ForegroundColor Yellow

$deletedFiles = 0

if (Test-Path $dbFile) {
    try {
        Remove-Item $dbFile -Force
        Write-Host "  Deleted: battle.db" -ForegroundColor Green
        $deletedFiles++
    } catch {
        Write-Host "  Error: Could not delete battle.db - $_" -ForegroundColor Red
        Write-Host "  Please close any applications using the database and try again." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  battle.db not found (already clean)" -ForegroundColor Gray
}

if (Test-Path $dbJournal) {
    try {
        Remove-Item $dbJournal -Force
        Write-Host "  Deleted: battle.db-journal" -ForegroundColor Green
        $deletedFiles++
    } catch {
        Write-Host "  Warning: Could not delete battle.db-journal - $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  battle.db-journal not found" -ForegroundColor Gray
}

if ($deletedFiles -eq 0) {
    Write-Host "  No database files to delete." -ForegroundColor Gray
}

# Step 3: Recreate database schema
Write-Host ""
Write-Host "[3/4] Recreating database schema..." -ForegroundColor Yellow
Write-Host "  Running: npx prisma db push" -ForegroundColor Gray

Push-Location $backendPath
try {
    $output = npx prisma db push --skip-generate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Database schema created successfully." -ForegroundColor Green
    } else {
        Write-Host "  Error creating database schema:" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        Pop-Location
        exit 1
    }
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Step 4: Seed the database
Write-Host ""
Write-Host "[4/4] Seeding database with test data..." -ForegroundColor Yellow
Write-Host "  Running: npm run prisma:seed" -ForegroundColor Gray

Push-Location $backendPath
try {
    npm run prisma:seed
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Database Reset Complete!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Test Credentials:" -ForegroundColor Cyan
        Write-Host "  Admin:     admin@batl.example.com / ChangeMe123!" -ForegroundColor White
        Write-Host "  Organizer: organizer@batl.example.com / Organizer123!" -ForegroundColor White
        Write-Host "  Player:    player@batl.example.com / Player123!" -ForegroundColor White
        Write-Host ""
        Write-Host "To start the backend server, run:" -ForegroundColor Cyan
        Write-Host "  cd backend && npm run dev" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "  Error seeding database." -ForegroundColor Red
        Pop-Location
        exit 1
    }
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
