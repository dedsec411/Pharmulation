import { makeRng, intBetween, pick, type Rng } from "./seeded-random";

/**
 * Goods-in: the delivery challan check that happens before anything is put away.
 *
 * The warehousing case in the database describes what arrived and where it
 * should end up, but it says nothing about the paperwork that comes with it.
 * In a real store that paperwork is the first gate: you stand at the bay with
 * the carton in front of you and the purchase order behind you, and you decide
 * whether this consignment is yours to accept at all. Getting that wrong is how
 * a wrong batch, a short count or a damaged carton ends up on a shelf with a
 * clean record behind it.
 *
 * So the documents are generated here, deterministically from the case id, and
 * the faults are placed rather than rolled - a learner who replays a case meets
 * the same delivery, and a lecturer can look at a disputed result and see
 * exactly which rule decided it.
 *
 * What is *not* invented here matters as much as what is. Everything clinical -
 * the medicine, its strength, its batch, its expiry, its storage requirement -
 * comes from the case. What this module adds is logistics metadata only:
 * quantities in packs, a supplier, document numbers, a barcode. No price
 * appears anywhere on purpose. A rupee figure printed beside a real medicine
 * would be read as that medicine's real price by exactly the people this is
 * built for, and the quantity checks teach the same lesson without it.
 */

/**
 * Minimum shelf life at receipt, as a buyer actually writes it - longest first.
 *
 * This is a term of the order, not a law, and a real buyer sets it against what
 * the market supplies for that line: eighteen months on a fast ambient product,
 * six on something short-cycle. So the term is chosen per delivery rather than
 * fixed, as the longest rung that still leaves something in the consignment
 * acceptable.
 *
 * A fixed number was tried first and rotted. The expiry dates in the case files
 * are absolute and the calendar kept moving, so by the time this was written a
 * flat twelve-month rule failed seventeen of twenty-three batches and five of
 * the eight cases had no acceptable carton at all - which teaches "always
 * refuse" rather than "check it against the order". Reading the term off the
 * purchase order in front of you is the real skill anyway, and it is the one
 * thing here that cannot go stale.
 */
const SHELF_LIFE_LADDER = [18, 12, 9, 6];

/** Assumed shelf life, used only to print a manufacturing date on the carton. */
const ASSUMED_SHELF_LIFE_MONTHS = 24;

/** At most this many cartons get the full check - the phase shares a clock with four others. */
export const MAX_CARTONS = 3;

export type ConditionKey = "outer" | "moisture" | "seal" | "tape";

/** True is the sound state. A carton that is fine reads `true` four times. */
export type ConditionRecord = Record<ConditionKey, boolean>;

export const CONDITION_ROWS: Array<{
  key: ConditionKey; question: string; good: string; bad: string;
}> = [
  { key: "outer", question: "Outer carton", good: "No damage", bad: "Torn or crushed" },
  { key: "moisture", question: "Moisture", good: "Dry", bad: "Wet or stained" },
  { key: "seal", question: "Manufacturer's seal", good: "Sealed", bad: "Seal broken" },
  { key: "tape", question: "Strap and tape", good: "Intact", bad: "Opened or re-taped" },
];

export const SOUND_CONDITION: ConditionRecord = {
  outer: true, moisture: true, seal: true, tape: true,
};

export type FindingCode = "batch-mismatch" | "qty-mismatch" | "short-shelf-life" | "damaged";

/**
 * Suppliers are invented, and deliberately so.
 *
 * Every carton here is a teaching fault waiting to happen - a torn box, a
 * broken seal, a batch that does not match its challan. Printing a real DRAP
 * licence holder's name on one would put a real company's name against a
 * fabricated failure in front of a room of pharmacists.
 */
const SUPPLIERS = [
  "Riverline Pharmaceuticals (Pvt) Ltd",
  "Northfield Laboratories (Pvt) Ltd",
  "Sunward Healthcare (Pvt) Ltd",
  "Clearwater Pharma (Pvt) Ltd",
  "Meridian Lifesciences (Pvt) Ltd",
];

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** The join-code alphabet: no I, O, 0 or 1, because these get read aloud and copied by hand. */
const SERIAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type Carton = {
  shipmentId: string;
  /** Printed on the carton, from the case - never invented. */
  product: string;
  strength: string | null;
  batch: string;
  expiry: string;
  expiryLabel: string;
  mfgLabel: string;
  /** Packs actually in the carton, once counted. */
  qty: number;
  storage: string;
  controlled: boolean;
  gtin: string;
  serial: string;
  supplier: string;
  /** What the carton really looks like. The learner has to record this. */
  condition: ConditionRecord;
  /**
   * What you can see, in words.
   *
   * Always written, including for a sound carton. A note that appeared only
   * when something was wrong would answer the condition check before the
   * learner had looked at anything.
   */
  conditionNote: string;
  monthsToExpiry: number;
  po: { number: string; qty: number; raisedOn: string; minShelfLifeMonths: number };
  dc: { number: string; batch: string; qty: number; date: string };
  /** Everything wrong with this consignment. Empty means accept it. */
  findings: FindingCode[];
};

export type LabelField = {
  n: number;
  label: string;
  value: string;
  /** What a receiver is actually checking when they look at this field. */
  verify: string;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

function addMonths(date: Date, months: number): Date {
  const out = new Date(date.getTime());
  out.setMonth(out.getMonth() + months);
  return out;
}

/** Whole months from `from` to `to`; negative once the date has gone. */
export function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12
    + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

const monthLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/**
 * A real GS1 check digit, on a Pakistan (896) prefix.
 *
 * It would have been quicker to print fourteen arbitrary digits, but "scan the
 * barcode and check it against the pack" is one of the ten things this screen
 * teaches, and a number that fails the check it is supposed to pass teaches the
 * opposite of the intended lesson.
 */
export function gs1CheckDigit(thirteen: string): number {
  let sum = 0;
  for (let i = 0; i < thirteen.length; i++) {
    const digit = Number(thirteen[thirteen.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

function makeGtin(rng: Rng): string {
  let body = "896";
  while (body.length < 13) body += String(Math.floor(rng() * 10));
  return body + gs1CheckDigit(body);
}

function makeSerial(rng: Rng): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += pick(rng, SERIAL_ALPHABET.split(""));
  return out;
}

/**
 * Strength as the case already states it, or nothing.
 *
 * The catalogue writes strength into the product name ("Amoxicillin 500mg
 * caps"), and some products have none to state ("Insulin Glargine"). Pulling it
 * back out is safe; making one up is not, so a product without one simply loses
 * that line on the label.
 */
export function readStrength(product: string): string | null {
  const match = product.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mL|%|IU)(?:\s*\/\s*\d*\s*(?:ml|mL|g|L))?)/);
  return match ? match[1].replace(/\s+/g, "") : null;
}

export const SOUND_NOTE =
  "The carton is square and dry, still strapped, and the manufacturer's seal across the flap is unbroken.";

const DEFECT_NOTES: Record<ConditionKey, string> = {
  outer: "One corner of the outer carton is crushed and split; the inner packs show through the tear.",
  moisture: "A dried water stain runs up one side and the board is soft where it dried.",
  seal: "The manufacturer's seal across the top flap has been cut through.",
  tape: "The original strapping is gone and the carton has been closed again with plain tape.",
};

/** Faults that have to be written in, as opposed to ones the case data already carries. */
const AUTHORED: FindingCode[] = ["batch-mismatch", "qty-mismatch", "damaged"];

export type ShipmentLike = {
  id?: string;
  drug?: string;
  batch?: string;
  expiry?: string;
  requirement?: string;
  controlled?: boolean;
};

/**
 * Turn the first few shipments of a case into cartons at the receiving bay.
 *
 * Faults are placed in two passes. The first is not a choice at all: a batch
 * whose expiry is genuinely close reads as short-dated because it *is* short-
 * dated, computed from the date in the case. Only then are paperwork faults
 * written onto the cartons that came back clean, and only enough of them to
 * make roughly half the delivery worth stopping. Doing it in that order is what
 * keeps a carton marked "in order" from quietly failing the shelf-life rule.
 */
/**
 * The term this order was placed on, read off what the line actually supplies.
 *
 * The longest rung that still leaves most of the consignment acceptable. A
 * buyer who writes eighteen months onto a line the market ships at seven is
 * refusing nearly every delivery, and no buyer does that for long - the term
 * settles at what can be met.
 *
 * Taking the longest rung that left merely *one* carton acceptable was tried
 * and made the phase monotonous: two thirds of every delivery failed on dates,
 * which crowded out every other kind of check and meant a damaged carton never
 * appeared at all.
 */
function shelfLifeTerm(monthsLeft: Array<number | null>): number {
  const dated = monthsLeft.filter((m): m is number => m !== null);
  const shortest = SHELF_LIFE_LADDER[SHELF_LIFE_LADDER.length - 1];
  if (!dated.length) return shortest;
  const passes = (term: number) => dated.filter((m) => m >= term).length;
  const half = Math.ceil(dated.length / 2);
  return SHELF_LIFE_LADDER.find((term) => passes(term) >= half)
    // Nothing reaching even the shortest rung is a consignment to turn away
    // whole, and the phase says so rather than softening the term to hide it.
    ?? SHELF_LIFE_LADDER.find((term) => passes(term) >= 1)
    ?? shortest;
}

export function buildGoodsIn(
  caseId: string,
  shipments: ShipmentLike[],
  now: Date = new Date(),
): Carton[] {
  const chosen = (shipments ?? []).slice(0, MAX_CARTONS);
  if (!chosen.length) return [];

  const rng = makeRng(`goods-in:${caseId}`);
  const supplier = pick(rng, SUPPLIERS);
  const poNumber = `PO-${now.getFullYear()}-${String(intBetween(rng, 100, 999))}`;
  const dcDate = iso(now);

  // The dates decide the term, so they are read before a single carton is
  // built. Doing it the other way round is what produced a delivery where
  // every line was short and refusing everything was the only right answer.
  const monthsLeft = chosen.map((sh) => {
    const expiry = new Date(String(sh.expiry ?? ""));
    return Number.isNaN(expiry.getTime()) ? null : monthsBetween(now, expiry);
  });
  const minShelfLifeMonths = shelfLifeTerm(monthsLeft);

  const cartons: Carton[] = chosen.map((sh, index) => {
    const product = String(sh.drug ?? "Unlabelled stock");
    const batch = String(sh.batch ?? "-");
    const expiryIso = String(sh.expiry ?? "");
    const expiryDate = new Date(expiryIso);
    const dated = monthsLeft[index] !== null;
    const months = monthsLeft[index] ?? minShelfLifeMonths;
    const qty = intBetween(rng, 4, 24) * 5;

    return {
      shipmentId: String(sh.id ?? `C${index + 1}`),
      product,
      strength: readStrength(product),
      batch,
      expiry: expiryIso,
      expiryLabel: dated ? monthLabel(expiryDate) : "Not printed",
      mfgLabel: dated ? monthLabel(addMonths(expiryDate, -ASSUMED_SHELF_LIFE_MONTHS)) : "Not printed",
      qty,
      storage: String(sh.requirement ?? "No storage condition stated"),
      controlled: !!sh.controlled,
      gtin: makeGtin(rng),
      serial: makeSerial(rng),
      supplier,
      condition: { ...SOUND_CONDITION },
      conditionNote: SOUND_NOTE,
      monthsToExpiry: months,
      po: { number: poNumber, qty, raisedOn: iso(addMonths(now, -1)), minShelfLifeMonths },
      dc: { number: `DC-${intBetween(rng, 1000, 9999)}`, batch, qty, date: dcDate },
      findings: dated && months < minShelfLifeMonths ? ["short-shelf-life"] : [],
    };
  });

  // Enough stopped cartons that the phase is a judgement and not a rhythm, but
  // still a delivery with something sound in it - accepting correctly is half
  // the skill, and a run where every carton is faulty never tests it.
  const target = Math.max(1, Math.ceil(cartons.length / 2));
  const clean = cartons.filter((c) => !c.findings.length);
  let toPlace = target - (cartons.length - clean.length);

  // Drawn without replacement: two cartons in one delivery failing the same
  // way teaches half as much as two failing differently.
  const pool = shuffle(AUTHORED, rng);
  for (const carton of clean) {
    if (toPlace <= 0) break;
    applyFault(carton, pool[toPlace - 1] ?? pick(rng, AUTHORED), rng);
    toPlace -= 1;
  }

  return cartons;
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function applyFault(carton: Carton, fault: FindingCode, rng: Rng) {
  if (fault === "batch-mismatch") {
    // A transposed digit, which is what this really looks like on a bay: close
    // enough that it passes anyone who is pattern-matching rather than reading.
    carton.dc.batch = transpose(carton.batch, rng);
  } else if (fault === "qty-mismatch") {
    carton.dc.qty = carton.qty + intBetween(rng, 1, 4) * 5;
    carton.po.qty = carton.dc.qty;
  } else if (fault === "damaged") {
    const key = pick(rng, ["outer", "moisture", "seal", "tape"] as ConditionKey[]);
    carton.condition = { ...SOUND_CONDITION, [key]: false };
    carton.conditionNote = DEFECT_NOTES[key];
  }
  carton.findings.push(fault);
}

/** Swap the last two characters so the batch stays plausible rather than obviously other. */
function transpose(batch: string, rng: Rng): string {
  if (batch.length < 2) return `${batch}${intBetween(rng, 2, 9)}`;
  const head = batch.slice(0, -2);
  const [a, b] = [batch.at(-2)!, batch.at(-1)!];
  return a === b ? `${head}${a}${intBetween(rng, 2, 9)}` : `${head}${b}${a}`;
}

/** The GRN decision, as one list, so naming the fault is part of the answer. */
export const ACCEPT_OPTION = "Accept and raise the GRN";

export const DECISION_OPTIONS: Array<{ value: string; finding: FindingCode | null }> = [
  { value: ACCEPT_OPTION, finding: null },
  { value: "Raise a discrepancy - batch on the challan is not the batch on the carton", finding: "batch-mismatch" },
  { value: "Raise a discrepancy - quantity received does not match the challan", finding: "qty-mismatch" },
  // Deliberately does not name a number: the term is on the purchase order in
  // front of them, and looking it up is the check.
  { value: "Raise a discrepancy - shelf life is short of the term on the purchase order", finding: "short-shelf-life" },
  { value: "Raise a discrepancy - carton damaged or seal broken", finding: "damaged" },
];

export function findingFor(option: string): FindingCode | null {
  return DECISION_OPTIONS.find((o) => o.value === option)?.finding ?? null;
}

/** Any real fault named counts. A carton can be wrong in more than one way. */
export function isDecisionCorrect(carton: Carton, option: string): boolean {
  const finding = findingFor(option);
  if (!carton.findings.length) return finding === null;
  return finding !== null && carton.findings.includes(finding);
}

/** What the learner should have answered, for the feedback panel. */
export function correctDecision(carton: Carton): string {
  if (!carton.findings.length) return ACCEPT_OPTION;
  const first = carton.findings[0];
  return DECISION_OPTIONS.find((o) => o.finding === first)?.value ?? ACCEPT_OPTION;
}

export function conditionMatches(carton: Carton, recorded: ConditionRecord): boolean {
  return CONDITION_ROWS.every((row) => recorded[row.key] === carton.condition[row.key]);
}

export function explainFinding(code: FindingCode, carton: Carton): {
  whyWrong: string; whatToKnow: string;
} {
  switch (code) {
    case "batch-mismatch":
      return {
        whyWrong: `The challan lists batch ${carton.dc.batch} but the carton is printed ${carton.batch}. Booking it in against the challan puts a batch on your shelf that your records say is somewhere else.`,
        whatToKnow: "A recall names a batch and nothing else. If the batch you hold is not the batch your system holds, you cannot answer a recall, and neither can the supplier.",
      };
    case "qty-mismatch":
      return {
        whyWrong: `The challan says ${carton.dc.qty} packs; the carton holds ${carton.qty}. Signing for ${carton.dc.qty} accepts a liability for stock you never received.`,
        whatToKnow: "Count before you sign. Once the challan is signed clean, the shortfall is yours to prove, not the supplier's to explain.",
      };
    case "short-shelf-life":
      return {
        whyWrong: `${carton.expiryLabel} leaves about ${Math.max(0, carton.monthsToExpiry)} months, under the ${carton.po.minShelfLifeMonths} months ${carton.po.number} was placed on. Short-dated stock that cannot move in time is written off, not dispensed.`,
        whatToKnow: "Purchase orders carry a minimum shelf life at receipt for a reason. Read the term off the order and check the expiry against it at the bay, while refusing the consignment is still free.",
      };
    case "damaged":
      return {
        whyWrong: "The carton is not sound, so what is inside it cannot be assumed sound either. Accepting it clean makes the damage yours from that moment.",
        whatToKnow: "Damage, wetting and a broken seal are all refusal grounds at the bay. Record what you saw on the GRN, photograph it, and raise the discrepancy before the driver leaves.",
      };
  }
}

export function findingLabel(code: FindingCode): string {
  return DECISION_OPTIONS.find((o) => o.finding === code)?.value ?? code;
}

/**
 * The ten things on a carton worth reading, in the order the eye meets them.
 *
 * Numbered here rather than in the screen so the callout beside each field and
 * the checklist underneath it can never drift apart, and so a product with no
 * printed strength loses the line without leaving a gap in the numbering.
 */
export function labelFields(carton: Carton): LabelField[] {
  const fields: Array<Omit<LabelField, "n">> = [
    { label: "Product name", value: carton.product, verify: "Reads the same as the purchase order, generic and brand both." },
    ...(carton.strength
      ? [{ label: "Strength", value: carton.strength, verify: "The strength ordered, not a neighbouring one from the same range." }]
      : []),
    { label: "Batch number", value: carton.batch, verify: "Matches the delivery challan exactly. This is the only handle a recall has." },
    { label: "Manufacturing date", value: carton.mfgLabel, verify: "Present and legible, and consistent with the expiry printed beside it." },
    { label: "Expiry date", value: carton.expiryLabel, verify: `At least the ${carton.po.minShelfLifeMonths} months ${carton.po.number} was placed on.` },
    { label: "Quantity", value: `${carton.qty} packs`, verify: "Counted, not read. The challan figure is a claim until you check it." },
    { label: "Manufacturer", value: carton.supplier, verify: "A licensed supplier you hold an agreement with." },
    { label: "Handling", value: carton.storage, verify: "Tells you which zone it goes to, and whether it should have arrived cold." },
    { label: "Barcode (GTIN)", value: carton.gtin, verify: "Scans, and resolves to the same product the label names." },
    { label: "Serial number", value: carton.serial, verify: "Unique to this carton. It is what traces this box if anything is queried later." },
  ];
  return fields.map((f, i) => ({ ...f, n: i + 1 }));
}

/** The condition record in words, for the feedback panel. */
export function describeCondition(record: ConditionRecord): string {
  const faults = CONDITION_ROWS.filter((r) => !record[r.key]).map((r) => r.bad.toLowerCase());
  return faults.length ? faults.join(", ") : "no damage, dry, sealed, tape intact";
}

/**
 * Why a call was wrong, in the three ways it can be.
 *
 * Kept here beside the rule that judged it so the explanation cannot drift from
 * the grading, which is the thing a learner disputing a mark will compare.
 */
export function decisionFeedback(carton: Carton, option: string): {
  errorType: string; whyWrong: string; whatToKnow: string;
} {
  const named = findingFor(option);

  if (!carton.findings.length) {
    return {
      errorType: "Sound consignment refused",
      whyWrong: `Nothing on this carton fails a check. The batch matches the challan, the count matches, ${carton.expiry ? `${carton.expiryLabel} leaves about ${carton.monthsToExpiry} months against the ${carton.po.minShelfLifeMonths}-month term on ${carton.po.number}, ` : ""}and the carton is sound. A refused delivery is a day of supply lost and a credit note to chase for nothing.`,
      whatToKnow: "A discrepancy is raised against a fault you can point at on the paperwork. When every line agrees, sign for it and raise the GRN.",
    };
  }

  const real = explainFinding(carton.findings[0], carton);

  if (named === null) {
    return {
      errorType: "Faulty consignment accepted",
      whyWrong: real.whyWrong,
      whatToKnow: real.whatToKnow,
    };
  }

  return {
    errorType: "Wrong discrepancy raised",
    whyWrong: `That is not what is wrong with this consignment. ${real.whyWrong}`,
    whatToKnow: real.whatToKnow,
  };
}
