import { useMemo, useState } from "react";
import {
  AlertTriangle, Flame, Inbox, Lock, Package, Snowflake, TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { money, coverLabel } from "@/lib/warehouse/view";
import type { StorageZone } from "@/lib/warehouse/economics";
import type { Facility } from "./useFacility";

/**
 * The stock room.
 *
 * Two jobs sit here and they are deliberately not the same screen furniture.
 * Goods-in is a decision: every delivery lands in quarantine and stays
 * undispensable until someone puts it somewhere, and they can put it in the
 * wrong place if they insist. The shelf below is a report.
 */

const ZONES: Array<{ key: Exclude<StorageZone, "quarantine">; label: string; note: string; icon: typeof Package }> = [
  { key: "ambient", label: "Ambient shelf", note: "below 30C, dry", icon: Package },
  { key: "cold-chain", label: "Fridge", note: "2-8C, logged daily", icon: Snowflake },
  { key: "cd-safe", label: "CD safe", note: "locked, register kept", icon: Lock },
  { key: "flammables", label: "Flammables", note: "vented cabinet", icon: Flame },
];

const ZONE_LABEL: Record<string, string> = {
  ambient: "Ambient shelf",
  "cold-chain": "Fridge",
  "cd-safe": "CD safe",
  flammables: "Flammables",
  quarantine: "Goods-in",
};

type Props = {
  facility: Facility;
  onPutAway: (moves: Array<{ stockId: string; zone: string }>, confirm: boolean) => Promise<boolean>;
  busy: boolean;
};

export function StockRoom({ facility, onPutAway, busy }: Props) {
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{ moves: Array<{ stockId: string; zone: string }>; warnings: string[] } | null>(null);

  const byZone = useMemo(() => {
    const out = new Map<string, { packs: number; value: number }>();
    for (const batch of facility.stock) {
      const entry = out.get(batch.location) ?? { packs: 0, value: 0 };
      entry.packs += batch.qty;
      entry.value += batch.qty * batch.unitCost;
      out.set(batch.location, entry);
    }
    return out;
  }, [facility.stock]);

  const goodsIn = facility.stock.filter((b) => b.location === "quarantine" && b.qty > 0);
  const lineFor = (drugId: string) => facility.catalogue.find((l) => l.drugId === drugId);

  async function put(moves: Array<{ stockId: string; zone: string }>) {
    const warnings = moves.flatMap((move) => {
      const batch = facility.stock.find((b) => b.id === move.stockId);
      const line = batch ? lineFor(batch.drugId) : undefined;
      if (!line || line.storage === move.zone) return [];
      return [line.storage === "cold-chain"
        ? `${line.name} belongs in the fridge. Left out of it, this batch will be destroyed.`
        : `${line.name} belongs in ${ZONE_LABEL[line.storage].toLowerCase()}.`];
    });
    if (warnings.length) {
      setPending({ moves, warnings });
      return;
    }
    await onPutAway(moves, false);
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {ZONES.map((zone) => {
          const held = byZone.get(zone.key) ?? { packs: 0, value: 0 };
          const Icon = zone.icon;
          return (
            <div key={zone.key} className="rounded-lg border bg-card/60 p-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {zone.label}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{held.packs}</div>
              <div className="truncate text-xs text-muted-foreground">{money(held.value)} - {zone.note}</div>
            </div>
          );
        })}
        <div className={`rounded-lg border p-3 ${goodsIn.length ? "border-amber-500/50 bg-amber-500/10" : "bg-card/60"}`}>
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" /> Goods-in
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {byZone.get("quarantine")?.packs ?? 0}
          </div>
          <div className="truncate text-xs text-muted-foreground">not dispensable</div>
        </div>
      </section>

      {goodsIn.length > 0 && (
        <section className="rounded-lg border bg-card/60 p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Inbox className="h-4 w-4 text-muted-foreground" /> Waiting to be put away
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Everything that arrives is quarantined until you place it. Quarantined stock
            cannot be dispensed, so a delivery left here sells nothing.
          </p>
          <div className="space-y-2">
            {goodsIn.map((batch) => {
              const line = lineFor(batch.drugId);
              const target = chosen[batch.id] ?? line?.storage ?? "ambient";
              return (
                <div key={batch.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-background/50 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{line?.name ?? "Medicine"}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      Batch {batch.batchNo} - {batch.qty} packs - expires week {batch.expiresPeriod}
                    </div>
                  </div>
                  {line?.controlled && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Lock className="h-3 w-3" /> Controlled
                    </Badge>
                  )}
                  <Select value={target} onValueChange={(v) => setChosen((c) => ({ ...c, [batch.id]: v }))}>
                    <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ZONES.map((zone) => (
                        <SelectItem key={zone.key} value={zone.key} className="text-xs">{zone.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => put([{ stockId: batch.id, zone: target }])}
                  >
                    Put away
                  </Button>
                </div>
              );
            })}
          </div>
          <Button
            size="sm"
            className="mt-3"
            disabled={busy}
            onClick={() => put(goodsIn.map((batch) => ({
              stockId: batch.id,
              zone: chosen[batch.id] ?? lineFor(batch.drugId)?.storage ?? "ambient",
            })))}
          >
            Put all away
          </Button>
        </section>
      )}

      {facility.expiring.length > 0 && (
        <section className="rounded-lg border bg-card/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TriangleAlert className="h-4 w-4 text-amber-500" /> Running out of life
          </div>
          <div className="space-y-1.5">
            {facility.expiring.slice(0, 8).map((item) => (
              <div key={item.batch.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  {item.name} <span className="text-muted-foreground">- {item.batch.batchNo}, {item.batch.qty} packs</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className={item.inWeeks <= 0 ? "text-red-500" : "text-amber-600 dark:text-amber-400"}>
                    {item.inWeeks <= 0 ? "expired" : `${item.inWeeks}w`}
                  </span>
                  <span className="ml-2 text-muted-foreground">{money(item.valueAtRisk)}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Package className="h-4 w-4 text-muted-foreground" /> On the shelf
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Medicine</th>
                <th className="pb-2 text-right font-medium">Sellable</th>
                <th className="pb-2 text-right font-medium">Held</th>
                <th className="pb-2 text-right font-medium">Cover</th>
                <th className="pb-2 text-right font-medium">Value</th>
                <th className="pb-2 text-right font-medium">Where</th>
              </tr>
            </thead>
            <tbody>
              {[...facility.positions]
                .sort((a, b) => a.weeksOfCover - b.weeksOfCover)
                .map((pos) => (
                  <tr key={pos.line.drugId} className="border-t">
                    <td className="py-1.5 pr-2">
                      <span className="flex items-center gap-1.5">
                        <Badge variant="outline" className="px-1 py-0 text-[10px]">{pos.abc}</Badge>
                        <span className="truncate">{pos.line.name}</span>
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{pos.onHand.sellable}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{pos.onHand.packs}</td>
                    <td className={`py-1.5 text-right tabular-nums ${pos.needsOrdering ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {coverLabel(pos.weeksOfCover)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{money(pos.onHand.value)}</td>
                    <td className="py-1.5 text-right text-xs text-muted-foreground">{ZONE_LABEL[pos.line.storage]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> That is not where it belongs
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {pending?.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
                <p className="text-sm">
                  You can do it anyway. Stock kept in the wrong place carries the
                  consequence of being kept in the wrong place.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Put it where it belongs</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pending) await onPutAway(pending.moves, true);
                setPending(null);
              }}
            >
              Do it anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
