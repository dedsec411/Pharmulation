import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Eye, FileText, History, PackageCheck, ScanLine } from "lucide-react";
import {
  ACCEPT_OPTION, CONDITION_ROWS, decisionOptionsFor,
  labelFields, stockCountNote, type Carton, type ConditionKey, type ConditionRecord,
} from "@/lib/game/goods-in";
import { Abbr } from "@/components/Abbr";

/**
 * Closing the challan at the end of the shift.
 *
 * The physical check happens at the bay, but the goods received note is raised
 * and the challan matched before the driver's copy goes back - which is why
 * this sits at the end of the case rather than the front, against stock the
 * learner has already booked in, dispatched from and counted. Each carton says
 * what they did with it earlier, so the paperwork is the close of the shift
 * they just worked rather than a screen of its own.
 *
 * Two things happen here and they happen in this order, because that is the
 * order they happen in a real store: you write down the state of the box in
 * front of you, and only then do you decide what to do with it. Recording the
 * condition after deciding is how a torn carton ends up with a clean GRN
 * behind it, so the decision stays locked until the condition is written.
 *
 * The carton is drawn rather than photographed, and what can be seen on it is
 * also stated in words underneath. That is not redundancy: a CSS tear is not
 * legible to a screen reader, and a defect a learner cannot perceive is not a
 * test of observation, it is a test of eyesight.
 */

type Props = {
  carton: Carton;
  index: number;
  total: number;
  /** Set once the condition has been written to the GRN; unlocks the decision. */
  recorded: ConditionRecord | null;
  /** The zone this stock went to earlier in the shift, or "quarantine". */
  placedIn: string | null;
  ruledOut: string[];
  onRecord: (drafted: ConditionRecord) => void;
  onDecide: (option: string) => void;
};

const KRAFT = "linear-gradient(155deg,#dcb98d 0%,#cba272 48%,#b78a58 100%)";

export function CartonCheck({
  carton, index, total, recorded, placedIn, ruledOut, onRecord, onDecide,
}: Props) {
  const [draft, setDraft] = useState<Partial<ConditionRecord>>({});
  const fields = useMemo(() => labelFields(carton), [carton]);
  const complete = CONDITION_ROWS.every((r) => draft[r.key] !== undefined);

  return (
    <section className="relative z-10 space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-sky-300/20 bg-slate-900/[0.07] p-4 backdrop-blur-xl dark:bg-slate-950/55">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
            Closing the delivery - check carton details
          </p>
          <h2 className="mt-1 truncate text-lg font-bold sm:text-xl">{carton.supplier}</h2>
          <p className="text-xs text-muted-foreground">
            <Abbr term="DC" /> {carton.dc.number} dated {carton.dc.date} &middot; against <Abbr term="PO" /> {carton.po.number}
          </p>
        </div>
        <p className="shrink-0 rounded-full border border-sky-300/30 px-3 py-1 text-xs font-semibold tabular-nums text-sky-700 dark:text-sky-200">
          Carton {index + 1} of {total}
        </p>
        <p className="w-full text-xs text-muted-foreground">
          The stock you worked through this shift, back on the paperwork. The driver's
          copy goes back signed, so anything wrong with a consignment has to be on it
          before the challan leaves.
        </p>
      </header>

      {/* min-w-0 on both columns: a grid item's automatic minimum size is its
          content, so the match table's min width would otherwise set a floor
          for the whole column and push the phase off the side of a phone.
          items-start stops the shorter column stretching into an empty box. */}
      <div className="grid items-start gap-4 lg:grid-cols-[1.05fr_1fr]">
        <div className="min-w-0 rounded-2xl border border-sky-300/20 bg-slate-900/[0.07] p-4 backdrop-blur-xl dark:bg-slate-950/55">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
            <PackageCheck className="size-3.5" aria-hidden="true" /> On the bay
          </p>
          <CartonGraphic carton={carton} fields={fields} />
          <p className="mt-3 flex gap-2 rounded-xl border border-border/40 bg-background/40 p-3 text-sm text-muted-foreground">
            <Eye className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden="true" />
            <span><span className="font-semibold text-foreground">What you can see: </span>{carton.conditionNote}</span>
          </p>
          <Earlier carton={carton} placedIn={placedIn} />
        </div>

        <div className="min-w-0 space-y-4">
          <ConditionPanel
            draft={draft}
            recorded={recorded}
            complete={complete}
            onPick={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
            onSubmit={() => onRecord(draft as ConditionRecord)}
          />

          <ThreeWayMatch
            carton={carton}
            recorded={recorded}
            ruledOut={ruledOut}
            onDecide={onDecide}
          />
        </div>
      </div>

      <details className="group rounded-2xl border border-sky-300/20 bg-slate-900/[0.07] p-4 backdrop-blur-xl dark:bg-slate-950/55">
        <summary className="cursor-pointer list-none text-sm font-semibold text-sky-700 transition hover:text-sky-600 dark:text-sky-300">
          What to verify from the carton ({fields.length} checks)
        </summary>
        <ol className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {fields.map((f) => (
            <li key={f.n} className="flex gap-2.5 text-sm">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] font-black tabular-nums text-sky-700 dark:text-sky-300">
                {f.n}
              </span>
              <span>
                <span className="font-semibold">{f.label}</span>
                <span className="block text-xs text-muted-foreground">{f.verify}</span>
              </span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

/**
 * What already happened to this consignment today.
 *
 * The point of closing the paperwork last is that there is a shift behind it.
 * Without this the screen would be the same screen wherever it sat in the case.
 */
function Earlier({ carton, placedIn }: { carton: Carton; placedIn: string | null }) {
  const countNote = stockCountNote(carton);
  if (!placedIn && !countNote) return null;
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-sky-300/25 bg-sky-400/5 p-3 text-sm">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
        <History className="size-3.5" aria-hidden="true" /> Earlier this shift
      </p>
      {placedIn === "quarantine" ? (
        <p className="text-muted-foreground">
          You held this in <span className="font-semibold text-foreground">quarantine</span>,
          so the note has to say the stock is not available and why.
        </p>
      ) : placedIn ? (
        <p className="text-muted-foreground">
          You booked this into <span className="font-semibold text-foreground">{placedIn}</span>.
        </p>
      ) : null}
      {countNote && <p className="text-muted-foreground">{countNote}</p>}
    </div>
  );
}

/** The box itself. Kraft stays kraft in both themes - cardboard has one colour. */
function CartonGraphic({
  carton, fields,
}: { carton: Carton; fields: ReturnType<typeof labelFields> }) {
  const { condition } = carton;
  // A pseudo-QR from the serial: decoration, but decoration that changes with
  // the carton rather than sitting there identical on all three.
  const qr = useMemo(() => {
    const seed = carton.serial + carton.gtin;
    return Array.from({ length: 64 }, (_, i) => (seed.charCodeAt(i % seed.length) + i * 7) % 3 === 0);
  }, [carton.serial, carton.gtin]);

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-black/20 px-5 py-4 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.75)]" style={{ background: KRAFT }}>
      <div className="relative">
        {/* Flap seam and the manufacturer's seal across it. */}
        <div className="relative mb-3 h-5">
          <div className="absolute inset-x-0 top-1/2 h-px bg-black/25" />
          {condition.seal ? (
            <div className="absolute left-1/2 top-0 h-5 w-28 -translate-x-1/2 rounded-sm bg-sky-900/70 text-center text-[8px] font-black uppercase leading-5 tracking-[0.18em] text-sky-50">
              sealed
            </div>
          ) : (
            <>
              <div className="absolute left-1/2 top-0 h-5 w-12 -translate-x-[110%] rounded-sm bg-sky-900/70" />
              <div className="absolute left-1/2 top-0 h-5 w-12 translate-x-[10%] rounded-sm bg-sky-900/70" />
              <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[8px] font-black uppercase leading-5 tracking-[0.18em] text-red-900">
                cut
              </span>
            </>
          )}
          {!condition.tape && (
            <div className="absolute right-1 top-0 h-5 w-20 rotate-[7deg] rounded-sm border border-black/20 bg-[#e8dcc2]/80" />
          )}
        </div>

        <div className="rounded-md bg-white p-3 text-slate-900 shadow-sm" style={{ transform: "rotate(-0.35deg)" }}>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
            {carton.controlled ? "Controlled drug - secure handling" : "Pharmaceutical goods"}
          </p>
          <dl className="mt-2 space-y-1.5">
            {fields.filter((f) => f.label !== "Barcode (GTIN)" && f.label !== "Serial number").map((f) => (
              <div key={f.n} className="flex items-baseline gap-2">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[9px] font-black tabular-nums text-white" aria-hidden="true">
                  {f.n}
                </span>
                <dt className="w-24 shrink-0 text-[10px] uppercase tracking-wide text-slate-500 sm:w-32">{f.label}</dt>
                <dd className={`min-w-0 flex-1 break-words text-xs font-semibold ${f.label === "Product name" ? "text-sm" : ""}`}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 flex items-end gap-3 border-t border-dashed border-slate-300 pt-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[9px] font-black tabular-nums text-white" aria-hidden="true">
                  {fields.find((f) => f.label === "Barcode (GTIN)")?.n}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">GTIN</span>
              </div>
              <div className="mt-1 flex h-9 items-stretch overflow-hidden" aria-hidden="true">
                {carton.gtin.split("").flatMap((digit, i) => [
                  <span key={`bar-${i}`} className="bg-slate-900" style={{ width: (Number(digit) % 3) + 1 }} />,
                  <span key={`gap-${i}`} style={{ width: ((Number(digit) + 1) % 3) + 1 }} />,
                ])}
              </div>
              <p className="text-[10px] font-semibold tabular-nums tracking-wider">{carton.gtin}</p>
            </div>
            <div className="shrink-0 text-center">
              <div className="grid grid-cols-8 gap-px" aria-hidden="true">
                {qr.map((on, i) => (
                  <span key={i} className={`size-1.5 ${on ? "bg-slate-900" : "bg-white"}`} />
                ))}
              </div>
              <p className="mt-1 text-[9px] font-semibold tracking-wider">
                <span className="mr-1 inline-flex size-3 items-center justify-center rounded-full bg-slate-900 text-[8px] font-black text-white" aria-hidden="true">
                  {fields.find((f) => f.label === "Serial number")?.n}
                </span>
                {carton.serial}
              </p>
            </div>
          </div>
        </div>

        {/* Damage, drawn. The prose underneath carries the same information,
            and both are placed clear of the barcode and the serial: a stain
            sitting over the two fields the learner is being asked to read is
            an obstacle, not a defect. */}
        {!condition.outer && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 -top-4 size-20"
            style={{
              background: "linear-gradient(135deg,#9a6f42 0%,#7d5730 60%,#5f3f20 100%)",
              clipPath: "polygon(100% 0,100% 78%,84% 58%,92% 40%,62% 44%,46% 12%,70% 14%,52% 0)",
            }}
          />
        )}
        {!condition.moisture && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-4 w-16 opacity-80 mix-blend-multiply"
            style={{
              background:
                "linear-gradient(90deg,#6f4a28 0%,rgba(122,83,48,0.65) 45%,rgba(150,110,70,0.28) 78%,transparent 100%)",
            }}
          />
        )}
      </div>
    </div>
  );
}

function ConditionPanel({
  draft, recorded, complete, onPick, onSubmit,
}: {
  draft: Partial<ConditionRecord>;
  recorded: ConditionRecord | null;
  complete: boolean;
  onPick: (key: ConditionKey, value: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-sky-300/20 bg-slate-900/[0.07] p-4 backdrop-blur-xl dark:bg-slate-950/55">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
        <ClipboardCheck className="size-3.5" aria-hidden="true" /> Carton condition check
      </p>
      <fieldset disabled={!!recorded} className="mt-3 space-y-2">
        <legend className="sr-only">Record the condition of the carton in front of you</legend>
        {CONDITION_ROWS.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 p-2.5">
            <span className="text-sm font-medium">{row.question}</span>
            <div className="flex gap-1.5">
              {[true, false].map((value) => {
                const picked = (recorded ? recorded[row.key] : draft[row.key]) === value;
                return (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => onPick(row.key, value)}
                    aria-pressed={picked}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-[0.97] ${
                      picked
                        ? value
                          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "border-red-500/60 bg-red-500/15 text-red-700 dark:text-red-300"
                        : "border-border/50 text-muted-foreground hover:border-sky-300/50"
                    }`}
                  >
                    {value ? row.good : row.bad}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>
      {recorded ? (
        <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Condition written to the <Abbr term="GRN" />.
        </p>
      ) : (
        <button
          type="button"
          disabled={!complete}
          onClick={onSubmit}
          className="mt-3 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
        >
          {complete ? "Record condition on the GRN" : "Answer all four to continue"}
        </button>
      )}
    </div>
  );
}

const COLUMNS: Array<{ key: "po" | "dc" | "grn"; head: string }> = [
  { key: "po", head: "Purchase order" },
  { key: "dc", head: "Delivery challan" },
  { key: "grn", head: "Goods received note" },
];

/** Ordered, claimed, found - the three documents a receipt has to agree with. */
function ThreeWayMatch({
  carton, recorded, ruledOut, onDecide,
}: {
  carton: Carton;
  recorded: ConditionRecord | null;
  ruledOut: string[];
  onDecide: (option: string) => void;
}) {
  const locked = !recorded;
  const soundRecorded = recorded
    ? CONDITION_ROWS.every((r) => recorded[r.key])
    : null;

  const rows: Array<{ label: string; po: string; dc: string; grn: string }> = [
    { label: "Document", po: carton.po.number, dc: carton.dc.number, grn: "Raised on acceptance" },
    { label: "Batch", po: "As supplied", dc: carton.dc.batch, grn: carton.batch },
    { label: "Quantity", po: `${carton.po.qty} packs`, dc: `${carton.dc.qty} packs`, grn: `${carton.qty} packs counted` },
    {
      label: "Expiry",
      po: `Min ${carton.po.minShelfLifeMonths} months at receipt`,
      dc: "-",
      grn: carton.expiry
        ? `${carton.expiryLabel} (${Math.max(0, carton.monthsToExpiry)} months left)`
        : "Not printed",
    },
    {
      label: "Condition",
      po: "Sound and sealed",
      dc: "-",
      grn: soundRecorded === null ? "Not yet recorded" : soundRecorded ? "Sound" : "Not sound",
    },
  ];

  return (
    <div className="rounded-2xl border border-sky-300/20 bg-slate-900/[0.07] p-4 backdrop-blur-xl dark:bg-slate-950/55">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
        <FileText className="size-3.5" aria-hidden="true" /> Three-way match
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        What you ordered, what the supplier says they sent, and what is actually in front of you.
      </p>

      {/* Two renderings of one array. A phone got the table in a horizontal
          scroller, which left "goods received" - the column that carries what
          is actually in front of you - off the right edge and easy to miss
          entirely. The comparison is the whole point of the screen, so on a
          small screen each line stacks instead. */}
      <dl className="mt-3 space-y-2 sm:hidden">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border border-border/40 p-2.5">
            <dt className="text-xs font-bold">{r.label}</dt>
            <dd className="mt-1 space-y-0.5">
              {COLUMNS.map((col) => (
                <div key={col.key} className="flex justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">{col.head}</span>
                  <span className="text-right tabular-nums">{r[col.key]}</span>
                </div>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[26rem] border-collapse text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th scope="col" className="py-1.5 pr-2 font-semibold">Line</th>
              {COLUMNS.map((col) => (
                <th key={col.key} scope="col" className="py-1.5 pr-2 font-semibold">{col.head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border/40 align-top">
                <th scope="row" className="py-2 pr-2 font-semibold">{r.label}</th>
                {COLUMNS.map((col) => (
                  <td key={col.key} className={`py-2 pr-2 tabular-nums ${col.key === "po" ? "text-muted-foreground" : ""}`}>
                    {r[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
          <ScanLine className="size-3.5" aria-hidden="true" /> Your call
        </p>
        {locked && (
          <p className="mt-1 text-xs text-muted-foreground">
            Record the carton condition first - a decision made before the box is looked at is
            the one that puts damaged stock on a shelf.
          </p>
        )}
        <div className="mt-2 grid gap-2">
          {decisionOptionsFor(carton).map((option) => {
            const out = ruledOut.includes(option.value);
            const accept = option.value === ACCEPT_OPTION;
            return (
              <motion.button
                key={option.value}
                type="button"
                disabled={locked || out}
                whileTap={locked || out ? undefined : { scale: 0.985 }}
                onClick={() => onDecide(option.value)}
                className={`rounded-xl border p-3 text-left text-sm transition disabled:cursor-not-allowed ${
                  out
                    ? "border-destructive/30 text-muted-foreground line-through opacity-60"
                    : locked
                      ? "border-border/30 opacity-40"
                      : accept
                        ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/70 hover:bg-emerald-500/10"
                        : "border-border/50 hover:border-amber-400/60 hover:bg-amber-400/10"
                }`}
              >
                {option.value}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
