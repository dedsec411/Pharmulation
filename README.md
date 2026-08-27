# Pharmulation

A browser-based pharmacy training simulator. Players work real pharmacy
workflows against the clock — dispensing prescriptions, running an OTC
consultation with an AI patient, building clinical medication orders,
manufacturing a batch, and running a warehouse — and are scored on accuracy,
safety and speed.

Built as a learning tool: every mistake is explained by an in-game mentor
rather than just marked wrong.

## Training modes

| Mode | What you do |
|---|---|
| **Community Pharmacy — Rx** | Read the prescription, collect the right medicines, compound where needed, then write correct dispensing labels. |
| **Community Pharmacy — OTC** | Take a history from an **AI patient** in free conversation, then recommend a product, dose and counselling. Graded on WWHAM coverage and red-flag recognition. |
| **Clinical** | Review the patient file, build medication orders with correct dose/route/frequency, and catch interactions. |
| **Industry** | Run a batch from master formula through weighing, environment, process stages, QC and release. |
| **Warehousing** | Receiving, FEFO dispatch, expiry handling, cold chain, audit decisions and reconciliation. |

Difficulty (easy / medium / hard) changes scoring weights, how much time you
get, how much the mentor reveals, and — in OTC — how forthcoming the patient is.

## Tech stack

- **React 19** + **TanStack Start** (SSR, file-based routing, server functions)
- **Vite 7**, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion
- **Supabase** — Postgres, Auth, RLS
- **Google Gemini** — the AI patient and the mentor chat
- Deployed on **Vercel** (Nitro `vercel` preset)

## Getting started

The application lives in `pharmu/`, not the repository root.

```bash
cd pharmu
npm install
cp .env.example .env    # then fill in the values below
npm run dev             # http://localhost:8080
```

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | client + server | Supabase project. Safe to expose; protected by RLS. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server (SSR) | Same values, read server-side. |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Bypasses RLS. Needed for the admin panel and account deletion. Never prefix with `VITE_`. |
| `GEMINI_API_KEY` | **server only** | Google AI Studio key for the AI patient and mentor chat. |

`.env` is gitignored. The two server-only keys must also be set in the Vercel
project settings, or the admin panel and AI chat will fail in production.

### Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run format     # prettier --write
```

## Database

Schema lives in `pharmu/supabase/migrations/`, applied in filename order.

```bash
supabase link --project-ref <your-project-ref>
supabase migration list    # confirm local and remote agree
supabase db push
```

`supabase/config.toml` must name the same project the app talks to. It once
pointed elsewhere, so `db push` silently targeted the wrong database and two
migrations never reached production — one of which left badge and leaderboard
writes open to any logged-in user. If you change projects, change it here too,
and re-run `migration list`.

Security-relevant behaviour is enforced in the database, not the client:

- Row-level security scopes every table to its owner.
- Privileged writes go through `SECURITY DEFINER` functions that re-validate
  server-side — `award_badge_if_earned`, `apply_case_result`,
  `touch_daily_streak`.
- A trigger blocks a user from escalating their own `profiles.role`.
- Admin actions and account deletion run in server functions with the service
  role, never from the browser.

## Project layout

```
pharmu/
  src/
    routes/                 file-based routes; _authenticated/ requires a session
    components/game/        game UI: timer, mentor panel, OTC consultation
    lib/game/               scoring engine, case data, shared game rules
    lib/api/                server functions (Gemini chat, admin, account)
    integrations/supabase/  generated client and types (do not hand-edit)
  supabase/migrations/      schema history
docs/                       design notes and working documents
```

## Notes for contributors

- `npm run build` does not type-check — Vite strips types without checking
  them. Run `npm run typecheck` before pushing.
- `src/routeTree.gen.ts` and `src/integrations/supabase/types.ts` are
  generated. Regenerate rather than edit.
- Deploys use **npm** (see `vercel.json`). A `bun.lock` also exists alongside
  `bunfig.toml`'s supply-chain guard; if you install with bun, keep
  `package-lock.json` in step or the deploy will build different versions.
- The OTC clinical content in `src/lib/game/otc-cases.ts` is training material.
  Have a qualified pharmacist review changes to doses, referral thresholds or
  contraindications.
