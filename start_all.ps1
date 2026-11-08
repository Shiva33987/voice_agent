# ====================================================================
# Dograh - Complete One-Click Project Startup Script
# ====================================================================
$ErrorActionPreference = 'Continue'
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = $ScriptDir
if (Test-Path (Join-Path $ScriptDir "scripts")) {
    $RepoRoot = $ScriptDir
} else {
    $RepoRoot = Split-Path -Parent $ScriptDir
}
Set-Location $RepoRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Starting Dograh Voice AI Stack & Appointment Engine    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Docker Stack
Write-Host "`n[1/4] Starting Docker services (Postgres, Redis, MinIO, API, UI, Tunnel)..." -ForegroundColor Yellow
docker compose --profile tunnel up -d

# 2. Wait for containers
Write-Host "`n[2/4] Verifying services are healthy..." -ForegroundColor Yellow
$maxRetries = 20
$ready = $false
for ($i = 0; $i -lt $maxRetries; $i++) {
    $apiState = docker inspect -f '{{.State.Status}}' dograh-main-api-1 2>$null
    $uiState = docker inspect -f '{{.State.Status}}' dograh-main-ui-1 2>$null
    if ($apiState -eq 'running' -and $uiState -eq 'running') {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host "Warning: Containers are still starting up..." -ForegroundColor Yellow
} else {
    Write-Host "All Docker containers are running!" -ForegroundColor Green
}

# 3. Apply UI & API enhancements (Call Recordings, Delete button, Ultra-Premium Glassmorphism)
Write-Host "`n[3/4] Ensuring UI enhancements & Delete endpoints are loaded..." -ForegroundColor Yellow
docker cp scripts/ultra_premium_glassmorphism.css dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker cp scripts/clean_and_inject_css.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec -u 0 dograh-main-ui-1 node /app/clean_and_inject_css.js 2>&1 | Out-Null

docker cp scripts/patch_workflow_delete.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker cp scripts/patch_recordings_page.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker cp scripts/patch_remove_overview.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker cp scripts/patch_remove_header_links.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker cp scripts/patch_attractive_profile.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker cp scripts/patch_remove_star_badge.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker cp scripts/patch_remove_manage_section.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker cp scripts/patch_remove_theme_toggle.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker cp scripts/patch_remove_version_info.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_workflow_delete.js 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_recordings_page.js 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_remove_overview.js 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_remove_header_links.js 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_attractive_profile.js 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_remove_star_badge.js 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_remove_manage_section.js 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_remove_theme_toggle.js 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_remove_version_info.js 2>&1 | Out-Null
docker cp scripts/patch_remove_brand_logo.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_remove_brand_logo.js 2>&1 | Out-Null
docker cp scripts/patch_disable_chatwoot.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_disable_chatwoot.js 2>&1 | Out-Null
docker cp scripts/patch_remove_dograh_word.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_remove_dograh_word.js 2>&1 | Out-Null
docker cp scripts/patch_fix_dialog_focus.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_fix_dialog_focus.js 2>&1 | Out-Null
docker cp scripts/patch_aria_hidden_safe.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_aria_hidden_safe.js 2>&1 | Out-Null
docker cp scripts/patch_remove_docs_link.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_remove_docs_link.js 2>&1 | Out-Null

docker cp scripts/agent_favicon.ico dograh-main-ui-1:/app/.next/server/app/favicon.ico.body 2>&1 | Out-Null
docker cp scripts/agent_favicon.ico dograh-main-ui-1:/app/.next/server/app/favicon.ico 2>&1 | Out-Null
docker cp scripts/agent_favicon.ico dograh-main-ui-1:/app/public/favicon.ico 2>&1 | Out-Null
docker cp scripts/agent_favicon.png dograh-main-ui-1:/app/public/favicon.png 2>&1 | Out-Null
docker cp scripts/agent_favicon.png dograh-main-ui-1:/app/public/dograh-mark.png 2>&1 | Out-Null
docker cp scripts/patch_title_and_metadata.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_title_and_metadata.js 2>&1 | Out-Null
docker cp scripts/patch_nav_names.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_nav_names.js 2>&1 | Out-Null
docker cp scripts/patch_provider_delete.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_provider_delete.js 2>&1 | Out-Null
docker cp scripts/build_guide_jsx.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker cp scripts/patch_instruction_guide.js dograh-main-ui-1:/app/ 2>&1 | Out-Null
docker exec dograh-main-ui-1 node /app/patch_instruction_guide.js 2>&1 | Out-Null

docker cp scripts/patch_api_delete.py dograh-main-api-1:/app/ 2>&1 | Out-Null
$apiPatchOutput = docker exec dograh-main-api-1 python /app/patch_api_delete.py 2>$null
if ($apiPatchOutput -match 'successfully') {
    docker restart dograh-main-api-1 2>&1 | Out-Null
}

# 4. Start Appointment Service (Port 8080) if not running
Write-Host "`n[4/4] Checking Appointment Booking Service (Port 8080)..." -ForegroundColor Yellow
$portOpen = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 8080)
    $tcp.Close()
    $portOpen = $true
} catch {
    $portOpen = $false
}

if ($portOpen) {
    Write-Host "Appointment Service is already active on port 8080." -ForegroundColor Green
} else {
    Write-Host "Launching Appointment Service on port 8080..." -ForegroundColor Cyan
    $PythonExe = Join-Path $RepoRoot "venv\Scripts\python.exe"
    Start-Process -FilePath $PythonExe -ArgumentList (Join-Path $RepoRoot "scripts\appointment_service.py") -WindowStyle Minimized
    Start-Sleep -Seconds 2
    Write-Host "Appointment Service launched!" -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   Dograh Voice AI System is ONLINE & READY!              " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host " Web Applications:" -ForegroundColor White
Write-Host "  -> Main UI:             http://localhost:3010" -ForegroundColor Cyan
Write-Host "  -> Voice Agents:        http://localhost:3010/workflow" -ForegroundColor Cyan
Write-Host "  -> Call Recordings:     http://localhost:3010/recordings" -ForegroundColor Cyan
Write-Host "  -> Telephony / Numbers: http://localhost:3010/telephony" -ForegroundColor Cyan
Write-Host "  -> Appointments DB:     http://localhost:8080/dashboard" -ForegroundColor Cyan
Write-Host "  -> MinIO Audio Storage: http://localhost:9001" -ForegroundColor Cyan
Write-Host "     * MinIO User:        dograh35bd22798c3e" -ForegroundColor Gray
Write-Host "     * MinIO Pass:        75712913f2aad1a53341853de22c06d7e01c29edf0be56bfa0cce0255d92e4a2" -ForegroundColor Gray
Write-Host ""
Write-Host " Backend & API:" -ForegroundColor White
Write-Host "  -> FastAPI Backend:     http://localhost:8000" -ForegroundColor Cyan
Write-Host "  -> Health Endpoint:     http://localhost:8000/api/v1/health" -ForegroundColor Cyan
Write-Host ""

