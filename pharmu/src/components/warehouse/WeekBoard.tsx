import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowRight, Banknote, Boxes, CalendarClock, ClipboardCheck,
  PackageCheck, ShieldAlert, TrendingDown, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money, coverLabel } from "@/lib/warehouse/view";
import type { Facility } from "./useFacility";

/**
 * The week, at a glance.
 *
 * Ordered the way a pharmacist would actually read it: what is wrong right
 * now, then what this week commits them to, then how the business is doing.
 * Nothing here recommends an action - a learner who is told what to order has
 * not done the analysis the mode exists to teach.
 */

type Props = {
  facility: Facility;
  onGoTo: (tab: string) => void;
  onClose: () => void;
  closing: boolean;
};

function StatTile(props: {
  label: string;
  value: string;
  hint?: string;
  tone?: "plain" | "good" | "warn" | "bad";
}) {
  const tone = props.tone ?? "plain";
  const colour =
    tone === "good" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "warn" ? "text-amber-600 dark:text-amber-400"
    : tone === "bad" ? "text-red-600 dark:text-red-400"
    : "text-foreground";
  return (
    <div className="rounded-lg border bg-card/60 p-3 min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{props.label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums truncate ${colour}`}>{props.value}</div>
      {props.hint ? <div className="text-xs text-muted-foreground truncate">{props.hint}</div> : null}
    </div>
  );
}

/** Twelve weeks of closing cash. Enough to see a trend, not enough to study. */
function CashTrend({ points }: { points: number[] }) {
  if (points.length < 2) {
    return <div className="text-xs text-muted-foreground">A trend needs more than one closed week.</div>;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const path = points
    .map((value, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 30 - ((value - min) / span) * 28;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const falling = points[points.length - 1] < points[0];
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-full" aria-hidden>
      <path
        d={path}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={falling ? "stroke-red-500" : "stroke-emerald-500"}
      />
    </svg>
  );
}

export function WeekBoard({ facility, onGoTo, onClose, closing }: Props) {
  const last = facility.periods[0];
  const brief = facility.briefing;

  const outstanding = useMemo(() => {
    const items: Array<{ label: string; tab: string; severity: "info" | "warn" }> = [];

    const quarantined = facility.stock.filter((b) => b.location === "quarantine" && b.qty > 0);
    if (quarantined.length) {
      items.push({
        label: `${quarantined.length} batch(es) in goods-in, not put away. Quarantined stock cannot be dispensed.`,
        tab: "stock",
        severity: "warn",
      });
    }

    const decisions = facility.events.filter(
      (e) => e.kind === "recall" || e.kind === "excursion" || e.kind === "licence-expiry");
    if (decisions.length) {
      items.push({
        label: `${decisions.length} notice(s) waiting on you.`,
        tab: "notices",
        severity: "warn",
      });
    }

    const usesFridge = facility.positions.some(
      (p) => p.line.storage === "cold-chain" && p.onHand.packs > 0);
    if (usesFridge && !facility.paperwork.temperatureLog) {
      items.push({ label: "The fridge temperature has not been logged this week.", tab: "compliance", severity: "info" });
    }

    const holdsControlled = facility.positions.some((p) => p.line.controlled && p.onHand.packs > 0);
    if (holdsControlled && !facility.paperwork.cdRegister) {
      items.push({ label: "The controlled drugs register has not been written up this week.", tab: "compliance", severity: "info" });
    }

    if (brief.linesBelowReorder > 0) {
      items.push({
        label: `${brief.linesBelowReorder} line(s) at or below their reorder point.`,
        tab: "ordering",
        severity: "info",
      });
    }

    return items;
  }, [facility, brief]);

  const cashTone = facility.cash < 0 ? "bad" : facility.runwayWeeks !== null ? "warn" : "good";

  return (
    <div className="space-y-5">
      {!facility.trading && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-500/40 bg-red-500/10 p-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
            <div className="min-w-0">
              <div className="font-semibold text-red-600 dark:text-red-400">
                {facility.suspendedUntilPeriod >= facility.period
                  ? `Closed by order until week ${facility.suspendedUntilPeriod + 1}`
                  : "Trading without a licence"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                The counter is shut. Nothing will be dispensed this week, and the rent,
                the invoices and the expiry dates all carry on regardless.
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => onGoTo("compliance")}>
                Licences and paperwork <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {brief.netPosition < 0 && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          You are holding {money(brief.owed)} of your suppliers' money against{" "}
          {money(facility.cash)} in the bank. Thirty-day terms make a pharmacy look
          better off than it is, and the gap only shows up on the week the invoices
          land together.
        </p>
      )}

      {outstanding.length > 0 && (
        <div className="rounded-lg border bg-card/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            Before you close week {facility.period}
          </div>
          <ul className="space-y-1.5">
            {outstanding.map((item) => (
              <li key={item.label} className="flex items-start justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-start gap-2">
                  <AlertTriangle
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      item.severity === "warn" ? "text-amber-500" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onGoTo(item.tab)}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          Where the money stands
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            label="Cash"
            value={money(facility.cash)}
            hint={facility.runwayWeeks !== null ? `${facility.runwayWeeks} weeks at this rate` : "not losing money"}
            tone={cashTone}
          />
          <StatTile
            label="Owed to suppliers"
            value={money(brief.owed)}
            hint={brief.paymentsDue > 0 ? `${money(brief.paymentsDue)} due this week` : "nothing due this week"}
            tone={brief.owed > facility.cash ? "bad" : "plain"}
          />
          <StatTile
            label="Cash less debts"
            value={money(brief.netPosition)}
            hint="what the shop is actually worth"
            tone={brief.netPosition < 0 ? "bad" : "good"}
          />
          <StatTile label="Stock value" value={money(brief.stockValue)} hint={`${facility.positions.length} lines`} />
          <StatTile
            label="At risk"
            value={money(brief.valueAtRisk)}
            hint={`${brief.expiringCount} batch(es) near expiry`}
            tone={brief.valueAtRisk > 0 ? "warn" : "plain"}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            {last ? `Week ${last.periodNo}, closed` : "Nothing closed yet"}
          </h3>
          {last ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Revenue" value={money(last.revenue)} />
              <StatTile
                label="Gross margin"
                value={`${(last.revenue > 0 ? ((last.revenue - last.cogs) / last.revenue) * 100 : 0).toFixed(1)}%`}
                tone={last.revenue > last.cogs ? "good" : "bad"}
              />
              <StatTile
                label="Served"
                value={`${(last.demanded > 0 ? (last.sold / last.demanded) * 100 : 100).toFixed(0)}%`}
                hint={`${last.demanded - last.sold} packs turned away`}
                tone={last.demanded > 0 && last.sold / last.demanded < 0.9 ? "warn" : "good"}
              />
              <StatTile
                label="Wastage"
                value={money(last.wastage)}
                tone={last.wastage > 0 ? "warn" : "good"}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Close week {facility.period} and the first set of figures appears here.
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-card/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            Cash, last {Math.max(facility.periods.length, 1)} week(s)
          </h3>
          <CashTrend points={[...facility.periods].reverse().map((p) => p.closingCash)} />
          {facility.month.weeks > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label={`${facility.month.weeks}-week revenue`} value={money(facility.month.revenue)} />
              <StatTile label="Margin" value={`${facility.month.grossMarginPercent.toFixed(1)}%`} />
              <StatTile label="Service" value={`${facility.month.serviceLevel.toFixed(0)}%`} />
              <StatTile
                label="Fines"
                value={money(facility.month.penalties)}
                tone={facility.month.penalties > 0 ? "bad" : "good"}
              />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-card/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Boxes className="h-4 w-4 text-muted-foreground" />
          Thinnest cover
        </h3>
        <div className="space-y-1.5">
          {[...facility.positions]
            .sort((a, b) => a.weeksOfCover - b.weeksOfCover)
            .slice(0, 5)
            .map((pos) => (
              <div key={pos.line.drugId} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">{pos.abc}</Badge>
                  <span className="truncate">{pos.line.name}</span>
                </span>
                <span
                  className={`shrink-0 tabular-nums ${
                    pos.needsOrdering ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                  }`}
                >
                  {coverLabel(pos.weeksOfCover)}
                </span>
              </div>
            ))}
        </div>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => onGoTo("ordering")}>
          <Truck className="mr-1.5 h-3.5 w-3.5" /> Ordering and analysis
        </Button>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/60 p-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Close week {facility.period}</div>
          <p className="text-xs text-muted-foreground">
            Deliveries land, invoices are paid, the counter sells what it can, and
            anything out of life is written off. It cannot be undone.
          </p>
        </div>
        <Button onClick={onClose} disabled={closing}>
          <PackageCheck className="mr-1.5 h-4 w-4" />
          {closing ? "Closing..." : `Close week ${facility.period}`}
        </Button>
      </div>
    </div>
  );
}
