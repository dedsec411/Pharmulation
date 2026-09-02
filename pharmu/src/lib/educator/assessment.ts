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
 * Returns the existing row where one is already open, so a refresh mid-sitting
 * rejoins rather than starting the clock again.
 */
export async function startSitting(
  a: AssessmentRow,
  userId: string
): Promise<Sitting | null> {
  const { data: existing } = await db().from("assessment_sessions")
    .select("id, started_at, submitted_at")
    .eq("assessment_id", a.id)
    .eq("student_id", userId)
    .maybeSingle();

  if (existing?.submitted_at) return null;

  let sessionId = existing?.id as string | undefined;
  let startedAt = existing?.started_at as string | undefined;

  if (!sessionId) {
    const { data, error } = await db().from("assessment_sessions")
      .insert({ assessment_id: a.id, student_id: userId })
      .select("id, started_at")
      .single();
    if (error) throw error;
    sessionId = data.id as string;
    startedAt = data.started_at as string;
  }

  return {
    sessionId: sessionId!,
    assessmentId: a.id,
    title: a.title,
    mode: a.mode,
    caseCount: a.case_count,
    startedAt: startedAt!,
    endsAt: new Date(startedAt!).getTime() + a.time_limit_sec * 1000,
  };
}

/**
 * Close a sitting and record what was done inside it.
 *
 * The result is read back from the score rows written during the window, so it
 * is the same evidence the rest of the app grades from - there is no second,
 * assessment-only scoring path that could disagree with the first.
 */
export async function submitSitting(sitting: Sitting, userId: string) {
  const until = new Date(Math.min(Date.now(), sitting.endsAt)).toISOString();

  const { data: rows } = await db().from("scores")
    .select("score, accuracy")
    .eq("user_id", userId)
    .eq("mode", sitting.mode)
    .gte("completed_at", sitting.startedAt)
    .lte("completed_at", until)
    .limit(50);

  const scored = ((rows ?? []) as { score: number; accuracy: number }[])
    .slice(0, sitting.caseCount);

  const total = scored.reduce((sum, r) => sum + Number(r.score ?? 0), 0);
  const accuracy = scored.length
    ? scored.reduce((sum, r) => sum + Number(r.accuracy ?? 0), 0) / scored.length
    : 0;

  await db().from("assessment_sessions")
    .update({
      submitted_at: new Date().toISOString(),
      score: Math.round(total),
      // The column is a percentage to two decimal places, not a fraction.
      accuracy: Math.round(accuracy * 10000) / 100,
      cases_done: scored.length,
    })
    .eq("id", sitting.sessionId);

  return { cases: scored.length, score: Math.round(total), accuracy };
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
