# Pharmulation showcase-readiness checklist

Tracks the findings from the full-codebase audit. Items get checked off as they're implemented and verified. See commit `633cf12` for the first batch.

## Done

- [x] Untrack `.env` from git, add it to `.gitignore`, add `.env.example` — leaked `GEMINI_API_KEY` is no longer tracked; key has been rotated.
- [x] **Close the `profiles.role` self-escalation hole** — `20260827120000_prevent_profile_role_self_escalation.sql`, applied to the live database and verified end-to-end: an authenticated user's self-promote is reverted, their normal profile updates (xp etc.) still work, and the service-role path used by the admin panel can still promote.
- [x] Remove Emergency mode (was broken — `onExit` crash — and unreachable from any nav link).
- [x] Remove Cosmetic mode (was dead config, no route ever existed).
- [x] Delete standalone `game.rx.tsx` / `game.otc.tsx`; `game.community.tsx` is now the single Rx+OTC implementation.
- [x] **Rebuild OTC as a fully AI consultation** — the patient now improvises from an authored 12-case clinical bank (`lib/game/otc-cases.ts`) with no scripted dialogue, and the consultation itself is graded against WWHAM plus red-flag recognition (`gradeConsultation`). Replaces the two hardcoded cases, the scripted fallback, and the previously unscored conversation. Lives in `OtcConsultation.tsx`.
- [x] **Make the in-game score agree with the final score** — added `liveScore`/`liveScoreFromPoints` (delegating to `computeScore` so they cannot drift) and `SCORE_WEIGHTS` as the single source of truth for point values. Verified live and final now match exactly across all difficulties. Fixed three real bugs found on the way: hospital showed `orders.length * 5` (tracked nothing; now hidden, since it only reveals correctness on submit), industry/warehousing hardcoded `- 100` for the difficulty base (easy lost 10 points, hard gained 20), and several OTC toasts quoted point values that disagreed with what was actually scored.
- [x] **Make XP/streak updates atomic** — `apply_case_result` / `touch_daily_streak` SECURITY DEFINER RPCs (migration `20260827130000_atomic_profile_counters.sql`), applied live and verified: 20 concurrent increments now all land (xp 2000/2000), where the old read-modify-write pattern lost 19 of 20 (xp 100/2000). The RPC also clamps caller-supplied XP, and the streak is idempotent within a day.
- [x] **Surface Supabase errors instead of swallowing them** — added `lib/supabase-query.ts` (`unwrap`/`unwrapList`) that throws with a user-facing message and logs the raw Postgrest error, plus a global `QueryCache` handler in `router.tsx` that toasts failures (deduped by message). Applied across the query call sites; paths with their own fallback log instead, and score submission toasts since a lost score is silent data loss.
- [x] **Fix the four latent `tsc` errors and add a `typecheck` script** — none were caught at build time because vite/esbuild strips types without checking. `npm run typecheck` is now clean.
- [x] **Make `npm run lint` usable** — it was walking `.vercel`/`.netlify` build output, taking minutes and crashing on stale generated files. Now ignores build output and the generated route tree; finishes in ~20s.
- [x] Fix the admin panel's silent no-op writes — "Promote user" and "Delete case" now run through `createServerFn` (`lib/api/admin.functions.ts`) using the service-role client with a server-side admin re-check, plus toasts/pending states/cache invalidation. **Needs `SUPABASE_SERVICE_ROLE_KEY` set on the server (local `.env` and Vercel) to work.**
- [x] Fix Gemini chat failing with 404s on every model — `chat.functions.ts`'s hardcoded model fallback list (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-*`, `gemini-1.5-flash`) was entirely deprecated for new API keys. Replaced with `gemini-flash-lite-latest` / `gemini-flash-latest` / `gemini-3.5-flash` / `gemini-3.5-flash-lite`, verified against the live key.

## Next up — correctness / security

- [ ] **Migrations in this repo are drifting from the live database — fix the pipeline, not the symptoms.** `supabase/config.toml` points at `ogxbvpnpqbwjmdyhrabr` while the app runs against `hpzjxzmqgrcpbizxucbp`, so `supabase db push` never targets production and migrations are being applied by hand (or not at all). Two have already been caught missing after the fact:
  - `20260827120000` (role self-escalation trigger) — applied late, hole was live until then.
  - `20260615153330` (badge/leaderboard lockdown) — **never ran**; until 2026-08-27 any authenticated user could self-award badges and write arbitrary leaderboard scores, and `award_badge_if_earned` did not exist so no badge had ever been awarded.
  Point `config.toml` at the real project and reconcile, or assume more silent drift.

## Content gaps

- [ ] **Consolidate the "mentor" persona constant** (`DOCTOR_IMAGE`, currently `/dr-hakim-clean.png`) — still duplicated verbatim as a private constant in `OnboardingModal.tsx`, `PharmacistChat.tsx`, `TutorialBot.tsx`, `ErrorExplanationPanel.tsx`, and `dashboard.tsx`. This is exactly the pattern that caused the 5-commit "Dr Hakim gender" fix chain — extract to one shared module (e.g. `src/lib/mentor.ts`).

## Architecture / code quality

- [ ] Centralize the ~16 files' worth of duplicated `supabase.from(...)` query logic into `src/lib/api/*` modules instead of embedding raw queries per route.
- [ ] Replace `(supabase as any)` casts in `useCaseLoader.ts` (lines ~299, 321, 536, 544, 550) — `case_templates`/`user_seen_cases` are already properly typed in the generated types, the casts are stale.
- [ ] De-duplicate the `Profile` type in `auth-store.ts` — hand-maintained instead of importing `Tables<'profiles'>` from the generated Supabase types; can silently drift from the real schema.
- [ ] Split oversized multi-concern files: `game.community.tsx` (still ~1600 lines mixing mode-picker + Rx game + OTC game), `game.industry.tsx` (~1277 lines), `useCaseLoader.ts` (generic hook + OTC hardcoded fallback + procedural case generator, three concerns in one file).

## Repo hygiene / DX

- [ ] **Fix the `supabase/config.toml` project mismatch** — it points at `ogxbvpnpqbwjmdyhrabr` while the app actually runs against `hpzjxzmqgrcpbizxucbp`. Until fixed, any `supabase db push` / `migration list` targets the wrong project, which is why migrations in this repo have not been reaching the live database.
- [ ] Fix the corrupted root `.gitignore` (`c:\Users\DeDSeC\Desktop\pharmulation\.gitignore` has garbled/spaced-out text).
- [ ] **Decide on Prettier formatting.** `npm run lint` reports ~4,200 `prettier/prettier` errors because the codebase was never formatted but `eslint-plugin-prettier` is configured to error on it. `npx prettier --write .` fixes all of them, but reformats essentially every file — a huge diff that would bury real history. Either run it once deliberately (ideally as its own commit, and worth adding a `.git-blame-ignore-revs`), or drop the prettier plugin from the eslint config. Left alone for now since it is a judgement call. Underneath the formatting noise the only real findings are 165 `no-explicit-any`, 14 `react-refresh/only-export-components`, 5 `react-hooks/exhaustive-deps` (all in `game.industry.tsx` / `game.warehousing.tsx`), and 1 `prefer-const`.
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
