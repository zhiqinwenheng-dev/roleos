# Production Go-Live Guide

This guide covers Supabase + GitHub + Cloudflare + custom domain deployment.

## 1. Prepare Supabase

1. Create a Supabase project.
2. Run migration:
   - [`supabase/migrations/20260311_roleos_init.sql`](/F:/codex/roleosbc/supabase/migrations/20260311_roleos_init.sql)
3. Verify schema:
   - `npm run supabase:preflight`
4. Save:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 2. Deploy Origin API

Option A (recommended): one-click deploy script.

- Linux/macOS: `npm run deploy:cloud:oneclick:sh`
- Windows PowerShell: `npm run deploy:cloud:oneclick:ps`

For non-interactive automation (CI/server bootstrap), set:

- `ROLEOS_AUTOMATION=1`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Option B: manual Docker deploy.

```bash
docker compose up -d --build
```

Minimum production env:

- `ROLEOS_STORE_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ROLEOS_JWT_SECRET`
- `ROLEOS_ADMIN_API_KEY`
- `ROLEOS_PAYMENT_WEBHOOK_SECRET`
- `ROLEOS_OPENCLAW_ENDPOINT`
- `ROLEOS_ALLOWED_ORIGINS`

## 3. Connect Cloudflare Worker

Use:

- [`cloudflare/worker.ts`](/F:/codex/roleosbc/cloudflare/worker.ts)
- [`wrangler.toml`](/F:/codex/roleosbc/wrangler.toml)

Set Worker vars/secrets:

- `ORIGIN_API_URL`
- `EDGE_SHARED_SECRET`

Set GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Local automation command:

- `npm run deploy:cloudflare:edge`

Required env vars:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `ORIGIN_API_URL`
- optional: `EDGE_SHARED_SECRET`

Deploy frontend to Cloudflare Pages:

- `npm run deploy:cloudflare:pages`

## 4. Bind custom domain

1. Add DNS record in Cloudflare (for example `api.yourdomain.com`).
2. Bind Worker route to that domain.
3. Enable SSL mode `Full (strict)`.

For your target domain:

- `https://roleos.ai/portal` as Rc user entry
- `https://roleos.ai/market/catalog` as shared RS/Rc market source

## 5. Secure payment webhooks

Webhook endpoints require HMAC by default:

- Header: `x-roleos-signature`
- Signature: `HMAC-SHA256(raw_json_body, ROLEOS_PAYMENT_WEBHOOK_SECRET)`

Migration fallback only:

- `ROLEOS_ALLOW_LEGACY_WEBHOOK_SECRET_HEADER=1`

## 6. Setup operations

- Portal entry: `GET /portal`
- Shared market catalog: `GET /market/catalog`
- Metrics: `GET /metrics` (with `x-roleos-admin-key`)
- Reconciliation job: `npm run job:reconcile`

Go-live automation:

- local readiness: `npm run go-live:verify`
- remote smoke: `ROLEOS_REMOTE_BASE_URL=https://api.roleos.ai npm run go-live:remote-smoke`
- autopilot: `npm run go-live:autopilot`

Autopilot optional flags:

- `ROLEOS_AUTODEPLOY_CLOUDFLARE=1` to enable Cloudflare deploy when credentials are present.
- `ROLEOS_RUN_REMOTE_SMOKE=1` to force remote smoke (requires `ROLEOS_REMOTE_BASE_URL` or `ORIGIN_API_URL`).

Recommended schedule for reconciliation:

- Every 5-15 minutes

## 7. Release CLI binaries (optional)

```bash
npm run release:binaries
```

Local run generates artifact in `release/` for the current platform.

For Windows + Linux + macOS matrix artifacts, run GitHub workflow: `release-binaries`.
