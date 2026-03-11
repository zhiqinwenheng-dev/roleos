$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $projectRoot "rolebc-test-main\rolebc-test-main"
$logsDir = Join-Path $projectRoot ".roleos\logs"

if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
  throw "Backend project not found: $projectRoot"
}
if (-not (Test-Path (Join-Path $frontendRoot "package.json"))) {
  throw "Frontend project not found: $frontendRoot"
}

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

function Test-ListeningPort([int]$Port) {
  try {
    $connections = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
    return $connections.Count -gt 0
  } catch {
    return $false
  }
}

function Wait-ForPort([int]$Port, [int]$TimeoutSeconds = 45) {
  for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
    if (Test-ListeningPort -Port $Port) {
      return $true
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Start-ServiceIfNeeded(
  [string]$Name,
  [int]$Port,
  [string]$WorkingDirectory,
  [string[]]$NpmArgs,
  [string]$StdoutLog,
  [string]$StderrLog
) {
  if (Test-ListeningPort -Port $Port) {
    Write-Host "[OK] $Name already running on port $Port."
    return
  }

  Write-Host "[INFO] Starting $Name ..."
  Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList $NpmArgs `
    -WorkingDirectory $WorkingDirectory `
    -WindowStyle Hidden `
    -RedirectStandardOutput $StdoutLog `
    -RedirectStandardError $StderrLog | Out-Null

  if (-not (Wait-ForPort -Port $Port)) {
    throw "$Name failed to start on port $Port. Check logs: $StdoutLog, $StderrLog"
  }
  Write-Host "[OK] $Name started on port $Port."
}

$backendOut = Join-Path $logsDir "backend-dev.out.log"
$backendErr = Join-Path $logsDir "backend-dev.err.log"
$frontendOut = Join-Path $logsDir "frontend-dev.out.log"
$frontendErr = Join-Path $logsDir "frontend-dev.err.log"

Start-ServiceIfNeeded `
  -Name "RoleOS Cloud API" `
  -Port 3000 `
  -WorkingDirectory $projectRoot `
  -NpmArgs @("run", "dev:cloud") `
  -StdoutLog $backendOut `
  -StderrLog $backendErr

Start-ServiceIfNeeded `
  -Name "RoleOS Web Frontend" `
  -Port 5173 `
  -WorkingDirectory $frontendRoot `
  -NpmArgs @("run", "dev") `
  -StdoutLog $frontendOut `
  -StderrLog $frontendErr

Write-Host ""
Write-Host "RoleOS local stack is ready:"
Write-Host "Web:      http://127.0.0.1:5173/"
Write-Host "Cloud C:  http://127.0.0.1:5173/app/cloud"
Write-Host "API:      http://127.0.0.1:3000/"
Write-Host "Portal:   http://127.0.0.1:3000/portal"
Write-Host ""
Write-Host "Logs:"
Write-Host "- $backendOut"
Write-Host "- $backendErr"
Write-Host "- $frontendOut"
Write-Host "- $frontendErr"
