# dndbnb

A D&D Beyond-style consumer app, powered by [dnd-srd-engine](https://github.com/greghcarr/dnd-srd-engine).

The source lives in this standalone repo; the engine is a sibling checkout at `../dnd-srd-engine`. Vite's resolve.alias (see [vite.config.ts](vite.config.ts)) maps `dnd-srd-engine` to the sibling's TypeScript source, so engine edits hot-reload here with no rebuild step and the engine bundles into the production output. The deploy workflow at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) checks out both repos in CI and publishes the built bundle to GitHub Pages; the URL settles at https://greghcarr.github.io/dndbnb/. The engine repo fires a `repository_dispatch` event at this repo on every push to its `main`, so engine slices auto-redeploy dndbnb.

## Stack

- React 18 + React Router 6 + Zustand (session/UI state).
- Supabase: Postgres + Auth + Realtime + Storage (free tier).
- Vite dev/build, GitHub Pages deploy.

## One-time Supabase setup

dndbnb is a database-backed app. Before `npm run dev:dndbnb` will boot you need a Supabase project:

1. **Create the project.** Sign up at https://supabase.com, create a new project (free tier). Pick a region close to you. Save the database password.
2. **Run the migrations, in order.** Open the project's SQL editor and paste each one (top to bottom):
   - [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql), the `characters` table and RLS.
   - [supabase/migrations/0002_browse_favorites_moderation.sql](supabase/migrations/0002_browse_favorites_moderation.sql), the `favorites` table and the server-side moderation trigger that rejects offensive character names.
   - [supabase/migrations/0003_campaigns.sql](supabase/migrations/0003_campaigns.sql), profiles + campaigns + members + the `characters.campaign_id` column with extended RLS.
   - [supabase/migrations/0004_fix_campaign_owner_seed.sql](supabase/migrations/0004_fix_campaign_owner_seed.sql), one-line fix: marks the AFTER INSERT trigger that seeds the owner's membership row as SECURITY DEFINER so it isn't blocked by RLS.
   - [supabase/migrations/0005_campaign_insert_policy.sql](supabase/migrations/0005_campaign_insert_policy.sql), rebinds the campaigns INSERT policy to the `authenticated` role and gives the owner-setting trigger a clearer error when `auth.uid()` is null.
   - [supabase/migrations/0006_campaigns_trust_trigger.sql](supabase/migrations/0006_campaigns_trust_trigger.sql), makes the campaigns INSERT policy fully permissive and hands the gate to the BEFORE INSERT trigger. Adds a `debug_auth_state()` RPC and forces a PostgREST schema reload.
   - [supabase/migrations/0007_campaigns_full_reset.sql](supabase/migrations/0007_campaigns_full_reset.sql), aggressive reset that drops and recreates every campaigns RLS policy and re-applies the trigger fixes; logs before/after policy state via `RAISE NOTICE`. Belt-and-braces if any prior fix-up didn't apply.
   - [supabase/migrations/0008_campaign_members_self_insert.sql](supabase/migrations/0008_campaign_members_self_insert.sql), adds an explicit INSERT policy on `campaign_members` so the AFTER INSERT trigger that seeds the owner's membership row can succeed under SECURITY INVOKER semantics too.
   - [supabase/migrations/0009_campaigns_owner_select.sql](supabase/migrations/0009_campaigns_owner_select.sql), **the actual root-cause fix.** Adds `campaigns_owner_select` so the post-INSERT RETURNING clause sees the new row via `owner_id = auth.uid()` instead of depending on the member row that the AFTER INSERT trigger hasn't seeded yet. The "RLS violation" message was misleading: PostgREST gets zero rows back from RETURNING when the SELECT policy filters out the row, and reports it as an RLS write failure even though the actual write succeeded.
   - [supabase/migrations/0010_characters_primary_class.sql](supabase/migrations/0010_characters_primary_class.sql), adds a generated `primary_class_id` column on `characters` (derived from `payload.classes[0].classId`) so list views can tint each card by class without pulling the full payload.
   - [supabase/migrations/0011_campaign_icon.sql](supabase/migrations/0011_campaign_icon.sql), adds an `icon` column to `campaigns` (default `'shield'`) so the campaign creator + owner can pick a glyph that appears on every campaign card.
   - [supabase/migrations/0012_characters_species_id.sql](supabase/migrations/0012_characters_species_id.sql), adds a generated `species_id` column on `characters` (derived from `payload.speciesId`) so the character cards can render a "Tiefling Ranger"-style summary line without pulling the full payload.
   - [supabase/migrations/0013_characters_sort_order.sql](supabase/migrations/0013_characters_sort_order.sql), adds a `sort_order` integer column on `characters` (default 0) so the My Characters page can persist a drag-to-reorder.
3. **Enable email/password auth and turn off email confirmation.** Authentication -> Providers -> Email (enabled). Then Authentication -> Settings (or Sign In / Up) -> uncheck "Confirm email". dndbnb is a username-only product: usernames map to a non-routable synthetic address (`<username>@dndbnb.invalid`), so no real email can ever be confirmed.
4. **Wire the client.** Copy [dndbnb/.env.local.example](.env.local.example) to `dndbnb/.env.local` and fill in:
   - `VITE_SUPABASE_URL`: Settings -> API -> Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Settings -> API -> Project API keys -> `anon` (public).

The anon key is safe to ship in the client bundle; RLS policies on the database enforce per-user access. The service-role key, by contrast, must never appear in client code.

## Running locally

```bash
# from a parent dir containing both dnd-srd-engine and dndbnb as siblings:
git clone https://github.com/greghcarr/dnd-srd-engine.git
git clone https://github.com/greghcarr/dndbnb.git
cd dnd-srd-engine && npm install && cd ../dndbnb
npm install
cp .env.local.example .env.local   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev       # vite dev server (port 5174)
npm run build     # production bundle to dist/
npm run preview   # serve the production bundle locally
npm run typecheck # tsc --noEmit
```

The engine has to be installed (`cd ../dnd-srd-engine && npm install`) because Vite consumes it from TypeScript source, not from a built artifact. Vite's `resolve.alias` (see [vite.config.ts](vite.config.ts)) maps `dnd-srd-engine` and `dnd-srd-engine/starter-pack` to the sibling's `src/index.ts` and `src/starter-pack.ts`, so engine edits hot-reload here with no rebuild step.

## Source layout

```
index.html                     Vite entry; mounts <div id="root">
src/
  main.tsx                     React + Router bootstrap
  App.tsx                      route table + auth gate
  components/                  shared UI (Layout, CharacterCard, FavoriteButton, ...)
  routes/                      top-level pages (Browse, MyCharacters, Sheet, Campaigns, ...)
  lib/                         supabase client, session, campaigns, favorites, moderation, PDF
styles.css                     global styles (light + dark)
supabase/migrations/           DB schema (apply in order via Supabase SQL editor)
.github/workflows/             deploy-pages.yml
vite.config.ts                 engine alias + GitHub Pages base path
tsconfig.json                  TypeScript strict + paths for engine alias
```

## Production deploy setup

The deploy workflow is [deploy-pages.yml](.github/workflows/deploy-pages.yml); on every push to `main` (or a `repository_dispatch: engine-updated` event from the engine repo), it checks out both repos in the runner workspace, builds dndbnb with the engine baked in, and publishes via the Actions-based GitHub Pages flow.

One-time setup:

1. **Configure Pages.** Repo Settings -> Pages -> Source = "GitHub Actions". The workflow's `configure-pages@v5` step also auto-enables it.
2. **Add Supabase secrets.** Settings -> Secrets and variables -> Actions, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` so the GitHub-built bundle can reach Supabase. The deploy workflow exposes them to `vite build`.
3. **Engine cross-repo trigger (optional, recommended).** In greghcarr/dnd-srd-engine, the `notify-dndbnb.yml` workflow fires `repository_dispatch: engine-updated` at this repo on every push to its `main`. That workflow needs a fine-grained PAT scoped to greghcarr/dndbnb with `Contents: read+write` (or `metadata`) and `Actions: write`, stored as the engine repo's secret `DNDBNB_DISPATCH_TOKEN`.

Manual redeploy: Actions -> "Deploy to GitHub Pages" -> Run workflow.

## Engine import boundary

dndbnb imports the engine as a package, not via relative paths:

```ts
import { computeDerivedCharacter } from 'dnd-srd-engine';
import { loadStarterPack } from 'dnd-srd-engine/starter-pack';
```

Vite's `resolve.alias` (see [vite.config.ts](vite.config.ts)) rewrites these to the sibling engine's `src/`. The engine bundles into the production output at build time, so the deployed site has no runtime dependency on the engine being checked out. This keeps dndbnb honest about what's actually in the public API: if a function isn't exported from `src/index.ts`, dndbnb can't reach it.

## Moderation

User-entered character names go through a two-layer local check (no third-party API call ever):

- **Client side:** [obscenity](https://www.npmjs.com/package/obscenity) runs in the browser with leet-speak normalization, confusable character mapping, and duplicate collapsing. It powers the live "this will be rejected" hint in the creator and is the first defense.
- **Server side:** a Postgres function `public.is_text_offensive(t)` plus a `BEFORE INSERT OR UPDATE OF name` trigger on `public.characters`. The blocklist is a short, hand-curated array of the worst slurs and clearly-vulgar terms; it lives in the migration so updates ship via SQL. This is the backstop: a determined user who bypasses the client still can't write an offensive name.

The two lists deliberately diverge in coverage. The client side catches a wide net (every variant `obscenity` can detect); the server side enforces only the obviously-not-okay floor. Together they handle the realistic cases without ever needing an API call.

## Identity model

dndbnb does not collect real email addresses. Users pick a username (3-30 chars, lowercase letters / digits / underscore / dash, must start with a letter or digit) and a password. Internally the username is bridged to Supabase's email-based auth by synthesizing `<username>@dndbnb.invalid`, a permanently non-routable address (RFC 2606). Side effects:

- Email confirmation is off (see step 3 above); the synthetic addresses can't receive mail.
- Password reset via email link is unavailable; future slices will add a non-email recovery flow.
- Username uniqueness piggybacks on Supabase's email-uniqueness constraint, no separate enforcement today.

## Current scope

Shipped:

- Auth (username + password, no real email collected).
- Per-user character list at `/characters`.
- Multi-step creator wizard at `/characters/new` (standard array, point buy, 4d6-drop-lowest roll).
- Read-only sheet at `/characters/:id` with PDF export.
- Public browse at `/browse`, opt-in `is_public` flag with owner-only visibility toggle.
- Favorites (star anyone's public character) with a dedicated `/favorites` page.
- Clone any reachable character into your own collection.
- Local moderation on character names (client + server, no API).
- Campaigns at `/campaigns`: create, join with an 8-character code, member roster (with usernames), attach/detach a character from the sheet, leave or delete.

Still to do (in roadmap order): realtime action feed inside a campaign, real spellbook / inventory editing on the sheet, combat tracker, compendium browser, DM "serious play" mode, map system.
