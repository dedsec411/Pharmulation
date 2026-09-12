import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarClock, Check, GraduationCap, Lock, Timer } from "lucide-react";
import { useRedeemPendingJoinCode } from "@/lib/educator/join";
import { useStudentWork } from "@/lib/educator/student-work";
import { MODE_LABEL, PUBLIC_MODE_GROUPS, type Mode } from "@/lib/game/shared";
import { windowState } from "@/lib/educator/assessment";

/**
 * Work a lecturer has set, on the student's own dashboard.
 *
 * Renders nothing at all for anyone not in a class, which is nearly everyone:
 * the individual learner's dashboard is unchanged by the existence of the
 * institution platform.
 *
 * "Done" is derived from real score rows in the assigned mode completed after
 * the assignment was posted. There is no hand-in step to forget, and a student
 * who played the mode has done what was asked.
 */

function routeForMode(mode: string | null): string | null {
  if (!mode) return null;
  const group = PUBLIC_MODE_GROUPS.find((g) => (g.modes as readonly string[]).includes(mode));
  return group ? `/game/${group.key}` : null;
}

export function AssignedWork({ userId }: { userId?: string }) {
  useRedeemPendingJoinCode(userId);

  // Shared with the class page's summary tiles. A tile reading "2 still to do"
  // above a list showing three would be worse than showing neither, so the
  // done and overdue rules live in one place and both read the same answer.
  const { classes, assignments, assessments, ordered, outstanding, hasAnything } =
    useStudentWork(userId);

  if (!hasAnything) return null;

  const nameFor = (id: string) => classes.find((c) => c.id === id)?.name ?? "Your class";

  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <GraduationCap className="size-5 text-primary" /> Set by your class
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {assignments.length
          ? outstanding
            ? `${outstanding} still to do.`
            : "Everything set for you is done."
          : "Your timed assessments."}
      </p>

      {/* Assessments first: they have a closing time and one attempt, so
          burying them under ordinary practice would be the wrong order. */}
      {assessments.length > 0 && (
        <div className="mt-3 space-y-2">
          {assessments.map((a) => {
            const state = windowState(a);
            return (
              <div
                key={a.id}
                className={`glass-card flex flex-wrap items-center gap-4 border-sky-400/25 p-4 ${
                  a.submittedAt ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-1.5 truncate font-semibold">
                    <Lock className="size-3.5 text-sky-700 dark:text-sky-300" /> {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {nameFor(a.class_id)} · {MODE_LABEL[a.mode as Mode] ?? a.mode} ·{" "}
                    {a.case_count} {a.case_count === 1 ? "case" : "cases"}
                  </p>
                </div>

                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Timer className="size-3.5" />
                  {Math.round(a.time_limit_sec / 60)} min · {state.note}
                </p>

                {a.submittedAt ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <Check className="size-3.5" />
                    {a.accuracy === null ? "Submitted" : `${Math.round(Number(a.accuracy))}%`}
                  </span>
                ) : (
                  <Link
                    to="/assessment/$assessmentId"
                    params={{ assessmentId: a.id }}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      state.open
                        ? "bg-sky-500 text-white hover:brightness-110"
                        : "border border-border/50 text-muted-foreground"
                    }`}
                  >
                    {state.open ? "Sit assessment" : "Details"}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {ordered.map((a, i) => {
          const route = routeForMode(a.mode);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              /* Stacked on a phone. In one row, the title was competing with a
                 full date and a button across 390px and lost: "Two clinical
                 reviews" became "Two ...", and the class name wrapped to five
                 lines. The date and the action sit together underneath instead,
                 and sm:contents dissolves that wrapper on a wider screen so the
                 original single row is unchanged. */
              className={`glass-card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 ${a.done ? "opacity-60" : ""}`}
            >
              <div className="min-w-0 sm:flex-1">
                <p className="truncate font-semibold">
                  {a.title || (a.mode ? MODE_LABEL[a.mode as Mode] : "Assigned case")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {nameFor(a.class_id)}
                  {a.mode && ` · ${MODE_LABEL[a.mode as Mode]}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 sm:contents">
              {a.due_at && (
                <p className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  a.overdue ? "text-rose-400" : "text-muted-foreground"
                }`}>
                  <CalendarClock className="size-3.5" />
                  {a.overdue ? "Overdue" : "Due"}{" "}
                  {new Date(a.due_at).toLocaleString(undefined, {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}

              {a.done ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <Check className="size-3.5" /> Done
                </span>
              ) : route ? (
                <Link
                  to={route}
                  className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  Start
                </Link>
              ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
