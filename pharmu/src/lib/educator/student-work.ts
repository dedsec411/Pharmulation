import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyAssignments, useMyEnrollments, type MyAssignment } from "./join";
import { useMyAssessments, windowState } from "./assessment";

/**
 * What a student's class is asking of them, worked out once.
 *
 * The dashboard's list and the class page's summary tiles both need this, and
 * they have to agree: a tile saying "2 still to do" above a list showing three
 * outstanding items is worse than showing neither. So the done/overdue rules
 * live here and both read the same answer.
 */

type CompletedScore = { mode: string; completed_at: string };

/**
 * Cases finished since the oldest outstanding assignment was posted.
 *
 * Scoped to that date rather than a fixed number of recent rows: five would
 * miss work done a fortnight ago, and the whole history is more than the
 * question needs. Enabled only once there is an assignment to answer, so a
 * student in no class makes no extra request.
 */
function useScoresSince(userId: string | undefined, since: string | null) {
  return useQuery<CompletedScore[]>({
    queryKey: ["assignment-progress", userId, since],
    enabled: !!userId && !!since,
    queryFn: async (): Promise<CompletedScore[]> => {
      const { data, error } = await supabase.from("scores")
        .select("mode, completed_at")
        .eq("user_id", userId!)
        .gte("completed_at", since!)
        .limit(500);
      if (error) throw error;
      return (data ?? []) as CompletedScore[];
    },
  });
}

export type AssignmentRow = MyAssignment & { done: boolean; overdue: boolean };

export function useStudentWork(userId?: string) {
  const { data: classes = [], isPending: classesPending } = useMyEnrollments(userId);
  const classIds = classes.map((c) => c.id);
  const { data: assignments = [] } = useMyAssignments(classIds);

  const oldest = assignments.length
    ? assignments.reduce(
        (min, a) => (a.created_at < min ? a.created_at : min), assignments[0].created_at)
    : null;
  const { data: recentScores = [] } = useScoresSince(userId, oldest);
  const { data: assessments = [] } = useMyAssessments(classIds, userId);

  /**
   * Done is derived from real score rows in the assigned mode, completed after
   * the assignment was posted. There is no hand-in step to forget, and a
   * student who played the mode has done what was asked.
   */
  const rows: AssignmentRow[] = assignments.map((a) => {
    const posted = new Date(a.created_at).getTime();
    const done = recentScores.some((s) =>
      (!a.mode || s.mode === a.mode) && new Date(s.completed_at).getTime() >= posted);
    const overdue = !done && !!a.due_at && new Date(a.due_at).getTime() < Date.now();
    return { ...a, done, overdue };
  });

  // Finished work stays visible but sinks, so a list opens on what is left.
  const ordered = [...rows].sort((a, b) => Number(a.done) - Number(b.done));
  const outstanding = rows.filter((r) => !r.done).length;

  /**
   * The soonest deadline still ahead of us.
   *
   * Future only, on purpose. Taking the earliest outstanding deadline meant a
   * student with one item a fortnight overdue saw that date under the heading
   * "next deadline" - a date in the past, presented as the thing to aim at.
   * Work already late is counted separately, as overdue.
   */
  const now = Date.now();
  const nextDue = rows
    .filter((r) => !r.done && r.due_at && new Date(r.due_at).getTime() >= now)
    .map((r) => r.due_at as string)
    .sort()[0] ?? null;

  /** Assessments that have not closed - the ones that can still be sat. */
  const liveAssessments = assessments.filter((a) => windowState(a).note !== "Closed");

  return {
    classes,
    classesPending,
    assignments,
    rows,
    ordered,
    assessments,
    liveAssessments,
    outstanding,
    nextDue,
    overdue: rows.filter((r) => r.overdue).length,
    hasAnything: assignments.length > 0 || assessments.length > 0,
  };
}
