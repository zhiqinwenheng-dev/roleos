# RoleOS Website Frontend

This frontend is connected to the RoleOS backend APIs and provides:

- Official website pages (conversion)
- Rc Cloud entry and console (`/app/cloud`)
- RS self-hosted download and onboarding pages
- Unified docs center (RS / Rc terminology)

## Unified terminology

- `RS` = `RoleOS Self-Hosted`
- `Rc` = `RoleOS Cloud`

No `B/C` naming is used in current website content.

## Local development

Backend should run first on `http://127.0.0.1:3000`.

Install:

```bash
npm install
```

Run frontend:

```bash
npm run dev
```

Default URL:

- `http://127.0.0.1:5173`

## Build & type check

```bash
npm run lint
npm run build
```

## Environment variables

Copy `.env.example` and configure:

- `VITE_ROLEOS_API_BASE_URL`
- `VITE_ROLEOS_API_PROXY_TARGET` (default `http://127.0.0.1:3000`)

## Main routes

- `/` Home
- `/products`
- `/products/self-hosted` (RS)
- `/app/cloud` (Rc)
- `/app/cloud/onboarding`
- `/app/cloud/session`
- `/pricing`
- `/docs`
- `/login` / `/signup`
