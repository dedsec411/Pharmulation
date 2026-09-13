import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateJoinCode, normaliseJoinCode } from "@/lib/educator/codes";
import type { Difficulty } from "@/lib/game/shared";

/**
 * A room full of phones playing the same drill.
 *
 * The host opens a session, reads a code off the projector, and everybody
 * joins. What makes it the same drill for everybody is a seed stored on the
 * session: the questions are generated from it, so nothing has to be written
 * down or pushed to anybody.
 *
 * Polled rather than subscribed. Realtime is used elsewhere in the product and
 * works, but this runs in a hall on conference wifi, and a poll that misses
 * recovers on the next tick while a dropped socket needs noticing and
 * reconnecting. Two seconds is faster than anybody can read a leaderboard.
 */

export type LiveStatus = "lobby" | "running" | "ended";

export type LiveSession = {
  id: string;
  host_id: string;
  code: string;
  title: string | null;
  difficulty: Difficulty;
  seed: string;
  status: LiveStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

export type LiveParticipant = {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
  score: number | null;
  errors: number | null;
  finished_at: string | null;
};

/** Loose enough for the generated types being behind the database. */
const db = () => supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export const POLL_MS = 2000;

/**
 * The board, in the order a room should read it.
 *
 * Finished players first and best score at the top, because that is the
 * question the projector is answering. Everybody still playing follows in join
 * order rather than by a partial score - ranking somebody mid-drill would have
 * the board reshuffling under them and would rank a fast wrong answer above a
 * careful right one.
 *
 * Ties break on time taken, then on name, so the order is stable between polls
 * rather than flickering every two seconds.
 */
export function rankParticipants(rows: readonly LiveParticipant[]): LiveParticipant[] {
  const finished = rows.filter((r) => r.finished_at);
  const playing = rows.filter((r) => !r.finished_at);

  finished.sort((a, b) =>
    (b.score ?? 0) - (a.score ?? 0)
    || String(a.finished_at).localeCompare(String(b.finished_at))
    || a.display_name.localeCompare(b.display_name));

  playing.sort((a, b) =>
    String(a.joined_at).localeCompare(String(b.joined_at))
    || a.display_name.localeCompare(b.display_name));

  return [...finished, ...playing];
}

export function sessionProgress(rows: readonly LiveParticipant[]) {
  const finished = rows.filter((r) => r.finished_at).length;
  const scores = rows.filter((r) => r.finished_at).map((r) => r.score ?? 0);
  return {
    joined: rows.length,
    finished,
    stillPlaying: rows.length - finished,
    averageScore: scores.length
      ? Math.round(scores.reduce((t, s) => t + s, 0) / scores.length)
      : null,
  };
}

/** A seed nobody can guess from the code, so a session cannot be pre-played. */
export function newSeed(random: () => number = Math.random): string {
  return `${Date.now().toString(36)}-${random().toString(36).slice(2, 10)}`;
}

export async function createLiveSession(hostId: string, difficulty: Difficulty, title?: string) {
  // A code collision is a unique-violation rather than a silent overwrite, and
  // at one in a billion it is not worth a retry loop - the host presses the
  // button again.
  const { data, error } = await db().from("live_sessions").insert({
    host_id: hostId,
    code: generateJoinCode(),
    difficulty,
    seed: newSeed(),
    title: title?.trim() || null,
  }).select("*").single();
  if (error) throw error;
  return data as LiveSession;
}

export async function setSessionStatus(sessionId: string, status: LiveStatus) {
  const patch: Record<string, unknown> = { status };
  if (status === "running") patch.started_at = new Date().toISOString();
  if (status === "ended") patch.ended_at = new Date().toISOString();
  const { error } = await db().from("live_sessions").update(patch).eq("id", sessionId);
  if (error) throw error;
}

export async function joinLiveSession(code: string, displayName: string): Promise<string | null> {
  const { data, error } = await db().rpc("join_live_session_by_code", {
    code: normaliseJoinCode(code),
    name: displayName,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function reportResult(sessionId: string, userId: string, score: number, errors: number) {
  const { error } = await db().from("live_participants")
    .update({ score, errors, finished_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  if (error) throw error;
}

export function useLiveSession(sessionId?: string | null) {
  return useQuery({
    queryKey: ["live-session", sessionId],
    enabled: !!sessionId,
    refetchInterval: POLL_MS,
    queryFn: async () => {
      const { data, error } = await db().from("live_sessions").select("*").eq("id", sessionId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as LiveSession | null;
    },
  });
}

export function useLiveParticipants(sessionId?: string | null) {
  return useQuery({
    queryKey: ["live-participants", sessionId],
    enabled: !!sessionId,
    refetchInterval: POLL_MS,
    queryFn: async () => {
      const { data, error } = await db().from("live_participants").select("*").eq("session_id", sessionId);
      if (error) throw error;
      return rankParticipants((data ?? []) as LiveParticipant[]);
    },
  });
}

/** The host's own sessions, most recent first. */
export function useMyLiveSessions(hostId?: string | null) {
  return useQuery({
    queryKey: ["live-sessions", hostId],
    enabled: !!hostId,
    queryFn: async () => {
      const { data, error } = await db().from("live_sessions")
        .select("*").eq("host_id", hostId).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return (data ?? []) as LiveSession[];
    },
  });
}
