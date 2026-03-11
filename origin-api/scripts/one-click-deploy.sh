#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

require_cmd() {
  local name="$1"
  local hint="$2"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "$name is required. $hint"
    exit 1
  fi
}

ask() {
  local prompt="$1"
  local default="${2:-}"
  local required="${3:-no}"
  local value
  while true; do
    if [[ -n "$default" ]]; then
      read -r -p "$prompt [$default]: " value
    else
      read -r -p "$prompt: " value
    fi

    if [[ -z "$value" ]]; then
      if [[ -n "$default" ]]; then
        echo "$default"
        return
      fi
      if [[ "$required" == "yes" ]]; then
        echo "This value is required."
        continue
      fi
      echo ""
      return
    fi
    echo "$value"
    return
  done
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

  ask "$prompt" "$default" "$required"
}

resolve_cli() {
  local linux_x64="$PROJECT_ROOT/release/roleos-linux-x64"
  local linux_arm64="$PROJECT_ROOT/release/roleos-linux-arm64"
  local darwin_x64="$PROJECT_ROOT/release/roleos-darwin-x64"
  local darwin_arm64="$PROJECT_ROOT/release/roleos-darwin-arm64"

  for candidate in "$linux_x64" "$linux_arm64" "$darwin_x64" "$darwin_arm64"; do
    if [[ -f "$candidate" ]]; then
      chmod +x "$candidate"
      echo "exe::$candidate"
      return
    fi
  done

  require_cmd node "Install Node.js 20+ from https://nodejs.org."
  require_cmd npm "Install npm with Node.js."

  local node_major
  node_major="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$node_major" -lt 20 ]]; then
    echo "Node.js 20+ is required. Current major version: $node_major"
    exit 1
  fi

  if [[ ! -f "$PROJECT_ROOT/dist/src/cli/main.js" ]]; then
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
      npm ci
    else
      npm install --no-audit --no-fund
    fi
    npm run build
  fi

  echo "node::$PROJECT_ROOT/dist/src/cli/main.js"
}

run_roleos() {
  local cli_mode="$1"
  local cli_path="$2"
  shift 2
  if [[ "$cli_mode" == "exe" ]]; then
    "$cli_path" "$@"
  else
    node "$cli_path" "$@"
  fi
}

start_openclaw() {
  local image="$1"
  require_cmd docker "Install Docker first if you want local OpenClaw sidecar."
  docker rm -f roleos-openclaw >/dev/null 2>&1 || true
  docker run -d --name roleos-openclaw -p 4310:4310 "$image" >/dev/null
}

echo "RoleOS RS one-click installer"
echo "--------------------------------"

DEPLOY_OPENCLAW="$(get_value "ROLEOS_DEPLOY_OPENCLAW" "Start local OpenClaw container (yes/no)" "yes" "yes")"
OPENCLAW_IMAGE="$(get_value "ROLEOS_OPENCLAW_IMAGE" "OpenClaw image" "ghcr.io/openclaw/openclaw:latest")"

if [[ "$DEPLOY_OPENCLAW" == "yes" ]]; then
  start_openclaw "$OPENCLAW_IMAGE"
  echo "[OK] OpenClaw container started on 127.0.0.1:4310"
fi

if [[ "$DEPLOY_OPENCLAW" == "yes" ]]; then
  OPENCLAW_ENDPOINT_DEFAULT="http://127.0.0.1:4310"
else
  OPENCLAW_ENDPOINT_DEFAULT="http://localhost:4310"
fi

OPENCLAW_ENDPOINT="$(get_value "ROLEOS_OPENCLAW_ENDPOINT" "OpenClaw endpoint" "$OPENCLAW_ENDPOINT_DEFAULT" "yes")"
OPENCLAW_API_KEY="$(get_value "ROLEOS_OPENCLAW_API_KEY" "OpenClaw API key(optional)" "")"
MODEL_API_KEY="$(get_value "ROLEOS_MODEL_API_KEY" "Model API key" "" "yes")"
FEISHU_APP_ID="$(get_value "ROLEOS_FEISHU_APP_ID" "Feishu App ID(optional)" "feishu-app-id")"
FEISHU_APP_SECRET="$(get_value "ROLEOS_FEISHU_APP_SECRET" "Feishu App Secret(optional)" "feishu-app-secret")"
STARTER_KIT_ID="$(get_value "ROLEOS_STARTER_KIT_ID" "Starter Kit ID" "content-starter-kit" "yes")"
FIRST_TEAM_INTENT="$(get_value "ROLEOS_FIRST_TEAM_INTENT" "First team run intent" "Generate an onboarding-ready starter output." "yes")"

CLI_DESC="$(resolve_cli)"
CLI_MODE="${CLI_DESC%%::*}"
CLI_PATH="${CLI_DESC##*::}"

SETUP_ARGS=(
  "/roleos"
  "setup"
  "--yes"
  "--openclaw-endpoint" "$OPENCLAW_ENDPOINT"
  "--model-key" "$MODEL_API_KEY"
  "--starter-kit" "$STARTER_KIT_ID"
  "--feishu-app-id" "$FEISHU_APP_ID"
  "--feishu-app-secret" "$FEISHU_APP_SECRET"
)

if [[ -n "$OPENCLAW_API_KEY" ]]; then
  SETUP_ARGS+=("--openclaw-key" "$OPENCLAW_API_KEY")
fi

run_roleos "$CLI_MODE" "$CLI_PATH" "${SETUP_ARGS[@]}"
echo "[OK] Setup completed."

if run_roleos "$CLI_MODE" "$CLI_PATH" /roleos doctor; then
  echo "[OK] Doctor checks passed."
else
  echo "[WARN] Doctor checks reported issues. You can rerun: /roleos doctor"
fi

if run_roleos "$CLI_MODE" "$CLI_PATH" /roleos team content-team-mvp --intent "$FIRST_TEAM_INTENT"; then
  echo "[OK] First team run succeeded."
else
  echo "[WARN] First team run failed. Re-check model/OpenClaw/Feishu credentials."
fi

echo
echo "RS local deployment completed."
echo "Config: .roleos/config/self-hosted.config.json"
echo "State:  .roleos/state/self-hosted-state.json"
echo "Try:    /roleos role | /roleos kit | /roleos team content-team-mvp"
