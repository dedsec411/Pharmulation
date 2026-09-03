import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pill, ShieldAlert, X as XIcon } from "lucide-react";
import { RX_DRUG_CATEGORIES, getBrandsForDrug, setRealBrands, type BrandOption } from "@/lib/drug-catalog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrapList } from "@/lib/supabase-query";
import {
  LABEL_FREQUENCIES, LABEL_TIMINGS,
  LABEL_INSTRUCTIONS, MAX_COURSE_DAYS, ONGOING, durationDays, formatDuration,
} from "@/lib/game/dosing";

/**
 * The dispensing controls shared by Rx and OTC.
 *
 * Both modes hand over a medicine the same way in real practice - find it on
 * the shelf, choose a brand, write the label - so both use these rather than
 * OTC growing its own parallel copy.
 */

// Defined alongside the dose parser that has to emit values from these lists,
// so the two can never drift apart. Re-exported here because this is where the
// label UI has always imported them from.
export { LABEL_FREQUENCIES, LABEL_TIMINGS, LABEL_INSTRUCTIONS } from "@/lib/game/dosing";

export type LabelAnswer = {
  frequency: string;
  timing: string;
  duration: string;
  /** Auxiliary label lines. A label carries as many as the medicine needs. */
  instruction?: string[];
};

export function OptionPicker({
  label, options, value, onChange,
}: { label: string; options: readonly string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              value === option
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/40 text-muted-foreground hover:border-primary/40"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DurationSlider({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  // A course is a number of days, so the control is a day count rather than a
  // pick from four buckets. The buckets could not express "5 days" or "10 days"
  // at all, and stored cases ask for both.
  const days = durationDays(value);
  const ongoing = days === null;
  const sliderDays = days ?? 7;

  return (
    <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Duration</p>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {ongoing ? "Ongoing" : formatDuration(sliderDays)}
        </span>
      </div>

      <input
        type="range"
        min={1}
        max={MAX_COURSE_DAYS}
        step={1}
        value={sliderDays}
        disabled={ongoing}
        onChange={(event) => onChange(formatDuration(Number(event.target.value)))}
        aria-label="Duration in days"
        className="mt-4 w-full accent-primary disabled:opacity-40"
      />

      {/* Every day is selectable; only a few are labelled, so the scale stays
          readable rather than printing thirty numbers.

          Positioned at each mark's real place on the track, not spread evenly.
          `justify-between` put the five labels at 0/25/50/75/100% of the width,
          but on a 1-30 range 7 sits at 21% and 14 at 45% - so the handle read
          8 when it looked like it was on the 7, and 15 on the 14. The value
          was right the whole time; the numbers under it were in the wrong
          places.

          The px term corrects for the thumb: its centre travels from half a
          thumb-width in to half a thumb-width short of the end, so 0% and 100%
          on the track are not 0% and 100% of the element. */}
      <div className="relative mt-1 h-3 text-[9px] font-semibold text-muted-foreground">
        {[1, 7, 14, 21, MAX_COURSE_DAYS].map((mark) => {
          const pct = ((mark - 1) / (MAX_COURSE_DAYS - 1)) * 100;
          return (
            <span
              key={mark}
              className={`absolute -translate-x-1/2 tabular-nums ${
                !ongoing && mark === sliderDays ? "text-primary" : ""
              }`}
              style={{ left: `calc(${pct}% + ${((50 - pct) * 0.16).toFixed(2)}px)` }}
            >
              {mark}
            </span>
          );
        })}
      </div>

      {/* A long-term medicine has no day count, so it cannot live on the scale.
          Without this, every "ongoing" answer would be unreachable. */}
      <button
        type="button"
        role="switch"
        aria-checked={ongoing}
        onClick={() => onChange(ongoing ? formatDuration(7) : ONGOING)}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
          ongoing
            ? "border-primary bg-primary/15 text-primary"
            : "border-border/40 text-muted-foreground hover:border-primary/40"
        }`}
      >
        <span className={`inline-block size-2 rounded-full ${ongoing ? "bg-primary" : "bg-muted-foreground/40"}`} />
        Ongoing - no fixed end date
      </button>
    </div>
  );
}

/**
 * The cautionary line on the label.
 *
 * Presets cover the labels that come up constantly; "Other" exists because the
 * useful instruction is often specific to the patient - a missed dose rule, a
 * device to bring back, a review date - and a fixed list cannot hold those.
 */
export function InstructionPicker({
  value, onChange,
}: { value: string[]; onChange: (value: string[]) => void }) {
  const [custom, setCustom] = useState(false);

  // A real label carries as many cautionary lines as the medicine needs -
  // "swallow whole" and "do not drink alcohol" are not alternatives - so these
  // toggle independently instead of behaving like radio buttons.
  const isPreset = (item: string) => (LABEL_INSTRUCTIONS as readonly string[]).includes(item);
  const customText = value.find((item) => !isPreset(item)) ?? "";

  function toggle(option: string) {
    onChange(value.includes(option)
      ? value.filter((item) => item !== option)
      : [...value, option]);
  }

  /** The free-text line is one more entry, replaced in place as it is typed. */
  function setCustomText(text: string) {
    const presets = value.filter(isPreset);
    onChange(text.trim() ? [...presets, text] : presets);
  }

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        Other / special instruction{" "}
        <span className="text-muted-foreground">(optional - choose any that apply)</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LABEL_INSTRUCTIONS.map((option) => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                selected
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/40 text-muted-foreground hover:border-primary/40"
              }`}
            >
              {option}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => {
            // Closing the free-text box drops whatever was in it, so a
            // half-typed line cannot end up on the label unseen.
            if (custom) setCustomText("");
            setCustom(!custom);
          }}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${
            custom
              ? "border-primary bg-primary/15 text-primary"
              : "border-border/40 text-muted-foreground hover:border-primary/40"
          }`}
        >
          Other...
        </button>
      </div>

      {custom && (
        <input
          autoFocus
          value={customText}
          onChange={(event) => setCustomText(event.target.value)}
          maxLength={120}
          placeholder="Write the instruction as it should read on the label"
          className="mt-2 w-full rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/60"
        />
      )}
    </div>
  );
}

/** Write the dispensing label for one medicine. */
export function LabelForm({
  drug, brand, onSubmit,
}: { drug: string; brand?: string | null; onSubmit: (answer: LabelAnswer) => void }) {
  const [frequency, setFrequency] = useState("");
  const [timing, setTiming] = useState("");
  const [duration, setDuration] = useState<string>(formatDuration(7));
  const [instruction, setInstruction] = useState<string[]>([]);

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur">
      <h2 className="text-xl font-bold">{brand ? `${brand} (${drug})` : drug}</h2>
      <p className="text-sm text-muted-foreground">Write the label the patient will read.</p>
      <OptionPicker label="Frequency" options={LABEL_FREQUENCIES} value={frequency} onChange={setFrequency} />
      <OptionPicker label="Timing" options={LABEL_TIMINGS} value={timing} onChange={setTiming} />
      <DurationSlider value={duration} onChange={setDuration} />
      <InstructionPicker value={instruction} onChange={setInstruction} />
      <button
        type="button"
        disabled={!frequency || !timing}
        onClick={() => onSubmit({ frequency, timing, duration, instruction: instruction.length ? instruction : undefined })}
        className="mt-5 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
      >
        Submit label
      </button>
    </div>
  );
}

type ShelfDrug = { id: string; name: string; generic_name?: string | null; category?: string | null };

/**
 * Pick a medicine off the shelf, then choose its brand.
 *
 * `onRefer` is what makes this usable for OTC: not every consultation should
 * end in a sale, so refusing to dispense has to be an available action rather
 * than an option the player can only reach by picking from a list.
 */
export function DispensingShelf({
  drugs, onDispense, onRefer, referLabel = "Refer to a doctor instead",
}: {
  drugs: ShelfDrug[];
  onDispense: (drug: ShelfDrug, brand: string) => void;
  onRefer?: () => void;
  referLabel?: string;
}) {
  const [category, setCategory] = useState("");
  const [brandDrug, setBrandDrug] = useState<ShelfDrug | null>(null);

  // Real brands for the shelf, so a learner picks Lasix rather than
  // "Furosemide Generic". Falls back to generated names where a medicine has
  // no brand recorded for the market.
  useQuery({
    queryKey: ["drug-brands"],
    queryFn: async () => {
      const rows = unwrapList(
        await supabase.from("drug_brands").select("brand, market, manufacturer, drugs(name, generic_name)"),
        "medicine brands",
      );
      const byGeneric: Record<string, BrandOption[]> = {};
      for (const row of rows as any[]) {
        const key = String(row.drugs?.generic_name || row.drugs?.name || "").toLowerCase().trim();
        if (!key) continue;
        (byGeneric[key] ??= []).push({ brand: row.brand, company: row.manufacturer });
      }
      setRealBrands(byGeneric);
      return byGeneric;
    },
    staleTime: 5 * 60 * 1000,
  });

  const categoryStats = useMemo(
    () => RX_DRUG_CATEGORIES
      .map((name) => ({ name, count: drugs.filter((d) => d.category === name).length }))
      .filter((c) => c.count > 0),
    [drugs],
  );
  const shelf = useMemo(
    () => drugs.filter((d) => d.category === category),
    [drugs, category],
  );

  return (
    <>
      {!category && (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Medicine categories</p>
              <p className="mt-1 text-sm text-muted-foreground">Select a category to open the shelf.</p>
            </div>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              {categoryStats.length} groups
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {categoryStats.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCategory(c.name)}
                className="rounded-2xl border border-border/40 bg-muted/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-9 place-items-center rounded-xl border border-primary/25 bg-primary/10">
                    <Pill className="size-4 text-primary" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {c.count} meds
                  </span>
                </div>
                <p className="mt-3 font-bold">{c.name}</p>
                <p className="text-xs text-muted-foreground">Open shelf and select a dispensing brand</p>
              </button>
            ))}
          </div>

          {onRefer && (
            <button
              type="button"
              onClick={onRefer}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2.5 text-sm font-bold text-amber-400 transition hover:bg-amber-400/15"
            >
              <ShieldAlert className="size-4" /> {referLabel}
            </button>
          )}
        </div>
      )}

      {category && (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{category} shelf</p>
              <p className="mt-1 text-sm text-muted-foreground">Pick a medicine, then choose its brand.</p>
            </div>
            <button
              type="button"
              onClick={() => setCategory("")}
              className="rounded-full border border-border/50 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              All categories
            </button>
          </div>

          <div className="mt-4 grid max-h-[380px] gap-2 overflow-y-auto sm:grid-cols-2">
            {shelf.map((drug) => (
              <button
                key={drug.id}
                type="button"
                onClick={() => setBrandDrug(drug)}
                className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
              >
                <p className="font-semibold">{drug.name}</p>
                <p className="truncate text-xs text-muted-foreground">{drug.generic_name ?? drug.category}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {brandDrug && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setBrandDrug(null)}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-border/40 bg-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Choose brand</p>
                <h2 className="mt-1 text-2xl font-bold">{brandDrug.name}</h2>
                <p className="text-sm text-muted-foreground">{brandDrug.generic_name ?? brandDrug.category}</p>
              </div>
              <button
                type="button"
                onClick={() => setBrandDrug(null)}
                aria-label="Close brand selection"
                className="rounded-full border border-border/50 p-1.5 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {getBrandsForDrug(brandDrug).map((option) => (
                <button
                  key={option.brand}
                  type="button"
                  onClick={() => { onDispense(brandDrug, option.brand); setBrandDrug(null); }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm transition hover:border-primary/50 hover:bg-primary/10"
                >
                  <span className="font-semibold">{option.brand}</span>
                  {/* The company matters at the counter: a learner is choosing
                      between the originator and the generics beside it. */}
                  {option.company && (
                    <span className="shrink-0 text-xs text-muted-foreground">{option.company}</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
