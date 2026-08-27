# Pharmulation showcase-readiness checklist

Tracks the findings from the full-codebase audit. Items get checked off as they're implemented and verified. See commit `633cf12` for the first batch.

## Done

- [x] Untrack `.env` from git, add it to `.gitignore`, add `.env.example` — leaked `GEMINI_API_KEY` is no longer tracked; key has been rotated.
- [x] **Close the `profiles.role` self-escalation hole** — `20260827120000_prevent_profile_role_self_escalation.sql`, applied to the live database and verified end-to-end: an authenticated user's self-promote is reverted, their normal profile updates (xp etc.) still work, and the service-role path used by the admin panel can still promote.
- [x] Remove Emergency mode (was broken — `onExit` crash — and unreachable from any nav link).
- [x] Remove Cosmetic mode (was dead config, no route ever existed).
- [x] Delete standalone `game.rx.tsx` / `game.otc.tsx`; `game.community.tsx` is now the single Rx+OTC implementation.
- [x] **Make account deletion real** — was deleting only the `profiles` row from the browser, leaving the auth user, scores, badges and certificates behind while claiming to delete everything; signing back in gave an account with no profile row. Now a `deleteOwnAccount` server function deletes the auth user with the service role and everything cascades. Verified all user tables drop to zero and credentials stop working.
- [x] **Consolidate the mentor persona** into `lib/mentor.ts` — the avatar path was copy-pasted across five components (the cause of the five-commit "dr hakim gender" chain). Orphaned assets removed.
- [x] **Rebuild OTC as a fully AI consultation** — the patient now improvises from an authored 12-case clinical bank (`lib/game/otc-cases.ts`) with no scripted dialogue, and the consultation itself is graded against WWHAM plus red-flag recognition (`gradeConsultation`). Replaces the two hardcoded cases, the scripted fallback, and the previously unscored conversation. Lives in `OtcConsultation.tsx`.
- [x] **Make the in-game score agree with the final score** — added `liveScore`/`liveScoreFromPoints` (delegating to `computeScore` so they cannot drift) and `SCORE_WEIGHTS` as the single source of truth for point values. Verified live and final now match exactly across all difficulties. Fixed three real bugs found on the way: hospital showed `orders.length * 5` (tracked nothing; now hidden, since it only reveals correctness on submit), industry/warehousing hardcoded `- 100` for the difficulty base (easy lost 10 points, hard gained 20), and several OTC toasts quoted point values that disagreed with what was actually scored.
- [x] **Make XP/streak updates atomic** — `apply_case_result` / `touch_daily_streak` SECURITY DEFINER RPCs (migration `20260827130000_atomic_profile_counters.sql`), applied live and verified: 20 concurrent increments now all land (xp 2000/2000), where the old read-modify-write pattern lost 19 of 20 (xp 100/2000). The RPC also clamps caller-supplied XP, and the streak is idempotent within a day.
- [x] **Surface Supabase errors instead of swallowing them** — added `lib/supabase-query.ts` (`unwrap`/`unwrapList`) that throws with a user-facing message and logs the raw Postgrest error, plus a global `QueryCache` handler in `router.tsx` that toasts failures (deduped by message). Applied across the query call sites; paths with their own fallback log instead, and score submission toasts since a lost score is silent data loss.
- [x] **Fix the four latent `tsc` errors and add a `typecheck` script** — none were caught at build time because vite/esbuild strips types without checking. `npm run typecheck` is now clean.
- [x] **Make `npm run lint` usable** — it was walking `.vercel`/`.netlify` build output, taking minutes and crashing on stale generated files. Now ignores build output and the generated route tree; finishes in ~20s.
- [x] Fix the admin panel's silent no-op writes — "Promote user" and "Delete case" now run through `createServerFn` (`lib/api/admin.functions.ts`) using the service-role client with a server-side admin re-check, plus toasts/pending states/cache invalidation. **Needs `SUPABASE_SERVICE_ROLE_KEY` set on the server (local `.env` and Vercel) to work.**
- [x] Fix Gemini chat failing with 404s on every model — `chat.functions.ts`'s hardcoded model fallback list (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-*`, `gemini-1.5-flash`) was entirely deprecated for new API keys. Replaced with `gemini-flash-lite-latest` / `gemini-flash-latest` / `gemini-3.5-flash` / `gemini-3.5-flash-lite`, verified against the live key.

## Next up — correctness / security

- [x] **Migration drift — root cause fixed and live database audited clean.** `supabase/config.toml` pointed at `ogxbvpnpqbwjmdyhrabr` while the app runs against `hpzjxzmqgrcpbizxucbp`, so `supabase db push` silently targeted the wrong database and migrations here never reached production. Two were caught missing after the fact:
  - `20260827120000` (role self-escalation trigger) — applied late; the hole was live until then.
  - `20260615153330` (badge/leaderboard lockdown) — **never ran**; any authenticated user could self-award badges and write arbitrary leaderboard scores, and `award_badge_if_earned` did not exist, so no badge had ever been awarded.

  `config.toml` now points at the real project. A full audit of live vs. repo (2026-08-27) found **no remaining drift**: all 11 tables, all later-added columns, the dropped `drugs.is_bookmarked_by`, all 7 RPCs, and the RLS write locks on `user_badges`, `leaderboard`, `drugs` and `cases` all behave as the migrations intend, and `profiles` reads are correctly scoped to own-row.

  Still worth doing: `supabase link --project-ref hpzjxzmqgrcpbizxucbp` and confirm `supabase migration list` shows local and remote in step, so future migrations apply through the CLI rather than by hand.

- [x] **Repo hygiene** — added a root README (setup, env vars, modes, migration workflow, layout); deleted `netlify.toml` (published `dist` while the Nitro vercel preset outputs `.vercel/output`, so Netlify builds were already broken) and the stale `pharma-verse-play-main/`; rewrote the mangled root `.gitignore`; moved working documents into `docs/`. Kept `bun.lock` (its `bunfig.toml` carries a real supply-chain guard) and the root `package.json` (Vercel may use it for project detection) — both documented in the README instead.

- [x] **Add a test suite and CI** — 73 vitest tests over the pure logic (scoring engine, retry decay, tiers/CPD, the error-unwrap helper, and structural validation of all 12 OTC clinical cases), plus a GitHub Actions workflow running typecheck, tests and build on push and PR. Lint runs non-blocking while the `any`s remain.
- [x] **Tighten types** — `Profile` now derives from the generated schema (the hand-written one had already drifted, missing the `admin` role, forcing a cast in `admin.tsx`), and the five stale `(supabase as any)` casts in `useCaseLoader` are gone.
- [x] **Delete the dead OTC pilot loader** — the two hardcoded case UUIDs, the ~210-line embedded fallback and its helpers. Nothing had called `useCaseLoader("otc")` since OTC moved to the authored case bank. 578 lines down to 346, and the third copy of that content is gone.
- [x] **De-duplicate seed data** — the single-file dump and the three chunks held the identical 147 rows. Kept the chunks (the 220KB single file is too large for the SQL editor) with a README explaining the order.

## Architecture / code quality — deliberately deferred

These are refactors, not defects. Each is a large, purely internal change with
real regression risk and nothing a user or reviewer would see, so none were
bulk-applied while the app was being prepared for showcase. Worth doing after,
ideally one at a time behind the test suite that now exists.

- [ ] Centralize the duplicated `supabase.from(...)` query logic into `src/lib/api/*`. Touches ~16 files; the error-handling half of the problem is already solved by `unwrapList`.
- [ ] Work through the ~136 `no-explicit-any` lint errors. Many are untyped case JSON, which needs a real schema for case content first rather than a mechanical cast-removal pass.
- [ ] Split the oversized files: `game.community.tsx` (~1,400 lines, mode picker + Rx game) and `game.industry.tsx` (~1,277). `useCaseLoader.ts` is already down to 346.
- [ ] `leaderboard` table is dead schema — never read or written, and fully locked down by RLS. Harmless where it is; drop it only alongside a deliberate migration, not as incidental cleanup.

## Repo hygiene / DX

- [x] **Prettier decision made: not wired into lint.** `eslint-plugin-prettier` was reporting ~4,200 formatting errors because the codebase was never formatted with it, which buried every real finding. Rather than reformat essentially every file (a diff that would bury real history for no reviewer-visible gain), prettier was removed from the eslint config and remains available on demand via `npm run format`. `npm run lint` now reports **152 real problems** (140 `no-explicit-any`, 12 warnings) instead of 4,380. `no-explicit-any` is deliberately left as an error rather than downgraded — it is genuine lost type safety, tracked below.

## Deliberately deferred (flagged, not forgotten)

- `oncology` mode: same shape as the removed `cosmetic` (dead config, no route), but wasn't requested for removal — left in place.
- DB `case_mode` enum still contains `oncology`/`cosmetic`/`emergency` values — harmless to leave; dropping enum values requires type recreation and wasn't in scope.
