#!/usr/bin/env pwsh
# Start Dograh services in development mode (Windows)
# Usage: .\scripts\start_services_dev.ps1 [-NoMigrations] [-IncludeTelephonyWorkers]
#
# Note: Telephony workers (ari_manager, campaign_orchestrator) are disabled by
# default on Windows because they use Unix signal handlers not supported by the
# Windows asyncio event loop.

Param(
    [switch]$NoMigrations,
    [switch]$IncludeTelephonyWorkers,
    [switch]$NoDockerCheck,
    [switch]$WithUI,
    [switch]$Wait
)

$ErrorActionPreference = 'Stop'

###############################################################################
### HELPER FUNCTIONS
###############################################################################

function Test-PortListening([string]$HostName, [int]$Port, [int]$TimeoutMs = 1000) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect($HostName, $Port, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        if (-not $success) {
            $client.Close()
            return $false
        }
        $client.EndConnect($iar)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Start-IndependentProcess([string]$CommandLine, [string]$CurrentDirectory) {
    try {
        $result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
            CommandLine = $CommandLine
            CurrentDirectory = $CurrentDirectory
        }
        if ($result.ReturnValue -eq 0 -and $result.ProcessId) {
            return [int]$result.ProcessId
        }
    } catch {
        # Fall back to Start-Process
    }
    $p = Start-Process cmd.exe -ArgumentList '/c', $CommandLine -PassThru -WindowStyle Hidden
    return $p.Id
}

function Test-DockerRunning {
    try {
        $null = & docker info 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Ensure-BackingServices([string]$BaseDir) {
    Write-Host "Checking backing services (PostgreSQL, Redis, MinIO)..."

    $dockerCmd = Get-Command 'docker' -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Host ""
        Write-Host "==========================================================================" -ForegroundColor Red
        Write-Host " [ERROR] 'docker' command was not found in your PATH." -ForegroundColor Red
        Write-Host " Dograh requires Docker Desktop to run PostgreSQL, Redis, and MinIO." -ForegroundColor Yellow
        Write-Host " Please install or start Docker Desktop and ensure it is in your PATH." -ForegroundColor Yellow
        Write-Host "==========================================================================" -ForegroundColor Red
        Write-Host ""
        exit 1
    }

    if (-not (Test-DockerRunning)) {
        Write-Host "Docker daemon is not running. Checking for Docker Desktop installation..." -ForegroundColor Yellow

        $candidates = @(
            (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\frontend\Docker Desktop.exe'),
            (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'),
            (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
            (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Docker Desktop.lnk')
        )

        $launched = $false
        foreach ($candidate in $candidates) {
            if (Test-Path $candidate) {
                Write-Host "Attempting to launch Docker Desktop ($candidate)..." -ForegroundColor Cyan
                try {
                    Start-Process $candidate
                    $launched = $true
                    break
                } catch {
                    # Continue checking other candidates
                }
            }
        }

        if ($launched) {
            Write-Host "Waiting up to 45 seconds for Docker Desktop engine to start..." -ForegroundColor Yellow
            for ($attempt = 1; $attempt -le 22; $attempt++) {
                Start-Sleep -Seconds 2
                if (Test-DockerRunning) {
                    Write-Host "Docker Desktop engine is ready!" -ForegroundColor Green
                    break
                }
            }
        }

        if (-not (Test-DockerRunning)) {
            Write-Host ""
            Write-Host "==========================================================================" -ForegroundColor Red
            Write-Host " [ERROR] Docker Desktop is not currently running." -ForegroundColor Red
            Write-Host " Dograh requires Docker to host PostgreSQL (port 5433) and Redis (6379)." -ForegroundColor Yellow
            Write-Host ""
            Write-Host " ACTION REQUIRED:" -ForegroundColor Cyan
            Write-Host " 1. Open 'Docker Desktop' from your Windows Start Menu / Taskbar." -ForegroundColor White
            Write-Host " 2. Wait until the whale icon indicates Docker Desktop is running." -ForegroundColor White
            Write-Host " 3. Re-run this script: .\scripts\start_services_dev.ps1" -ForegroundColor White
            Write-Host "==========================================================================" -ForegroundColor Red
            Write-Host ""
            exit 1
        }
    }

    # Ensure postgres (5433) and redis (6379) are active
    $pgPort    = 5433
    $redisPort = 6379
    $pgUp      = Test-PortListening -HostName '127.0.0.1' -Port $pgPort
    $redisUp   = Test-PortListening -HostName '127.0.0.1' -Port $redisPort

    if (-not $pgUp -or -not $redisUp) {
        $composeFile = Join-Path $BaseDir 'docker-compose-local.yaml'
        if (Test-Path $composeFile) {
            Write-Host "Starting local database and cache via docker-compose-local.yaml..." -ForegroundColor Cyan
            & docker compose -f $composeFile up -d
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Failed to start docker-compose-local.yaml containers." -ForegroundColor Red
                exit 1
            }

            Write-Host "Waiting for PostgreSQL (port $pgPort) to accept connections..."
            $ready = $false
            for ($i = 1; $i -le 15; $i++) {
                if (Test-PortListening -HostName '127.0.0.1' -Port $pgPort) {
                    $ready = $true
                    break
                }
                Start-Sleep -Seconds 1
            }

            if (-not $ready) {
                Write-Host "PostgreSQL did not become ready on port $pgPort. Run: docker compose -f docker-compose-local.yaml logs" -ForegroundColor Red
                exit 1
            }
            Write-Host "PostgreSQL and Redis are up and ready." -ForegroundColor Green
        }
    } else {
        Write-Host "PostgreSQL (port $pgPort) and Redis (port $redisPort) are already running." -ForegroundColor Green
    }
}

###############################################################################
### CONFIGURATION
###############################################################################

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir   = Split-Path -Parent $ScriptDir
Set-Location $BaseDir

$EnvFile    = if ($env:DOGRAH_ENV_FILE) { $env:DOGRAH_ENV_FILE } else { Join-Path $BaseDir 'api/.env' }
$RunDir     = Join-Path $BaseDir 'run'
$LogsRoot   = Join-Path $BaseDir 'logs'
$LatestDir  = Join-Path $LogsRoot 'latest'
$VenvPath   = Join-Path $BaseDir 'venv'
$PythonExe  = Join-Path $VenvPath 'Scripts\python.exe'
$NpmCmd     = if (Test-Path 'C:\Program Files\nodejs\npm.cmd') { 'C:\Program Files\nodejs\npm.cmd' } else { 'npm.cmd' }

Write-Host "Starting Dograh Services (DEV MODE) in BASE_DIR: $BaseDir"
Write-Host "Auto-reload enabled for api/ directory changes"
Write-Host "Environment file: $EnvFile"

###############################################################################
### 0) Verify Docker and backing infrastructure
###############################################################################

if (-not $NoDockerCheck) {
    Ensure-BackingServices -BaseDir $BaseDir
}

###############################################################################
### 1) Load environment variables
###############################################################################

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#')) {
            $parts = $line -split '=', 2
            if ($parts.Count -eq 2) {
                [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim().Trim('"'), 'Process')
            }
        }
    }
}

if (-not $env:UVICORN_BASE_PORT)   { $env:UVICORN_BASE_PORT = '8000' }

$HealthEndpoint    = '/api/v1/health'
$HealthMaxAttempts = if ($env:HEALTH_MAX_ATTEMPTS) { [int]$env:HEALTH_MAX_ATTEMPTS } else { 30 }
$HealthInterval    = if ($env:HEALTH_INTERVAL)     { [int]$env:HEALTH_INTERVAL }     else { 2 }

###############################################################################
### 2) Define services
###############################################################################

$serviceSpecs = @()

if ($IncludeTelephonyWorkers) {
    $serviceSpecs += @{ Name = 'ari_manager';           Cmd = "`"$PythonExe`" -m api.services.telephony.ari_manager" }
    $serviceSpecs += @{ Name = 'campaign_orchestrator';  Cmd = "`"$PythonExe`" -m api.services.campaign.campaign_orchestrator" }
}

$serviceSpecs += @{ Name = 'uvicorn'; Cmd = "`"$PythonExe`" -m uvicorn api.app:app --host 0.0.0.0 --port $($env:UVICORN_BASE_PORT) --reload --reload-dir api" }
$serviceSpecs += @{ Name = 'arq';     Cmd = "`"$PythonExe`" -m arq api.tasks.arq.WorkerSettings --custom-log-dict api.tasks.arq.LOG_CONFIG" }
$serviceSpecs += @{ Name = 'appointment_service'; Cmd = "`"$PythonExe`" scripts/appointment_service.py" }

###############################################################################
### 3) Activate virtual environment
###############################################################################

$VenvActivateScript = Join-Path $VenvPath 'Scripts/Activate.ps1'

if (Test-Path $VenvActivateScript) {
    . $VenvActivateScript
    Write-Host "Virtual environment activated: $VenvPath"
} else {
    Write-Host "Warning: Virtual environment not found at $VenvPath"
    Write-Host "Continuing without virtual environment activation..."
}

###############################################################################
### 4) Stop old services
###############################################################################

New-Item -ItemType Directory -Path $RunDir -Force | Out-Null

$serviceNamesToClean = @($serviceSpecs | ForEach-Object { $_.Name })
if ($WithUI) {
    $serviceNamesToClean += 'ui'
}

foreach ($svcName in $serviceNamesToClean) {
    $pidFile = Join-Path $RunDir "$svcName.pid"
    if (Test-Path $pidFile) {
        $oldPid = (Get-Content $pidFile -Raw).Trim()
        if ($oldPid) {
            $prev = $ErrorActionPreference; $ErrorActionPreference = 'SilentlyContinue'
            & taskkill /PID $oldPid /T /F 2>&1 | Out-Null
            $ErrorActionPreference = $prev
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
}

###############################################################################
### 5) Run migrations
###############################################################################

if (-not $NoMigrations) {
    Write-Host "Running database migrations (Alembic)..."
    & "$PythonExe" -m alembic -c (Join-Path $BaseDir 'api/alembic.ini') upgrade head
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "==========================================================================" -ForegroundColor Red
        Write-Host " [ERROR] Database migrations failed (Exit code: $LASTEXITCODE)!" -ForegroundColor Red
        Write-Host " Aborting service startup to prevent running services in an invalid state." -ForegroundColor Yellow
        Write-Host "==========================================================================" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
}

###############################################################################
### 6) Prepare logs
###############################################################################

New-Item -ItemType Directory -Path $LatestDir -Force | Out-Null
Get-ChildItem $LatestDir -Filter '*.log' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

###############################################################################
### 7) Start services
###############################################################################

foreach ($spec in $serviceSpecs) {
    $name    = $spec.Name
    $logPath = Join-Path $LatestDir "$name.log"
    $pidFile = Join-Path $RunDir "$name.pid"

    Write-Host "-> Starting $name"

    $wrapped = "cmd.exe /c `"$($spec.Cmd) >> `"$logPath`" 2>&1`""
    $procId = Start-IndependentProcess -CommandLine $wrapped -CurrentDirectory $BaseDir

    Set-Content -Path $pidFile -Value $procId
    Write-Host "   PID $procId -> $logPath"
}

###############################################################################
### 8) Wait for uvicorn health check
###############################################################################

$healthUrl = "http://127.0.0.1:$($env:UVICORN_BASE_PORT)$HealthEndpoint"
Write-Host "Waiting for uvicorn health check at $healthUrl ..."

$healthy = $false
for ($attempt = 1; $attempt -le $HealthMaxAttempts; $attempt++) {
    try {
        $httpCode = curl.exe -s -o /dev/null -w "%{http_code}" $healthUrl
        if ($httpCode -eq '200') {
            Write-Host "OK uvicorn healthy (attempt $attempt)"
            $healthy = $true
            break
        }
    } catch {
        # connection refused / timeout / non-200 — keep polling
    }
    Start-Sleep -Seconds $HealthInterval
}

if (-not $healthy) {
    Write-Host "FAIL uvicorn FAILED health check after $HealthMaxAttempts attempts."
    Write-Host "     Check logs: Get-Content logs/latest/uvicorn.log -Wait"
    exit 1
}

###############################################################################
### 9) Summary
###############################################################################

Write-Host ""
Write-Host "------------------------------------------------------"
Write-Host "Mode: DEVELOPMENT (auto-reload enabled)"
Write-Host ""
foreach ($spec in $serviceSpecs) {
    $procId = (Get-Content (Join-Path $RunDir "$($spec.Name).pid") -Raw).Trim()
    Write-Host "  $($spec.Name) (PID $procId) -> logs/latest/$($spec.Name).log"
}
Write-Host ""
Write-Host "Health: curl.exe http://localhost:$($env:UVICORN_BASE_PORT)/api/v1/health"
Write-Host "Logs:   Get-Content logs/latest/*.log -Wait"
Write-Host "Stop:   .\stop.ps1 (or .\scripts\stop_services.ps1)"
Write-Host "------------------------------------------------------"

if ($WithUI) {
    Write-Host ""
    Write-Host "Starting Frontend (Next.js) dev server..." -ForegroundColor Cyan
    $uiDir = Join-Path $BaseDir 'ui'
    $uiLog = Join-Path $LatestDir "ui.log"
    $wrapped = "cmd.exe /c `"$NpmCmd`" run dev >> `"$uiLog`" 2>&1"
    $uiPid = Start-IndependentProcess -CommandLine $wrapped -CurrentDirectory $uiDir
    Set-Content -Path (Join-Path $RunDir "ui.pid") -Value $uiPid
    Write-Host "UI will be accessible at: http://localhost:3000 (PID $uiPid -> logs/latest/ui.log)" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "To start the frontend UI, open a new terminal and run:" -ForegroundColor Cyan
    Write-Host "  cd ui; npm run dev" -ForegroundColor White
}

if ($Wait) {
    Write-Host ""
    Write-Host "Services are running. Waiting (Press Ctrl+C to stop)..."
    try {
        $pidsToWait = @()
        foreach ($spec in $serviceSpecs) {
            $pidFile = Join-Path $RunDir "$($spec.Name).pid"
            if (Test-Path $pidFile) {
                $p = (Get-Content $pidFile -Raw).Trim()
                if ($p) { $pidsToWait += [int]$p }
            }
        }
        if ($WithUI -and (Test-Path (Join-Path $RunDir "ui.pid"))) {
            $p = (Get-Content (Join-Path $RunDir "ui.pid") -Raw).Trim()
            if ($p) { $pidsToWait += [int]$p }
        }
        if ($pidsToWait.Count -gt 0) {
            Wait-Process -Id $pidsToWait
        } else {
            while ($true) { Start-Sleep -Seconds 5 }
        }
        while ($true) { Start-Sleep -Seconds 5 }
    } finally {
        & (Join-Path $ScriptDir 'stop_services.ps1')
    }
}
