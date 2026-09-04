import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, ClipboardList, Activity, AlertTriangle, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/auth-store";
import { CountUp } from "@/components/CountUp";
import {
  useAllMyStudents, useClassAssignments, useCohortScores, useMyClasses,
} from "@/lib/educator/queries";
import { publicModeLabel } from "@/lib/game/shared";

export const Route = createFileRoute("/educator/dashboard")({
  head: () => ({ meta: [{ title: "Faculty overview - Pharmulation" }] }),
  component: EducatorDashboard,
});

type StatProps = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string | null;
};

function Stat({ icon: Icon, label, value, sub, index = 0 }: StatProps & { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="glass-card p-5"
    >
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-2xl font-black tabular-nums">
        {/* A count only where the figure is a number. "Top mode today" is a
            mode name, and counting it up is not a thing that can happen. */}
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

function EducatorDashboard() {
  const { profile } = useAuthStore();
  const { data: classes = [] } = useMyClasses(profile?.user_id);
  const live = classes.filter((c) => !c.archived);
  const { data: studentIds = [] } = useAllMyStudents(live);
  const { data: scores = [] } = useCohortScores(studentIds);
  const { data: assignments = [] } = useClassAssignments(live.map((c) => c.id));

  const week = Date.now() - 7 * 86400_000;
  const thisWeek = scores.filter((s) => new Date(s.completed_at).getTime() >= week);
  const meanAccuracy = thisWeek.length
    ? Math.round(thisWeek.reduce((sum, s) => sum + Number(s.accuracy), 0) / thisWeek.length * 100)
    : null;

  // Which students have not played at all this week - the number a lecturer
  // actually acts on.
  const activeIds = new Set(thisWeek.map((s) => s.user_id));
  const quiet = studentIds.filter((id) => !activeIds.has(id)).length;

  const overdue = assignments.filter(
    (a) => a.due_at && new Date(a.due_at).getTime() < Date.now()).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Faculty</p>
          <h1 className="mt-1 text-3xl font-extrabold">Overview</h1>
          <p className="text-sm text-muted-foreground">
            {live.length} active {live.length === 1 ? "class" : "classes"} · {studentIds.length} students
          </p>
        </div>
        <Link
          to="/educator/classes"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        >
          Manage classes
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="glass-card mt-6 p-6 sm:p-10 text-center">
          <Users className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">No classes yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create a class to get a join code. Students enter it when they sign up, or from their
            dashboard, and their work appears here.
          </p>
          <Link
            to="/educator/classes"
            className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Create your first class
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat index={0} icon={Users} label="Students enrolled" value={studentIds.length} />
            <Stat index={1} icon={Activity} label="Cases this week" value={thisWeek.length}
              sub={meanAccuracy !== null ? `${meanAccuracy}% mean accuracy` : "No activity yet"} />
            <Stat index={2} icon={AlertTriangle} label="Inactive this week" value={quiet}
              sub={quiet ? "Have not completed a case" : "Everyone has played"} />
            <Stat index={3} icon={ClipboardList} label="Assignments past due" value={overdue} />
          </div>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="glass-card p-6">
              <h2 className="font-bold">Your classes</h2>
              <div className="mt-4 space-y-2">
                {live.map((c) => (
                  <Link
                    key={c.id}
                    to="/educator/classes"
                    className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 p-3 transition hover:border-primary/40"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                    <span className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-xs font-bold tracking-widest text-primary">
                      {c.join_code}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="font-bold">Recent student activity</h2>
              {thisWeek.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nothing completed in the last seven days.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {thisWeek.slice(0, 6).map((s, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 p-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{publicModeLabel(s.mode)}</span>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-primary">
                        {Math.round(Number(s.accuracy) * 100)}%
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {new Date(s.completed_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
