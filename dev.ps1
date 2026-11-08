#!/usr/bin/env pwsh
# Start Dograh full-stack development environment (Backend + Database + Frontend)
# Usage: .\dev.ps1

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $ScriptDir 'scripts\start_services_dev.ps1') -WithUI @args
