import {
  BadgeAlert, CheckCircle2, ClipboardList, FileWarning, Inbox,
  Snowflake, Thermometer, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/warehouse/view";
import type { Facility } from "./useFacility";

/**
 * The post tray.
 *
 * A recall, a fridge that failed, a licence that lapsed, a supplier who sent
 * eighty of the hundred you ordered. Each one sits here until it is answered,
 * and each week it is not answered it costs something.
 *
 * An excursion deliberately does not say what the right answer is. It shows the
 * excursion and the manufacturer's stability limits and asks for a decision,
 * because reading the data sheet and comparing is the skill - being told the
 * answer and clicking it is not.
 */

type Action = "quarantine" | "use" | "destroy" | "acknowledge";

type Props = {
  facility: Facility;
  onResolve: (eventId: string, action: Action) => void;
  busy: boolean;
  onGoTo: (tab: string) => void;
};

const SEVERITY_TONE: Record<string, string> = {
  critical: "text-red-600 dark:text-red-400",
  major: "text-amber-600 dark:text-amber-400",
  minor: "text-muted-foreground",
  advisory: "text-muted-foreground",
};

export function NoticeBoard({ facility, onResolve, busy, onGoTo }: Props) {
  const open = facility.events;
  const lastInspection = facility.inspections[0];

  return (
    <div className="space-y-5">
      {open.length === 0 && (
        <div className="rounded-lg border bg-card/60 p-6 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
          <p className="mt-2 text-sm font-medium">Nothing outstanding</p>
          <p className="text-xs text-muted-foreground">
            Nobody has recalled anything, the fridge held, and your licences are in date.
          </p>
        </div>
      )}

      {open.map((event) => {
        const payload = (event.payload ?? {}) as Record<string, any>;

        if (event.kind === "recall") {
          return (
            <article key={event.id} className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
              <header className="flex flex-wrap items-center gap-2">
                <BadgeAlert className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold">Recall notice - {payload.drugName}</h3>
                <Badge variant="outline" className="text-[10px]">week {event.period_no}</Badge>
              </header>
              <p className="mt-2 text-sm text-muted-foreground">{payload.reason}</p>
              <p className="mt-2 text-sm">
                Batch <span className="font-medium">{payload.batchNo}</span> is withdrawn.
                It must come off the shelf. Every week it stays on sale is charged, and a
                batch that is dispensed instead of withdrawn is worse than one that is late.
              </p>
              <Button
                size="sm"
                className="mt-3"
                disabled={busy}
                onClick={() => onResolve(event.id, "quarantine")}
              >
                Withdraw batch {payload.batchNo} from sale
              </Button>
            </article>
          );
        }

        if (event.kind === "excursion") {
          const batches = (payload.affectedBatches ?? []) as string[];
          return (
            <article key={event.id} className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
              <header className="flex flex-wrap items-center gap-2">
                <Snowflake className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Cold chain excursion</h3>
                <Badge variant="outline" className="text-[10px]">week {event.period_no}</Badge>
              </header>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border bg-background/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    What happened
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 tabular-nums">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" /> {payload.hours} hours
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <Thermometer className="h-3.5 w-3.5 text-muted-foreground" /> up to {payload.maxTempC}C
                    </span>
                  </div>
                </div>
                <div className="rounded-md border bg-background/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Manufacturer's stability data
                  </div>
                  <div className="mt-1 text-sm tabular-nums">
                    Stable up to {payload.stability?.safeHours} hours at no more than{" "}
                    {payload.stability?.safeMaxTempC}C.
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Affected: {batches.join(", ") || "none recorded"}. Compare the excursion against
                the data sheet and decide. Doing nothing means it is destroyed at the close
                and the failure to answer is charged.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onResolve(event.id, "use")}>
                  Release for sale
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onResolve(event.id, "quarantine")}>
                  Quarantine pending advice
                </Button>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => onResolve(event.id, "destroy")}>
                  Destroy
                </Button>
              </div>
            </article>
          );
        }

        if (event.kind === "shortage") {
          return (
            <article key={event.id} className="rounded-lg border bg-card/60 p-4">
              <header className="flex flex-wrap items-center gap-2">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Short delivery - {payload.drugName}</h3>
                <Badge variant="outline" className="text-[10px]">week {event.period_no}</Badge>
              </header>
              <p className="mt-2 text-sm text-muted-foreground">
                {payload.delivered} packs against {payload.ordered} ordered. The invoice
                is for what was sent, and the shelf is short by the difference.
              </p>
              <Button size="sm" variant="ghost" className="mt-2" disabled={busy}
                      onClick={() => onResolve(event.id, "acknowledge")}>
                Noted
              </Button>
            </article>
          );
        }

        if (event.kind === "licence-expiry") {
          return (
            <article key={event.id} className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
              <header className="flex flex-wrap items-center gap-2">
                <FileWarning className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold">
                  {payload.licence === "narcotics" ? "Narcotics permit" : "Drug Sale Licence"} expired
                </h3>
                <Badge variant="outline" className="text-[10px]">week {event.period_no}</Badge>
              </header>
              <p className="mt-2 text-sm text-muted-foreground">
                It lapsed in week {payload.expiredPeriod}.
                {payload.licence === "narcotics"
                  ? " Controlled medicines cannot be held or ordered until it is back in force."
                  : " The pharmacy may not trade until it is renewed."}
              </p>
              <Button size="sm" className="mt-3" onClick={() => onGoTo("compliance")}>
                Renew it
              </Button>
            </article>
          );
        }

        return null;
      })}

      {lastInspection && (
        <section className="rounded-lg border bg-card/60 p-4">
          <header className="flex flex-wrap items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              Inspection, week {lastInspection.period_no}
            </h3>
            {(lastInspection.payload ?? {}).passed
              ? <Badge variant="outline" className="text-[10px] text-emerald-600">No findings</Badge>
              : <Badge variant="destructive" className="text-[10px]">
                  {money((lastInspection.payload ?? {}).totalFine ?? 0)} in fines
                </Badge>}
          </header>
          {((lastInspection.payload ?? {}).findings ?? []).length > 0 ? (
            <ul className="mt-3 space-y-2">
              {((lastInspection.payload ?? {}).findings as any[]).map((finding, i) => (
                <li key={`${finding.code}-${i}`} className="text-sm">
                  <span className={`text-[11px] uppercase tracking-wide ${SEVERITY_TONE[finding.severity] ?? ""}`}>
                    {finding.severity}
                  </span>
                  <div className="text-muted-foreground">{finding.detail}</div>
                  <div className="text-xs text-muted-foreground">{money(finding.fine)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              The inspector found nothing to write up.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
