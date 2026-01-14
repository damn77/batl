# Cleanup script for tmpclaude temporary files
# These files are created by Claude Code CLI tool and can be safely deleted

Write-Host "Searching for tmpclaude-* files..." -ForegroundColor Cyan

# Find all tmpclaude files
$files = Get-ChildItem -Path . -Filter "tmpclaude-*" -File -Recurse -ErrorAction SilentlyContinue
$count = $files.Count

if ($count -eq 0) {
    Write-Host "No tmpclaude-* files found. Repository is clean!" -ForegroundColor Green
    exit 0
}

Write-Host "Found $count tmpclaude-* files" -ForegroundColor Yellow
Write-Host ""
Write-Host "Files to be deleted:" -ForegroundColor Yellow
$files | ForEach-Object { Write-Host "  $($_.FullName)" }
Write-Host ""

$response = Read-Host "Do you want to delete these files? (y/N)"

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "Deleting files..." -ForegroundColor Cyan
    $files | Remove-Item -Force
    Write-Host "[OK] Cleanup complete! Deleted $count files." -ForegroundColor Green
} else {
    Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    exit 0
}
