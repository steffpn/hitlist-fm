# Deploy & DNS — hitlist.fm

Two public surfaces on one custom domain, split by subdomain:

| Host | Railway service | Root dir / Dockerfile | What it serves |
|---|---|---|---|
| `hitlist.fm` (+ `www`) | **site** (new) | `apps/site/Dockerfile` | Public marketing site (Playlist Battle, playlists, submit, Hitlist Pro, legal…) |
| `app.hitlist.fm` | **web** (existing) | `apps/web/Dockerfile` | Hitlist Pro monitoring app (admin console + artist/label/station portals) |
| `api.hitlist.fm` (optional) | **api** (existing) | `apps/api/Dockerfile` | Backend API (also reachable on its Railway URL) |

Railway project: **hitlist.fm** (renamed from MFM), workspace *norseabelito-rgb's Projects*.

## DNS records to add at the domain registrar (hitlist.fm)

Railway serves custom domains via CNAME to a per-domain target it generates. After adding
each domain in Railway (Settings → Networking → Custom Domain), Railway shows the exact
CNAME target — use those. Typical shape:

| Type | Name | Value |
|---|---|---|
| CNAME | `@` / `hitlist.fm` (or ALIAS/ANAME if the registrar supports apex) | `<site>.up.railway.app` (target Railway shows) |
| CNAME | `www` | `<site>.up.railway.app` |
| CNAME | `app` | `<web>.up.railway.app` |
| CNAME | `api` (optional) | `<api>.up.railway.app` |

Apex (`hitlist.fm`) can't be a plain CNAME on most registrars — use the registrar's
ALIAS/ANAME/flattened-CNAME, or host DNS on Cloudflare (proxied CNAME on apex works).

## Environment variables

**site** service:
- `NEXT_PUBLIC_SITE_URL=https://hitlist.fm`
- `NEXT_PUBLIC_APP_URL=https://app.hitlist.fm`  (Login / Access Pro links)
- `CONTACT_TO=hello@hitlist.fm`  (form destination)
- `EMAIL_FROM="hitlist.fm <no-reply@hitlist.fm>"`
- `RESEND_API_KEY=…`  (optional — without it, form submissions are logged, not emailed)
- Optional analytics: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID`
- Build args (Dockerfile): `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` — set as service vars so they're present at build.

**web** service:
- Rebuild arg `NEXT_PUBLIC_API_URL=https://api.hitlist.fm/api/v1` (or keep the Railway api URL).

**api** service:
- `WEB_APP_URL=https://app.hitlist.fm`
- `APP_BASE_URL=https://app.hitlist.fm`  (email links)
- CORS already allows `*.hitlist.fm` + `hitlist.fm` (see `apps/api/src/index.ts`).

## Stripe / deep links (mobile)
- iOS return scheme: `hitlist://subscription/*` (was `onairmusic://`).
- Android billing return: `https://app.hitlist.fm/billing/*` (was `https://onair.music/billing/*`).
- Update the Stripe **success/cancel** allowed redirect hosts accordingly.

## One-time cutover checklist
1. Rename Railway project MFM → hitlist.fm.
2. Create the **site** service from the GitHub repo (root `/`, `RAILWAY_DOCKERFILE_PATH=apps/site/Dockerfile`), set its env vars.
3. Add custom domains: `hitlist.fm`+`www` → site, `app.hitlist.fm` → web, `api.hitlist.fm` → api.
4. Add the DNS records the registrar (values from Railway). Wait for verification + TLS.
5. Set `WEB_APP_URL`/`APP_BASE_URL` on api; redeploy web with the new `NEXT_PUBLIC_API_URL`.
6. Rebuild/republish the mobile apps with the new bundle id / scheme / Stripe URLs.
