#!/usr/bin/env pwsh
# Start a public Cloudflare tunnel to expose local Dograh API (port 8000) for telephony webhooks
# Usage: .\scripts\start_tunnel.ps1

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir   = Split-Path -Parent $ScriptDir
$EnvFile   = Join-Path $BaseDir 'api/.env'

Write-Host "Starting Cloudflare Tunnel for port 8000..." -ForegroundColor Cyan

# Check if cloudflared is installed
$cf = Get-Command "cloudflared" -ErrorAction SilentlyContinue
if (-not $cf) {
    Write-Host "cloudflared is not found in PATH." -ForegroundColor Red
    exit 1
}

Write-Host "Creating quick tunnel on trycloudflare.com (protocol: http2)..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the tunnel when done." -ForegroundColor Gray
Write-Host ""

& cloudflared tunnel --protocol http2 --edge-ip-version 4 --url http://127.0.0.1:8000
