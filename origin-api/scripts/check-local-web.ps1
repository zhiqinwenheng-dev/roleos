$ErrorActionPreference = "Stop"

function Test-ListeningPort([int]$Port) {
  try {
    $connections = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
    return $connections.Count -gt 0
  } catch {
    return $false
  }
}

function Get-StatusCode([string]$Url) {
  try {
    return (Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 8).StatusCode
  } catch {
    return 0
  }
}

$backendPort = 3000
$frontendPort = 5173

$backendListening = Test-ListeningPort -Port $backendPort
$frontendListening = Test-ListeningPort -Port $frontendPort

$frontendHome = Get-StatusCode -Url "http://127.0.0.1:$frontendPort/"
$frontendCloud = Get-StatusCode -Url "http://127.0.0.1:$frontendPort/app/cloud"
$backendHealthz = Get-StatusCode -Url "http://127.0.0.1:$backendPort/healthz"
$backendPlans = Get-StatusCode -Url "http://127.0.0.1:$backendPort/plans"

Write-Host "RoleOS local stack check"
Write-Host "------------------------"
Write-Host "Frontend port $frontendPort listening: $frontendListening"
Write-Host "Backend port $backendPort listening:   $backendListening"
Write-Host ""
Write-Host "HTTP status:"
Write-Host "GET / (frontend):            $frontendHome"
Write-Host "GET /app/cloud (frontend):   $frontendCloud"
Write-Host "GET /healthz (backend):      $backendHealthz"
Write-Host "GET /plans (backend):        $backendPlans"

$allOk =
  $frontendListening -and
  $backendListening -and
  ($frontendHome -eq 200) -and
  ($frontendCloud -eq 200) -and
  ($backendHealthz -eq 200) -and
  ($backendPlans -eq 200)

if ($allOk) {
  Write-Host ""
  Write-Host "[OK] Website and API are healthy."
  exit 0
}

Write-Host ""
Write-Host "[WARN] One or more checks failed. Run: npm run dev:stack:start"
exit 1
