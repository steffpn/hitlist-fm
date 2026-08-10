# Note de setup — variabile de mediu de reconectat (producție)

Toate variabilele de mai jos se setează în **Railway → workspace-ul tău → serviciul
`api` → Variables** (dacă nu e specificat altfel). Serviciul se redeployează automat la
modificarea variabilelor. Funcțiile respective sunt *env-gated*: fără chei, API-ul
pornește normal și doar dezactivează/loghează funcția în cauză.

## 1. Stripe (plăți)

| Variabilă | Ce face |
|---|---|
| `STRIPE_SECRET_KEY` | Cheia secretă a contului Stripe (`sk_live_...`). Fără ea, clientul Stripe e `null`: checkout-ul de abonamente, portalul de billing (customer portal) și sincronizarea abonamentelor nu sunt disponibile — la pornire API-ul loghează `STRIPE_SECRET_KEY not set`. |
| `STRIPE_WEBHOOK_SECRET` | Secretul endpoint-ului de webhook (`whsec_...`). Necesar ca `POST /v1/webhooks/stripe` să valideze semnătura evenimentelor (checkout finalizat, plăți recurente, anulări) și să actualizeze abonamentele în DB. |

Pași: Stripe Dashboard → Developers → API keys (cheia secretă), apoi Developers →
Webhooks → Add endpoint cu URL-ul
`https://api-production-94f67.up.railway.app/v1/webhooks/stripe` și copiezi
signing secret-ul. Planurile din DB au câmpuri `stripe_product_id` /
`stripe_monthly_price_id` / `stripe_annual_price_id` care trebuie populate cu ID-urile
produselor/prețurilor create în Stripe.

## 2. Resend (emailuri)

| Variabilă | Ce face |
|---|---|
| `RESEND_API_KEY` | Cheia API de la https://resend.com. Fără ea, emailurile **nu se trimit** — sunt doar logate (`email not configured (RESEND_API_KEY missing)`). Afectează: reset de parolă și codul de verificare a emailului la signup. |
| `EMAIL_FROM` | Adresa expeditor (ex. `hitlist.fm <no-reply@hitlist.fm>`). Domeniul trebuie verificat în Resend (DNS: SPF + DKIM). Dacă lipsește, se folosește un default din cod. |

## 3. Push Android (FCM)

Codul e deja scris (client + backend) — push-ul stă „dormant" până se adaugă
credențialele. Pașii compleți sunt în **`apps/android/PUSH_SETUP.md`**; pe scurt:

1. **Firebase Console** → creezi proiect → adaugi aplicații Android pentru
   `music.onair.app` (release) și `music.onair.app.debug` (debug).
2. Descarci **`google-services.json`** și îl pui la `apps/android/app/google-services.json`
   (build-ul Gradle îl detectează automat; e nevoie de rebuild + republish APK).
3. Firebase → Project settings → Service accounts → **Generate new private key** și pui
   conținutul JSON-ului în variabila **`FCM_SERVICE_ACCOUNT_JSON`** pe serviciul `api`
   (alternativ `FCM_SERVICE_ACCOUNT_PATH` dacă montezi fișierul). Fără ea, trimiterile
   către Android sunt sărite silențios (iOS/APNs nu e afectat).
4. Migrarea `20260701_add_device_token_platform` (coloana `device_tokens.platform`) se
   aplică automat la deploy (`prisma migrate deploy` rulează în comanda de start).

## 4. URL-uri aplicație

| Variabilă | Ce face |
|---|---|
| `WEB_APP_URL` | URL-ul aplicației web (ex. `https://music-monitor-production-ed14.up.railway.app`). Folosit pentru CORS (originile permise) și ca fallback pentru linkurile din emailuri. |
| `APP_BASE_URL` | Baza pentru linkurile generate în emailuri (ex. linkul de reset parolă). Dacă lipsește, se folosește `WEB_APP_URL`, apoi `http://localhost:3001`. Setează-l la URL-ul web public. |

## 5. Seed-ul conturilor demo

Scriptul **`apps/api/prisma/seed-demo.ts`** creează cele 4 conturi demo (vezi
`DEMO_ACCOUNTS.md`): admin, artist (numele = artistul real cu cele mai multe difuzări),
label „Demo Records" (top 3 artiști + top 3 piese fiecare) și stație (prima stație din
DB + competitorul). Rolurile non-admin primesc abonament **premium activ pe 10 ani**
fără câmpuri Stripe, plus Organization/Membership/OrgEntity ca la backfill-ul de
identitate. Parola tuturor: `Hitlist!Demo2026`.

Rulare / re-rulare (e idempotent — upsert pe email și pe cheile naturale, zero
duplicate; re-rularea resetează parola demo și re-alege dinamic artiștii/stațiile de
top la momentul rulării):

```bash
cd apps/api
DATABASE_URL="postgresql://... (URL-ul bazei de producție)" npx tsx prisma/seed-demo.ts
```

Precondiții: migrațiile aplicate la zi și planurile seed-uite
(`npx tsx prisma/seed-plans.ts`) — scriptul se oprește cu eroare clară dacă lipsesc
planurile premium. La final afișează tabelul cu email/parolă/rol/entități create.
