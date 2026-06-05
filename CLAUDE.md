# CLAUDE.md

Claude Code auto-loads this at session start. It is a short safety-rail summary; the real docs are linked below.

**Read before non-trivial work:** [README.md](README.md) for the stack + setup, [BACKLOG.md](BACKLOG.md) for what's queued, and the sibling [dnd-srd-engine](../dnd-srd-engine) for the rules engine this app consumes.

## What this is

dndbnb is a D&D Beyond-style consumer app powered by the sibling [dnd-srd-engine](../dnd-srd-engine). Character creation, character sheets, campaigns, browse, favorites, PDF export. Supabase backs auth + the database (characters, favorites, campaigns, membership).

## Load-bearing rules

- **Engine boundary.** Rules logic belongs in [dnd-srd-engine](../dnd-srd-engine); dndbnb is presentation + persistence. If a change would alter how an attack resolves, how a save is rolled, or what an event means, it goes in the engine, not here.
- **Commit, don't push.** Local commits only; never push/amend/force-push without explicit instruction.
- **Pre-commit:** `npm run typecheck` must pass; for UI changes, also look at the running app (`npm run dev`).
- **No magic numbers/strings.** Tunables go in a named constant near use; deeper shared constants in [src/lib/](src/lib/).
- **Engine is consumed from source.** The sibling `../dnd-srd-engine` must have its `node_modules` installed (`cd ../dnd-srd-engine && npm install`). Verify engine field names against engine source.
- **Supabase env vars required.** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from [.env.local](.env.local) (copy [.env.local.example](.env.local.example)). Without them the supabase client refuses to construct.

## Stack

React 18 + React Router 6 + Zustand (session/UI state) + Supabase (Postgres + Auth + RLS + Storage). Vite dev/build. TypeScript strict.

## Key files

- [src/App.tsx](src/App.tsx), [src/main.tsx](src/main.tsx): app entry + router.
- [src/routes/](src/routes/): top-level pages (Browse, MyCharacters, Sheet, Campaigns, CampaignDetail, Favorites, SignIn, etc.).
- [src/components/](src/components/): shared UI (Layout, CharacterCard, FavoriteButton, etc.).
- [src/lib/](src/lib/): supabase client, session, campaigns, favorites, moderation, PDF export.
- [supabase/migrations/](supabase/migrations/): DB schema (apply in order via Supabase SQL editor).
- [BACKLOG.md](BACKLOG.md): the queue of next work.
