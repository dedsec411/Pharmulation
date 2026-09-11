import { useState } from "react";
import {
  BookLock, CheckCircle2, Clock3, FileBadge, Snowflake, TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/warehouse/view";
import {
  LICENCE_FEE, LICENCE_TERM_WEEKS, NARCOTICS_LEAD_WEEKS,
  type LicenceKind,
} from "@/lib/warehouse/compliance";
import type { Facility } from "./useFacility";

/**
 * Licences and paperwork.
 *
 * The register does not show what is physically in the safe, on purpose. A
 * screen that puts the book and the shelf side by side turns writing up the
 * register into copying a number across, which is the one thing the exercise
 * is not. The learner goes and counts, then writes down what they counted -
 * and if they write down the wrong number, the register is wrong, exactly as
 * it would be.
 */

type Props = {
  facility: Facility;
  onApply: (kind: LicenceKind) => void;
  onSignRegister: (counts: Array<{ drugId: string; counted: number }>) => void;
  onLogTemperature: () => void;
  busy: boolean;
  onGoTo: (tab: string) => void;
};

const LICENCES: Array<{ kind: LicenceKind; title: string; blurb: string }> = [
  {
    kind: "drug_sale",
    title: "Drug Sale Licence",
    blurb: "Issued by the provincial health authority. Without it in date the pharmacy may not trade at all.",
  },
  {
    kind: "narcotics",
    title: "Narcotics permit",
    blurb: "Separate from the sale licence, and needed on top of it before a controlled medicine can be ordered or held.",
  },
];

export function ComplianceDesk({
  facility, onApply, onSignRegister, onLogTemperature, busy, onGoTo,
}: Props) {
  const [counts, setCounts] = useState<Record<string, string>>({});

  const controlledLines = facility.positions.filter(
    (p) => p.line.controlled && (p.onHand.packs > 0 || facility.register.some((r) => r.drug_id === p.line.drugId)));
  const usesFridge = facility.positions.some((p) => p.line.storage === "cold-chain" && p.onHand.packs > 0);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-2">
        {LICENCES.map((spec) => {
          const held = facility.licences.find((l) => l.kind === spec.kind);
          const expires = held ? Number(held.expires_period) : null;
          const left = expires === null ? null : expires - facility.period;
          const active = held?.status === "active" && (left ?? -1) >= 0;
          const pending = held?.status === "pending";

          return (
            <article key={spec.kind} className="rounded-lg border bg-card/60 p-4">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <FileBadge className="h-4 w-4 text-muted-foreground" /> {spec.title}
                </h3>
                {active
                  ? <Badge variant="outline" className="text-[10px] text-emerald-600">In force</Badge>
                  : pending
                    ? <Badge variant="outline" className="text-[10px]">
                        With the authority
                      </Badge>
                    : <Badge variant="destructive" className="text-[10px]">
                        {held ? "Expired" : "Not held"}
                      </Badge>}
              </header>
              <p className="mt-2 text-xs text-muted-foreground">{spec.blurb}</p>

              <div className="mt-3 text-sm">
                {pending && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Expected in week {held?.issued_period}.
                  </span>
                )}
                {active && (
                  <span className={left !== null && left <= 4 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                    Valid through week {expires}
                    {left !== null && left <= 4 ? ` - ${left} week(s) left` : ""}.
                  </span>
                )}
                {!active && !pending && held && (
                  <span className="text-red-500">Lapsed in week {expires}.</span>
                )}
                {!held && (
                  <span className="text-muted-foreground">
                    Takes {NARCOTICS_LEAD_WEEKS} weeks to come through once applied for.
                  </span>
                )}
              </div>

              {!pending && (
                <Button
                  size="sm"
                  variant={active ? "outline" : "default"}
                  className="mt-3"
                  disabled={busy}
                  onClick={() => onApply(spec.kind)}
                >
                  {active
                    ? `Renew for ${money(LICENCE_FEE[spec.kind])}`
                    : held
                      ? `Reinstate for ${money(LICENCE_FEE[spec.kind])}`
                      : `Apply - ${money(LICENCE_FEE[spec.kind])}`}
                </Button>
              )}
              {active && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Renewing early keeps the weeks you have already paid for and adds
                  another {LICENCE_TERM_WEEKS}.
                </p>
              )}
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border bg-card/60 p-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <BookLock className="h-4 w-4 text-muted-foreground" /> Controlled drugs register
          </h3>
          {facility.paperwork.cdRegister
            ? <Badge variant="outline" className="gap-1 text-[10px] text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Written up for week {facility.period}
              </Badge>
            : <Badge variant="outline" className="text-[10px] text-amber-600">Not yet written up</Badge>}
        </header>

        {controlledLines.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            You hold nothing controlled, so there is no register to keep. That changes the
            week a narcotics permit comes through and the first order lands.
          </p>
        ) : (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              Count the safe, then write down what you counted. The register moves only
              when you write it up - the shelf moves whether you do or not, and an
              inspector compares the two. There is no tolerance: a missing ampoule is a
              criminal matter, not a stock variance.
            </p>
            <div className="mt-3 space-y-2">
              {controlledLines.map((pos) => {
                const book = facility.register.find((r) => r.drug_id === pos.line.drugId);
                const posted = book ? Number(book.posted_through_period) : 0;
                const stale = posted < facility.period - 1;
                return (
                  <div key={pos.line.drugId} className="flex flex-wrap items-center gap-3 rounded-md border bg-background/50 p-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{pos.line.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Register balance {book ? Number(book.balance) : 0}
                        {book ? ` - last written up in week ${posted}` : " - never written up"}
                        {stale && <span className="text-amber-600 dark:text-amber-400"> (stale)</span>}
                      </div>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      placeholder="counted"
                      value={counts[pos.line.drugId] ?? ""}
                      onChange={(e) => setCounts((c) => ({ ...c, [pos.line.drugId]: e.target.value }))}
                      className="h-8 w-28 text-right tabular-nums"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                disabled={busy || Object.values(counts).every((v) => v.trim() === "")}
                onClick={() => onSignRegister(
                  controlledLines
                    .filter((pos) => (counts[pos.line.drugId] ?? "").trim() !== "")
                    .map((pos) => ({
                      drugId: pos.line.drugId,
                      counted: Math.max(0, Number(counts[pos.line.drugId]) || 0),
                    })),
                )}
              >
                Write up the register
              </Button>
              <button
                type="button"
                onClick={() => onGoTo("stock")}
                className="text-xs text-primary hover:underline"
              >
                Go and count the safe
              </button>
            </div>
          </>
        )}
      </section>

      <section className="rounded-lg border bg-card/60 p-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Snowflake className="h-4 w-4 text-muted-foreground" /> Fridge temperature log
          </h3>
          {facility.paperwork.temperatureLog
            ? <Badge variant="outline" className="gap-1 text-[10px] text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Logged for week {facility.period}
              </Badge>
            : <Badge variant="outline" className="text-[10px] text-amber-600">Not logged</Badge>}
        </header>
        {usesFridge ? (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              An inspector asks for this before anything else, because it is the only
              evidence that the cold chain held while nobody was watching. A missing log
              is a minor finding on its own - and no defence at all when a batch is
              questioned.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              disabled={busy || facility.paperwork.temperatureLog}
              onClick={onLogTemperature}
            >
              {facility.paperwork.temperatureLog ? "Logged" : "Log this week's readings"}
            </Button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing in the fridge this week, so there is nothing to log.
          </p>
        )}
      </section>

      {facility.suspendedUntilPeriod >= facility.period && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/5 p-4 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-muted-foreground">
            The pharmacy is closed by order until week {facility.suspendedUntilPeriod + 1}.
            Putting the findings right does not reopen it early - the closure is the penalty,
            and it runs its course.
          </p>
        </div>
      )}
    </div>
  );
}
