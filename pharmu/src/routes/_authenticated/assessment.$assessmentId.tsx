import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Lock, Timer, ListChecks, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import {
  startSitting, useSittingStore, windowState, type AssessmentRow,
} from "@/lib/educator/assessment";
import { MODE_LABEL, PUBLIC_MODE_GROUPS, type Mode } from "@/lib/game/shared";

export const Route = createFileRoute("/_authenticated/assessment/$assessmentId")({
  head: () => ({ meta: [{ title: "Assessment - Pharmulation" }] }),
  component: AssessmentBriefing,
});

function routeForMode(mode: string): string {
  const group = PUBLIC_MODE_GROUPS.find((g) => (g.modes as readonly string[]).includes(mode));
  return group ? `/game/${group.key}` : "/dashboard";
}

/**
 * The page a student sees before a timed sitting starts.
 *
 * Deliberately a full stop rather than a link straight into the game: the
 * clock starts on the button here, and the terms - no hints, no second
 * attempt, auto-submit - are stated before it does, not discovered afterwards.
 */
function AssessmentBriefing() {
  const { assessmentId } = useParams({ from: "/_authenticated/assessment/$assessmentId" });
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const begin = useSittingStore((s) => s.begin);
  const active = useSittingStore((s) => s.active);
  const [starting, setStarting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", assessmentId, profile?.user_id],
    enabled: !!profile?.user_id,
    queryFn: async () => {
      const client = supabase as unknown as { from: (t: string) => any };
      const { data: row, error } = await client.from("assessments")
        .select("id, class_id, title, mode, case_count, time_limit_sec, opens_at, closes_at")
        .eq("id", assessmentId)
        .maybeSingle();
      if (error) throw error;
      if (!row) return null;

      const { data: session } = await client.from("assessment_sessions")
        .select("submitted_at, score, accuracy, cases_done")
        .eq("assessment_id", assessmentId)
        .eq("student_id", profile!.user_id)
        .maybeSingle();

      return { assessment: row as AssessmentRow, session };
    },
  });

  async function onStart() {
    if (!data?.assessment || !profile?.user_id || starting) return;
    setStarting(true);
    try {
      const sitting = await startSitting(data.assessment);
      begin(sitting);
      navigate({ to: routeForMode(data.assessment.mode) });
    } catch (error) {
      console.error("Could not start the sitting", error);
      // The database raises the specific reason - closed, not enrolled,
      // already sat - and that is more use to the candidate than "try again".
      const reason = (error as { message?: string })?.message;
      toast.error("Could not start the assessment", {
        description: reason && !reason.includes("JSON") ? reason : "Please try again.",
      });
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10">
        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading the assessment
          </p>
        )}

        {!isLoading && !data && (
          <div className="glass-card p-6 sm:p-10 text-center">
            <AlertTriangle className="mx-auto size-8 text-amber-400" />
            <p className="mt-3 font-bold">This assessment is not available to you</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It may have been removed, or set for a class you are not in.
            </p>
          </div>
        )}

        {data?.assessment && (() => {
          const a = data.assessment;
          const state = windowState(a);
          const submitted = !!data.session?.submitted_at;
          const running = active?.assessmentId === a.id;

          return (
            <div className="glass-card p-5 sm:p-8">
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-400/35 bg-sky-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
                <Lock className="size-3" /> Timed assessment
              </p>
              <h1 className="mt-4 text-3xl font-extrabold">{a.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{state.note}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/40 bg-background/40 p-4">
                  <ListChecks className="size-4 text-primary" />
                  <p className="mt-2 text-xl font-black tabular-nums">{a.case_count}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.case_count === 1 ? "case" : "cases"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/40 bg-background/40 p-4">
                  <Timer className="size-4 text-primary" />
                  <p className="mt-2 text-xl font-black tabular-nums">
                    {Math.round(a.time_limit_sec / 60)}
                  </p>
                  <p className="text-xs text-muted-foreground">minutes</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-background/40 p-4">
                  <p className="mt-6 text-sm font-bold">{MODE_LABEL[a.mode as Mode] ?? a.mode}</p>
                  <p className="text-xs text-muted-foreground">mode</p>
                </div>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                <li>The clock starts when you press begin and does not stop, including if you
                  leave this page.</li>
                <li>No hints and no mentor tips for the duration.</li>
                <li>Whatever you have finished when the time runs out is submitted
                  automatically.</li>
                <li>One sitting only. You cannot restart it.</li>
              </ul>

              {submitted ? (
                <div className="mt-6 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4">
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">Already submitted</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.session.cases_done} of {a.case_count} cases ·{" "}
                    {data.session.accuracy === null
                      ? "not scored"
                      : `${Math.round(Number(data.session.accuracy))}% accuracy`}
                  </p>
                </div>
              ) : running ? (
                <button
                  type="button"
                  onClick={() => navigate({ to: routeForMode(a.mode) })}
                  className="mt-6 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  Back to your cases
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStart}
                  disabled={!state.open || starting || !!active}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                >
                  {starting && <Loader2 className="size-4 animate-spin" />}
                  {active
                    ? "Finish your current assessment first"
                    : state.open
                      ? "Begin - start the clock"
                      : state.note}
                </button>
              )}
            </div>
          );
        })()}
      </main>
    </>
  );
}
