# Pharmulation — context for a new session

Paste this whole file as the first message of a new Claude chat. It is written
for someone who has never seen the codebase, and it is deliberately specific
about the things that have already gone wrong, because those are the ones that
will go wrong again.

Last updated: 13 September 2026.

---

## What this is

A browser-based pharmacy training simulator. You are handed a prescription, a
patient or a delivery and you have to work it: pick the right medicine, get the
dose and the label right, spot what is wrong before it reaches the patient.

It is being demonstrated at **SIMPACT, Aga Khan University, on 17 September
2026**. Anything that would embarrass the product in front of a judge or a
pharmacist matters more than anything that would only annoy a developer.

Audience: pharmacy students, technicians, practising pharmacists, and the
educators who teach them. Built in and for **Pakistan** — the medicine
catalogue carries Pakistani brand names and the warehouse content is written
against DRAP rules and PKR.

---

## Stack

| | |
|---|---|
| Framework | TanStack Start (SSR) + TanStack Router, file-based routes |
| UI | React 19.2, Tailwind v4, shadcn/ui in `src/components/ui`, Framer Motion |
| State | Zustand (auth, theme, settings), TanStack Query v5 for server state |
| Backend | Supabase — Postgres, Auth, **RLS everywhere** |
| Server code | `createServerFn` from TanStack Start, files named `*.functions.ts` |
| Build/test | Vite 7, Vitest 4, TypeScript 5.8, Zod 3 |
| Hosting | Vercel |

### Commands

```bash
npm run dev        # dev server (picks a free port from 8080 up)
npm run typecheck  # tsc --noEmit
npm test           # vitest run
npm run build      # vite build
npm run lint
```

**Always run typecheck, tests and build before claiming something works.** The
current baseline is **911 tests across 49 files, all passing**.

---

## Repo map

```
pharmu/
  src/
    routes/                     file-based routes
      __root.tsx                document head, meta, favicon, analytics, 404
      index.tsx                 public landing page
      login.tsx signup.tsx leaderboard.tsx privacy.tsx terms.tsx
      _authenticated/           everything behind sign-in
        dashboard.tsx modes.tsx drugs.tsx profile.tsx settings.tsx
        class.tsx               student's class page
        game.community.tsx      Rx + OTC
        game.hospital.tsx       clinical
        game.industry.tsx       manufacturing batch
        game.warehousing.tsx    timed warehouse case
        assessment.$assessmentId.tsx
        admin.tsx
      educator/                 faculty side, its own shell and sub-nav
        dashboard classes assign analytics assessment
    components/
      ui/                       shadcn primitives
      game/                     shared game pieces (GameHeader, FeedbackScreen…)
      lens/                     Prescription Lens UI
      warehouse/                facility-mode screens (PARKED, see below)
      Navbar.tsx TutorialBot.tsx LegalPage.tsx …
    lib/
      api/                      server functions + provider transports
      game/                     scoring, weakness map, dosing, case building
      educator/                 classes, join codes, assignments, assessments
      lens/                     prescription reading + case building
      warehouse/                facility simulation engine (PARKED)
      site.ts                   canonical URL, product name, descriptions
      supabase-query.ts         unwrap/unwrapList — throw on error, never swallow
  supabase/migrations/          44 SQL migrations, applied by hand
  public/                       icons, og-image, robots.txt, sitemap.xml
```

---

## The training modes

Four, all timed cases scored the same way:

- **Community Pharmacy** (`/game/community`) — Rx dispensing and OTC
  consultation. The fullest mode; contains compounding too.
- **Clinical** (`/game/hospital`) — build medication orders, check interactions.
- **Industry** (`/game/industry`) — run a tablet batch from formula to release.
- **Warehousing** (`/game/warehousing`) — six phases: receiving, dispatch,
  expiry, audit, reconcile, then the challan/GRN close. Reads
  `cases.shipment_json`.

Modes removed earlier and gone for good: emergency, cosmetic, oncology. The
Postgres `case_mode` enum still lists them; that is harmless and deliberate.

### The parked facility mode — read this before touching warehousing

A full persistent-pharmacy simulation was built and then **parked**: licences,
weekly close, cash, inspections, recalls, cold-chain excursions, the lot. It is
not routed. It still lives at:

- `src/lib/warehouse/` — the engine, pure and tested (economics, week close,
  compliance, events, supplier terms, scoring, view models)
- `src/components/warehouse/` — six screens
- `src/lib/api/warehouse.functions.ts` + `src/lib/warehouse/run.ts`
- `wh_*` tables in the database, migrations already applied

**257 of those tests belong to it and still pass.** Do not delete it and do
not "clean up" the dead code. To bring it back:

```bash
# note the pharmu/ prefix - the git root is one level above this directory
git show fe54534^:pharmu/src/routes/_authenticated/game.warehousing.tsx > src/routes/_authenticated/game.warehousing.tsx
```

…then remove `warehousing` from `MODE_TIMERS` in `src/lib/game/shared.ts`. The
`TimedMode` type exists precisely so the compiler then points at every screen
that assumed a timer.

---

## Subsystems

### Prescription Lens
Photograph a real prescription, get a playable case. `/lib/api/lens.functions.ts`.

Reading is done by **PrescriptoAI**, not a chat model. Three things about that
API were found by testing and contradict its published docs:
- endpoint is `https://www.prescriptoai.com/...` — the apex domain 307s to www
  and both fetch and curl **drop the Authorization header across hosts**
- the multipart field is `prescription`, not `image`
- the response is an envelope (`success`/`data`/`type`/`metadata`) and carries
  **no confidence score**

Mapping lives in `src/lib/lens/from-prescriptoai.ts`.

**Privacy rules, non-negotiable:**
- the image is never stored — in memory for one request, then gone
- the patient's real name is dropped at the mapping boundary; the case carries
  an invented one
- never log the payload

### The challan close (last phase of warehousing)
Carton condition, then the three-way match of purchase order against delivery
challan against goods received note. `src/lib/game/goods-in.ts`, screen in
`src/components/game/CartonCheck.tsx`.

It runs **last**, after reconciliation, and is wired to what came before: each
carton shows the zone the learner sent that stock to (or that they quarantined
it), and flags a product the stock count disputed. Moving it there means it
reads as the close of a shift rather than a screen of its own — don't move it
back to the front without also removing those links.

The case files say nothing about paperwork, so the documents are generated from
the case id — deterministically, so a replay meets the same delivery. Only
logistics metadata is invented: quantities in packs, an invented supplier,
document numbers, a GTIN with a real check digit. The medicine, batch, expiry
and storage condition all come from the case, and no price appears anywhere.

**The minimum shelf life is read off the purchase order, not hardcoded.** A
fixed threshold was tried twice and rotted both times: expiry dates in the case
files are absolute and the calendar keeps moving, so by September 2026 a flat
twelve-month rule failed seventeen of twenty-three batches. The term is now
chosen per delivery as the longest of 18/12/9/6 months that still leaves most
of the consignment acceptable. If those case expiries are ever refreshed, the
tests in `goods-in.test.ts` carry the eight real spreads and should be updated
with them.

### Educator / class platform
Faculty create classes with a 6-character join code (alphabet excludes I, O, 0,
1). Students join, get assignments and timed assessments.

- faculty: `src/routes/educator/*`, data in `src/lib/educator/queries.ts`
- student: `/class` page, `src/lib/educator/join.ts` and `student-work.ts`
- `useStudentWork` is the single source of truth for done/overdue — the
  dashboard list and the class page tiles both read it so they cannot disagree

### The guide (Dr. Hakim, who flies)
`src/components/TutorialBot.tsx` wires a guide who waits in the **bottom-left
corner** of every signed-in page and flies to the controls he explains, with
the rest of the page dimmed. The decisions live in tested modules:

- `src/lib/guide-flight.ts` — where he lands and where his bubble goes: below
  the target, then above, then beside, and over it only when nothing else
  fits. Scrolling allows for the sticky bar.
- `src/lib/tutorial-spots.ts` — what he says at each control. An element opts
  in with `data-tour="id"`, the screen it belongs to with
  `data-tour-scene="id"`. **Marking a control means writing its words**: the
  tests read the source in both directions and fail on either gap. No doses or
  ranges in the words.
- `src/lib/tutorial.ts` — the written guides. A step's optional `target` flies
  to that control when it is on screen and is said from the middle when not.
- `src/lib/tutorial-store.ts` — what he is doing, `pausesClock`, `guideLocked`.
- `src/components/guide/*` — the avatar (springs, so a target that scrolls
  moves the end of the flight), spotlight, bubble, menu, What's-this outlines,
  and the library (written guides + short forms).

- **The first time a screen appears he comes over by himself**, once per
  screen per account. A `MutationObserver` watches for scenes; it is throttled,
  not debounced, because the ambient animations never stop mutating the page.
- A mode's first case gets its overview then the case bar and first screen as
  **one** tour, fired from `DifficultySelect`'s `choose()`. `holding` stops a
  smaller tour jumping in ahead of it. Pressing on from the overview re-reads
  the page, because on a slow load the case arrives after the tour starts.
- The full tour still opens on a first dashboard visit (`shouldAutoRunTour`)
  and marks the dashboard's own introduction as done.
- **Never over a modal** (`pageIsCovered`: a fixed full-screen layer that takes
  clicks) and **never in a graded sitting or a live session** (`guideLocked`),
  where stopping the clock would be an unfair pause.
- **The case clock stops while he covers the page** — touring, What's-this, the
  library (`shouldTick` in `useTimer.ts`). Not for the menu: a menu left open
  would be a free pause the case bar charges for.
- Settings → "Dr. Hakim comes over" stops the uninvited visits; tapping still works.
- **The guest account remembers in sessionStorage, not localStorage**, and
  ignores `profiles.onboarding_completed`. It is shared: at a stand it is
  whoever picked up the laptop thirty seconds ago, so every visitor gets the
  tour. See `shouldAutoRunTour`.
- If you add a mode, add a guide and a `modeGuideKey` entry — a test fails
  otherwise.

### Case variety and difficulty
- **Difficulty is served as asked.** `difficultyPool` in `case-selection.ts`.
  It used to widen with player level — from level 8 Expert and Trainee drew the
  same pool. Don't reintroduce that.
- **No repeats until a bucket is exhausted.** `pickNextCase` prefers unseen,
  then least-recently-seen, recorded in `user_seen_cases.case_id`.
  **That table's unique index on (user_id, case_id) is partial, so an upsert
  with `onConflict` silently fails** — insert or update explicitly.
- **Difficulty changes the content**, via `DIFFICULTY_CONTENT` in `shared.ts`:
  consignments, audit calls, decoy ingredients, and whether tolerances are
  printed on the bench. Tests assert nothing gets easier as you climb.
- **Warehousing shifts are generated** (`warehouse-case.ts`), seeded per play.
  Every medicine/requirement/zone triple is lifted verbatim from the authored
  cases and the generator may emit no other combination — `drugs` has no
  storage column, so deriving one would be inventing a storage condition for a
  real product. **Adding to `VERIFIED_SHIPMENTS` needs a pharmacist.**

Still on fixed pools with no generator: Rx (7 templates, none `hard`), OTC,
Clinical, Industry. Industry varies through its form/product picker rather than
its case rows, so it is less exposed.

### Look-alike brand names (the differentiator)
`src/lib/game/lookalike.ts` measures how close two brand names are; the result
is committed as `lookalike-pairs.ts` (**generated — regenerate, don't hand-edit**).
Over all 1,286 Pakistani brands it finds **55 pairs within two edits, every one
crossing therapeutic classes** — Clopid/Lopid, Amoxil/Doxil, Neoral/Nizoral.
Several appear on the international ISMP confused-name lists, which says the
method finds real pairs; the rest appear to be unpublished for this market.

The drill is on the Community picker and scores as `rx`.

**They are candidates, not findings.** The measurement is orthographic only.
Confirming any pair has actually been confused in a Pakistani pharmacy needs
incident data and a pharmacist — say that whenever the figure is quoted. The
drill itself asserts no pharmacology: the task is "the prescription says this
one, hand over this one", and a test fails if a dose ever appears.

### Live cohort sessions
**Needs `supabase/migrations/20260913120000_live_sessions.sql` applied by hand.**
Nothing works until it is run in the SQL editor; the pages degrade with a toast
rather than a white screen, which is verified.

Host at `/educator/live`, players at `/live`. Everybody plays the same drill
because the questions generate from a `seed` stored on the session. Polled
every 2s rather than subscribed — a hall on conference wifi recovers from a
missed poll, not from a dropped socket.

Two schema rules worth keeping: joining goes through the SECURITY DEFINER
`join_live_session_by_code` so nobody can enumerate running sessions, and the
"can I see my session's participants" check uses a SECURITY DEFINER helper —
**a policy on `live_participants` that selects from `live_participants`
recurses and Postgres fails the query.**

### Practice evidence record
`src/lib/educator/competence.ts` + `competence-pdf.ts`, downloaded from
Profile → Certificates. Reads back `errors_detail`, which nothing else did.

It is an **evidence record, not a certificate of competence** — keep that
wording. An error is "resolved" only if it has not recurred in the later half
*and* there are ≥4 cases; no trend is reported below 4 cases; a change under 3
points is "steady". Don't loosen those: it is a document somebody signs.

### Bench instruments (Industry)
`src/lib/game/gauge.ts` is the only geometry: a reading becomes a fraction of
the scale, and the needle angle, ticks and arcs all come from that fraction
(tested, including that the needle tip lands on the arc point). The dials in
`src/components/game/Instruments.tsx` draw from it. The old ones swept a
different angle from their face, so **0 g did not read 0** - don't draw a dial
from its own numbers again.

- `envBounds` is the one reach for the room controls, shared by the sliders,
  the gauges and the room's opening value.
- **Don't pass colours through a motion element's `style`.** A `motion.path`
  given `style={{ fill }}` applied it once on mount and never updated - the
  needle stayed blue while the card said "Too hot". Use the `fill` attribute.
- The balance is `guided` only when `showTolerances` is on. At Expert it shows
  a weight and Settling/Stable, no band, and the slider and Confirm button stay
  neutral, or they give away the tolerance the batch record is meant to hold.
- The room gauges still print their acceptable range at Expert. The difficulty
  picker says tolerances are "only in the batch record" at Expert, so that is
  an open inconsistency to decide on.

### Short forms (the jury's objection)
`src/lib/glossary.ts` (21 entries, tested) + `src/components/Abbr.tsx`.
`<Abbr term="FEFO" />` renders the short form with hover *and* tap definitions
— tap matters, `title` does nothing on a phone. A **Plain English** switch
(Settings, and in the guide panel) expands every short form at once. The guide
panel also carries the full glossary. Don't delete the abbreviations: they are
what a pharmacist meets at work.

### The guest demo account
It is an ordinary account, so **Settings → delete account once destroyed it**
and took the landing-page button down with it. `deleteOwnAccount` now refuses
for the demo, checked against `GUEST_EMAIL` server-side rather than an id,
because recreating the account assigns a new one. If it is ever recreated,
update `GUEST_USER_ID` in `guest.functions.ts` (leaderboard filters + tour).

### No free answers
`src/lib/game/no-free-answers.ts` (tested). Two rules every mode must follow:

1. **Option order is shuffled** with `shuffledBySeed(items, "<caseId>:<question>")`,
   and answers are judged by *value*, never by index. The correct answer used
   to be written first or second — in Industry's fourteen process questions it
   was never third or fourth once.
2. **No control opens on a passing value.** `wrongStart({min,max,floor,ceiling,step,seed})`
   returns something outside the acceptable band, away from its edge. Pass the
   *same* bounds the slider itself renders, or the opening value lands off the
   end of its own track.

Both are seeded per case so a replay shows the same screen — a disputed mark
has to be reproducible. What was removed is the systematic bias, not the
reproducibility.

If you add a question or a dial, use these. There are tests asserting the
answer lands in every position roughly equally, and that a "sound" carton's
accept button is not always at the top.

### Weakness map
`src/lib/game/weakness.ts` — drug class × clinical skill, built from
`scores.errors_detail`. Warehousing and industry are deliberately excluded;
their faults go to a separate operational track in `src/lib/game/operations.ts`.

### Scoring
`src/lib/game/shared.ts` — `computeScore`, `computeScoreFromPoints`,
`submitScore`. XP is score ÷ 2.

---

## Data model essentials

| Table | Notes |
|---|---|
| `profiles` | email, full_name, role (`student`/`educator`/`admin`), xp, level, streak, cpd_hours_earned |
| `drugs` | **896 rows** |
| `drug_brands` | **1,286 Pakistani brand names** — the real differentiator |
| `cases` | **65**, 8 per mode; warehousing ones carry `shipment_json` |
| `scores` | one row per completed case, `errors_detail` drives the weakness map |
| `classes`, `class_enrollments`, `class_assignments`, `assessments` | educator platform |
| `wh_*` | parked facility mode |

**Security is RLS, not application filters.** Server functions use the
caller's own Supabase client (`context.supabase`), never the service role,
except where explicitly noted. If you add a table, add policies.

---

## House style — follow it

1. **Comments say *why*, never *what*.** Explain the decision, the trade-off,
   or the bug that forced it. Look at any file for the register.
2. **Pure logic goes in `src/lib/**` with tests.** Components stay dumb.
   Judgements — what counts as overdue, what a week scores — belong in a tested
   module, so a learner disputing a result can be shown the rule.
3. **Never invent clinical content.** No fabricated doses, interactions or
   testimonials. If a fact needs a pharmacist to sign it off, say so instead of
   guessing. Mentor tips deliberately contain no numeric doses.
4. **Errors throw.** `unwrap`/`unwrapList` in `src/lib/supabase-query.ts` turn
   a failed query into a thrown error so React Query surfaces it. Never return
   `[]` on failure — that renders "no data" for a broken database.
5. **Loading is not the same as empty.** Use `isPending`; a returning user must
   never be told they have no history while their history loads.
6. **Commit each discrete change on its own**, with a message that explains the
   reasoning, not the diff.
7. **Migrations are applied by hand** in the Supabase SQL editor. There is no
   CLI access token. Write the file, then tell the user to run it — and say so
   loudly, at the top of your reply, not buried in a summary.

---

## Landmines — every one of these has already bitten

- **Do not wrap the router outlet in `AnimatePresence`.** A keyed remount made
  every page rebuild at opacity 0 on each navigation and was reported as "the
  page loads twice". `src/components/PageTransition.tsx` is the fix; leave it.
- **Auth checks belong after mount, not in `beforeLoad`.** Putting one in
  `beforeLoad` changed the client-matched route versus the server's and
  regenerated the whole tree.
- **Unqualified columns in RLS subqueries.** `WHERE e.class_id = id` bound `id`
  to the inner table, so no student could ever read their class — and because
  assignment queries key off that list, lecturers could set work nobody saw.
  Always qualify: `public.classes.id`.
- **`Math.random()` in a render body** re-rolls on every re-render and causes an
  SSR hydration mismatch. See `tipOfTheDay`/`nextTip` in `src/lib/mentor.ts`.
- **Batch numbers must be unique.** A recall names one and nothing else.
- **Placeholders are not labels.** Every input needs a real `<label>`, hidden
  with `sr-only` if the design has no room.
- **Check the live API, don't trust its docs.** See PrescriptoAI above.
- **`.env` is gitignored and must stay that way.** A Gemini key was committed
  once and had to be rotated. Real keys: `PRESCRIPTOAI_API_KEY`,
  `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `VITE_`).

---

## Where things stand

**Done recently:** favicon and share card (there was no favicon at all, and the
share image pointed at a dead scaffolding URL); privacy and terms pages written
from the real schema; FAQ; robots/sitemap/canonicals; cookieless Vercel
Analytics (**no cookie banner — the only cookie is the auth one, which needs no
consent**); images cut from 1.78 MB to 96 KB; drug search memoised and
deferred; skeletons and error states on the dashboard; press feedback on every
button; 56 mentor tips rotating per visit; student class page; role-aware
navigation (students see Class, faculty see Faculty).

**Landing page claims were corrected** — it previously said "70,000+
Pharmacists Trained" and "100 CPD Credit Hours" with invented testimonials.
Now: 896 medicines, 1,286 brand names, 4 modes, 65 case files, all countable.
Do not reintroduce unverifiable claims.

**Open items:**
- `PRESCRIPTOAI_API_KEY` must be set in the Vercel project or the scanner
  reports itself unconfigured
- `SITE_URL` in `src/lib/site.ts` is `https://pharmulation.vercel.app`; if a
  real domain is pointed at it, change that plus `public/robots.txt` and
  `public/sitemap.xml`
- CPD is described as "evidence of practice, not accreditation". If the
  Pharmacy Council ever accredits it, the wording can be strengthened — not
  before
- signed-in pages have not been checked at 390px beyond a scripted overflow
  pass; worth ten minutes on a real handset
- a class-average figure for students needs a `SECURITY DEFINER` function
  returning only the aggregate, because RLS deliberately hides the roll

---

## How to work here

Read the file before changing it — most carry a comment explaining why they are
the way they are. Verify against the running app or the live database rather
than assuming. When something is wrong, say so plainly and fix the cause rather
than the symptom. And if a change cannot be verified, say that too.
