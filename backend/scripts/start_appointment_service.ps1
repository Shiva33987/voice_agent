#!/usr/bin/env pwsh
# Start the Appointment Service on port 8080 for Dograh Voice Agents
# Usage: .\scripts\start_appointment_service.ps1

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$PythonExe = Join-Path $RepoRoot "venv\Scripts\python.exe"

Write-Host "Starting Dograh Appointment Booking Service on http://localhost:8080..." -ForegroundColor Cyan
Write-Host "Web Dashboard: http://localhost:8080/dashboard" -ForegroundColor Green
Write-Host "Swagger Docs:  http://localhost:8080/docs" -ForegroundColor Green
Write-Host ""

& $PythonExe (Join-Path $ScriptDir "appointment_service.py")
