#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Please install Docker Desktop / Docker Engine first."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Current environment does not support 'docker compose'. Please upgrade Docker."
  exit 1
fi

ask() {
  local prompt="$1"
  local default="$2"
  local value
  read -r -p "$prompt [$default]: " value
  if [[ -z "$value" ]]; then
    echo "$default"
  else
    echo "$value"
  fi
}

AUTOMATION_MODE="${ROLEOS_AUTOMATION:-0}"

get_value() {
  local env_key="$1"
  local prompt="$2"
  local default="${3:-}"
  local required="${4:-no}"
  local env_value="${!env_key:-}"

  if [[ -n "$env_value" ]]; then
    echo "$env_value"
    return
  fi

  if [[ "$AUTOMATION_MODE" == "1" ]]; then
    if [[ -n "$default" ]]; then
      echo "$default"
      return
    fi
    if [[ "$required" == "yes" ]]; then
      echo "Missing required environment variable: $env_key"
      exit 1
    fi
    echo ""
    return
  fi

  ask "$prompt" "$default"
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    date +%s%N | sha256sum | awk '{print $1}'
  fi
}

PORT="$(get_value "PORT" "Service port" "3000" "yes")"
SUPABASE_URL="$(get_value "SUPABASE_URL" "SUPABASE_URL" "https://your-project-ref.supabase.co" "yes")"
SUPABASE_SERVICE_ROLE_KEY="$(get_value "SUPABASE_SERVICE_ROLE_KEY" "SUPABASE_SERVICE_ROLE_KEY" "replace-with-service-role-key" "yes")"
ROLEOS_ALLOWED_ORIGINS="$(get_value "ROLEOS_ALLOWED_ORIGINS" "ROLEOS_ALLOWED_ORIGINS" "https://app.yourdomain.com" "yes")"
DEPLOY_OPENCLAW="$(get_value "ROLEOS_DEPLOY_OPENCLAW" "Deploy OpenClaw sidecar (yes/no)" "yes" "yes")"
ROLEOS_OPENCLAW_IMAGE="$(get_value "ROLEOS_OPENCLAW_IMAGE" "ROLEOS_OPENCLAW_IMAGE" "ghcr.io/openclaw/openclaw:latest" "yes")"
if [[ "$DEPLOY_OPENCLAW" == "yes" ]]; then
  ROLEOS_OPENCLAW_ENDPOINT="http://openclaw:4310"
else
  ROLEOS_OPENCLAW_ENDPOINT="$(get_value "ROLEOS_OPENCLAW_ENDPOINT" "ROLEOS_OPENCLAW_ENDPOINT" "http://localhost:4310" "yes")"
fi
ROLEOS_OPENCLAW_API_KEY="$(get_value "ROLEOS_OPENCLAW_API_KEY" "ROLEOS_OPENCLAW_API_KEY(optional)" "")"
ROLEOS_PERSONAL_GATEWAY_BASE_URL="$(get_value "ROLEOS_PERSONAL_GATEWAY_BASE_URL" "ROLEOS_PERSONAL_GATEWAY_BASE_URL" "https://your-gateway.example.com/pay" "yes")"
FEISHU_WEBHOOK_URL="$(get_value "FEISHU_WEBHOOK_URL" "FEISHU_WEBHOOK_URL(optional)" "")"

if [[ "$AUTOMATION_MODE" == "1" ]]; then
  if [[ "$SUPABASE_URL" == "https://your-project-ref.supabase.co" ]]; then
    echo "SUPABASE_URL must be provided when ROLEOS_AUTOMATION=1."
    exit 1
  fi
  if [[ "$SUPABASE_SERVICE_ROLE_KEY" == "replace-with-service-role-key" ]]; then
    echo "SUPABASE_SERVICE_ROLE_KEY must be provided when ROLEOS_AUTOMATION=1."
    exit 1
  fi
fi

ROLEOS_JWT_SECRET="$(random_secret)"
ROLEOS_ADMIN_API_KEY="$(random_secret)"
ROLEOS_PAYMENT_WEBHOOK_SECRET="$(random_secret)"

cat > .env.production <<EOF
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
EOF

echo ".env.production generated."
if [[ "$DEPLOY_OPENCLAW" == "yes" ]]; then
  docker compose --profile with-openclaw up -d --build
else
  docker compose up -d --build
fi

if command -v curl >/dev/null 2>&1; then
  echo "Running health check..."
  curl -fsS "http://localhost:${PORT}/healthz" >/dev/null || true
fi

echo
echo "Cloud deployment completed."
echo "Cloud API: http://localhost:${PORT}"
echo "Portal:    http://localhost:${PORT}/portal"
echo "Admin key: $ROLEOS_ADMIN_API_KEY"
