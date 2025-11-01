# Kill eTennis Backend and Frontend Services
# This script kills processes running on ports 3000 (frontend) and 3001 (backend)

Write-Host "Killing eTennis services..." -ForegroundColor Cyan
Write-Host ""

# Kill process on port 3001 (Backend)
Write-Host "Checking for processes on port 3001 (Backend)..." -ForegroundColor Yellow
$backendProcess = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($backendProcess) {
    foreach ($pid in $backendProcess) {
        Write-Host "Found process $pid on port 3001" -ForegroundColor Green
        Stop-Process -Id $pid -Force
        Write-Host "Backend service killed" -ForegroundColor Green
    }
} else {
    Write-Host "No process found on port 3001" -ForegroundColor Gray
}

Write-Host ""

# Kill process on port 3000 (Frontend)
Write-Host "Checking for processes on port 3000 (Frontend)..." -ForegroundColor Yellow
$frontendProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($frontendProcess) {
    foreach ($pid in $frontendProcess) {
        Write-Host "Found process $pid on port 3000" -ForegroundColor Green
        Stop-Process -Id $pid -Force
        Write-Host "Frontend service killed" -ForegroundColor Green
    }
} else {
    Write-Host "No process found on port 3000" -ForegroundColor Gray
}

Write-Host ""

# Kill any remaining Node.js processes
Write-Host "Killing any remaining Node.js/nodemon processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node,nodemon -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "Killed $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done! All services should be stopped." -ForegroundColor Cyan
