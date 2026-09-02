import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, Trash2, Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import {
  educatorDb, useAllMyStudents, useClassAssignments, useCohortScores, useMyClasses,
} from "@/lib/educator/queries";
import { MODE_LABEL, PUBLIC_MODE_GROUPS, type Mode } from "@/lib/game/shared";

export const Route = createFileRoute("/educator/assign")({
  head: () => ({ meta: [{ title: "Assign work - Pharmulation" }] }),
  component: AssignPage,
});

const MODES = PUBLIC_MODE_GROUPS.flatMap((g) =>
  (g.modes as readonly Mode[]).map((mode) => ({
    mode,
    // Rx and OTC both live under Community Pharmacy, so the mode alone would
    // give two identical-looking options in the picker.
    label: g.modes.length > 1 ? `${g.label} - ${MODE_LABEL[mode]}` : g.label,
  }))
);

/** Stored cases for one mode. Most cases are generated, so this is often empty. */
function useStoredCases(mode: Mode | "") {
  return useQuery({
    queryKey: ["assignable-cases", mode],
    enabled: !!mode,
    queryFn: async () => {
      const { data, error } = await educatorDb().from("cases")
        .select("id, title, difficulty")
        .eq("mode", mode)
        .order("title")
        .limit(200);
      if (error) throw error;
      return (data ?? []) as { id: string; title: string | null; difficulty: string }[];
    },
  });
}

function AssignPage() {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: classes = [] } = useMyClasses(profile?.user_id);
  const live = useMemo(() => classes.filter((c) => !c.archived), [classes]);
  const classIds = live.map((c) => c.id);

  const { data: assignments = [] } = useClassAssignments(classIds);
  const { data: studentIds = [] } = useAllMyStudents(live);
  const { data: scores = [] } = useCohortScores(studentIds);

  const [classId, setClassId] = useState("");
  const [mode, setMode] = useState<Mode | "">("");
  const [caseId, setCaseId] = useState("");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: storedCases = [] } = useStoredCases(mode);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["class-assignments"] });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!classId || !mode || saving) return;
    setSaving(true);
    const { error } = await educatorDb().from("class_assignments").insert({
      class_id: classId,
      mode,
      // Empty means "any case in this mode", which is the common shape: the
      // generator makes a fresh case per student rather than serving a stored
      // one, so pinning an id is the exception.
      case_id: caseId || null,
      title: title.trim() || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    });
    setSaving(false);

    if (error) {
      toast.error("Could not create the assignment");
      return;
    }
    setTitle("");
    setCaseId("");
    setDueAt("");
    refresh();
    toast.success("Assignment posted", { description: "Students see it on their dashboard." });
  }

  async function remove(id: string) {
    const { error } = await educatorDb().from("class_assignments").delete().eq("id", id);
    if (error) toast.error("Could not remove the assignment");
    else {
      refresh();
      toast.success("Assignment removed");
    }
  }

  /**
   * How many enrolled students have done the work.
   *
   * Counted from real score rows in that mode completed after the assignment
   * was posted, not from a submission flag - there is no separate "hand in"
   * step, and a student who plays the mode has done what was asked.
   */
  const rosterByClass = useQuery({
    queryKey: ["assignment-rosters", classIds.slice().sort().join(",")],
    enabled: classIds.length > 0,
    queryFn: async () => {
      const { data, error } = await educatorDb().from("class_enrollments")
        .select("class_id, student_id").in("class_id", classIds);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const row of (data ?? []) as { class_id: string; student_id: string }[]) {
        (map[row.class_id] ??= []).push(row.student_id);
      }
      return map;
    },
  }).data ?? {};

  function progressFor(assignment: { class_id: string; mode: string | null; created_at: string }) {
    const roster = rosterByClass[assignment.class_id] ?? [];
    if (!roster.length) return { done: 0, total: 0 };
    const posted = new Date(assignment.created_at).getTime();
    const done = roster.filter((student) =>
      scores.some((s) =>
        s.user_id === student &&
        (!assignment.mode || s.mode === assignment.mode) &&
        new Date(s.completed_at).getTime() >= posted)
    ).length;
    return { done, total: roster.length };
  }

  const className = (id: string) => live.find((c) => c.id === id)?.name ?? "Class";

  return (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Faculty</p>
        <h1 className="mt-1 text-3xl font-extrabold">Assign work</h1>
        <p className="text-sm text-muted-foreground">
          Set a class a mode to practise, with an optional deadline. It appears on their dashboard.
        </p>
      </div>

      {live.length === 0 ? (
        <div className="glass-card mt-6 p-10 text-center">
          <ClipboardList className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">Create a class first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Assignments are posted to a class, so there needs to be one to post to.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
          <form onSubmit={onSubmit} className="glass-card h-fit space-y-4 p-5">
            <h2 className="font-bold">New assignment</h2>

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
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mode</span>
              <select
                value={mode}
                onChange={(e) => { setMode(e.target.value as Mode); setCaseId(""); }}
                className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">Choose a mode</option>
                {MODES.map((m) => <option key={m.mode} value={m.mode}>{m.label}</option>)}
              </select>
            </label>

            {storedCases.length > 0 && (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Specific case <span className="normal-case tracking-normal">(optional)</span>
                </span>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">Any case in this mode</option>
                  {storedCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title ?? "Untitled case"} ({c.difficulty})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Instruction <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Three Rx cases before Thursday"
                className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Due <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <button
              type="submit"
              disabled={!classId || !mode || saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Post assignment
            </button>
          </form>

          <div className="space-y-3">
            <h2 className="font-bold">Posted</h2>
            {assignments.length === 0 && (
              <p className="glass-card p-6 text-sm text-muted-foreground">
                Nothing assigned yet.
              </p>
            )}

            {assignments.map((a) => {
              const { done, total } = progressFor(a);
              const overdue = a.due_at && new Date(a.due_at).getTime() < Date.now();
              return (
                <div key={a.id} className="glass-card flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {a.title || (a.mode ? MODE_LABEL[a.mode as Mode] : "Assigned case")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {className(a.class_id)}
                      {a.mode && ` · ${MODE_LABEL[a.mode as Mode]}`}
                      {a.case_id && " · one fixed case"}
                    </p>
                    {a.due_at && (
                      <p className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${overdue ? "text-rose-400" : "text-muted-foreground"}`}>
                        <CalendarClock className="size-3.5" />
                        {overdue ? "Was due" : "Due"} {new Date(a.due_at).toLocaleString(undefined, {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-black tabular-nums">
                      {done}<span className="text-muted-foreground">/{total}</span>
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      completed
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    title="Remove assignment"
                    className="rounded-lg border border-border/50 p-2 text-muted-foreground transition hover:text-rose-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
