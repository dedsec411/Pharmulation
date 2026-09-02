import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildWeaknessMap, type DrugIndex, type WeaknessMap } from "./weakness";

/**
 * The learner's weakness map, computed once and shared.
 *
 * Both the dashboard and the profile need it, and both would otherwise pull the
 * whole score history and rebuild it independently. One query key means one
 * fetch per session and one derivation, with React Query holding the result.
 *
 * The brief suggested caching the map in a profile column. That is worth doing
 * once the history is long enough to be slow to walk, but it is not yet: a
 * learner's scores are a few hundred rows at most and the derivation is a
 * single pass. Caching now would add a staleness problem - a map written after
 * one case and read after another - to solve a cost that has not appeared. The
 * column exists in the migration for when it does.
 */
export function useWeaknessMap(userId?: string) {
  const { data: drugIndex = {} } = useQuery({
    queryKey: ["drug-class-index"],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("drugs").select("name, category").limit(1000);
      if (error) throw error;
      const index: DrugIndex = {};
      for (const row of data ?? []) {
        if (row.name && row.category) index[row.name.toLowerCase()] = row.category;
      }
      return index;
    },
  });

  return useQuery<WeaknessMap | null>({
    queryKey: ["weakness-map", userId],
    enabled: !!userId && Object.keys(drugIndex).length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("scores") as any)
        .select("mode, errors_detail, class_attempts, accuracy, completed_at")
        .eq("user_id", userId!)
        .order("completed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return buildWeaknessMap(data ?? [], drugIndex);
    },
  });
}

/** Cases and accuracy for this week and the one before, for the weekly report. */
export function useWeeklyTotals(userId?: string) {
  return useQuery({
    queryKey: ["weekly-totals", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const { data, error } = await supabase
        .from("scores")
        .select("accuracy, completed_at")
        .eq("user_id", userId!)
        .gte("completed_at", since.toISOString());
      if (error) throw error;

      const weekAgo = Date.now() - 7 * 86400_000;
      const rows = data ?? [];
      const split = (recent: boolean) => rows.filter((r) =>
        recent
          ? new Date(r.completed_at).getTime() >= weekAgo
          : new Date(r.completed_at).getTime() < weekAgo);

      const mean = (list: typeof rows) =>
        list.length ? list.reduce((s, r) => s + Number(r.accuracy), 0) / list.length : null;

      return {
        casesThisWeek: split(true).length,
        casesLastWeek: split(false).length,
        accuracyThisWeek: mean(split(true)),
        accuracyLastWeek: mean(split(false)),
      };
    },
  });
}
