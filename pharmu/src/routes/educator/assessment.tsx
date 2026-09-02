import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Timer, Plus, Trash2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { educatorDb, useClassAssessments, useMyClasses } from "@/lib/educator/queries";
import { MODE_LABEL, PUBLIC_MODE_GROUPS, type Mode } from "@/lib/game/shared";

export const Route = createFileRoute("/educator/assessment")({
  head: () => ({ meta: [{ title: "Assessments - Pharmulation" }] }),
  component: AssessmentPage,
});

const MODES = PUBLIC_MODE_GROUPS.flatMap((g) =>
  (g.modes as readonly Mode[]).map((mode) => ({
    mode,
    label: g.modes.length > 1 ? `${g.label} - ${MODE_LABEL[mode]}` : g.label,
  }))
);

const LIMITS = [
  { sec: 600, label: "10 minutes" },
  { sec: 900, label: "15 minutes" },
  { sec: 1800, label: "30 minutes" },
  { sec: 2700, label: "45 minutes" },
  { sec: 3600, label: "1 hour" },
  { sec: 7200, label: "2 hours" },
];

type SessionRow = {
  id: string;
  assessment_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  accuracy: number | null;
  cases_done: number;
};

/** Every sitting of the educator's assessments, for the results table. */
function useSessions(assessmentIds: string[]) {
  const key = assessmentIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["assessment-sessions", key],
    enabled: assessmentIds.length > 0,
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await educatorDb().from("assessment_sessions")
        .select("id, assessment_id, student_id, started_at, submitted_at, score, accuracy, cases_done")
        .in("assessment_id", assessmentIds)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
  });
}

function windowLabel(row: { opens_at: string | null; closes_at: string | null }) {
  const fmt = (v: string) => new Date(v).toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  if (row.opens_at && row.closes_at) return `${fmt(row.opens_at)} to ${fmt(row.closes_at)}`;
  if (row.opens_at) return `Opens ${fmt(row.opens_at)}`;
  if (row.closes_at) return `Closes ${fmt(row.closes_at)}`;
  return "Open now, no closing time";
}

function AssessmentPage() {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: classes = [] } = useMyClasses(profile?.user_id);
  const live = useMemo(() => classes.filter((c) => !c.archived), [classes]);

  const { data: assessments = [] } = useClassAssessments(live.map((c) => c.id));
  const { data: sessions = [] } = useSessions(assessments.map((a) => a.id));

  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode | "">("");
  const [caseCount, setCaseCount] = useState(3);
  const [limit, setLimit] = useState(900);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["class-assessments"] });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!classId || !mode || !title.trim() || saving) return;

    if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) {
      toast.error("The closing time is before the opening time");
      return;
    }

    setSaving(true);
    const { error } = await educatorDb().from("assessments").insert({
      class_id: classId,
      title: title.trim(),
      mode,
      case_count: caseCount,
      time_limit_sec: limit,
      opens_at: opensAt ? new Date(opensAt).toISOString() : null,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    });
    setSaving(false);

    if (error) {
      toast.error("Could not create the assessment");
      return;
    }
    setTitle("");
    setOpensAt("");
    setClosesAt("");
    refresh();
    toast.success("Assessment scheduled");
  }

  async function remove(id: string) {
    const { error } = await educatorDb().from("assessments").delete().eq("id", id);
    if (error) toast.error("Could not remove the assessment");
    else {
      refresh();
      toast.success("Assessment removed");
    }
  }

  const className = (id: string) => live.find((c) => c.id === id)?.name ?? "Class";

  return (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Faculty</p>
        <h1 className="mt-1 text-3xl font-extrabold">Assessments</h1>
        <p className="text-sm text-muted-foreground">
          A timed, locked sitting: no hints, no mentor tips, and the clock does not stop.
        </p>
      </div>

      {live.length === 0 ? (
        <div className="glass-card mt-6 p-10 text-center">
          <Timer className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">Create a class first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            An assessment is set for a class, so there needs to be one to set it for.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
          <form onSubmit={onSubmit} className="glass-card h-fit space-y-4 p-5">
            <h2 className="font-bold">New assessment</h2>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</span>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">Choose a class</option>
                {live.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Mid-semester dispensing test"
                className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mode</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">Choose a mode</option>
                {MODES.map((m) => <option key={m.mode} value={m.mode}>{m.label}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cases</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={caseCount}
                  onChange={(e) => setCaseCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                  className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time limit</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {LIMITS.map((l) => <option key={l.sec} value={l.sec}>{l.label}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opens</span>
                <input
                  type="datetime-local"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closes</span>
                <input
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={!classId || !mode || !title.trim() || saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Schedule assessment
            </button>

            <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              Students cannot pause, retry a case, or see mentor tips during a sitting. Running out
              of time submits whatever they have finished.
            </p>
          </form>

          <div className="space-y-3">
            <h2 className="font-bold">Scheduled</h2>
            {assessments.length === 0 && (
              <p className="glass-card p-6 text-sm text-muted-foreground">
                No assessments scheduled.
              </p>
            )}

            {assessments.map((a) => {
              const mine = sessions.filter((s) => s.assessment_id === a.id);
              const done = mine.filter((s) => s.submitted_at);
              const mean = done.length
                ? Math.round(done.reduce((sum, s) => sum + Number(s.accuracy ?? 0), 0) / done.length)
                : null;

              return (
                <div key={a.id} className="glass-card p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{a.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {className(a.class_id)} · {MODE_LABEL[a.mode as Mode] ?? a.mode} ·{" "}
                        {a.case_count} {a.case_count === 1 ? "case" : "cases"} ·{" "}
                        {Math.round(a.time_limit_sec / 60)} min
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{windowLabel(a)}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-black tabular-nums">{done.length}</p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        submitted
                      </p>
                    </div>
                    {mean !== null && (
                      <div className="text-right">
                        <p className="text-lg font-black tabular-nums">{mean}%</p>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          mean
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      title="Remove assessment"
                      className="rounded-lg border border-border/50 p-2 text-muted-foreground transition hover:text-rose-400"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  {mine.length > 0 && (
                    <div className="mt-4 overflow-x-auto border-t border-border/30 pt-3">
                      <table className="w-full min-w-[420px] text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                            <th className="py-1.5 font-semibold">Started</th>
                            <th className="py-1.5 text-right font-semibold">Cases</th>
                            <th className="py-1.5 text-right font-semibold">Score</th>
                            <th className="py-1.5 text-right font-semibold">Accuracy</th>
                            <th className="py-1.5 text-right font-semibold">State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mine.map((s) => (
                            <tr key={s.id} className="border-t border-border/20">
                              <td className="py-2 text-xs text-muted-foreground">
                                {new Date(s.started_at).toLocaleString(undefined, {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                })}
                              </td>
                              <td className="py-2 text-right tabular-nums">{s.cases_done}</td>
                              <td className="py-2 text-right tabular-nums">{s.score ?? "-"}</td>
                              <td className="py-2 text-right tabular-nums">
                                {s.accuracy === null ? "-" : `${Math.round(Number(s.accuracy))}%`}
                              </td>
                              <td className="py-2 text-right text-xs font-semibold">
                                {s.submitted_at
                                  ? <span className="text-emerald-400">Submitted</span>
                                  : <span className="text-amber-400">In progress</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
