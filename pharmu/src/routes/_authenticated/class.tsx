import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight, BookOpen, CalendarClock, GraduationCap, Target, TrendingUp,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ClassMembership } from "@/components/game/ClassMembership";
import { AssignedWork } from "@/components/game/AssignedWork";
import { useAuthStore } from "@/lib/auth-store";
import { useMyEnrollments, useMyAssignments } from "@/lib/educator/join";
import { useMyAssessments } from "@/lib/educator/assessment";
import { supabase } from "@/integrations/supabase/client";
import { unwrapList } from "@/lib/supabase-query";

/**
 * Everything a student's class asks of them, in one place.
 *
 * Joining a class used to live at the bottom of the profile page, below the
 * badges, which meant a student whose lecturer had just handed out a code had
 * to be told where to find the box. The work itself appeared on the dashboard
 * and nowhere else. Neither was discoverable, so this page owns both and the
 * navigation points at it.
 *
 * It is deliberately a student page. Faculty have the educator side and are
 * sent there instead of being shown an empty version of this one.
 */
export const Route = createFileRoute("/_authenticated/class")({
  head: () => ({ meta: [{ title: "Your class - Pharmulation" }] }),
  component: ClassPage,
  errorComponent: ({ error }) => <div className="p-5 sm:p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-5 sm:p-8">Not found</div>,
});

/** What this student has done since term started, for their own reference. */
function useMyProgress(userId?: string) {
  return useQuery({
    queryKey: ["class-progress", userId],
    enabled: !!userId,
    queryFn: async () => {
      const rows = unwrapList(
        await supabase.from("scores")
          .select("mode, score, accuracy, completed_at")
          .eq("user_id", userId!)
          .order("completed_at", { ascending: false })
          .limit(500),
        "your class progress",
      ) as Array<{ mode: string; score: number; accuracy: number | null }>;

      const accuracies = rows.map((r) => Number(r.accuracy)).filter(Number.isFinite);
      return {
        cases: rows.length,
        accuracy: accuracies.length
          ? Math.round((accuracies.reduce((n, a) => n + a, 0) / accuracies.length) * 100)
          : null,
        modes: new Set(rows.map((r) => r.mode)).size,
      };
    },
  });
}

function ClassPage() {
  const { profile } = useAuthStore();
  const userId = profile?.user_id;
  const role = String(profile?.role ?? "");
  const isFaculty = role === "educator" || role === "admin";

  const { data: classes = [], isPending: classesPending } = useMyEnrollments(userId);
  const { data: assignments = [] } = useMyAssignments(classes.map((c) => c.id));
  const { data: assessments = [] } = useMyAssessments(classes.map((c) => c.id), userId);
  const { data: progress } = useMyProgress(userId);

  const enrolled = classes.length > 0;
  const nothingSet = enrolled && assignments.length === 0 && assessments.length === 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <GraduationCap className="size-6 text-primary" aria-hidden="true" />
            Your class
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {enrolled
              ? "Work your lecturer has set, and how you are getting on with it."
              : "Join with the code your lecturer gave you to see the work they set."}
          </p>
        </header>

        {/* Faculty land here only by typing the address. Send them onward
            rather than showing them a student page with nothing in it. */}
        {isFaculty && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-400/30 bg-sky-400/5 p-4">
            <p className="text-sm text-muted-foreground">
              You are signed in as faculty. Classes you teach are managed on the educator side.
            </p>
            <Link
              to="/educator/dashboard"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Educator dashboard <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {classesPending ? (
          <div className="glass-card p-6" aria-hidden="true">
            <div className="h-4 w-40 animate-pulse rounded bg-foreground/10" />
            <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-foreground/10" />
          </div>
        ) : !enrolled ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 sm:p-8"
          >
            <h2 className="text-lg font-bold">Not in a class yet</h2>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              If your university uses Pharmulation, your lecturer will have given you a
              six-character join code. Enter it below and any work they set will appear
              here and on your dashboard. You can keep training without one - nothing on
              the rest of the app needs a class.
            </p>
            <div className="mt-5">
              <ClassMembership userId={userId} />
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <section className="glass-card p-6">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <BookOpen className="size-4" aria-hidden="true" /> Enrolled in
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {classes.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            </section>

            {progress && (
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { icon: Target, label: "Cases completed", value: progress.cases.toLocaleString() },
                  { icon: TrendingUp, label: "Average accuracy", value: progress.accuracy === null ? "-" : `${progress.accuracy}%` },
                  { icon: CalendarClock, label: "Modes tried", value: String(progress.modes) },
                ].map((s) => (
                  <div key={s.label} className="glass-card p-4 text-center">
                    <s.icon className="mx-auto mb-1.5 size-5 text-primary" aria-hidden="true" />
                    <div className="text-xl font-bold tabular-nums">{s.value}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </section>
            )}

            {/* The same component the dashboard shows, so a student never sees
                two different accounts of what is outstanding. */}
            <AssignedWork userId={userId} />

            {nothingSet && (
              <section className="glass-card p-6 text-center">
                <CalendarClock className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">No work set yet</p>
                <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                  Your lecturer has not posted an assignment or an assessment. Anything they
                  set will show up here. In the meantime, any mode you like counts towards
                  your own progress.
                </p>
                <Link
                  to="/modes"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  Pick a mode <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Join another class
              </h2>
              <ClassMembership userId={userId} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
