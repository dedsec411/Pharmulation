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
current baseline is **913 tests across 49 files, all passing**.

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
- While he covers the page **focus stays with him** and Tab wraps inside his
  bubble, library or outlines. Otherwise the stopped clock was a pause you
  could keep working through by keyboard.
- Controls in the sticky bar (nav, case clock) are **never scrolled to** —
  they are always on screen, and scrolling towards them sent the page to the
  top. When he is done, the page goes back where the reader was, if he moved it.
- **Skip on an introduction covers the whole current page**, including screens
  that finished loading after it began.
- `useDifficultyChoice` takes `{ guideKey }` for anything that borrows a mode's
  difficulty without being that mode. The look-alike drill passes `null`.
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

## Mobile — the rules every page is held to

Target widths: 360, 390, 393, 412, 430. **The desktop is designed; mobile work
must not move it.** Mobile-only changes go in base or `max-sm:` classes with the
existing `sm:`/`md:` classes left exactly as they were. Prove it: the fingerprint
approach used for the foundation pass records element geometry at 1440px before
and after, and the numbers must match.

Global rules (in `src/styles.css`, "Mobile foundation"):
- **`min-h-screen` / `h-screen` resolve to `100dvh`.** `100vh` on a phone is
  taller than the visible screen. Write `dvh` in any new viewport-sized value.
- **Text fields are at least 16px on touch screens**, or Safari zooms the page.
- **`overflow-x: clip` on phone widths.** Never `hidden` — it breaks sticky.

Conventions for the page passes:
- Gutter is `px-4` (16px); cards do not touch the screen edge.
- Touch targets at least 40px, 44px where there is room. Do not shrink buttons
  to fit; stack instead.
- Sticky chrome stays small: the case bar is one row plus the hint strip on a
  phone (~117px). Nothing fixed may permanently cover content — Dr. Hakim's dock
  has a phone-only spacer after the page, and steps aside when a modal opens.
- Modals taller than a phone screen scroll inside their overlay
  (`overflow-y-auto overscroll-contain` on the fixed layer).
- Animate transform and opacity, not size or position. No new backdrop blur:
  touch screens already have it switched off for frame budget.
- No JS resize listeners for layout that CSS breakpoints can do.

The shell (navigation and page frame) on a phone:
- **Below md, navigation is one menu control beside the logo** (`ShellMenu`):
  the button shows the current section (`src/lib/shell-nav.ts`), the panel drops
  from the bar with the destinations as 56px tiles, then settings, theme and
  sign-out rows. Used by the student `Navbar` and the faculty header. The desktop
  bar is unchanged; do not route desktop through it.
- Not a bottom tab bar, deliberately: Dr. Hakim's dock, the chat and the page-end
  clearance already own the bottom, and game screens have no nav bar.
- **Header-to-content gap is one rule** below md: `[data-app-nav] + main` gets
  24px. Put `data-app-nav` on any new app bar whose `<main>` follows it.
- **Page changes reset scroll instantly** (`scrollRestorationBehavior` in
  `src/router.tsx`). The stylesheet's smooth scrolling made every new page slide
  up from the last page's position.
- No `viewport-fit=cover`, so browsers keep content out of notches and home
  indicators themselves and no `env(safe-area-*)` padding is needed. If a bottom
  bar or cover is ever added, that stops being true.
- Toasts stay where the foundation pass put them (76px on phones, below the app
  bar). On a game page they still cross the hint strip; fixing that needs the
  case bar's height, so it belongs to the game-screen pass, not a shell offset.
- Known and left: every signed-in page renders its own `Navbar`, so the bar is
  rebuilt on navigation and the logo animation starts over. Making it persist
  means a shared layout route, which is an architecture change.

The student dashboard on a phone:
- **Order below sm:** mentor tip, standing (name, level, streak, XP), daily
  challenge, work set by the class, weekly report, then recommended, Lens,
  modes, recent activity and the board. Class work and the weekly report swap
  with `flex-col-reverse` on a wrapper; the DOM, and so a screen reader and the
  desktop, keep the report first.
- **Regroup with `contents`, not a second tree.** A wrapper that is a row or grid
  on a phone and `sm:contents` above it lets the same elements sit differently
  without moving the desktop row (assignment and assessment cards, the
  recommended button, the daily challenge header, the mode cards).
- **Mode cards are rows below sm** and their ambient art is hidden there: in a
  row that short it ran through the name and the count.
- **The tip does not grow while it types.** The full tip is laid out in
  transparent text and the typing is drawn over it. That growth was most of the
  page's layout shift on a phone (0.85 at 390px, 0.15 after).
- `AssignedWork` is shared with `/class`, so its phone layout shows there too.

The Modes page on a phone:
- **The four modes come first, Lens after them** (`flex-col-reverse` on a
  wrapper below sm; DOM order unchanged, so keyboard focus reaches Lens before
  the modes it is painted under — same trade as the dashboard's weekly report).
- **Each mode card is a row:** icon tile, name and description across the full
  width, then time, difficulty as words (not a 10px capitals badge) and a Play
  mark. The whole card stays the single link; Play is `aria-hidden` and never
  shown on a locked card. Ambient art is hidden below sm.
- Known and left: at 768px the desktop nav bar does not fit (the page scrolls
  sideways by about 230px) — a shell problem, not this page's. `BackButton` is
  38px tall on every page.

Community Pharmacy on a phone (Rx, OTC and the look-alike drill):
- **Toasts clear the case bar.** Below 600px, while a hint strip
  (`[data-tour="case-hint"]`) is on screen, toasts start at 7.75rem instead of
  76px (`styles.css`, "Game screens on a phone"). Applies to every mode's bar.
- **The Rx dispensing tray is in the page's flow below sm**, not sticky: pinned
  at top-20 it slid under the 116px bar. It still sits directly above the shelf.
- **Category lists are two columns of name-and-count tiles** (Rx shelf and
  `DispensingShelf`); the repeated icon, "Open shelf…" and "choose brand" lines
  are hidden there.
- **Label choices are a two-column grid of 44px buttons** with `aria-pressed`;
  the duration slider's touch box, scale and Ongoing switch are phone-sized.
- **The prescription sheet's printed fields are 12px on a phone** (units 11px),
  and the "Show typed" link is a real button there.
- OTC loses its outer card below sm; the chat header no longer wraps.
- Brand pickers (Rx and `DispensingShelf`) scroll inside their overlay
  (`overflow-y-auto` + `my-auto`), at every width - they could not scroll.
- Verified by `community.mjs`-style driving with Supabase writes answered
  locally and server functions blocked; desktop and 640/768px geometry matched
  the before runs scene by scene.
- Known and left: Dr. Hakim's dock still overlaps whatever content is at the
  bottom-left at some scroll positions (he steps aside for modals) — mentor
  pass. The sticky tray still tucks 37px under the bar at 640px and up. From
  601px up toasts use Sonner's desktop position and can sit over the score and
  pause. The difficulty modal is taller than a phone screen and scrolls to
  Expert.

Clinical on a phone (`game.hospital.tsx`, `CaseFileSlides`):
- **The "Clinical alert" banner and the EKG floor are hidden below sm.** The
  banner sat at top-16, on the 116px bar's hint strip, and only repeats the
  toast and mistake panel that fire with it; the floor was fixed motion behind
  the order button.
- **The case file loses its clipboard card below sm** (the deck is already a
  card). Labs are a two-column panel there, with flag and range at 11px.
- **Order lines label every control** (`<label>` with a caption that is
  `sm:sr-only`): dose and route share a row on a phone, frequency takes the next
  - three abreast cut "once daily" to "once da". The formulary label is now
  attached to its field.
- Slide dots keep their 6px look; a pseudo-element gives each a 44px-tall touch
  area on a phone (a probe measuring the button still reports 6px).
- Shared: examiner and debrief eyebrow and chip labels are 11px on a phone.
- Known and left: the lab slide can list a reading twice (e.g. Potassium) when
  the default labs and the case's own use different names for it - React warns
  about the duplicate key. That is the chart data, not the layout. No drug pair
  in the current formulary data triggers the interaction alarm, so that path
  was not exercised; the renal alert was. Dr. Hakim still overlaps the
  formulary queue at the top of the page at some scroll positions.

Industry on a phone (`game.industry.tsx`, `BatchBooklet`, `Instruments`):
- **The step comes before the master formula reference below sm**
  (`order-last` on the aside). Above it, the reference put every task a screen
  and a half down. The aside has no controls, so focus order is unaffected; the
  Batch record button stays at the top of every phase.
- **The spinning gears, conveyor, "GMP" stamp and the gauges' falling or rising
  particles are hidden below sm.** The stamp sat on the BMR number; the rest was
  motion behind the numbers being read. Gauge faces still tint by zone.
- **Formula rows put the amount under the ingredient name** (beside it, the two
  ran into each other). The batch size field and every slider are 44px/40px
  tall; acknowledge, Confirm weight, Run drying and QC Continue are 44px and
  full width.
- **Tab rows (weighing inventory, batch record sections) are one sideways
  scrolling row of 44px chips** instead of three wrapped rows of 24-26px pills.
  Record tabs now carry `aria-pressed`.
- **QC verdicts sit under the reading as two 44px buttons.**
- The batch record is capped at 85dvh on a phone. The reference, gauge and
  "You made" (`CaseCelebration`, shared) labels are 11px there.
- **Landmine:** a nowrap scrolling row inside a `grid` item widens the item to
  the row's full length unless the item has `min-w-0` (the inventory card has
  it below sm). Without it the bench and the balance ran off the screen with no
  page-level overflow, because the card clipped them.
- Verified by `industry.mjs` (seeded case, Supabase writes answered locally,
  server functions blocked); desktop and tablet geometry matched the before runs
  scene by scene.
- Known and left: the dial end labels (e.g. "12°C / 33°C", "0 g / 8000 g") are
  9px SVG text. The reading and "Acceptable" range beside them are full size,
  and enlarging SVG text would crowd the ticks. The "BMR" `Abbr` tooltip button
  is 20×16 (shared component). The weighing card says "Step 2 - Weighing"
  though the room check comes first, and choosing an ingredient does not scroll
  to the balance below. Dr. Hakim overlaps the reference and process map at the
  bottom-left at some scroll positions. The balance dial logs framer-motion
  "motion.stop" warnings (pre-existing).

Warehousing on a phone (`game.warehousing.tsx`, `CartonCheck`,
`ModeAmbientLayer`):
- **Only the timed six-phase case is routed.** The parked facility engine
  (`src/lib/warehouse`, `src/components/warehouse`, `wh_*`) was not touched;
  nothing routable imports it. The probe logged every Supabase table the page
  reached at every width: no `wh_*` table, and the only writes
  (`user_seen_cases`, `scores`, `rpc/apply_case_result`) were answered locally.
- **The warehousing conveyor is hidden below sm** (screen intensity only; the
  dashboard and Modes cards already hide their art on phones). It is drawn
  twice - by `ModeTheme` and inside the route's `main` - and sat across the
  quarantine bay and the dispatch shelf.
- **Receiving:** zones are two columns with the repeated "Drop the selected
  shipment here" line hidden, quarantine keeps a full row, and the picked
  manifest says "Now choose a zone below" (the zones are under the whole list).
- **Expiry calls and the four carton condition checks are pairs of 44px buttons
  under their item**, not pills beside it; expiry now carries `aria-pressed`.
- **The audit status board follows the decision** (`order-last`, no controls,
  so focus order is unchanged).
- **The stocktake stays a table** (a four-column comparison) with tighter
  cells; each checkbox has a 44px label as its touch area and a name
  ("Investigate Vitamin D3") - it had none.
- The register modal has side margins, 44px fields and button. Stamp, slot,
  temp log, seal, GTIN and serial labels are 11px on a phone.
- Probe: `warehouse.mjs` also freezes `Date.now` while the shift is dealt -
  the seed uses the clock as well as `Math.random`.
- Known and left: the `Abbr` tooltip buttons (FEFO, DC, PO, GRN) are about
  18x16 - shared component, a mentor/typography pass. The temp log's "8C red
  zone" caption is 8px SVG text scaled up by the viewBox; the range beside it
  ("2-16C") is 11px. A score toast can sit over "Proceed to dispatch" while it
  is on screen. Dr. Hakim still overlaps the manifest list, the audit options
  and the three-way match at the bottom-left at some scroll positions. There is
  no barcode scanner or camera in this mode - the barcode is drawn on the
  carton and read by eye - so no scanning UI was exercised.

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
