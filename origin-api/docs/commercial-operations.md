# Commercial Operations Baseline

## Scope

The cloud runtime supports first-stage commercial operation with tenant isolation, billing metrics, and payment flow.

## Implemented capabilities

- Plan catalog: `trial`, `starter`, `pro`, `business`, `enterprise`
- Subscription lifecycle per workspace
- Monthly run limit enforcement by plan
- Usage and revenue estimation
- Checkout order creation (`/workspaces/:id/billing/checkout`)
  - supports `billingMode`: `api_token` or `compute_token`
- Payment webhooks (`/billing/webhooks/*`)
- Admin ops view (`/admin/ops/overview`)
- Prometheus metrics (`/metrics`)
- Reconciliation job (`npm run job:reconcile`)
- Shared market source (`/market/catalog`) for RS/Rc catalog sync

## Revenue model

1. MRR from active subscriptions.
2. Variable revenue from overage usage.
3. Estimated total revenue = `MRR + variable_revenue`.

## Launch checklist

1. Use strong values for:
   - `ROLEOS_JWT_SECRET`
   - `ROLEOS_ADMIN_API_KEY`
   - `ROLEOS_PAYMENT_WEBHOOK_SECRET`
2. Enable webhook HMAC signature verification.
3. Restrict `/metrics` access to trusted collectors.
4. Run reconciliation periodically.
5. Use Supabase provider in production.
6. Put API behind HTTPS and Cloudflare edge.
