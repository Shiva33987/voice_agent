#!/usr/bin/env pwsh
# Stop Dograh services (Backend + Workers + Frontend)
# Usage: .\stop.ps1

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $ScriptDir 'scripts\stop_services.ps1') @args
