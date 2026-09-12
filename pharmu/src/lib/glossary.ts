/**
 * The short forms, in words.
 *
 * The demo jury's objection was that somebody new cannot read the screens: a
 * warehouse phase called "Challan and GRN" assumes you already know what a GRN
 * is, and the whole point of the product is the people who do not yet.
 *
 * Expanding everything in place was the obvious fix and the wrong one - "First
 * Expired, First Out dispatch" reads worse than "FEFO dispatch" to the
 * pharmacists this is also built for, and the abbreviations are what they will
 * meet at work. So both: the short form stays, carries its meaning on hover
 * and on tap, and a single switch expands every one of them at once for
 * anybody who wants the screen in plain words.
 *
 * `plain` is written for somebody in their first week, not for a marker. None
 * of these are clinical claims - they are what the letters stand for and what
 * the thing is for.
 */

export type GlossaryEntry = {
  /** The short form exactly as it appears on screen. */
  term: string;
  /** What the letters stand for. */
  full: string;
  /** One sentence, no jargon. */
  plain: string;
};

export const GLOSSARY: GlossaryEntry[] = [
  { term: "FEFO", full: "First Expired, First Out", plain: "Send out the batch that expires soonest, so nothing goes out of date sitting on a shelf." },
  { term: "FIFO", full: "First In, First Out", plain: "Send out the oldest stock first. In a pharmacy FEFO usually matters more, because the oldest stock is not always the one expiring first." },
  { term: "GRN", full: "Goods Received Note", plain: "Your own record of what actually arrived, written when you accept a delivery." },
  { term: "DC", full: "Delivery Challan", plain: "The supplier's note listing what they say they sent with this delivery." },
  { term: "PO", full: "Purchase Order", plain: "The order you placed: what you asked for, how much, and on what terms." },
  { term: "CD", full: "Controlled Drug", plain: "A medicine with extra legal controls on how it is stored, recorded and handed over." },
  { term: "GTIN", full: "Global Trade Item Number", plain: "The number behind the barcode that identifies exactly which product a pack is." },
  { term: "MRP", full: "Maximum Retail Price", plain: "The highest price a pack may be sold for, printed on the pack itself." },
  { term: "SOP", full: "Standard Operating Procedure", plain: "The written steps for doing a task the same way every time." },
  { term: "CAPA", full: "Corrective and Preventive Action", plain: "What you did about a problem, and what you changed so it does not happen again." },
  { term: "BMR", full: "Batch Manufacturing Record", plain: "The document that says how a batch is to be made, and what actually happened while it was." },
  { term: "GMP", full: "Good Manufacturing Practice", plain: "The rules a medicine has to be made under for it to be fit to sell." },
  { term: "QC", full: "Quality Control", plain: "Testing a finished batch against its specification before anybody is allowed to release it." },
  { term: "API", full: "Active Pharmaceutical Ingredient", plain: "The part of a medicine that actually does the work. Everything else in the formula carries it." },
  { term: "RH", full: "Relative Humidity", plain: "How much moisture is in the air, as a percentage. Some products spoil in a damp room." },
  { term: "SPC", full: "Summary of Product Characteristics", plain: "The manufacturer's official document describing a medicine and how it should be used." },
  { term: "OTC", full: "Over The Counter", plain: "Medicines a pharmacist can sell without a prescription." },
  { term: "Rx", full: "Prescription", plain: "A prescription - an order for a medicine written by a prescriber." },
  { term: "CPD", full: "Continuing Professional Development", plain: "Learning you record through your career to show your practice is up to date." },
  { term: "DRAP", full: "Drug Regulatory Authority of Pakistan", plain: "The body that licenses and regulates medicines in Pakistan." },
  { term: "XP", full: "Experience Points", plain: "Points you earn for completed cases here. Enough of them raises your level." },
];

const BY_TERM = new Map(GLOSSARY.map((e) => [e.term.toLowerCase(), e]));

export function lookup(term: string): GlossaryEntry | null {
  return BY_TERM.get(String(term ?? "").trim().toLowerCase()) ?? null;
}

/** Everything, alphabetical, for the glossary in the guide panel. */
export function glossaryAlphabetical(): GlossaryEntry[] {
  return [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
}

/** What a term reads as when somebody has asked for plain words. */
export function expanded(entry: GlossaryEntry): string {
  return `${entry.full} (${entry.term})`;
}

/**
 * The one-line meaning, for a tooltip.
 *
 * Both halves, because the expansion alone is often no help - knowing that GRN
 * stands for Goods Received Note does not tell you what one is for.
 */
export function tooltip(entry: GlossaryEntry): string {
  return `${entry.full} — ${entry.plain}`;
}
