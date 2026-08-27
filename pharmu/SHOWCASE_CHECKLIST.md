# Pharmulation showcase-readiness checklist

Tracks the findings from the full-codebase audit. Items get checked off as they're implemented and verified. See commit `633cf12` for the first batch.

## Done

- [x] Untrack `.env` from git, add it to `.gitignore`, add `.env.example` — leaked `GEMINI_API_KEY` is no longer tracked; key has been rotated.
- [x] **Close the `profiles.role` self-escalation hole** — `20260827120000_prevent_profile_role_self_escalation.sql`, applied to the live database and verified end-to-end: an authenticated user's self-promote is reverted, their normal profile updates (xp etc.) still work, and the service-role path used by the admin panel can still promote.
- [x] Remove Emergency mode (was broken — `onExit` crash — and unreachable from any nav link).
- [x] Remove Cosmetic mode (was dead config, no route ever existed).
- [x] Delete standalone `game.rx.tsx` / `game.otc.tsx`; `game.community.tsx` is now the single Rx+OTC implementation.
- [x] Fix the admin panel's silent no-op writes — "Promote user" and "Delete case" now run through `createServerFn` (`lib/api/admin.functions.ts`) using the service-role client with a server-side admin re-check, plus toasts/pending states/cache invalidation. **Needs `SUPABASE_SERVICE_ROLE_KEY` set on the server (local `.env` and Vercel) to work.**
- [x] Fix Gemini chat failing with 404s on every model — `chat.functions.ts`'s hardcoded model fallback list (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-*`, `gemini-1.5-flash`) was entirely deprecated for new API keys. Replaced with `gemini-flash-lite-latest` / `gemini-flash-latest` / `gemini-3.5-flash` / `gemini-3.5-flash-lite`, verified against the live key.

## Next up — correctness / security
- [ ] **Surface Supabase errors instead of swallowing them** — the `const { data } = await supabase...; return data ?? []` pattern (ignoring `error`) is repeated across ~15 files (`admin.tsx`, `dashboard.tsx`, `profile.tsx`, `drugs.tsx`, `useCaseLoader.ts`, `leaderboard.tsx`, ...). A failed query currently just looks like "no data" instead of surfacing an error — the single biggest risk of something looking silently broken in a live demo.
- [ ] **Make XP/streak updates atomic** — `submitScore()` in `lib/game/shared.ts` and `bumpStreak()` in `lib/use-init-auth.ts` both do read-then-compute-then-write on `profiles`, which can lose an update under concurrent submits (double-tab, double-click). Convert to a single SQL update or a SECURITY DEFINER RPC (same pattern already used for `award_badge_if_earned`).
- [ ] **Reconcile live score display with `computeScore`** — `game.hospital.tsx`, and the Rx/OTC sub-games in `game.community.tsx`, each show a hand-rolled running score (e.g. `orders.length * 5`, or manual `correct*20 - wrong*15 + ...`) that can diverge from the authoritative `computeScore()` shown on the final `FeedbackScreen`.

## Content gaps

- [ ] **OTC Consultation only has 2 possible cases** (hardcoded UUIDs cycled in `useCaseLoader.ts`, sourced from two migrations). Repeat plays will show identical content — needs more case content authored through the same pipeline, or migrated onto the templated `case_templates` system the other modes use.
- [ ] **Consolidate the "mentor" persona constant** (`DOCTOR_IMAGE`, currently `/dr-hakim-clean.png`) — still duplicated verbatim as a private constant in `OnboardingModal.tsx`, `PharmacistChat.tsx`, `TutorialBot.tsx`, `ErrorExplanationPanel.tsx`, and `dashboard.tsx`. This is exactly the pattern that caused the 5-commit "Dr Hakim gender" fix chain — extract to one shared module (e.g. `src/lib/mentor.ts`).

## Architecture / code quality

- [ ] Centralize the ~16 files' worth of duplicated `supabase.from(...)` query logic into `src/lib/api/*` modules instead of embedding raw queries per route.
- [ ] Replace `(supabase as any)` casts in `useCaseLoader.ts` (lines ~299, 321, 536, 544, 550) — `case_templates`/`user_seen_cases` are already properly typed in the generated types, the casts are stale.
- [ ] De-duplicate the `Profile` type in `auth-store.ts` — hand-maintained instead of importing `Tables<'profiles'>` from the generated Supabase types; can silently drift from the real schema.
- [ ] Split oversized multi-concern files: `game.community.tsx` (still ~1600 lines mixing mode-picker + Rx game + OTC game), `game.industry.tsx` (~1277 lines), `useCaseLoader.ts` (generic hook + OTC hardcoded fallback + procedural case generator, three concerns in one file).
- [ ] Reduce the OTC pilot case content living in 3 places at once (two migrations + the ~200-line `OTC_PILOT_FALLBACK_CASES` constant in `useCaseLoader.ts`) — will naturally shrink once the OTC content-gap item above is addressed.

## Repo hygiene / DX

- [ ] **Fix the `supabase/config.toml` project mismatch** — it points at `ogxbvpnpqbwjmdyhrabr` while the app actually runs against `hpzjxzmqgrcpbizxucbp`. Until fixed, any `supabase db push` / `migration list` targets the wrong project, which is why migrations in this repo have not been reaching the live database.
- [ ] Fix the corrupted root `.gitignore` (`c:\Users\DeDSeC\Desktop\pharmulation\.gitignore` has garbled/spaced-out text).
- [ ] Add `.vercel`/`.netlify` build output to eslint's ignore list (`eslint.config.js` only ignores `dist`/`.output`/`.vinxi` — `npm run lint` currently scans the huge `.vercel/output` tree and can crash on stale generated files if a build ran concurrently).
- [ ] Decide the fate of `netlify.toml` (root) vs. the Nitro `vercel` preset in `vite.config.ts` — currently mismatched/stale (project has moved to Vercel).
- [ ] Delete the stale `pharma-verse-play-main/` folder and the duplicate root `package.json`/`package-lock.json` (repo root has no `src/`, so these don't participate in the real build).
- [ ] Pick one package manager — both `package-lock.json` (npm) and `bun.lock`/`bunfig.toml` (bun) exist; deploy configs use npm.
- [ ] Add a real root `README.md` (setup, env vars, scripts, architecture) — none exists today.
- [ ] Consolidate duplicate seed data — `supabase/seed_from_current_project.sql` and `supabase/seed_chunks/seed_00{1,2,3}.sql` contain the same drug rows in two forms.
- [ ] Decide the fate of the `leaderboard` DB table — fully locked down by RLS with no code path that ever writes to it; either wire it up or drop it.
- [ ] Fix the "Delete account" feature (`settings.tsx`) — only deletes the `profiles` row and signs out; doesn't delete the underlying `auth.users` record (needs a service-role call), so the user can log back in to a fresh blank profile.
- [ ] No automated tests and no CI type-check step exist — several real `tsc` errors currently ship unnoticed (was true as of the audit; worth re-checking after the recent edits).

## Deliberately deferred (flagged, not forgotten)

- `oncology` mode: same shape as the removed `cosmetic` (dead config, no route), but wasn't requested for removal — left in place.
- DB `case_mode` enum still contains `oncology`/`cosmetic`/`emergency` values — harmless to leave; dropping enum values requires type recreation and wasn't in scope.
