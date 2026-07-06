# Project rules — hitlist.fm (formerly onair.music / MFM)

## Cross-platform parity (MANDATORY, from 2026-07-06)
Any change to product behavior, data, copy, or design **must be reflected across all
three clients — web (`apps/web`), iOS (`apps/ios`), Android (`apps/android`)** — and the
backend (`apps/api`) when relevant. Before considering a change done:
- Trace every place the modified/removed/added functionality is used (all clients + API
  + `packages/tokens` + `packages/shared`) and update them together.
- A feature removed on one platform is removed on all; a string/label changed on one is
  changed on all; a token/color changed goes through `packages/tokens/tokens.json` and is
  mirrored to iOS `RadioBugTheme.swift`, Android `Color.kt` + `colors.xml`, and web
  `tailwind.config.ts`.
- Design is **token-driven**: `packages/tokens/tokens.json` is the single source of truth.

## Brand
- Product is being rebranded **onair.music → hitlist.fm** ("Gold Standard": amber gold
  `#F5B13D` on warm ink `#12100E`; ember `#FF5A34` for LIVE/rising; sunset gradient
  `#F5B13D→#FF5A34` only on CTA / hero gauge / logo). Mark = rotation gauge. Type unchanged
  (Sora + IBM Plex Mono). Full brief: `design_handoff_hitlist_fm/README.md`.
- Umbrella brand = **Hitlist** (domain hitlist.fm). Public site follows
  `Hitlist - site architecture.pdf`. The monitoring app is positioned as **Hitlist Pro**.

## Infra
- Railway project **MFM** in workspace **norseabelito-rgb's Projects** ONLY. Services:
  `web`, `api`, `Postgres`, `Redis`. NEVER touch the "georgen-cmd's Projects" workspace.
- Monorepo: pnpm workspace + turbo. `apps/{api,web,ios,android}`, `packages/{tokens,shared,tsconfig}`.
- iOS hits production API directly; keep API backward-compatible (route aliases) until
  clients are updated. Backup DB (pg_dump) before any migration.
