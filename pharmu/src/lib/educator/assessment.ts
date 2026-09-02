import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * A timed assessment sitting, from the student's side.
 *
 * The sitting is modelled as a window of time rather than a wrapper around the
 * game. Nothing is threaded through the four mode routes: the session records
 * when it opened, and what counts is whatever was scored between then and the
 * deadline. That keeps a feature used by a handful of classes out of the code
 * path every other case runs through, and it means a sitting cannot be escaped
 * by navigating away - the clock does not care which page is open.
 *
 * The one thing the game does need to know is that a sitting is live, so it
 * can withhold hints. That is a single boolean read from this store.
 */

const db = () => supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export type Sitting = {
  sessionId: string;
  assessmentId: string;
  title: string;
  mode: string;
  caseCount: number;
  startedAt: string;
  /** Epoch ms. The clock survives a refresh because it is an absolute time. */
  endsAt: number;
};

type SittingState = {
  active: Sitting | null;
  begin: (sitting: Sitting) => void;
  clear: () => void;
};

export const useSittingStore = create<SittingState>()(
  persist(
    (set) => ({
      active: null,
      begin: (sitting) => set({ active: sitting }),
      clear: () => set({ active: null }),
    }),
    { name: "pharmulation.assessment-sitting" }
  )
);

/** True while a timed sitting is running, so hints can be withheld. */
export function useSittingLock(): boolean {
  const active = useSittingStore((s) => s.active);
  return !!active && active.endsAt > Date.now();
}

export type AssessmentRow = {
  id: string;
  class_id: string;
  title: string;
  mode: string;
  case_count: number;
  time_limit_sec: number;
  opens_at: string | null;
  closes_at: string | null;
};

/** Whether an assessment can be started right now, and why not if it cannot. */
export function windowState(a: AssessmentRow): { open: boolean; note: string } {
  const now = Date.now();
  if (a.opens_at && new Date(a.opens_at).getTime() > now) {
    return {
      open: false,
      note: `Opens ${new Date(a.opens_at).toLocaleString(undefined, {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })}`,
    };
  }
  if (a.closes_at && new Date(a.closes_at).getTime() < now) {
    return { open: false, note: "Closed" };
  }
  if (a.closes_at) {
    return {
      open: true,
      note: `Closes ${new Date(a.closes_at).toLocaleString(undefined, {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })}`,
    };
  }
  return { open: true, note: "Open now" };
}

export type MyAssessment = AssessmentRow & {
  submittedAt: string | null;
  accuracy: number | null;
  casesDone: number;
};

/** Assessments set to this student's classes, with any sitting already taken. */
export function useMyAssessments(classIds: string[], userId?: string) {
  const key = classIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["my-assessments", key, userId],
    enabled: classIds.length > 0 && !!userId,
    queryFn: async (): Promise<MyAssessment[]> => {
      const { data, error } = await db().from("assessments")
        .select("id, class_id, title, mode, case_count, time_limit_sec, opens_at, closes_at")
        .in("class_id", classIds)
        .order("closes_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      const rows = (data ?? []) as AssessmentRow[];
      if (!rows.length) return [];

      // A sitting is one per student per assessment, so a submitted one is
      // what turns Start into a result rather than a second attempt.
      const { data: sessions } = await db().from("assessment_sessions")
        .select("assessment_id, submitted_at, accuracy, cases_done")
        .eq("student_id", userId!)
        .in("assessment_id", rows.map((r) => r.id));

      const mine = new Map<string, any>(
        ((sessions ?? []) as any[]).map((s) => [s.assessment_id, s])
      );
      return rows.map((r): MyAssessment => ({
        ...r,
        submittedAt: (mine.get(r.id)?.submitted_at as string | null) ?? null,
        accuracy: mine.get(r.id)?.accuracy ?? null,
        casesDone: Number(mine.get(r.id)?.cases_done ?? 0),
      }));
    },
  });
}

/**
 * Open a sitting.
 *
 * Enrolment, the open/close window and the one-attempt rule are all checked in
 * the database, not here: this page is not the only thing that can make the
 * request, so it cannot be the thing that decides. Rejoining an unsubmitted
 * sitting returns the original started_at, which is what makes a refresh
 * mid-exam continue the same clock rather than restart it.
 */
export async function startSitting(a: AssessmentRow): Promise<Sitting> {
  const { data, error } = await db().rpc("start_assessment_sitting", { assessment: a.id });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as
    | { id: string; started_at: string }
    | undefined;
  if (!row) throw new Error("Could not open the sitting.");

  return {
    sessionId: row.id,
    assessmentId: a.id,
    title: a.title,
    mode: a.mode,
    caseCount: a.case_count,
    startedAt: row.started_at,
    endsAt: new Date(row.started_at).getTime() + a.time_limit_sec * 1000,
  };
}

/**
 * Close a sitting.
 *
 * The marks are computed in the database from the score rows the game wrote
 * during the window, not sent up from here: a browser that could post its own
 * score and accuracy is the one thing a graded assessment cannot allow. The
 * function is idempotent, so a retry after a dropped connection returns the
 * stored result rather than recomputing against a longer window.
 */
export async function submitSitting(sitting: Sitting) {
  const { data, error } = await db().rpc("submit_assessment_sitting", {
    session_id: sitting.sessionId,
  });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as
    | { cases_done: number; score: number; accuracy: number }
    | undefined;

  return {
    cases: Number(row?.cases_done ?? 0),
    score: Number(row?.score ?? 0),
    // The column is a percentage; callers render a fraction.
    accuracy: Number(row?.accuracy ?? 0) / 100,
  };
}

/** Cases completed so far in the live sitting, for the progress readout. */
export function useSittingProgress(sitting: Sitting | null, userId?: string) {
  return useQuery({
    queryKey: ["sitting-progress", sitting?.sessionId],
    enabled: !!sitting && !!userId,
    refetchInterval: 15_000,
    queryFn: async (): Promise<number> => {
      const { data } = await db().from("scores")
        .select("id")
        .eq("user_id", userId!)
        .eq("mode", sitting!.mode)
        .gte("completed_at", sitting!.startedAt)
        .limit(50);
      return (data ?? []).length;
    },
  });
}
