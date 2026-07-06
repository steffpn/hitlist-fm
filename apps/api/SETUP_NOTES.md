
## Notă operațională Railway (descoperită la deploy)
Serviciul `api` are **watch paths** care ignoră schimbările din afara `apps/api` —
un commit care modifică doar `pnpm-lock.yaml` din root NU declanșează rebuild
(deploy "Skipped: no changes to watched files"). Recomandare: în Railway →
serviciul api → Settings → Watch Paths, adaugă `pnpm-lock.yaml`, `package.json`,
`pnpm-workspace.yaml` și `packages/**`. Similar pentru serviciul `web`.
