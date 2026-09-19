import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Info } from "lucide-react";
import {
  BAND_LABEL, MIN_ATTEMPTS, SKILLS, bandFor,
  type Band, type Cell, type WeaknessMap,
} from "@/lib/game/weakness";
import {
  OPERATION_SKILLS, MIN_WEEKS, type OperationsMap,
} from "@/lib/game/operations";

/**
 * The weakness heatmap.
 *
 * Read like a lab report rather than a chart: rows are drug classes, columns
 * are the seven clinical skills, and a cell is only coloured once there is
 * enough behind it to mean something. A cell under the attempt threshold is
 * hatched grey and says so, because a red cell built on two data points would
 * send someone to revise the wrong thing.
 *
 * The skill totals along the bottom always have enough behind them - they are
 * summed across every class - so a learner sees something useful from their
 * first few cases, long before any single row qualifies.
 */

const BAND_STYLE: Record<Band, string> = {
  critical: "bg-rose-500/85 text-rose-50 border-rose-400/50",
  weak: "bg-amber-500/80 text-amber-950 border-amber-400/50",
  fair: "bg-lime-400/70 text-lime-950 border-lime-300/50",
  strong: "bg-emerald-500/80 text-emerald-950 border-emerald-400/50",
  unknown: "bg-muted/40 text-muted-foreground border-border/40",
};

function CellBox({ cell, onPick }: { cell: Cell; onPick: (c: Cell) => void }) {
  const band = bandFor(cell.accuracy);
  const known = cell.accuracy !== null;
  return (
    <button
      type="button"
      onClick={() => onPick(cell)}
      title={known
        ? `${cell.drugClass} · ${cell.skill}: ${Math.round(cell.accuracy! * 100)}% (${cell.errors} errors in ${cell.attempts})`
        : `${cell.drugClass} · ${cell.skill}: ${cell.attempts} attempts, needs ${MIN_ATTEMPTS}`}
      className={`grid h-9 place-items-center rounded-md border text-[11px] font-bold tabular-nums transition hover:scale-[1.06] max-sm:h-11 ${BAND_STYLE[band]}`}
      style={known ? undefined : {
        // Hatching, so "not measured" never reads as a shade of a real score.
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent 0 4px, rgba(128,128,128,0.16) 4px 8px)",
      }}
    >
      {known ? `${Math.round(cell.accuracy! * 100)}` : "–"}
    </button>
  );
}

/**
 * Running a pharmacy, measured on its own track.
 *
 * Deliberately not columns on the grid above. A lapsed licence is not about
 * antibiotics, so there is no drug class to put it under, and adding four
 * mostly-empty columns to every clinical row would make the grid harder to
 * read in exchange for a cell that could never be filled.
 */
function OperationsStrip({ operations }: { operations: OperationsMap }) {
  if (operations.weeks === 0) return null;
  return (
    <div className="mt-6 border-t border-border/40 pt-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Running a pharmacy
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {operations.weeks} closed {operations.weeks === 1 ? "week" : "weeks"} of Warehousing.
        Each figure is the share of weeks that went by without a fault of that kind.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {OPERATION_SKILLS.map((spec) => {
          const cell = operations.cells.find((c) => c.skill === spec.key);
          const accuracy = cell?.accuracy ?? null;
          const band: Band | null = accuracy === null ? null : bandFor(accuracy);
          return (
            <div key={spec.key} className="rounded-xl border border-border/40 bg-background/40 p-3">
              <div className="text-xs font-semibold">{spec.label}</div>
              {accuracy === null ? (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Needs {MIN_WEEKS} closed weeks before this can be scored.
                </div>
              ) : (
                <>
                  <div className="mt-1 text-lg font-bold tabular-nums">
                    {Math.round(accuracy * 100)}%
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {band ? BAND_LABEL[band] : ""}
                    {cell && cell.faults > 0
                      ? ` - ${cell.faults} ${cell.faults === 1 ? "finding" : "findings"}`
                      : " - nothing recorded"}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeaknessHeatmap({ map, operations }: { map: WeaknessMap; operations?: OperationsMap }) {
  const [picked, setPicked] = useState<Cell | null>(null);

  const rows = useMemo(() => map.classes.map((drugClass) => ({
    drugClass,
    cells: SKILLS.map((s) =>
      map.cells.find((c) => c.drugClass === drugClass && c.skill === s.key)
      ?? { drugClass, skill: s.key, attempts: 0, errors: 0, accuracy: null }),
  })), [map]);

  const measuredCells = map.cells.filter((c) => c.accuracy !== null).length;

  return (
    <div className="glass-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold">
            <Activity className="size-4 text-primary" /> Weakness map
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Accuracy by drug class and clinical skill, across {map.totalCases} cases.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] max-sm:text-[11px]">
          {(["critical", "weak", "fair", "strong", "unknown"] as Band[]).map((b) => (
            <span key={b} className="inline-flex items-center gap-1.5">
              <span className={`size-3 rounded-sm border ${BAND_STYLE[b]}`} />
              <span className="text-muted-foreground">{BAND_LABEL[b]}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Skill totals first. These are summed across every class, so they are
          measurable long before any single row is. */}
      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[9rem_repeat(7,minmax(0,1fr))] gap-1.5">
            <span />
            {SKILLS.map((s) => (
              <span key={s.key} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground max-sm:text-[11px]">
                {s.short}
              </span>
            ))}

            <span className="flex items-center text-xs font-bold">All classes</span>
            {SKILLS.map((s) => {
              const t = map.bySkill[s.key];
              const cell: Cell = {
                drugClass: "All classes", skill: s.key,
                attempts: t.attempts, errors: t.errors, accuracy: t.accuracy,
              };
              return <CellBox key={s.key} cell={cell} onPick={setPicked} />;
            })}

            {rows.map((row) => (
              <div key={row.drugClass} className="contents">
                <span className="flex items-center truncate text-xs text-muted-foreground" title={row.drugClass}>
                  {row.drugClass}
                </span>
                {row.cells.map((cell) => (
                  <CellBox key={cell.skill} cell={cell} onPick={setPicked} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {picked && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-border/40 bg-background/40 p-3 text-sm"
        >
          <p className="font-semibold">
            {picked.drugClass} · {SKILLS.find((s) => s.key === picked.skill)?.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {picked.accuracy !== null
              ? `${Math.round(picked.accuracy * 100)}% — ${picked.errors} ${picked.errors === 1 ? "error" : "errors"} in ${picked.attempts} attempts.`
              : `Only ${picked.attempts} ${picked.attempts === 1 ? "attempt" : "attempts"} so far. At least ${MIN_ATTEMPTS} are needed before this can be scored.`}
          </p>
        </motion.div>
      )}

      {/* Say plainly why most of the grid is grey, rather than leaving a wall
          of hatching to be interpreted as a fault. */}
      {measuredCells === 0 && map.classes.length > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
          The class rows fill in as you play. Each needs {MIN_ATTEMPTS} attempts before it can be
          scored, and only cases completed from now on record which classes they covered.
          The row along the top is already measurable.
        </p>
      )}

      {map.unmappedErrors > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {map.unmappedErrors} further {map.unmappedErrors === 1 ? "error" : "errors"} came from
          Industry and Warehousing, which test process control rather than any of these seven
          clinical skills, and are not counted above.
        </p>
      )}

      {operations && <OperationsStrip operations={operations} />}
    </div>
  );
}
