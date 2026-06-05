# AGENTS.md

This file exists so AI coding agents that do not auto-load [CLAUDE.md](CLAUDE.md) (Codex CLI, Cursor, Continue, others) still find the working norms.

**Start with [README.md](README.md) for the stack + setup, [BACKLOG.md](BACKLOG.md) for what's queued, and the sibling [dnd-srd-engine](../dnd-srd-engine) for the rules engine this app consumes.**

Load-bearing rules, applied to every change:

- **Engine boundary.** Rules logic belongs in [dnd-srd-engine](../dnd-srd-engine); dndbnb is presentation + persistence. If a change would alter how an attack resolves, how a save is rolled, or what an event means, it goes in the engine, not here.
- **Commit, don't push.** `git commit` is local-only. Never `git push`, amend, force-push, or rewrite history without explicit instruction.
- **Pre-commit:** `npm run typecheck` must pass. For UI changes, also look at the running app (`npm run dev`).
- **No magic numbers/strings;** tunables go in a named constant near use.
- **Engine is consumed from source.** The sibling `../dnd-srd-engine` must have its `node_modules` installed. Check engine field names against engine source rather than guessing.
- **Supabase env vars required.** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from [.env.local](.env.local) (copy [.env.local.example](.env.local.example)).

If you cannot read the engine source or the supabase env, refuse to make non-trivial changes until you can; those conventions are load-bearing.

Other entry points point to the same docs:
- Claude Code auto-loads [CLAUDE.md](CLAUDE.md).
- Humans land via [README.md](README.md).
