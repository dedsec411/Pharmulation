import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Building2, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { ModeTheme } from "@/components/game/ModeTheme";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpenPharmacy } from "@/components/warehouse/OpenPharmacy";
import { WeekBoard } from "@/components/warehouse/WeekBoard";
import { StockRoom } from "@/components/warehouse/StockRoom";
import { OrderDesk } from "@/components/warehouse/OrderDesk";
import { NoticeBoard } from "@/components/warehouse/NoticeBoard";
import { ComplianceDesk } from "@/components/warehouse/ComplianceDesk";
import { ReportsDesk } from "@/components/warehouse/ReportsDesk";
import { WeekResult, type ClosedWeek } from "@/components/warehouse/WeekResult";
import {
  useAdvanceWeek, useFacility, useOpenPharmacy, usePutAway, usePlaceOrder,
  useResolveEvent, useApplyForLicence, useSignRegister, useLogTemperature,
} from "@/components/warehouse/useFacility";
import { SUPPLIER_NAME } from "@/lib/warehouse/supplier";
import { money } from "@/lib/warehouse/view";
import { weekScore, type WeekScore } from "@/lib/warehouse/score";
import { submitScore } from "@/lib/game/shared";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

/**
 * Warehousing.
 *
 * Not a timed case: a pharmacy that stays where you left it. The week only
 * advances when the learner closes it, so a facility abandoned for a month is
 * exactly where it was abandoned, and every decision in it has a consequence
 * that arrives weeks later rather than on the next screen.
 */

export const Route = createFileRoute("/_authenticated/game/warehousing")({
  head: () => ({ meta: [{ title: "Warehousing - Pharmulation" }] }),
  component: () => <ModeTheme mode="warehousing"><Warehousing /></ModeTheme>,
  errorComponent: ({ error }) => <div className="p-5 sm:p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-5 sm:p-8">Not found</div>,
});

function Warehousing() {
  const { data: facility, isLoading } = useFacility();
  const open = useOpenPharmacy();
  const advance = useAdvanceWeek();
  const putAway = usePutAway();
  const order = usePlaceOrder();
  const resolve = useResolveEvent();
  const licence = useApplyForLicence();
  const register = useSignRegister();
  const fridgeLog = useLogTemperature();
  const [tab, setTab] = useState("week");
  const [closed, setClosed] = useState<{ week: ClosedWeek; scored: WeekScore; xp: number } | null>(null);
  const userId = useAuthStore((s) => s.profile?.user_id);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!facility) {
    return <OpenPharmacy onOpen={(data) => open.mutate(data)} opening={open.isPending} />;
  }

  const closeWeek = () => {
    advance.mutate(undefined as never, {
      onSuccess: async (result: any) => {
        if (!result?.ok) return;

        const fines = (result.charges ?? [])
          .filter((c: any) => c.kind === "penalty")
          .reduce((sum: number, c: any) => sum + c.amount, 0);

        const scored = weekScore({
          serviceLevel: result.kpis.serviceLevel,
          grossMarginPercent: result.kpis.grossMarginPercent,
          revenue: result.kpis.revenue,
          wastage: result.kpis.wastage,
          fines,
          traded: result.traded,
        });

        // A week is the unit of work here the way a case is elsewhere, so it
        // earns XP the same way. Demand served stands in for accuracy: it is
        // the closest thing a pharmacy has to getting the answer right.
        const demanded = result.perDrug.reduce((n: number, d: any) => n + d.demanded, 0);
        const sold = result.perDrug.reduce((n: number, d: any) => n + d.sold, 0);
        let xp = 0;
        if (userId) {
          const submitted = await submitScore({
            userId,
            caseId: `generated:warehouse-week-${result.period}`,
            mode: "warehousing",
            score: scored.score,
            // A week is not raced. There is no clock to report.
            timeTaken: 0,
            errors: result.faults.length,
            correctDrugs: sold,
            totalDrugs: demanded,
            difficulty: facility.difficulty,
            errorsDetail: result.faults.map((f: any) => ({
              errorType: f.code, whyWrong: f.detail,
            })),
          });
          xp = submitted.xpGain;
        }

        setClosed({ week: result as ClosedWeek, scored, xp });
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/modes"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back to modes"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold leading-tight">{facility.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {facility.city} - week {facility.period}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={facility.trading ? "outline" : "destructive"} className="gap-1">
            {facility.trading
              ? <><ShieldCheck className="h-3 w-3" /> Trading</>
              : <><ShieldX className="h-3 w-3" /> Closed</>}
          </Badge>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Cash</div>
            <div className={`text-lg font-semibold tabular-nums ${facility.cash < 0 ? "text-red-500" : ""}`}>
              {money(facility.cash)}
            </div>
          </div>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="ordering">Ordering</TabsTrigger>
          <TabsTrigger value="notices" className="gap-1.5">
            Notices
            {facility.events.length > 0 && (
              <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                {facility.events.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="week">
          <WeekBoard
            facility={facility}
            onGoTo={setTab}
            onClose={closeWeek}
            closing={advance.isPending}
          />
        </TabsContent>

        <TabsContent value="stock">
          <StockRoom
            facility={facility}
            busy={putAway.isPending}
            onPutAway={async (moves, confirm) => {
              const result = await putAway.mutateAsync({ moves, confirm });
              if (result.ok) toast.success(`${result.moved} batch(es) put away.`);
              return result.ok;
            }}
          />
        </TabsContent>

        <TabsContent value="ordering">
          <OrderDesk
            facility={facility}
            placing={order.isPending}
            onOrder={(lines) => order.mutate({ supplier: SUPPLIER_NAME, lines })}
          />
        </TabsContent>

        <TabsContent value="notices">
          <NoticeBoard
            facility={facility}
            busy={resolve.isPending}
            onGoTo={setTab}
            onResolve={(eventId, action) => resolve.mutate({ eventId, action })}
          />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceDesk
            facility={facility}
            busy={licence.isPending || register.isPending || fridgeLog.isPending}
            onGoTo={setTab}
            onApply={(kind) => licence.mutate({ kind })}
            onSignRegister={(counts) => register.mutate({ counts })}
            onLogTemperature={() => fridgeLog.mutate(undefined as never)}
          />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsDesk facility={facility} />
        </TabsContent>
      </Tabs>

      <WeekResult
        week={closed?.week ?? null}
        scored={closed?.scored ?? null}
        xp={closed?.xp ?? 0}
        onClose={() => setClosed(null)}
      />
    </div>
  );
}
