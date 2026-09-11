import { useMemo, useState } from "react";
import { BarChart3, Receipt, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/warehouse/view";
import { monthToDate, type PeriodRow } from "@/lib/warehouse/view";
import type { Facility } from "./useFacility";

/**
 * What the business did.
 *
 * Weekly first, because that is the unit the learner decides in, with the
 * month above it because that is the unit an owner asks about. Both are shown
 * the same way round: what came in, what it cost, and what was lost - wastage
 * and fines sit in the same table as revenue rather than in a footnote, since
 * losing stock is exactly as expensive as not selling it.
 */

type Props = { facility: Facility };

const LEDGER_LABEL: Record<string, string> = {
  sale: "Takings",
  purchase: "Supplier invoice",
  overhead: "Overheads",
  "write-off": "Written off",
  licence: "Licence",
  penalty: "Penalty",
};

function Bars({ periods }: { periods: PeriodRow[] }) {
  if (!periods.length) return null;
  const peak = Math.max(...periods.map((p) => Math.max(p.revenue, p.cogs + p.overheads)), 1);
  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
      {periods.map((p) => {
        const margin = p.revenue - p.cogs;
        return (
          <div key={p.periodNo} className="flex w-9 shrink-0 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end justify-center gap-0.5">
              <div
                className="w-3 rounded-sm bg-primary/70"
                style={{ height: `${Math.max(2, (p.revenue / peak) * 100)}%` }}
                title={`Revenue ${money(p.revenue)}`}
              />
              <div
                className={`w-3 rounded-sm ${margin >= 0 ? "bg-emerald-500/70" : "bg-red-500/70"}`}
                style={{ height: `${Math.max(2, (Math.abs(margin) / peak) * 100)}%` }}
                title={`Gross margin ${money(margin)}`}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">{p.periodNo}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ReportsDesk({ facility }: Props) {
  const [window, setWindow] = useState(4);
  const chronological = useMemo(
    () => [...facility.periods].sort((a, b) => a.periodNo - b.periodNo),
    [facility.periods],
  );
  const month = useMemo(() => monthToDate(facility.periods, window), [facility.periods, window]);

  if (!facility.periods.length) {
    return (
      <div className="rounded-lg border bg-card/60 p-6 text-center">
        <BarChart3 className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">No closed weeks yet</p>
        <p className="text-xs text-muted-foreground">
          Close week {facility.period} and the figures start here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-card/60 p-4">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            The last {month.weeks} week{month.weeks === 1 ? "" : "s"}
          </h3>
          <div className="flex gap-1">
            {[4, 8, 12].map((weeks) => (
              <button
                key={weeks}
                type="button"
                onClick={() => setWindow(weeks)}
                className={`rounded-md px-2 py-0.5 text-xs ${
                  window === weeks ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {weeks}w
              </button>
            ))}
          </div>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Revenue", value: money(month.revenue) },
            { label: "Gross margin", value: `${month.grossMarginPercent.toFixed(1)}%`, hint: money(month.grossMargin) },
            { label: "Packs sold", value: month.sold.toLocaleString("en-PK") },
            { label: "Service level", value: `${month.serviceLevel.toFixed(0)}%`, hint: `${month.demanded - month.sold} turned away` },
            { label: "Wastage", value: money(month.wastage) },
            { label: "Fines and fees", value: money(month.penalties + month.fees) },
          ].map((tile) => (
            <div key={tile.label} className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{tile.label}</div>
              <div className="truncate text-lg font-semibold tabular-nums">{tile.value}</div>
              {tile.hint && <div className="truncate text-xs text-muted-foreground">{tile.hint}</div>}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Bars periods={chronological} />
          <div className="mt-1 flex gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-primary/70" /> revenue
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/70" /> gross margin
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-muted-foreground" /> Week by week
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Week</th>
                <th className="pb-2 text-right font-medium">Revenue</th>
                <th className="pb-2 text-right font-medium">Cost of goods</th>
                <th className="pb-2 text-right font-medium">Margin</th>
                <th className="pb-2 text-right font-medium">Wastage</th>
                <th className="pb-2 text-right font-medium">Invoices</th>
                <th className="pb-2 text-right font-medium">Overheads</th>
                <th className="pb-2 text-right font-medium">Fines</th>
                <th className="pb-2 text-right font-medium">Served</th>
                <th className="pb-2 text-right font-medium">Closing cash</th>
              </tr>
            </thead>
            <tbody>
              {facility.periods.map((p) => {
                const margin = p.revenue - p.cogs;
                const served = p.demanded > 0 ? (p.sold / p.demanded) * 100 : 100;
                return (
                  <tr key={p.periodNo} className="border-t">
                    <td className="py-1.5 tabular-nums">{p.periodNo}</td>
                    <td className="py-1.5 text-right tabular-nums">{money(p.revenue)}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{money(p.cogs)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${margin < 0 ? "text-red-500" : ""}`}>
                      {money(margin)}
                    </td>
                    <td className={`py-1.5 text-right tabular-nums ${p.wastage > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                      {money(p.wastage)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{money(p.purchases)}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{money(p.overheads)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${p.penalties > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                      {money(p.penalties)}
                    </td>
                    <td className={`py-1.5 text-right tabular-nums ${served < 90 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {served.toFixed(0)}%
                    </td>
                    <td className={`py-1.5 text-right tabular-nums ${p.closingCash < 0 ? "text-red-500" : ""}`}>
                      {money(p.closingCash)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-card/60 p-4">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <ScrollText className="h-4 w-4 text-muted-foreground" /> Where the cash went
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          The table above says what happened. This says why.
        </p>
        <div className="space-y-1">
          {facility.ledger.slice(0, 30).map((entry) => {
            const amount = Number(entry.amount_paisa);
            return (
              <div key={entry.id} className="flex items-center justify-between gap-3 border-b py-1 text-sm last:border-0">
                <span className="flex min-w-0 items-center gap-2">
                  <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
                    w{entry.period_no}
                  </Badge>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {LEDGER_LABEL[entry.kind] ?? entry.kind}
                  </span>
                  <span className="truncate text-muted-foreground">{entry.note}</span>
                </span>
                <span
                  className={`shrink-0 tabular-nums ${
                    amount > 0 ? "text-emerald-600 dark:text-emerald-400"
                    : amount < 0 ? "text-red-500" : "text-muted-foreground"
                  }`}
                >
                  {amount === 0 ? "-" : money(Math.abs(amount))}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
