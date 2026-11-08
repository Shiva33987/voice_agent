#!/usr/bin/env pwsh
# Run Alembic database migrations (Windows)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir   = Split-Path -Parent $ScriptDir
Set-Location $BaseDir

# Ensure repository root is importable for Alembic env/module resolution.
if ($env:PYTHONPATH) {
    $env:PYTHONPATH = "$BaseDir;$($env:PYTHONPATH)"
} else {
    $env:PYTHONPATH = $BaseDir
}

$EnvFile = Join-Path $BaseDir 'api/.env'

# Load environment variables
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
} else {
    Write-Host "Error: Environment file $EnvFile not found." -ForegroundColor Red
    exit 1
}

# Verify database is reachable before migrating
$pgPort = 5433
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect("127.0.0.1", $pgPort, $null, $null)
    if (-not $iar.AsyncWaitHandle.WaitOne(1000, $false)) {
        Write-Host "Error: PostgreSQL is not reachable on port $pgPort. Make sure Docker is running and run: docker compose -f docker-compose-local.yaml up -d" -ForegroundColor Red
        exit 1
    }
    $client.EndConnect($iar)
    $client.Close()
} catch {
    Write-Host "Error: Could not connect to PostgreSQL on port $pgPort. Make sure Docker is running." -ForegroundColor Red
    exit 1
}

# Run migrations
alembic -c api/alembic.ini upgrade head
