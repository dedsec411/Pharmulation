import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Target, ArrowRight } from "lucide-react";
import {
  SKILLS, describeGap, modesForSkill, weakestAreas, type WeaknessMap,
} from "@/lib/game/weakness";
import { PUBLIC_MODE_GROUPS } from "@/lib/game/shared";

/**
 * What to practise today, chosen from the weakness map.
 *
 * Supplements the mode cards rather than replacing them: a learner who wants to
 * play something else should not have to argue with the dashboard about it.
 *
 * No AI call. The recommendation is a query against the map - the weakest
 * measured areas, each pointed at a mode that actually exercises that skill.
 * Sending someone to Warehousing to work on counselling would be worse than
 * saying nothing, so a gap only ever links to a mode that tests it.
 */

/** The route a mode is played at, via the group it belongs to. */
function routeForMode(mode: string): string | null {
  const group = PUBLIC_MODE_GROUPS.find((g) => (g.modes as readonly string[]).includes(mode));
  return group ? `/game/${group.key}` : null;
}

const MODE_LABEL: Record<string, string> = {
  rx: "Community Pharmacy", otc: "Community Pharmacy", community: "Community Pharmacy",
  hospital: "Clinical", oncology: "Clinical",
};

export function RecommendedCases({ map }: { map: WeaknessMap }) {
  const gaps = weakestAreas(map, 3);
  if (!gaps.length) return null;

  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Target className="size-5 text-primary" /> Recommended for you today
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Chosen from where your accuracy is actually lowest, not from what you have played least.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {gaps.map((gap, i) => {
          const skill = SKILLS.find((s) => s.key === gap.skill);
          const mode = modesForSkill(gap.skill)[0];
          const route = mode ? routeForMode(mode) : null;
          const pct = Math.round(gap.accuracy * 100);

          return (
            <motion.div
              key={`${gap.drugClass ?? "all"}-${gap.skill}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card flex flex-col p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full border border-rose-400/40 bg-rose-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-300">
                  {pct}% accuracy
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {gap.errors} {gap.errors === 1 ? "error" : "errors"}
                </span>
              </div>

              <p className="mt-3 font-bold leading-tight">{skill?.label ?? gap.skill}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {gap.drugClass ? `${gap.drugClass} medicines` : "Across every drug class"}
                {" · "}{gap.attempts} attempts
              </p>

              {route ? (
                <Link
                  to={route}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 pt-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                  style={{ marginTop: "auto" }}
                >
                  Practise in {MODE_LABEL[mode] ?? mode} <ArrowRight className="size-3.5" />
                </Link>
              ) : (
                <p className="mt-auto pt-3 text-xs text-muted-foreground">
                  {describeGap(gap)}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
