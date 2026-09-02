import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X as XIcon, TrendingUp, AlertTriangle, Target, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SKILLS, describeGap, weakestAreas, type WeaknessMap } from "@/lib/game/weakness";
import { generateWeeklyReport } from "@/lib/api/report.functions";

/**
 * The Monday report.
 *
 * Generated at most once per learner per week: the row is looked up first and
 * the model is only asked when there is no row for the week already. Opening
 * the dashboard five times on a Monday therefore costs one generation, not
 * five, and the unique constraint on (user_id, week_start) makes that true even
 * if two tabs race.
 *
 * Dismissal is remembered locally rather than in the row, so dismissing the
 * banner does not destroy the report - it can still be read from the profile,
 * and it comes back on the next device.
 */

type StoredReport = {
  improved: string | null;
  biggest_gap: string | null;
  recommendation: string | null;
  motivation: string | null;
  weeks_to_next_level: number | null;
  week_start: string;
};

const reports = () => (supabase as unknown as { from: (t: string) => any }).from("weekly_reports");

/** The Monday of the current week, in the viewer's own timezone. */
export function weekStart(now = new Date()): string {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function WeeklyReportBanner({
  userId, map, level, xp, xpToNextLevel, casesThisWeek, casesLastWeek,
  accuracyThisWeek, accuracyLastWeek,
}: {
  userId?: string;
  map: WeaknessMap | null;
  level: number;
  xp: number;
  xpToNextLevel: number;
  casesThisWeek: number;
  casesLastWeek: number;
  accuracyThisWeek: number | null;
  accuracyLastWeek: number | null;
}) {
  const [report, setReport] = useState<StoredReport | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const started = useRef(false);
  const week = weekStart();

  useEffect(() => {
    if (!userId || !map || started.current) return;
    started.current = true;

    void (async () => {
      try {
        const { data } = await reports()
          .select("improved, biggest_gap, recommendation, motivation, weeks_to_next_level, week_start")
          .eq("user_id", userId).eq("week_start", week).limit(1);

        if (data?.length) { setReport(data[0]); return; }

        // Nothing to say about a week nobody played.
        if (casesThisWeek + casesLastWeek === 0) return;

        const result = await generateWeeklyReport({
          data: {
            casesThisWeek, casesLastWeek, accuracyThisWeek, accuracyLastWeek,
            level, xp, xpToNextLevel,
            skills: SKILLS.map((s) => ({
              skill: s.label,
              attempts: map.bySkill[s.key].attempts,
              errors: map.bySkill[s.key].errors,
              accuracy: map.bySkill[s.key].accuracy,
            })),
            topGaps: weakestAreas(map, 3).map(describeGap),
          },
        });
        if (!result.ok) return;

        const row = {
          user_id: userId, week_start: week,
          improved: result.report.improved,
          biggest_gap: result.report.biggestGap,
          recommendation: result.report.recommendation,
          motivation: result.report.motivation,
          weeks_to_next_level: result.report.weeksToNextLevel,
        };
        // Ignore a conflict: another tab got there first, which is the
        // constraint doing its job rather than an error worth reporting.
        await reports().insert(row);
        setReport({ ...row, week_start: week } as StoredReport);
      } catch (error) {
        console.error("[weekly report]", error);
      }
    })();
  }, [userId, map, week, casesThisWeek, casesLastWeek, accuracyThisWeek, accuracyLastWeek, level, xp, xpToNextLevel]);

  if (!report || dismissed) return null;

  const lines = [
    { icon: TrendingUp, label: "What improved", text: report.improved, tone: "text-emerald-300" },
    { icon: AlertTriangle, label: "Biggest gap", text: report.biggest_gap, tone: "text-amber-300" },
    { icon: Target, label: "This week", text: report.recommendation, tone: "text-primary" },
  ].filter((l) => l.text);

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="glass-card mt-6 p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              <Sparkles className="size-3.5" /> Your week
            </p>
            <h3 className="mt-1 text-lg font-bold">
              Week of {new Date(report.week_start).toLocaleDateString(undefined, { day: "numeric", month: "long" })}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss this week's report"
            className="rounded-full border border-border/50 p-1.5 text-muted-foreground transition hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {lines.map((line) => (
            <div key={line.label} className="rounded-xl border border-border/40 bg-background/40 p-3">
              <p className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${line.tone}`}>
                <line.icon className="size-3" /> {line.label}
              </p>
              <p className="mt-1 text-sm">{line.text}</p>
            </div>
          ))}
        </div>

        {(report.motivation || report.weeks_to_next_level) && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {report.motivation && (
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">{report.motivation}</p>
            )}
            {report.weeks_to_next_level && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                <CalendarClock className="size-3.5" />
                ~{report.weeks_to_next_level} {report.weeks_to_next_level === 1 ? "week" : "weeks"} to level {level + 1}
              </span>
            )}
          </div>
        )}
      </motion.section>
    </AnimatePresence>
  );
}
