import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import {
  useAllMyStudents, useClassRoster, useCohortScores, useMyClasses,
} from "@/lib/educator/queries";
import { useDrugIndex } from "@/lib/game/useWeaknessMap";
import { buildWeaknessMap } from "@/lib/game/weakness";
import { WeaknessHeatmap } from "@/components/game/WeaknessHeatmap";

export const Route = createFileRoute("/educator/analytics")({
  head: () => ({ meta: [{ title: "Class analytics - Pharmulation" }] }),
  component: AnalyticsPage,
});

/**
 * Cohort analytics.
 *
 * The heatmap is the same derivation the students see on their own profile,
 * run over every score row the educator is allowed to read. That matters twice:
 * a lecturer and a student are looking at the same measurement rather than two
 * that disagree, and the set of rows fed in is decided by row-level security,
 * not by a filter written here.
 */
function AnalyticsPage() {
  const { profile } = useAuthStore();
  const { data: classes = [] } = useMyClasses(profile?.user_id);
  const live = useMemo(() => classes.filter((c) => !c.archived), [classes]);

  const [classId, setClassId] = useState<string>("");
  const selected = classId ? live.filter((c) => c.id === classId) : live;

  const { data: allStudents = [] } = useAllMyStudents(selected);
  const { data: scores = [] } = useCohortScores(allStudents);
  const { data: drugIndex = {} } = useDrugIndex();
  const { data: roster = [] } = useClassRoster(classId || undefined);

  const map = useMemo(
    () => (scores.length ? buildWeaknessMap(scores, drugIndex) : null),
    [scores, drugIndex]
  );

  /**
   * The mistakes the cohort actually makes, most frequent first.
   *
   * Counted per student as well as per occurrence: forty errors from one
   * struggling student is a different teaching problem from forty spread
   * across the room, and the two numbers are what separate them.
   */
  const commonErrors = useMemo(() => {
    const counts = new Map<string, { total: number; students: Set<string> }>();
    for (const row of scores) {
      const detail = Array.isArray(row.errors_detail) ? row.errors_detail : [];
      for (const entry of detail as Record<string, unknown>[]) {
        const type = String(entry.errorType ?? "").trim();
        if (!type) continue;
        const bucket = counts.get(type) ?? { total: 0, students: new Set<string>() };
        bucket.total += 1;
        bucket.students.add(row.user_id);
        counts.set(type, bucket);
      }
    }
    return [...counts.entries()]
      .map(([type, v]) => ({ type, total: v.total, students: v.students.size }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [scores]);

  /** Per-student accuracy over the rows in view, weakest first. */
  const standings = useMemo(() => {
    const byStudent = new Map<string, { cases: number; accuracy: number }>();
    for (const row of scores) {
      const at = byStudent.get(row.user_id) ?? { cases: 0, accuracy: 0 };
      at.cases += 1;
      at.accuracy += Number(row.accuracy);
      byStudent.set(row.user_id, at);
    }
    return [...byStudent.entries()]
      .map(([id, v]) => ({
        id,
        cases: v.cases,
        accuracy: v.accuracy / v.cases,
        name: roster.find((r) => r.student_id === id)?.full_name ?? null,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [scores, roster]);

  const cohortAccuracy = scores.length
    ? scores.reduce((sum, s) => sum + Number(s.accuracy), 0) / scores.length
    : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Faculty</p>
          <h1 className="mt-1 text-3xl font-extrabold">Class analytics</h1>
          <p className="text-sm text-muted-foreground">
            {allStudents.length} students · {scores.length} cases ·{" "}
            {cohortAccuracy === null ? "no accuracy yet" : `${Math.round(cohortAccuracy * 100)}% mean accuracy`}
          </p>
        </div>

        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">All classes</option>
          {live.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!map ? (
        <div className="glass-card mt-6 p-10 text-center">
          <BarChart3 className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">Nothing to analyse yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {allStudents.length
              ? "Your students have not completed any cases yet."
              : "No students have joined your classes yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <WeaknessHeatmap map={map} />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section className="glass-card p-6">
              <h2 className="flex items-center gap-2 font-bold">
                <AlertTriangle className="size-4 text-primary" /> Most common cohort errors
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                How many times it happened, and how many students it happened to.
              </p>
              {commonErrors.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No errors recorded.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {commonErrors.map((e) => (
                    <li key={e.type} className="rounded-xl border border-border/40 bg-background/40 p-3">
                      <div className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{e.type}</span>
                        <span className="shrink-0 text-sm font-black tabular-nums">{e.total}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/40">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round((e.total / commonErrors[0].total) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {e.students} of {allStudents.length} students
                        {e.students === 1 && " · isolated to one student"}
                        {e.students >= allStudents.length && allStudents.length > 1 && " · the whole cohort"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="glass-card p-6">
              <h2 className="font-bold">Who needs attention</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {classId
                  ? "Lowest mean accuracy first."
                  : "Lowest mean accuracy first. Choose a class above to see names."}
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 font-semibold">Student</th>
                      <th className="py-2 text-right font-semibold">Cases</th>
                      <th className="py-2 text-right font-semibold">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.slice(0, 12).map((s, i) => (
                      <tr key={s.id} className="border-b border-border/20 last:border-0">
                        <td className="py-2.5 font-semibold">
                          {/* Names come from profiles, which are readable only
                              for a selected class roster. Across all classes
                              the row is still shown, anonymised. */}
                          {s.name ?? `Student ${i + 1}`}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{s.cases}</td>
                        <td className={`py-2.5 text-right font-bold tabular-nums ${
                          s.accuracy < 0.6 ? "text-rose-400" : s.accuracy < 0.8 ? "text-amber-400" : "text-emerald-400"
                        }`}>
                          {Math.round(s.accuracy * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
