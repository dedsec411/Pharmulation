import { useMemo, useState } from "react";
import { Lock, PiggyBank, Send, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, coverLabel } from "@/lib/warehouse/view";
import { marginPercent } from "@/lib/warehouse/economics";
import {
  orderAnalysis, SUPPLIER_NAME, SUPPLIER_BREAKS, PAYMENT_TERMS_WEEKS,
} from "@/lib/warehouse/supplier";
import type { Facility } from "./useFacility";

/**
 * The ordering desk.
 *
 * Everything a buyer needs to make the decision and nothing that makes it for
 * them: what each line earns, how long the stock lasts, where the reorder point
 * sits, what is already coming, and what the whole order does to the cash.
 *
 * The one helper is a target cover the learner sets themselves. Buying to a
 * days-of-cover policy is how the job is actually done, and a policy the
 * learner chose is theirs in a way that a suggested quantity never is.
 */

type Props = {
  facility: Facility;
  onOrder: (lines: Array<{ drugId: string; packs: number }>) => void;
  placing: boolean;
};

export function OrderDesk({ facility, onOrder, placing }: Props) {
  const [packs, setPacks] = useState<Record<string, number>>({});
  const [targetCover, setTargetCover] = useState(4);
  const [onlyShort, setOnlyShort] = useState(false);

  const lines = useMemo(
    () => Object.entries(packs)
      .filter(([, qty]) => qty > 0)
      .map(([drugId, qty]) => ({ drugId, packs: qty })),
    [packs],
  );

  const analysis = useMemo(() => orderAnalysis(lines.map((l) => {
    const line = facility.catalogue.find((c) => c.drugId === l.drugId)!;
    return { drug: { drugId: line.drugId, mrp: line.mrp, tradePrice: line.tradePrice }, packs: l.packs };
  })), [lines, facility.catalogue]);

  const cashAfter = facility.briefing.cashAfterCommitments - analysis.total;
  // What the pharmacy will owe once this order is on the book. The figure that
  // stops four weeks of terms reading as four weeks of profit.
  const owedAfter = facility.briefing.owed + analysis.total;
  const rows = useMemo(() => {
    const sorted = [...facility.positions].sort((a, b) => a.weeksOfCover - b.weeksOfCover);
    return onlyShort ? sorted.filter((p) => p.needsOrdering) : sorted;
  }, [facility.positions, onlyShort]);

  /** Top every short line up to the cover the learner asked for. */
  function fillToCover() {
    const next: Record<string, number> = { ...packs };
    for (const pos of facility.positions) {
      if (!pos.needsOrdering || pos.line.controlled) continue;
      // Against the forecast, so the target means the same thing as the cover
      // and the reorder point beside it.
      const want = Math.ceil(pos.forecastWeekly * targetCover);
      const short = want - pos.onHand.sellable - pos.onOrder;
      if (short > 0) next[pos.line.drugId] = short;
    }
    setPacks(next);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-card/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4 text-muted-foreground" /> {SUPPLIER_NAME}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {SUPPLIER_BREAKS.map((b) => `${b.discountPercent}% over ${b.minPacks} packs`).join(" - ")}.
              Invoiced on {PAYMENT_TERMS_WEEKS * 7}-day terms, so the stock arrives well
              before the money leaves - which is why the cash always looks healthier
              than the business is. Lead times below are to the shelf, counting the
              week a delivery spends in goods-in before it can be dispensed.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="w-28">
              <Label htmlFor="wh-cover" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Target cover
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  id="wh-cover"
                  type="number"
                  min={1}
                  max={26}
                  value={targetCover}
                  onChange={(e) => setTargetCover(Math.max(1, Math.min(26, Number(e.target.value) || 1)))}
                  className="h-8"
                />
                <span className="text-xs text-muted-foreground">wks</span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={fillToCover}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Fill short lines
            </Button>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyShort}
            onChange={(e) => setOnlyShort(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Only lines at or below their reorder point ({facility.briefing.linesBelowReorder})
        </label>
        {lines.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setPacks({})}>Clear</Button>
        )}
      </div>

      <section className="rounded-lg border bg-card/60 p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Medicine</th>
                <th className="pb-2 text-right font-medium">MRP</th>
                <th className="pb-2 text-right font-medium">Trade</th>
                <th className="pb-2 text-right font-medium">Margin</th>
                <th className="pb-2 text-right font-medium">Forecast</th>
                <th className="pb-2 text-right font-medium">Cover</th>
                <th className="pb-2 text-right font-medium">Reorder at</th>
                <th className="pb-2 text-right font-medium">On order</th>
                <th className="pb-2 text-right font-medium">Order</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((pos) => {
                const margin = marginPercent({
                  drugId: pos.line.drugId, mrp: pos.line.mrp, tradePrice: pos.line.tradePrice,
                });
                return (
                  <tr key={pos.line.drugId} className="border-t">
                    <td className="py-1.5 pr-2">
                      <span className="flex items-center gap-1.5">
                        <Badge variant="outline" className="px-1 py-0 text-[10px]">{pos.abc}</Badge>
                        <span className="truncate">{pos.line.name}</span>
                        {pos.line.controlled && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {pos.line.category} - {pos.weeksToShelf}w to the shelf
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{money(pos.line.mrp)}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{money(pos.line.tradePrice)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${margin < 12 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {margin.toFixed(0)}%
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {Math.round(pos.forecastWeekly)}
                    </td>
                    <td className={`py-1.5 text-right tabular-nums ${pos.needsOrdering ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {coverLabel(pos.weeksOfCover)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{pos.reorderAt}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {pos.onOrder || "-"}
                    </td>
                    <td className="py-1.5 pl-2 text-right">
                      <Input
                        type="number"
                        min={0}
                        max={5000}
                        value={packs[pos.line.drugId] ?? ""}
                        placeholder="0"
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(5000, Number(e.target.value) || 0));
                          setPacks((p) => ({ ...p, [pos.line.drugId]: value }));
                        }}
                        className="h-8 w-20 text-right tabular-nums"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <PiggyBank className="h-4 w-4 text-muted-foreground" /> What this order does
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Packs</div>
            <div className="text-lg font-semibold tabular-nums">{analysis.packs}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Cost</div>
            <div className="text-lg font-semibold tabular-nums">{money(analysis.total)}</div>
            {analysis.saved > 0 && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                {analysis.discountPercent}% break, {money(analysis.saved)} off
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Due in week</div>
            <div className="text-lg font-semibold tabular-nums">
              {analysis.packs > 0 ? facility.period + PAYMENT_TERMS_WEEKS : "-"}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Owed after this</div>
            <div className={`text-lg font-semibold tabular-nums ${owedAfter > facility.cash ? "text-red-500" : ""}`}>
              {money(owedAfter)}
            </div>
            <div className="text-xs text-muted-foreground">
              against {money(facility.cash)} in the bank
            </div>
          </div>
        </div>

        {analysis.nextBreak && (
          <p className="mt-3 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            {analysis.nextBreak.morePacks} more packs reaches the{" "}
            {analysis.nextBreak.discountPercent}% break and takes{" "}
            {money(analysis.nextBreak.wouldSave)} off what you are already buying. It also
            ties up more cash and puts more stock on a clock.
          </p>
        )}

        {cashAfter < 0 && (
          <p className="mt-3 text-xs text-red-500">
            This order costs more than you will have once this week's invoices are paid.
            You can place it - the money leaves in {PAYMENT_TERMS_WEEKS} weeks, not today -
            but something has to sell before then.
          </p>
        )}

        <Button
          className="mt-4"
          disabled={placing || lines.length === 0}
          onClick={() => onOrder(lines)}
        >
          <Send className="mr-1.5 h-4 w-4" />
          {placing ? "Placing..." : `Place order (${lines.length} line${lines.length === 1 ? "" : "s"})`}
        </Button>
      </section>
    </div>
  );
}
