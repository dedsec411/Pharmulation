import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, CalendarClock, CheckCircle2, ClipboardList, GraduationCap,
  Target, Timer, TrendingUp, type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CountUp } from "@/components/CountUp";
import { ClassMembership } from "@/components/game/ClassMembership";
import { LiveSessionJoin } from "@/components/game/LiveSessionJoin";
import { AssignedWork } from "@/components/game/AssignedWork";
import { useAuthStore } from "@/lib/auth-store";
import { useStudentWork } from "@/lib/educator/student-work";
import { supabase } from "@/integrations/supabase/client";
import { unwrapList } from "@/lib/supabase-query";

/**
 * Everything a student's class asks of them, in one place.
 *
 * Joining used to be a box at the bottom of the profile page and the work
 * appeared only on the dashboard, so nothing answered "what does my course
 * want from me". This page owns both.
 *
 * Laid out in that order deliberately: what is due, then how you are doing,
 * then the work itself, and the join form last. An enrolled student opens this
 * for the deadline, not to type a code they have already used.
 *
 * It is a student page. Faculty have their own side and are pointed at it
 * rather than shown an empty version of this one.
 */
export const Route = createFileRoute("/_authenticated/class")({
  head: () => ({ meta: [{ title: "Your class - Pharmulation" }] }),
  component: ClassPage,
  errorComponent: ({ error }) => <div className="p-5 sm:p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-5 sm:p-8">Not found</div>,
});

/** Matches the tile on the faculty overview, so the two sides read as one product. */
function Stat({
  icon: Icon, label, value, sub, tone = "plain", index = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string | null;
  tone?: "plain" | "good" | "warn";
  index?: number;
}) {
  const colour =
    tone === "good" ? "text-emerald-500"
    : tone === "warn" ? "text-amber-500"
    : "text-primary";
  // The CSS reduced-motion block cannot reach a framer transform, so the entry
  // and its stagger are dropped here rather than played at 0.001s.
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { delay: index * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduced ? undefined : { y: -4 }}
      className="glass-card p-5 max-sm:p-4"
    >
      <Icon className={`size-5 ${colour}`} aria-hidden="true" />
      <p className="mt-3 text-2xl font-black tabular-nums">
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

/** What this student has done, for their own reference. */
function useMyProgress(userId?: string) {
  return useQuery({
    queryKey: ["class-progress", userId],
    enabled: !!userId,
    queryFn: async () => {
      const rows = unwrapList(
        await supabase.from("scores")
          .select("mode, accuracy, completed_at")
          .eq("user_id", userId!)
          .order("completed_at", { ascending: false })
          .limit(500),
        "your class progress",
      ) as Array<{ mode: string; accuracy: number | null }>;

      const accuracies = rows.map((r) => Number(r.accuracy)).filter(Number.isFinite);
      return {
        cases: rows.length,
        accuracy: accuracies.length
          ? Math.round((accuracies.reduce((n, a) => n + a, 0) / accuracies.length) * 100)
          : null,
      };
    },
  });
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function ClassPage() {
  const { profile } = useAuthStore();
  const userId = profile?.user_id;
  const role = String(profile?.role ?? "");
  const isFaculty = role === "educator" || role === "admin";

  const work = useStudentWork(userId);
  const { data: progress } = useMyProgress(userId);

  const enrolled = work.classes.length > 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Bottom clearance for the mentor bot, which floats over the lower left
          corner on every page and was sitting on top of the last card. */}
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Class</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <GraduationCap className="size-6 shrink-0 text-primary" aria-hidden="true" />
              {enrolled ? work.classes.map((c) => c.name).join(", ") : "Your class"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {enrolled
                ? work.hasAnything
                  ? work.outstanding
                    ? `${work.outstanding} thing${work.outstanding === 1 ? "" : "s"} still to do.`
                    : "Everything set for you is done."
                  : "Nothing set yet. Anything you practise still counts."
                : "Join with the code your lecturer gave you to see the work they set."}
            </p>
          </div>
          {enrolled && (
            <Link
              to="/modes"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 max-sm:min-h-11"
            >
              Start training <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </header>

        {/* Faculty land here only by typing the address. */}
        {isFaculty && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-400/30 bg-sky-400/5 p-4">
            <p className="text-sm text-muted-foreground">
              You are signed in as faculty. Classes you teach are managed on the educator side.
            </p>
            <Link
              to="/educator/dashboard"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 max-sm:min-h-11"
            >
              Educator dashboard <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {work.classesPending ? (
          /* Two columns on a phone, exactly like the tiles it stands in for:
             a one-column skeleton followed by a two-column answer is a jump. */
          <div className="grid gap-4 max-sm:grid-cols-2 max-sm:gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-5 max-sm:p-4">
                <div className="size-5 animate-pulse rounded bg-foreground/10" />
                <div className="mt-3 h-7 w-16 animate-pulse rounded bg-foreground/10" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded bg-foreground/10" />
              </div>
            ))}
          </div>
        ) : !enrolled ? (
          <NotEnrolled userId={userId} />
        ) : (
          <div className="space-y-6">
            {/* Two by two on a phone. One column made four numbers - the whole
                summary - cost 600px before the work they summarise. */}
            <section className="grid gap-4 max-sm:grid-cols-2 max-sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                index={0}
                icon={work.outstanding ? ClipboardList : CheckCircle2}
                label={work.outstanding ? "Still to do" : "All caught up"}
                value={work.outstanding}
                tone={work.overdue ? "warn" : work.outstanding ? "plain" : "good"}
                sub={work.overdue ? `${work.overdue} past its deadline` : null}
              />
              {/* A date already gone is not a deadline to aim at, so overdue
                  work says so instead of printing last week under "next". */}
              <Stat
                index={1}
                icon={CalendarClock}
                label={work.nextDue ? "Next deadline" : work.overdue ? "Past its deadline" : "Next deadline"}
                value={work.nextDue
                  ? shortDate(work.nextDue)
                  : work.overdue ? "Overdue" : "-"}
                tone={!work.nextDue && work.overdue ? "warn" : "plain"}
                sub={work.nextDue
                  ? null
                  : work.overdue ? "Catch up when you can" : "Nothing with a date on it"}
              />
              <Stat
                index={2}
                icon={Timer}
                label="Assessments open"
                value={work.liveAssessments.length}
                sub={work.liveAssessments.length ? "Timed, one attempt" : null}
              />
              <Stat
                index={3}
                icon={Target}
                label="Cases completed"
                value={progress?.cases ?? 0}
                sub={progress?.accuracy === null || progress?.accuracy === undefined
                  ? null : `${progress.accuracy}% average accuracy`}
              />
            </section>

            {/* The same component the dashboard shows, so a student never sees
                two different accounts of what is outstanding. It renders
                nothing when nothing is set, which the block below answers. */}
            <AssignedWork userId={userId} />

            {!work.hasAnything && (
              <section className="glass-card p-8 text-center">
                <CalendarClock className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 text-base font-semibold">Nothing set yet</p>
                <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                  Your lecturer has not posted an assignment or an assessment. Whatever they
                  set will appear here. Until then, every case you play still counts towards
                  your own record - and your lecturer can see it.
                </p>
                <Link
                  to="/modes"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 max-sm:min-h-11"
                >
                  Pick a mode <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </section>
            )}

            {/* Not inside the collapsed block below: a session code is read
                out while everyone is sitting there, so it cannot be behind a
                disclosure that has to be found first. */}
            <LiveSessionJoin />

            <details className="glass-card group p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold text-muted-foreground transition hover:text-foreground max-sm:flex max-sm:min-h-11 max-sm:items-center">
                In another class too? Enter its code
              </summary>
              <div className="mt-4">
                <ClassMembership userId={userId} />
              </div>
            </details>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * The invitation, for a student with no class.
 *
 * This was a paragraph above an input. It is the first thing most people who
 * open this page will see, so it says what joining actually gets them before
 * asking them to type anything - and says plainly that the app is theirs
 * without one, because for most of them it will be.
 */
function NotEnrolled({ userId }: { userId?: string }) {
  const perks = [
    { icon: ClipboardList, text: "See the practice your lecturer sets, and what is still outstanding." },
    { icon: Timer, text: "Sit timed assessments - no hints, no mentor, the clock does not stop." },
    { icon: TrendingUp, text: "Your lecturer sees where the whole cohort is going wrong, not just your score." },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="border-b border-border/50 p-6 sm:p-8">
        <h2 className="text-xl font-bold sm:text-2xl">Got a join code?</h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          If your university uses Pharmulation, your lecturer will have given you a
          six-character code. You do not need one to use the app - everything else works
          without it - but a class connects your training to your course.
        </p>

        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {perks.map((p) => (
            <li key={p.text} className="flex gap-2.5 text-sm text-muted-foreground">
              <p.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {p.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 p-6 sm:p-8">
        <ClassMembership userId={userId} />
        {/* A student with no class can still be sitting in a live session -
            it needs no enrolment, only the code on the screen. */}
        <LiveSessionJoin />
      </div>
    </motion.div>
  );
}
