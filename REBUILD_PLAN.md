# onair.music — Rebuild Plan (2026-07-01)

Mandat: reconstrucție completă a produsului conform review-ului funcțional din 2026-07-01,
executată autonom de Claude. Utilizatorul face analiza before/after la final.

## Contract (non-negociabile)
- La final există **conturi demo pentru toate rolurile** (admin/artist/label/stație) cu
  acces complet, **fără paywall** pentru aceste conturi. Credențiale în `DEMO_ACCOUNTS.md`.
- Gating-ul premium se implementează REAL în cod (produsul "after" trebuie să fie complet),
  dar conturile demo primesc plan premium seed-uit.
- **Stripe / email / FCM**: cod complet, env-gated — funcțional din momentul în care se pun
  cheile (utilizatorul reconectează Stripe cu alt cont). Documentat în `SETUP_NOTES.md`.
- Deploy pe Railway: proiect **MFM** (workspace norseabelito-rgb — NU se atinge alt workspace),
  servicii: api (Dockerfile apps/api/Dockerfile), web, Postgres, Redis.
  API live: api-production-94f67.up.railway.app · Web live: music-monitor-production-ed14.up.railway.app
- Aplicația iOS instalată pe telefonul utilizatorului lovește producția → schimbările de API
  păstrează compatibilitate (alias-uri pe rutele mutate) până se actualizează clienții.
- Backup DB (pg_dump) înainte de orice migrare.

## Decizii luate autonom
1. **Paleta: Direcția A "ON AIR"** — roșu broadcast pe negru cald.
   Dark: bg `#0B0A0A`, surface `#151313`, surfaceLight `#232020`, surfaceHighlight `#2D2827`;
   accent `#FF4B45`, accentLight `#FF8A80`, pressed `#D92D26`; text `#F5F3F2`/`#ABA4A2`/`#8E8886`/`#827C7A`;
   success `#30D158`, warning `#FFC53D`, error `#FF8A80` (+icon obligatoriu), info `#6CA8FF`.
   LIVE = roșu pulsant (convenție broadcast). Marker detecție = `#FFC53D`.
   Gradient DOAR pe CTA (`#D92D26`→`#FF4B45`). Fără glow, fără glass pe liste.
2. **Digest worker se consolidează în daily-report** (un singur sistem de rapoarte, weekly inclus).
3. **Curation se șterge** (model + rute + features din seed). La fel: AudioSnippet,
   /airplay-events/history, consola statică din apps/api/src/admin-dashboard, digest builders duplicate.
4. **Modelul de identitate**: entitate Artist canonică + Organization/Membership/OrgEntity,
   migrare compat-preserving (org 1:1 per user; user.role rămâne funcțional până la final).
5. **Snippet-uri**: 5s înainte + 5s după detecție (DEJA aplicat în segment-resolver.ts + snippet.ts).

## Faze (tracking în task list + status aici)
- [ ] **F1 Backend — corectitudine + gating**: scoping ISRC exports/dashboard/live-feed; digest→daily-report;
      playedDuration≥30s (flag partial); cleanup 3→11 min; requireFeature + limite (5 piese/3 artiști free);
      billing /admin/subscriptions→/billing (+alias); rate limit login; reset parolă + delete account;
      alertă admin stație ERROR + last-ACR-callback; fix bug label în chart-alerts (continue);
      fix tips N/A + scoate punchlines; cod mort șters; GET /artist/browse-tracks; Invitation PENDING;
      competitors +ADMIN; users.role enum; GET /artists/summary; artworkUrl cache pe AirplayEvent.
- [ ] **F2 Identitate**: Artist entity (aliasuri, ISRC, verified, claim flow), Organization/Membership,
      billing pe org, signup self-serve cu trial, fallback rol necunoscut = ecran eroare.
- [ ] **F3 Design**: tokens.json în packages/ + generare Swift/Kotlin/CSS; iOS re-temat (inclusiv
      ~20 hex hardcodate: RadioBugModifiers.swift:42-43,112; LoginView:21; RegisterView:19; InviteCodeView:16;
      WelcomeView:15; SongDetailView:93,125; SongAnalyticsView:95; DiscoveryScoreView:82;
      PlaylistOverlapView:201; RotationAnalysisView:108); Android Color.kt + FontVariation pt Sora;
      web rebrand onair.music + fonturi + paleta.
- [ ] **F4 Web portal**: sidebar role-aware; portaluri artist/label/stație; admin: CRUD stații,
      missing-songs, acrcloud-search, view-as-role, export pe Detections, SSE, refresh token.
- [ ] **F5 iOS**: push permission race; deep-link router; ChartAlerts+DailyReport în navigație;
      șterge SearchView/LiveFeedView (live-insert în Detections); fix delete competitori; delete piese;
      browse-tracks în AddSong; onairmusic:// scheme; delete account UI; forgot password;
      NowPlaying real + lock screen; plan real în Settings; tab Detections pt STATION.
- [ ] **F6 Android**: BackHandler/rememberSaveable; Add Song/Add Competitor; search/filtre/export;
      preferințe editabile; Playlist Overlap + detalii artist; audio focus; contentIntent + canale
      notificări + deep link; Now Playing bar; curățare cod mort.
- [ ] **F7 Feature-uri noi**: push "prima difuzare"; chart public Airplay Top; alertă "piesă nouă
      la concurență"; transparența acoperirii + station-health worker; raport email PDF/XLSX (env-gated);
      export UCMR-ADA; share of airplay/peer group; chart alerts dropped_out/new-peak.
- [ ] **F8 Demo + deploy**: seed conturi demo premium; DEMO_ACCOUNTS.md; SETUP_NOTES.md;
      backup DB; migrări; deploy; verificare live.

## Jurnal
- 2026-07-01: Plan creat. Snippet 5s+5s aplicat. Railway verificat (MFM, workspace personal).
- 2026-07-02: F1 val 1 comis (60f26c6): scoping ARTIST/LABEL peste tot, requireFeature + limite,
  digest→daily-report, cod mort șters, migrare reconciliere baseline (lanțul merge pe DB gol,
  marcată applied pe prod) + phase1_cleanup (verificată pe clonă de prod). Backup prod în backups/.
  Teste: fără fișiere noi picate vs HEAD (121 eșecuri PRE-EXISTENTE — reparația suitei = item val 3).
  tsc: 7 erori noi TS2345 (boala pre-existentă fastify schema+preHandler) — fix global în val 3.
- F1 val 2 comis (c6228d5): prag 30s partial_play exclus din 62 de query-uri user-facing +
  artwork Deezer cache pe evenimente; /billing (+alias deprecated /admin/subscriptions);
  forgot/reset password + DELETE /auth/account (guard ultimul admin, operează pe realUser);
  station health (ERROR/DEGRADED cu push admini, fără reset orb la boot, lastAcrCallbackAt);
  /artist/browse-tracks + DELETE /artist/songs/:id + GET /artists/summary. Teste: 193 pass / 95 fail
  (pre-existente). LIMITARE cunoscută: dashboard admin (daily_station_plays cagg) include partial plays.
- F3 COMIS (9894bee): paleta ON AIR pe iOS (BUILD SUCCEEDED) + Android (assembleDebug verde,
  FontVariation fix) + web (next build verde, rebrand onair.music Ops). rbLive=roșu pulsant,
  rbSuccess nou pt semantica pozitivă, glow no-op, glass doar pe hero, tokens în packages/tokens/.
- F1 val 3 COMIS (2f49561): tsc 0 erori (era 69) + suită 292 passed / 0 failed (era 121 failed).
  F1 = DONE cu o limitare documentată (dashboard cagg include partial plays).
- F5 iOS COMIS (eacddb6): toate cele 14 fix-uri, BUILD SUCCEEDED, /billing/* adoptat.
- F6 Android COMIS (fd0d585): navigație+scriere+push+paritate, BUILD SUCCESSFUL, daily-driver.
- F4 fundație COMIS (2a5ef0e): shell role-aware, view-as-role web, sesiune cu refresh, admin complet.
  /portal/* e placeholder cu nav per rol pregătit (flag "soon") — partea 2 umple paginile.
- În curs: F7 product-features pe apps/api (push ON AIR, chart public, rotation alerts, coverage, share).
- Urmează: F4 partea 2 (portal content, apps/web); F2 identitate (docs/phase2-identity-spec.md);
  F8 demo accounts + DEMO_ACCOUNTS.md + SETUP_NOTES.md + deploy Railway + verificare live.
