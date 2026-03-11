# RoleOS RS/Rc Production MVP

This repository delivers the RoleOS RS/Rc dual-track MVP on one shared core.

## What is implemented

- Shared core: `Role / Kit / Team v1`, lifecycle, registry validation.
- RS (Self-Hosted): setup wizard, command surface, local state, audit trail.
- Rc (Cloud): auth, workspace isolation, run orchestration, Feishu delivery.
- Commercial baseline: plans, subscriptions, billing usage, checkout, webhooks.
- Production baseline: Supabase store, Cloudflare edge proxy, Docker, metrics, payment reconciliation.
- Cloud portal entry: `GET /portal` (register/login + run from browser).

## Install and verify

```bash
npm install
npm run check
npm test
npm run build
```

Automated release-readiness (Supabase + backend + frontend):

```bash
npm run go-live:verify
```

## Run locally

Cloud API:

```bash
npm run dev:cloud
```

Website + Cloud API (recommended one-command startup on Windows):

```bash
npm run dev:stack:start
```

Stack health check:

```bash
npm run dev:stack:check
```

Stop local web stack:

```bash
npm run dev:stack:stop
```

Windows double-click helpers:

- `start-roleos-web.bat`
- `stop-roleos-web.bat`

CLI:

```bash
npm run dev:cli -- /roleos help
```

## RS mode usage (Self-Hosted)

```bash
/roleos setup --yes
/roleos doctor
/roleos market
/roleos team content-team-mvp --intent "Create draft"
```

`/roleos doctor` verifies:

- OpenClaw endpoint health
- model key presence
- Feishu credential connectivity (if real credentials are provided)

## RS one-click installer (Self-Hosted)

Linux/macOS:

```bash
npm run deploy:oneclick:sh
```

Windows PowerShell:

```powershell
npm run deploy:oneclick:ps
```

This installer targets RS local deployment. It guides credentials, can start local OpenClaw, runs `/roleos setup`, `/roleos doctor`, and a first team run.

Non-interactive automation mode (`ROLEOS_AUTOMATION=1`) is also supported. Example:

```bash
ROLEOS_AUTOMATION=1 ROLEOS_MODEL_API_KEY=your_model_key npm run deploy:oneclick:sh
```

## Cloud one-click deploy (Origin API)

Linux/macOS:

```bash
npm run deploy:cloud:oneclick:sh
```

Windows PowerShell:

```powershell
npm run deploy:cloud:oneclick:ps
```

This deploy script generates `.env.production`, starts Docker services, and runs a health check for Cloud API deployment.

Non-interactive automation mode (`ROLEOS_AUTOMATION=1`) is also supported. Provide env vars such as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` before running.

## Binary packaging (CLI app)

Build a binary for your current platform locally:

```bash
npm run release:binaries
```

Output folder: `release/`

Use GitHub Actions workflow `release-binaries` for Windows/Linux/macOS matrix artifacts.

## Rc mode entry and APIs

Portal entry:

- `GET /portal`
- `GET /market/catalog` (shared RS/Rc market catalog)

Core APIs:

- `POST /auth/register`
- `POST /auth/login`
- `GET /workspaces/:id/roles`
- `POST /workspaces/:id/kits/:kitId/activate`
- `POST /workspaces/:id/team/run`
- `GET /workspaces/:id/runs/:runId`

Commercial APIs:

- `GET /workspaces/:id/subscription`
- `POST /workspaces/:id/subscription`
- `GET /workspaces/:id/billing/usage`
- `POST /workspaces/:id/billing/checkout`
- `POST /billing/webhooks/payments`
- `POST /billing/webhooks/personal-gateway`
- `GET /admin/ops/overview`
- `GET /metrics`

## Production env

Use:

- `.env.production.example`
- `supabase/migrations/20260311_roleos_init.sql`

Key vars:

- `ROLEOS_STORE_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ROLEOS_OPENCLAW_ENDPOINT`
- `ROLEOS_JWT_SECRET`
- `ROLEOS_ADMIN_API_KEY`
- `ROLEOS_PAYMENT_WEBHOOK_SECRET`

Supabase schema preflight:

```bash
npm run supabase:preflight
```

This check verifies required tables and ensures the `rs-self-hosted` commercial plan row exists.

## Go-live automation

Run all local readiness checks:

```bash
npm run go-live:verify
```

Run remote smoke against a deployed API:

```bash
ROLEOS_REMOTE_BASE_URL=https://api.roleos.ai npm run go-live:remote-smoke
```

Cloudflare deploy helpers:

```bash
npm run deploy:cloudflare:edge
npm run deploy:cloudflare:pages
```

Full autopilot (verify -> optional Cloudflare deploy -> remote smoke):

```bash
npm run go-live:autopilot
```

Notes:

- Cloudflare deploy in autopilot runs only when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are present.
- Remote smoke in autopilot runs only when `ROLEOS_REMOTE_BASE_URL` is set, or when `ROLEOS_RUN_REMOTE_SMOKE=1` with `ORIGIN_API_URL`.

## Docs

- `docs/production-supabase-cloudflare.md`
- `docs/commercial-operations.md`
- `docs/troubleshooting.md`

## Domain entry (`roleos.ai`)

After DNS + Cloudflare routing:

- `https://roleos.ai/portal` for Rc entry
- `https://roleos.ai/market/catalog` for shared market catalog API
