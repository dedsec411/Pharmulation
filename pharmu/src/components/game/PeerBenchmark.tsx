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

/** Reads as a position, not a bare number: "top 12%" beats "88th". */
function standing(pct: number): string {
  if (pct >= 50) return `top ${Math.max(1, 100 - pct)}%`;
  return `bottom ${Math.max(1, pct)}%`;
}

function Bar({ label, pct }: { label: string; pct: number | null }) {
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
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-xs font-bold tabular-nums">
        {standing(pct)}
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
      </p>

      <div className="mt-4 space-y-3">
        <Bar label="Accuracy" pct={data.accuracy_pct} />
        <Bar label="Cases completed" pct={data.cases_pct} />
        <Bar label="Clinical Reasoning Index" pct={data.cri_pct} />
      </div>
    </div>
  );
}
