import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Where a learner stands against others at the same role level.
 *
 * Reads get_my_percentiles, which computes the ranks server-side and returns
 * four numbers about the caller and nobody else. That is deliberately narrower
 * than the existing get_public_profiles: percentiles need no other learner's
 * name, id or figures to cross the boundary, and against the leaderboard's top
 * 200 they would flatter everyone below it anyway.
 */

type Percentiles = {
  peer_role: string;
  peers: number;
  accuracy_pct: number | null;
  cases_pct: number | null;
  cri_pct: number | null;
};

const ROLE_LABEL: Record<string, string> = {
  student: "students",
  graduate: "graduates",
  pharmd: "PharmD holders",
  admin: "peers",
};

/**
 * How a standing is worded.
 *
 * A percentile needs a crowd to mean anything. Best of five came out as "top
 * 1%", which is arithmetically what the formula says and completely misleading
 * - so a small cohort is reported as a rank instead, which is both honest and
 * more use to the learner.
 */
const CROWD = 20;

function standing(pct: number, peers: number): string {
  if (peers < CROWD) {
    const rank = Math.max(1, peers - Math.round((pct / 100) * peers) + 1);
    return `${ordinal(rank)} of ${peers}`;
  }
  if (pct >= 50) return `top ${Math.max(1, 100 - pct)}%`;
  return `bottom ${Math.max(1, pct)}%`;
}

function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

function Bar({ label, pct, peers }: { label: string; pct: number | null; peers: number }) {
  if (pct === null) {
    return (
      <div className="flex items-center gap-3">
        <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">Not measured yet</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-xs font-bold tabular-nums">
        {standing(pct, peers)}
      </span>
    </div>
  );
}

export function PeerBenchmark({ userId }: { userId?: string }) {
  const { data, isError } = useQuery({
    queryKey: ["my-percentiles", userId],
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string) => Promise<{ data: Percentiles[] | null; error: unknown }>;
      }).rpc("get_my_percentiles");
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });

  // A cohort of one is the learner comparing themselves to themselves.
  if (isError || !data || data.peers < 2) return null;

  const role = ROLE_LABEL[data.peer_role] ?? "peers";

  return (
    <div className="glass-card p-6">
      <h3 className="flex items-center gap-2 font-bold">
        <Users className="size-4 text-primary" /> Compared with your peers
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Against {data.peers - 1} other {role} on Pharmulation.
        {data.peers < CROWD && " Shown as a rank until the cohort is large enough for percentiles to mean anything."}
      </p>

      <div className="mt-4 space-y-3">
        <Bar label="Accuracy" pct={data.accuracy_pct} peers={data.peers} />
        <Bar label="Cases completed" pct={data.cases_pct} peers={data.peers} />
        <Bar label="Clinical Reasoning Index" pct={data.cri_pct} peers={data.peers} />
      </div>
    </div>
  );
}
