import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createFacility, getFacilityState, placeOrder, putAwayStock, advanceWeek,
  applyForLicence, resolveEvent, signCdRegister, logTemperature,
} from "@/lib/api/warehouse.functions";
import {
  stockPositions, expiringSoon, briefing, cashRunwayWeeks, monthToDate,
  type ViewCatalogueLine, type ViewBatch, type ViewOrder, type PeriodRow,
} from "@/lib/warehouse/view";

/**
 * The pharmacy, as the screens see it.
 *
 * One query holds the whole position and every action invalidates it. A
 * facility is a single consistent thing - cash, stock, orders and licences all
 * move together when a week closes - so splitting it into separate queries
 * would only create moments where the screen showed half of last week and half
 * of this one.
 */

export const FACILITY_KEY = ["warehouse", "facility"] as const;

type Row = Record<string, any>;

function toCatalogue(rows: Row[]): ViewCatalogueLine[] {
  return rows.map((r) => ({
    drugId: r.drug_id,
    name: r.drugs?.name ?? "Medicine",
    category: r.drugs?.category ?? "Other",
    mrp: Number(r.mrp_paisa),
    tradePrice: Number(r.trade_price_paisa),
    baseWeekly: Number(r.base_weekly),
    seasonality: Number(r.seasonality),
    peakWeek: Number(r.peak_week),
    leadTimeWeeks: Number(r.lead_time_weeks),
    storage: r.storage,
    controlled: Boolean(r.controlled),
  }));
}

function toStock(rows: Row[]): ViewBatch[] {
  return rows.map((r) => ({
    id: r.id,
    drugId: r.drug_id,
    batchNo: r.batch_no,
    qty: Number(r.qty),
    expiresPeriod: Number(r.expires_period),
    unitCost: Number(r.unit_cost_paisa),
    location: r.location,
  }));
}

function toOrders(rows: Row[]): ViewOrder[] {
  return rows.map((r) => ({
    id: r.id,
    supplier: r.supplier,
    etaPeriod: Number(r.eta_period),
    paymentDuePeriod: Number(r.payment_due_period),
    total: Number(r.total_paisa),
    paid: Boolean(r.paid),
    status: r.status,
    lines: (r.wh_order_lines ?? []).map((l: Row) => ({
      drugId: l.drug_id,
      packs: Number(l.packs),
      receivedPacks: l.received_packs === null || l.received_packs === undefined
        ? null : Number(l.received_packs),
    })),
  }));
}

function toPeriods(rows: Row[]): PeriodRow[] {
  return rows.map((r) => ({
    periodNo: Number(r.period_no),
    revenue: Number(r.revenue_paisa),
    cogs: Number(r.cogs_paisa),
    wastage: Number(r.wastage_paisa),
    purchases: Number(r.purchases_paisa),
    overheads: Number(r.overheads_paisa),
    penalties: Number(r.penalties_paisa ?? 0),
    fees: Number(r.fees_paisa ?? 0),
    openingCash: Number(r.opening_cash_paisa),
    closingCash: Number(r.closing_cash_paisa),
    demanded: Number(r.demanded),
    sold: Number(r.sold),
  }));
}

export type Facility = NonNullable<ReturnType<typeof useFacility>["data"]>;

export function useFacility() {
  return useQuery({
    queryKey: FACILITY_KEY,
    queryFn: async () => {
      const state = await getFacilityState();
      if (!state.ok) return null;

      const catalogue = toCatalogue(state.catalogue as Row[]);
      const stock = toStock(state.stock as Row[]);
      const orders = toOrders(state.orders as Row[]);
      const periods = toPeriods(state.periods as Row[]);
      const period = Number(state.facility.current_period);
      const cash = Number(state.facility.cash_paisa);

      const names = new Map(catalogue.map((l) => [l.drugId, l.name]));
      const positions = stockPositions(catalogue, stock, orders, period);
      const expiring = expiringSoon(stock, names, period);

      return {
        raw: state.facility as Row,
        id: state.facility.id as string,
        name: state.facility.name as string,
        city: state.facility.city as string,
        difficulty: state.facility.difficulty as "easy" | "medium" | "hard",
        period,
        cash,
        overdraft: Number(state.facility.overdraft_paisa),
        trading: state.trading,
        suspendedUntilPeriod: state.suspendedUntilPeriod,
        catalogue,
        names,
        stock,
        orders,
        periods,
        positions,
        expiring,
        briefing: briefing(period, cash, positions, orders, expiring),
        runwayWeeks: cashRunwayWeeks(cash, periods),
        month: monthToDate(periods),
        events: (state.events ?? []) as Row[],
        inspections: (state.inspections ?? []) as Row[],
        ledger: (state.ledger ?? []) as Row[],
        licences: (state.licences ?? []) as Row[],
        register: (state.register ?? []) as Row[],
        paperwork: state.paperwork,
      };
    },
    // The position only changes when the learner changes it, and every action
    // invalidates. Refetching on its own would just flicker the numbers.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/**
 * Run an action against the facility and reload the position afterwards.
 *
 * Failures are surfaced as a toast with the server's own wording. The server
 * explains refusals in the language of the job - "you cannot order controlled
 * medicines without a valid narcotics permit" - and restating them here would
 * only make them vaguer.
 */
function useFacilityAction<TArgs, TResult extends { ok: boolean; error?: string }>(
  run: (args: TArgs) => Promise<TResult>,
  onDone?: (result: TResult) => void,
  /** For actions whose refusal the screen answers better than a toast can. */
  quiet = false,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async (result) => {
      if (!result.ok) {
        if (!quiet) {
          const detail = (result as any).detail as string[] | undefined;
          toast.error(result.error ?? "That did not work.", {
            description: detail?.join(" "),
          });
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey: FACILITY_KEY });
      onDone?.(result);
    },
    onError: (error: unknown) => {
      console.error("[warehouse]", error);
      toast.error("Could not reach the pharmacy. Try that again.");
    },
  });
}

export function useOpenPharmacy() {
  return useFacilityAction(
    (data: { name: string; city: string; difficulty: "easy" | "medium" | "hard" }) =>
      createFacility({ data }),
    () => toast.success("The doors are open. Week 1."),
  );
}

export function usePlaceOrder() {
  return useFacilityAction(
    (data: { supplier: string; lines: Array<{ drugId: string; packs: number }> }) =>
      placeOrder({ data }),
    (result: any) => toast.success(`Order placed. It lands in week ${result.etaPeriod}.`),
  );
}

/**
 * Put stock away.
 *
 * Quiet on refusal: a move into the wrong place comes back with the reasons,
 * and the screen puts them in front of the learner as a decision to confirm
 * rather than flashing a toast that disappears before they have read it.
 */
export function usePutAway() {
  return useFacilityAction(
    (data: { moves: Array<{ stockId: string; zone: string }>; confirm?: boolean }) =>
      putAwayStock({ data: { ...data, confirm: data.confirm ?? false } as any }),
    undefined,
    true,
  );
}

export function useAdvanceWeek() {
  return useFacilityAction(() => advanceWeek());
}

export function useApplyForLicence() {
  return useFacilityAction(
    (data: { kind: "drug_sale" | "narcotics" }) => applyForLicence({ data }),
    (result: any) => toast.success(result.pending
      ? `Application lodged. It is expected in week ${result.grantedPeriod}.`
      : `Licence in force until week ${result.expiresPeriod}.`),
  );
}

export function useResolveEvent() {
  return useFacilityAction(
    (data: { eventId: string; action: "quarantine" | "use" | "destroy" | "acknowledge" }) =>
      resolveEvent({ data }),
  );
}

export function useSignRegister() {
  return useFacilityAction(
    (data: { counts: Array<{ drugId: string; counted: number }> }) => signCdRegister({ data }),
    () => toast.success("Register written up."),
  );
}

export function useLogTemperature() {
  return useFacilityAction(
    () => logTemperature(),
    () => toast.success("Fridge temperature logged."),
  );
}
