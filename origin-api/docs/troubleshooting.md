# Troubleshooting

## RS mode setup issues

### `/roleos setup` succeeds with warnings

Run:

```bash
/roleos doctor
```

This checks:

- OpenClaw endpoint reachability
- model key status
- Feishu credential connectivity
- shared market catalog availability (`/roleos market`)

### `Connectivity checks failed in strict mode`

If you used `--strict`, any failed connectivity check blocks setup.

Action:

- verify `--openclaw-endpoint`
- verify `--model-key`
- verify `--feishu-app-id` and `--feishu-app-secret`

## Rc mode access issues

### Cannot access portal

- Ensure service is up: `GET /healthz`
- Portal path is `GET /portal`

### Webhook returns 403

- Send `x-roleos-signature` with HMAC-SHA256 signature of raw JSON body.
- Secret must match `ROLEOS_PAYMENT_WEBHOOK_SECRET`.

## Supabase provider errors

If you see:

`Supabase store provider requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY`

Set:

- `ROLEOS_STORE_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## One-click deploy script problems

### Docker not found

- Install Docker Desktop / Docker Engine first.

### Health check fails after deploy

1. Check container logs: `docker compose logs -f roleos-cloud`
2. Confirm `.env.production` values are correct.
3. Verify Supabase connectivity and firewall/network rules.

### OpenClaw sidecar fails to start

1. Confirm `ROLEOS_OPENCLAW_IMAGE` points to a valid image.
2. Re-run with profile:
   - `docker compose --profile with-openclaw up -d --build`
