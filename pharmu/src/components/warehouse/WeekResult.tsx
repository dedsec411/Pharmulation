import { AlertOctagon, Minus, Plus, Trophy } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/warehouse/view";
import type { WeekScore } from "@/lib/warehouse/score";

/**
 * What the week came to.
 *
 * Shown once, after the close, because a week has a result the way a case has
 * an answer. The score is broken down rather than announced: a learner who
 * loses sixty points should be able to see that it was wastage and not bad
 * luck, and a learner who gained them should know which decision earned it.
 */

export type ClosedWeek = {
  period: number;
  traded: boolean;
  insolvent: boolean;
  suspendedUntilPeriod: number;
  kpis: {
    revenue: number; cogs: number; grossMarginPercent: number;
    wastage: number; serviceLevel: number; closingCash: number;
  };
  delivered: string[];
  writeOffs: Array<{ batchNo: string; qty: number; value: number }>;
  spoiled: Array<{ batchNo: string; qty: number; value: number }>;
  condemned: Array<{ batchNo: string; qty: number; value: number }>;
  faults: Array<{ code: string; detail: string }>;
  charges: Array<{ kind: string; amount: number; note: string }>;
  events: Array<Record<string, any>>;
  inspection: { findings: any[]; totalFine: number; suspended: boolean; passed: boolean } | null;
};

type Props = {
  week: ClosedWeek | null;
  scored: WeekScore | null;
  xp: number;
  onClose: () => void;
};

const NEW_NOTICE_LABEL: Record<string, string> = {
  recall: "A batch has been recalled",
  excursion: "The fridge failed",
};

export function WeekResult({ week, scored, xp, onClose }: Props) {
  if (!week || !scored) return null;

  const fines = week.charges
    .filter((c) => c.kind === "penalty")
    .reduce((sum, c) => sum + c.amount, 0);
  const lost = [...week.writeOffs, ...week.spoiled, ...week.condemned];
  // An inspection already appears as findings and a fine. Listing it again as
  // something waiting would be telling the learner to act on a past event.
  const decisions = week.events.filter((e) => e.kind === "recall" || e.kind === "excursion");
  const shortages = week.events.filter((e) => e.kind === "shortage");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {week.insolvent
              ? `Week ${week.period} - the account is past its limit`
              : week.traded
                ? `Week ${week.period} closed`
                : `Week ${week.period} closed with the counter shut`}
          </DialogTitle>
          <DialogDescription>
            {week.insolvent
              ? "There is no more credit. The pharmacy is finished, and every closed week stays on file - the post-mortem is the lesson."
              : week.traded
                ? `${money(week.kpis.revenue)} taken, ${week.kpis.serviceLevel.toFixed(0)}% of demand served.`
                : "Nothing was dispensed. The rent, the invoices and the expiry dates carried on regardless."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border bg-card/60 p-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-amber-500" /> Week score
          </span>
          <span className="text-right">
            <span className="text-2xl font-semibold tabular-nums">{scored.score}</span>
            <span className="ml-2 text-xs text-muted-foreground">+{xp} XP</span>
          </span>
        </div>

        <ul className="space-y-1.5">
          {scored.parts.map((part) => (
            <li key={part.label} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="font-medium">{part.label}</span>
                <span className="block text-xs text-muted-foreground">{part.detail}</span>
              </span>
              <span
                className={`shrink-0 flex items-center tabular-nums ${
                  part.points > 0 ? "text-emerald-600 dark:text-emerald-400"
                  : part.points < 0 ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                {part.points > 0 ? <Plus className="h-3 w-3" /> : part.points < 0 ? <Minus className="h-3 w-3" /> : null}
                {Math.abs(part.points)}
              </span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-card/60 p-3 sm:grid-cols-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Margin</div>
            <div className="text-sm font-semibold tabular-nums">{week.kpis.grossMarginPercent.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Wastage</div>
            <div className="text-sm font-semibold tabular-nums">{money(week.kpis.wastage)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Fines</div>
            <div className="text-sm font-semibold tabular-nums">{money(fines)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Cash</div>
            <div className={`text-sm font-semibold tabular-nums ${week.kpis.closingCash < 0 ? "text-red-500" : ""}`}>
              {money(week.kpis.closingCash)}
            </div>
          </div>
        </div>

        {week.faults.length > 0 && (
          <section>
            <h4 className="mb-1.5 text-sm font-semibold">What went wrong</h4>
            <ul className="space-y-1">
              {week.faults.map((fault, i) => (
                <li key={`${fault.code}-${i}`} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertOctagon className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                  {fault.detail}
                </li>
              ))}
            </ul>
          </section>
        )}

        {lost.length > 0 && (
          <section>
            <h4 className="mb-1.5 text-sm font-semibold">Stock lost</h4>
            <ul className="space-y-1">
              {lost.slice(0, 6).map((item, i) => (
                <li key={`${item.batchNo}-${i}`} className="flex justify-between gap-3 text-xs text-muted-foreground">
                  <span className="truncate">Batch {item.batchNo} - {item.qty} packs</span>
                  <span className="shrink-0 tabular-nums">{money(item.value)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {decisions.length > 0 && (
          <section>
            <h4 className="mb-1.5 text-sm font-semibold">Needs a decision from you</h4>
            <div className="flex flex-wrap gap-1.5">
              {decisions.map((event, i) => (
                <Badge key={`${event.kind}-${i}`} variant="outline" className="text-[10px]">
                  {NEW_NOTICE_LABEL[event.kind] ?? event.kind}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {shortages.length > 0 && (
          <section>
            <h4 className="mb-1.5 text-sm font-semibold">Short deliveries</h4>
            <ul className="space-y-1">
              {shortages.map((event, i) => (
                <li key={`short-${i}`} className="text-xs text-muted-foreground">
                  {event.drugName}: {event.delivered} packs against {event.ordered} ordered.
                </li>
              ))}
            </ul>
          </section>
        )}

        {week.suspendedUntilPeriod >= week.period && (
          <p className="rounded-md border border-red-500/40 bg-red-500/5 p-2 text-xs text-red-600 dark:text-red-400">
            The inspector has closed the pharmacy until week {week.suspendedUntilPeriod + 1}.
          </p>
        )}

        <DialogFooter>
          <Button onClick={onClose}>
            {week.insolvent ? "See the post-mortem" : `Start week ${week.period + 1}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
