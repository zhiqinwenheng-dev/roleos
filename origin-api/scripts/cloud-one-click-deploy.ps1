$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker is not installed. Please install Docker Desktop first."
}

docker compose version | Out-Null

function Ask-Value(
  [string]$Prompt,
  [string]$Default,
  [bool]$Required = $false,
  [string]$EnvKey = ""
) {
  if (-not [string]::IsNullOrWhiteSpace($EnvKey)) {
    $envValue = [Environment]::GetEnvironmentVariable($EnvKey)
    if (-not [string]::IsNullOrWhiteSpace($envValue)) {
      return $envValue
    }
  }

  $automationMode = $env:ROLEOS_AUTOMATION -eq "1"
  if ($automationMode) {
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

  $value = Read-Host "$Prompt [$Default]"
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $Default
  }
  return $value
}

function New-Secret {
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

$PORT = Ask-Value "Service port" "3000" $true "PORT"
$SUPABASE_URL = Ask-Value "SUPABASE_URL" "https://your-project-ref.supabase.co" $true "SUPABASE_URL"
$SUPABASE_SERVICE_ROLE_KEY = Ask-Value "SUPABASE_SERVICE_ROLE_KEY" "replace-with-service-role-key" $true "SUPABASE_SERVICE_ROLE_KEY"
$ROLEOS_ALLOWED_ORIGINS = Ask-Value "ROLEOS_ALLOWED_ORIGINS" "https://app.yourdomain.com" $true "ROLEOS_ALLOWED_ORIGINS"
$DEPLOY_OPENCLAW = Ask-Value "Deploy OpenClaw sidecar (yes/no)" "yes" $true "ROLEOS_DEPLOY_OPENCLAW"
$ROLEOS_OPENCLAW_IMAGE = Ask-Value "ROLEOS_OPENCLAW_IMAGE" "ghcr.io/openclaw/openclaw:latest" $true "ROLEOS_OPENCLAW_IMAGE"
if ($DEPLOY_OPENCLAW -eq "yes") {
  $ROLEOS_OPENCLAW_ENDPOINT = "http://openclaw:4310"
} else {
  $ROLEOS_OPENCLAW_ENDPOINT = Ask-Value "ROLEOS_OPENCLAW_ENDPOINT" "http://localhost:4310" $true "ROLEOS_OPENCLAW_ENDPOINT"
}
$ROLEOS_OPENCLAW_API_KEY = Ask-Value "ROLEOS_OPENCLAW_API_KEY(optional)" "" $false "ROLEOS_OPENCLAW_API_KEY"
$ROLEOS_PERSONAL_GATEWAY_BASE_URL = Ask-Value "ROLEOS_PERSONAL_GATEWAY_BASE_URL" "https://your-gateway.example.com/pay" $true "ROLEOS_PERSONAL_GATEWAY_BASE_URL"
$FEISHU_WEBHOOK_URL = Ask-Value "FEISHU_WEBHOOK_URL(optional)" "" $false "FEISHU_WEBHOOK_URL"

if (($env:ROLEOS_AUTOMATION -eq "1") -and ($SUPABASE_URL -eq "https://your-project-ref.supabase.co")) {
  throw "SUPABASE_URL must be provided when ROLEOS_AUTOMATION=1."
}
if (($env:ROLEOS_AUTOMATION -eq "1") -and ($SUPABASE_SERVICE_ROLE_KEY -eq "replace-with-service-role-key")) {
  throw "SUPABASE_SERVICE_ROLE_KEY must be provided when ROLEOS_AUTOMATION=1."
}

$ROLEOS_JWT_SECRET = New-Secret
$ROLEOS_ADMIN_API_KEY = New-Secret
$ROLEOS_PAYMENT_WEBHOOK_SECRET = New-Secret

$envContent = @"
PORT=$PORT
ROLEOS_ROOT=.
ROLEOS_STORE_PROVIDER=supabase
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ROLEOS_JWT_SECRET=$ROLEOS_JWT_SECRET
ROLEOS_ADMIN_API_KEY=$ROLEOS_ADMIN_API_KEY
ROLEOS_PAYMENT_WEBHOOK_SECRET=$ROLEOS_PAYMENT_WEBHOOK_SECRET
ROLEOS_ALLOW_LEGACY_WEBHOOK_SECRET_HEADER=0
ROLEOS_DEFAULT_PLAN=starter
ROLEOS_PERSONAL_GATEWAY_BASE_URL=$ROLEOS_PERSONAL_GATEWAY_BASE_URL
ROLEOS_ALLOWED_ORIGINS=$ROLEOS_ALLOWED_ORIGINS
ROLEOS_OPENCLAW_ENDPOINT=$ROLEOS_OPENCLAW_ENDPOINT
ROLEOS_OPENCLAW_API_KEY=$ROLEOS_OPENCLAW_API_KEY
ROLEOS_OPENCLAW_IMAGE=$ROLEOS_OPENCLAW_IMAGE
FEISHU_WEBHOOK_URL=$FEISHU_WEBHOOK_URL
ROLEOS_RECONCILE_STALE_MINUTES=30
ROLEOS_RECONCILE_EXPIRE_MINUTES=1440
ROLEOS_RECONCILE_LIMIT=200
"@

Set-Content -Path ".env.production" -Value $envContent -Encoding UTF8
Write-Host ".env.production generated."

if ($DEPLOY_OPENCLAW -eq "yes") {
  docker compose --profile with-openclaw up -d --build
} else {
  docker compose up -d --build
}

try {
  Write-Host "Running health check..."
  Invoke-RestMethod -Uri "http://localhost:$PORT/healthz" | Out-Null
  Write-Host "Health check passed."
} catch {
  Write-Warning "Health check failed. Please verify service logs."
}

Write-Host ""
Write-Host "Cloud deployment completed."
Write-Host "Cloud API: http://localhost:$PORT"
Write-Host "Portal:    http://localhost:$PORT/portal"
Write-Host "Admin key: $ROLEOS_ADMIN_API_KEY"
