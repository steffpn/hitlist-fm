# Conturi demo — onair.music

Toate conturile au aceeași parolă: **`OnAir!Demo2026`**

Conturile sunt create de scriptul `apps/api/prisma/seed-demo.ts` (idempotent — poate fi
re-rulat oricând fără să creeze duplicate; re-rularea resetează și parola demo).
Rolurile non-admin au **abonament PREMIUM activ pe 10 ani** (fără Stripe), deci nu vezi
niciun paywall.

## Conturi

| Email | Parolă | Rol | Ce vezi |
|---|---|---|---|
| `demo-admin@onair.music` | `OnAir!Demo2026` | **ADMIN** | Consola de administrare: detecții live, stații, utilizatori, invitații, planuri/abonamente, feature-uri, rapoarte piese lipsă + meniul **View as role**. |
| `demo-artist@onair.music` | `OnAir!Demo2026` | **ARTIST** | Portalul de artist pentru artistul cu cele mai multe difuzări reale din DB (numele contului = numele exact al artistului). Are top 5 piese (ISRC-uri) monitorizate, cu tot istoricul de airplay — dashboard, analytics, heatmap, rapoarte, export. |
| `demo-label@onair.music` | `OnAir!Demo2026` | **LABEL** | Portalul de casă de discuri „Demo Records": roster cu top 3 artiști după difuzări, câte 3 piese de top monitorizate per artist — dashboard agregat, comparație artiști, station affinity, release tracker. |
| `demo-station@onair.music` | `OnAir!Demo2026` | **STATION** | Portalul de stație pentru prima stație din DB (ex. „Virgin Radio"), cu cealaltă stație (ex. „Kiss FM Romania") setată drept competitor urmărit — playlist, rotation analysis, discovery, competitor intelligence. |

> Numele exacte (artist / stație / roster) sunt alese **dinamic la rularea seed-ului**, din
> datele reale de airplay de la momentul respectiv. Pe clona bazei de producție din
> 2026-07-01 au rezultat: artist = **David Guetta** (182 difuzări), roster label =
> David Guetta, EMAA, Vescan, stație = **Virgin Radio** cu competitor **Kiss FM Romania**.

## URL-uri live

- **Web:** https://music-monitor-production-ed14.up.railway.app
- **API:** https://api-production-94f67.up.railway.app

## Consolă admin vs. portal

Login-ul e comun (pagina `/login` de pe web). După autentificare ești direcționat automat
după rol:

- **ADMIN** → consola de administrare (rădăcina `/`): Detections, Stations, Users,
  Invitations, Plans, Subscriptions, Features, Missing songs, Top, ACRCloud search.
- **ARTIST / LABEL / STATION** → portalul de client (`/portal`): dashboard, airplay,
  analytics, charts, reports, billing, settings — cu secțiuni specifice rolului
  (songs pentru artist, artists/insights pentru label, competitors pentru stație).

## View as role (impersonare din admin)

Din contul **demo-admin** (sau orice admin), în header există meniul **View as role**:

1. Alegi rolul (Artist / Label / Station).
2. Alegi entitatea: un artist real (cu numărul de difuzări afișat), o stație, sau un
   roster de artiști pentru label.
3. API-ul provizionează o „persona" ascunsă (`POST /admin/impersonation/configure`) și
   browserul trimite automat `X-Impersonate-User-Id` pe fiecare request — vezi portalul
   exact cum îl vede clientul respectiv, cu un banner de impersonare afișat sus.
4. Ieși din impersonare din bannerul respectiv (starea e per-tab, ținută în
   sessionStorage; se pierde la închiderea tabului).

Impersonarea funcționează doar pentru conturi ADMIN reale și este ignorată pe rutele
`/admin/*`, deci e sigură.

## Notă: plăți și emailuri

Funcțiile de **plată (Stripe)** și **email (Resend)** sunt *env-gated*: până când cheile
sunt setate în Railway (vezi `SETUP_NOTES.md`), checkout-ul/portalul de billing Stripe nu
sunt disponibile, iar emailurile (reset parolă, verificare email la signup) sunt doar
logate în consolă, nu trimise. Conturile demo nu depind de ele: sunt deja verificate
(`emailVerified=true`) și au abonamentele premium create direct în DB.

## Re-rularea seed-ului

```bash
cd apps/api
DATABASE_URL="postgresql://..." npx tsx prisma/seed-demo.ts
```

Scriptul afișează la final tabelul cu conturi + parola. Detalii în `SETUP_NOTES.md`.
