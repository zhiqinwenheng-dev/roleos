$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Require-Command([string]$Name, [string]$Hint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required. $Hint"
  }
}

$AutomationMode = $env:ROLEOS_AUTOMATION -eq "1"

function Ask-Value(
  [string]$Prompt,
  [string]$Default = "",
  [bool]$Required = $false,
  [string]$EnvKey = ""
) {
  if (-not [string]::IsNullOrWhiteSpace($EnvKey)) {
    $envValue = [Environment]::GetEnvironmentVariable($EnvKey)
    if (-not [string]::IsNullOrWhiteSpace($envValue)) {
      return $envValue
    }
  }

  if ($AutomationMode) {
    if (-not [string]::IsNullOrWhiteSpace($Default)) {
      return $Default
    }
    if ($Required) {
      if (-not [string]::IsNullOrWhiteSpace($EnvKey)) {
        throw "Missing required environment variable: $EnvKey"
      }
      throw "Missing required value: $Prompt"
    }
    return ""
  }

  while ($true) {
    $display = if ($Default) { "$Prompt [$Default]" } else { $Prompt }
    $value = Read-Host $display
    if ([string]::IsNullOrWhiteSpace($value)) {
      if ($Default) {
        return $Default
      }
      if (-not $Required) {
        return ""
      }
      Write-Host "This value is required."
      continue
    }
    return $value
  }
}

function Get-NodeMajorVersion {
  $raw = & node --version
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read Node.js version."
  }
  $version = $raw.Trim().TrimStart("v")
  $major = $version.Split(".")[0]
  return [int]$major
}

function Resolve-RoleosCli {
  $exeCandidates = @(
    (Join-Path $projectRoot "release\roleos-win32-x64.exe"),
    (Join-Path $projectRoot "release\roleos-win32-arm64.exe")
  )
  foreach ($candidate in $exeCandidates) {
    if (Test-Path $candidate) {
      return @{
        mode = "exe"
        path = $candidate
      }
    }
  }

  Require-Command "node" "Install Node.js 20+ from https://nodejs.org."
  Require-Command "npm" "Install npm with Node.js."
  $major = Get-NodeMajorVersion
  if ($major -lt 20) {
    throw "Node.js 20+ is required. Current major version: $major"
  }

  if (-not (Test-Path (Join-Path $projectRoot "dist\src\cli\main.js"))) {
    if (-not (Test-Path (Join-Path $projectRoot "node_modules"))) {
      & npm.cmd ci
    } else {
      & npm.cmd install --no-audit --no-fund
    }
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed."
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
      throw "npm run build failed."
    }
  }

  return @{
    mode = "node"
    path = (Join-Path $projectRoot "dist\src\cli\main.js")
  }
}

function Invoke-Roleos([hashtable]$Cli, [string[]]$CommandArgs, [switch]$AllowFailure) {
  Write-Host "[RUN] $($Cli.path) $($CommandArgs -join ' ')"
  if ($Cli.mode -eq "exe") {
    & $Cli.path @CommandArgs | Out-Host
  } else {
    & node $Cli.path @CommandArgs | Out-Host
  }

  if (($LASTEXITCODE -ne 0) -and (-not $AllowFailure)) {
    throw "RoleOS command failed: $($CommandArgs -join ' ')"
  }
  return $LASTEXITCODE
}

function Start-OpenClawContainer([string]$Image) {
  Require-Command "docker" "Install Docker Desktop first if you want local OpenClaw sidecar."
  try {
    & docker rm -f roleos-openclaw | Out-Null
  } catch {
    # ignore cleanup failure
  }
  & docker run -d --name roleos-openclaw -p 4310:4310 $Image | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to start OpenClaw container with image: $Image"
  }
}

Write-Host "RoleOS RS one-click installer"
Write-Host "--------------------------------"

$deployOpenClaw = Ask-Value "Start local OpenClaw container (yes/no)" "yes" $true "ROLEOS_DEPLOY_OPENCLAW"
$openClawImage = Ask-Value "OpenClaw image" "ghcr.io/openclaw/openclaw:latest" $true "ROLEOS_OPENCLAW_IMAGE"

if ($deployOpenClaw -eq "yes") {
  Start-OpenClawContainer -Image $openClawImage
  Write-Host "[OK] OpenClaw container started on 127.0.0.1:4310"
}

$openClawEndpointDefault = if ($deployOpenClaw -eq "yes") { "http://127.0.0.1:4310" } else { "http://localhost:4310" }
$openClawEndpoint = Ask-Value "OpenClaw endpoint" $openClawEndpointDefault $true "ROLEOS_OPENCLAW_ENDPOINT"
$openClawApiKey = Ask-Value "OpenClaw API key(optional)" "" $false "ROLEOS_OPENCLAW_API_KEY"
$modelApiKey = Ask-Value "Model API key" "" $true "ROLEOS_MODEL_API_KEY"
$feishuAppId = Ask-Value "Feishu App ID(optional)" "feishu-app-id" $false "ROLEOS_FEISHU_APP_ID"
$feishuAppSecret = Ask-Value "Feishu App Secret(optional)" "feishu-app-secret" $false "ROLEOS_FEISHU_APP_SECRET"
$starterKitId = Ask-Value "Starter Kit ID" "content-starter-kit" $true "ROLEOS_STARTER_KIT_ID"
$firstTeamIntent = Ask-Value "First team run intent" "Generate an onboarding-ready starter output." $true "ROLEOS_FIRST_TEAM_INTENT"

$cli = Resolve-RoleosCli

$setupArgs = @(
  "/roleos",
  "setup",
  "--yes",
  "--openclaw-endpoint",
  $openClawEndpoint,
  "--model-key",
  $modelApiKey,
  "--starter-kit",
  $starterKitId,
  "--feishu-app-id",
  $feishuAppId,
  "--feishu-app-secret",
  $feishuAppSecret
)
if (-not [string]::IsNullOrWhiteSpace($openClawApiKey)) {
  $setupArgs += @("--openclaw-key", $openClawApiKey)
}

$null = Invoke-Roleos -Cli $cli -CommandArgs $setupArgs
Write-Host "[OK] Setup completed."

$doctorCode = Invoke-Roleos -Cli $cli -CommandArgs @("/roleos", "doctor") -AllowFailure
if ($doctorCode -eq 0) {
  Write-Host "[OK] Doctor checks passed."
} else {
  Write-Warning "Doctor checks reported issues. You can rerun: /roleos doctor"
}

$teamCode = Invoke-Roleos -Cli $cli -CommandArgs @(
  "/roleos",
  "team",
  "content-team-mvp",
  "--intent",
  $firstTeamIntent
) -AllowFailure
if ($teamCode -eq 0) {
  Write-Host "[OK] First team run succeeded."
} else {
  Write-Warning "First team run failed. Re-check model/OpenClaw/Feishu credentials."
}

Write-Host ""
Write-Host "RS local deployment completed."
Write-Host "Config: .roleos/config/self-hosted.config.json"
Write-Host "State:  .roleos/state/self-hosted-state.json"
Write-Host "Try:    /roleos role | /roleos kit | /roleos team content-team-mvp"
