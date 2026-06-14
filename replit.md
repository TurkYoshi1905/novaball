# NovaBall

A free online 2D arcade football game playable in the browser, with ranked matches, multiplayer rooms, and AI opponents.

## Run & Operate

- `pnpm --filter @workspace/novaball run dev` — run the frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- Required secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifact: `artifacts/novaball/`)
- Auth & DB: Supabase (`@supabase/supabase-js`)
- Styling: Tailwind CSS v4, custom dark theme
- Animation: Framer Motion
- API: Express 5 (scaffold, minimal usage)

## Where things live

- `artifacts/novaball/src/App.tsx` — main screen router (state-machine style)
- `artifacts/novaball/src/components/` — all UI components (auth, game, lobby, etc.)
- `artifacts/novaball/src/lib/` — Supabase client, auth helpers, DB queries, matchmaking
- `artifacts/novaball/src/hooks/` — game physics hooks (single & multiplayer)
- `artifacts/novaball/src/utils/` — rank system, changelog data
- `artifacts/novaball/src/types/` — shared TypeScript types

## Architecture decisions

- App uses a flat state-machine router in `App.tsx` (screen string enum) — no URL-based routing needed for a game.
- Supabase handles auth, player profiles, match history, leaderboard, and realtime multiplayer sync.
- All game physics run client-side; multiplayer uses Supabase Realtime channels for sync.
- No backend DB needed on Replit side — all data lives in Supabase.

## Product

- Login/register with email + Supabase auth
- Single-player vs AI with ranked RP system (19 rank tiers)
- Multiplayer: matchmaking queue, custom rooms, real-time matches
- Leaderboard, player profiles, match history, changelog

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Supabase secrets must be set: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Vite picks up `VITE_*` secrets at dev-server start — restart the workflow after adding/changing secrets.
- The `artifacts/api-server` is scaffold-only; all real backend logic is in Supabase.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
